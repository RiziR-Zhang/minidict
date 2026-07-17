import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Config, TranslationResult } from '../types.js';
import { loadConfig } from '../config.js';
import { translate } from '../translate.js';
import { APP_CSS, APP_HTML, APP_JS } from './assets.js';
import { ClientLifecycle, type ClientLifecycleOptions } from './lifecycle.js';
import {
  buildTranslateConfig,
  createGuiState,
  parseTranslateRequest,
  serializeSseEvent
} from './state.js';

export const GUI_HOST = '127.0.0.1';

export type TranslateFn = (
  word: string,
  config: Config,
  onResult?: (result: TranslationResult) => void
) => Promise<TranslationResult[]>;

export interface CreateGuiServerOptions {
  config: Config;
  translateFn?: TranslateFn;
  lifecycle?: ClientLifecycleOptions;
}

export interface StartGuiServerOptions {
  config?: Config;
  configPath?: string;
  port?: number;
  translateFn?: TranslateFn;
  lifecycle?: ClientLifecycleOptions;
}

export interface StartedGuiServer {
  server: Server;
  url: string;
  port: number;
}

function sendText(
  res: ServerResponse,
  statusCode: number,
  contentType: string,
  body: string
): void {
  res.writeHead(statusCode, {
    'content-type': `${contentType}; charset=utf-8`,
    'cache-control': 'no-store'
  });
  res.end(body);
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  sendText(res, statusCode, 'application/json', JSON.stringify(payload));
}

function methodAllowed(req: IncomingMessage, res: ServerResponse, method: 'GET' | 'POST'): boolean {
  if (req.method === method) return true;
  res.writeHead(405, { allow: method });
  res.end();
  return false;
}

async function handleTranslate(
  requestUrl: URL,
  res: ServerResponse,
  config: Config,
  translateFn: TranslateFn
): Promise<void> {
  const request = parseTranslateRequest(requestUrl.searchParams, config);

  if (!request.word) {
    sendJson(res, 400, { error: '请输入要查询的内容' });
    return;
  }

  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no'
  });

  let closed = false;
  res.on('close', () => {
    closed = true;
  });

  const writeEvent = (event: string, payload: unknown): void => {
    if (!closed) {
      res.write(serializeSseEvent(event, payload));
    }
  };

  writeEvent('start', { word: request.word, plugins: request.plugins });

  try {
    const translateConfig = buildTranslateConfig(config, request);
    const results = await translateFn(request.word, translateConfig, result => {
      writeEvent('result', result);
    });
    writeEvent('done', { count: results.length });
  } catch (error) {
    writeEvent('failure', {
      message: error instanceof Error ? error.message : '未知错误'
    });
  } finally {
    if (!closed) {
      res.end();
    }
  }
}

export function createGuiServer(options: CreateGuiServerOptions): Server {
  const translateFn = options.translateFn ?? translate;
  const lifecycle = options.lifecycle ? new ClientLifecycle(options.lifecycle) : undefined;

  const server = createServer((req, res) => {
    void (async () => {
      const requestUrl = new URL(req.url ?? '/', `http://${GUI_HOST}`);
      switch (requestUrl.pathname) {
        case '/':
          if (!methodAllowed(req, res, 'GET')) return;
          sendText(res, 200, 'text/html', APP_HTML);
          break;
        case '/assets/app.css':
          if (!methodAllowed(req, res, 'GET')) return;
          sendText(res, 200, 'text/css', APP_CSS);
          break;
        case '/assets/app.js':
          if (!methodAllowed(req, res, 'GET')) return;
          sendText(res, 200, 'text/javascript', APP_JS);
          break;
        case '/api/state':
          if (!methodAllowed(req, res, 'GET')) return;
          sendJson(res, 200, createGuiState(options.config));
          break;
        case '/api/translate':
          if (!methodAllowed(req, res, 'GET')) return;
          await handleTranslate(requestUrl, res, options.config, translateFn);
          break;
        case '/api/heartbeat':
          if (!methodAllowed(req, res, 'POST')) return;
          if (!lifecycle?.heartbeat(requestUrl.searchParams.get('clientId'))) {
            sendJson(res, 400, { error: 'clientId is required' });
            break;
          }
          res.writeHead(204, { 'cache-control': 'no-store' });
          res.end();
          break;
        case '/api/close':
          if (!methodAllowed(req, res, 'POST')) return;
          if (!lifecycle?.close(requestUrl.searchParams.get('clientId'))) {
            sendJson(res, 400, { error: 'clientId is required' });
            break;
          }
          res.writeHead(204, { 'cache-control': 'no-store' });
          res.end();
          break;
        default:
          sendJson(res, 404, { error: 'Not found' });
          break;
      }
    })().catch(error => {
      if (!res.headersSent) {
        sendJson(res, 500, {
          error: error instanceof Error ? error.message : 'Internal server error'
        });
      } else {
        res.end();
      }
    });
  });

  server.once('close', () => lifecycle?.stop());
  return server;
}

function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error): void => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = (): void => {
      server.off('error', onError);
      resolve();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, GUI_HOST);
  });
}

export async function startGuiServer(
  options: StartGuiServerOptions = {}
): Promise<StartedGuiServer> {
  const config = options.config ?? (await loadConfig(options.configPath));
  const server = createGuiServer({
    config,
    translateFn: options.translateFn,
    lifecycle: options.lifecycle
  });
  await listen(server, options.port ?? 0);

  const address = server.address() as AddressInfo;
  return {
    server,
    port: address.port,
    url: `http://${GUI_HOST}:${address.port}/`
  };
}
