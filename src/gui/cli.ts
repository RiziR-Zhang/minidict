#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import chalk from 'chalk';
import { startGuiServer } from './server.js';
import { openGuiWindow } from './windows.js';

interface GuiCommandOptions {
  config?: string;
  port?: string;
  open?: boolean;
  foreground?: boolean;
}

interface StartupMessage {
  type: 'started';
  url: string;
  opened: boolean;
}

function parsePort(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;

  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('--port 必须是 0 到 65535 之间的整数');
  }

  return port;
}

function bindShutdown(server: Awaited<ReturnType<typeof startGuiServer>>['server']): void {
  const shutdown = (): void => {
    server.close(() => process.exit(0));
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

function withClientId(url: string, clientId: string): string {
  const target = new URL(url);
  target.searchParams.set('clientId', clientId);
  return target.toString();
}

function childArgs(options: GuiCommandOptions): string[] {
  const args = [fileURLToPath(import.meta.url), '--foreground'];
  if (options.config) args.push('--config', options.config);
  if (options.port) args.push('--port', options.port);
  if (options.open === false) args.push('--no-open');
  return args;
}

function sendStartupMessage(message: StartupMessage): void {
  if (typeof process.send === 'function') {
    process.send(message);
    if (process.connected) {
      process.disconnect?.();
    }
  }
}

async function launchBackground(options: GuiCommandOptions): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, childArgs(options), {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      windowsHide: true
    });

    const timer = setTimeout(() => {
      if (child.connected) {
        child.disconnect();
      }
      child.unref();
      resolve();
    }, 5000);
    timer.unref?.();

    child.once('error', error => {
      clearTimeout(timer);
      reject(error);
    });

    child.once('message', message => {
      clearTimeout(timer);
      const startup = message as Partial<StartupMessage>;
      if (startup.type === 'started' && startup.url && startup.opened === false) {
        console.log(chalk.yellow(`请在浏览器打开: ${startup.url}`));
      }
      if (child.connected) {
        child.disconnect();
      }
      child.unref();
      resolve();
    });
  });
}

async function runForeground(options: GuiCommandOptions): Promise<void> {
  let closing = false;
  const active = {
    server: undefined as Awaited<ReturnType<typeof startGuiServer>>['server'] | undefined
  };
  const closeServer = (): void => {
    if (closing) return;
    if (!active.server) return;
    closing = true;
    active.server.close(() => process.exit(0));
  };

  const lifecycleEnabled = options.open !== false;
  const started = await startGuiServer({
    configPath: options.config,
    port: parsePort(options.port),
    lifecycle: lifecycleEnabled
      ? {
          onShutdown: closeServer
        }
      : undefined
  });
  active.server = started.server;

  bindShutdown(started.server);

  const clientId = randomUUID();
  const url = withClientId(started.url, clientId);
  let opened = false;
  if (options.open !== false) {
    opened = await openGuiWindow(url);
  }

  sendStartupMessage({ type: 'started', url, opened });

  console.log(chalk.green(`minidict GUI 已启动: ${url}`));
  if (opened) {
    console.log(chalk.gray('已打开 Edge 小窗。关闭窗口后服务会自动退出。'));
  } else {
    console.log(chalk.yellow(`请在浏览器打开: ${url}`));
    console.log(chalk.gray('按 Ctrl+C 结束服务。'));
  }
}

const program = new Command();

program
  .name('dict-gui')
  .description('启动 minidict 极简查询小窗')
  .option('--config <path>', '指定配置文件路径')
  .option('--port <number>', '指定本地服务端口，默认随机端口')
  .option('--no-open', '只启动本地服务，不自动打开窗口')
  .option('--foreground', '前台运行，便于查看日志和调试')
  .action(async (options: GuiCommandOptions) => {
    if (!options.foreground && options.open !== false) {
      await launchBackground(options);
      return;
    }

    await runForeground(options);
  });

program.parseAsync(process.argv).catch(error => {
  console.error(chalk.red(`错误: ${error instanceof Error ? error.message : '未知错误'}`));
  process.exit(1);
});
