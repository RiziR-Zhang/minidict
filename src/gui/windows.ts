import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

function edgeCandidates(): string[] {
  const paths = [
    process.env.ProgramFiles
      ? path.join(process.env.ProgramFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
      : undefined,
    process.env['ProgramFiles(x86)']
      ? path.join(
          process.env['ProgramFiles(x86)'],
          'Microsoft',
          'Edge',
          'Application',
          'msedge.exe'
        )
      : undefined,
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
      : undefined,
    'msedge'
  ];

  return paths.filter((candidate): candidate is string => Boolean(candidate));
}

async function canAccess(command: string): Promise<boolean> {
  if (command === 'msedge') return true;

  try {
    await fs.access(command);
    return true;
  } catch {
    return false;
  }
}

function launch(command: string, url: string): Promise<boolean> {
  return new Promise(resolve => {
    const child = spawn(command, [`--app=${url}`, '--window-size=520,700'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });

    let settled = false;
    const finish = (opened: boolean): void => {
      if (settled) return;
      settled = true;
      if (opened) child.unref();
      resolve(opened);
    };

    child.once('error', () => finish(false));
    child.once('spawn', () => finish(true));
  });
}

export async function openGuiWindow(url: string): Promise<boolean> {
  if (process.platform !== 'win32') {
    return false;
  }

  for (const command of edgeCandidates()) {
    if (!(await canAccess(command))) continue;
    if (await launch(command, url)) {
      return true;
    }
  }

  return false;
}
