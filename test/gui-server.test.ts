import { request } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Config } from '../src/types.js';
import { createGuiServer, GUI_HOST } from '../src/gui/server.js';

function baseConfig(overrides: Partial<Config> = {}): Config {
  return {
    plugins: ['bing', 'youdao'],
    showPhonetic: true,
    showExamples: false,
    maxExamples: 3,
    timeout: 10000,
    cache: { enabled: false, ttl: 0 },
    externalPlugins: [],
    ...overrides
  };
}

function listen(server: Server): Promise<string> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, GUI_HOST, () => {
      const address = server.address() as AddressInfo;
      resolve(`http://${GUI_HOST}:${address.port}`);
    });
  });
}

function close(server: Server): Promise<void> {
  return new Promise(resolve => {
    server.close(() => resolve());
  });
}

function requestText(
  url: string,
  method = 'GET'
): Promise<{ status: number; body: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const req = request(url, { method }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 0,
          body,
          contentType: String(res.headers['content-type'] ?? '')
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function get(url: string): Promise<{ status: number; body: string; contentType: string }> {
  return requestText(url);
}

function post(url: string): Promise<{ status: number; body: string; contentType: string }> {
  return requestText(url, 'POST');
}

describe('gui server', () => {
  let server: Server;
  let origin: string;

  beforeEach(async () => {
    server = createGuiServer({
      config: baseConfig(),
      translateFn: async () => []
    });
    origin = await listen(server);
  });

  afterEach(async () => {
    await close(server);
  });

  it('returns GUI state', async () => {
    const response = await get(`${origin}/api/state`);
    const payload = JSON.parse(response.body);

    expect(response.status).toBe(200);
    expect(response.contentType).toContain('application/json');
    expect(payload.plugins).toEqual(expect.arrayContaining(['bing', 'youdao', 'google']));
    expect(payload.defaults.plugins).toEqual(['bing', 'youdao']);
  });

  it('rejects empty translate queries', async () => {
    const response = await get(`${origin}/api/translate?word=`);
    const payload = JSON.parse(response.body);

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/请输入/);
  });

  it('returns 404 for unknown paths', async () => {
    const response = await get(`${origin}/missing`);
    const payload = JSON.parse(response.body);

    expect(response.status).toBe(404);
    expect(payload.error).toBe('Not found');
  });

  it('accepts lifecycle heartbeat and close requests', async () => {
    let shutdowns = 0;
    await close(server);
    server = createGuiServer({
      config: baseConfig(),
      translateFn: async () => [],
      lifecycle: {
        initialGraceMs: 10000,
        shutdownDelayMs: 0,
        onShutdown: () => {
          shutdowns += 1;
        }
      }
    });
    origin = await listen(server);

    expect((await post(`${origin}/api/heartbeat?clientId=a`)).status).toBe(204);
    expect(shutdowns).toBe(0);
    expect((await post(`${origin}/api/close?clientId=a`)).status).toBe(204);
    expect(shutdowns).toBe(1);
  });

  it('calls the lifecycle shutdown callback after heartbeat timeout', async () => {
    await close(server);
    const shutdown = new Promise<void>(resolve => {
      server = createGuiServer({
        config: baseConfig(),
        translateFn: async () => [],
        lifecycle: {
          heartbeatTimeoutMs: 5,
          initialGraceMs: 10000,
          pruneIntervalMs: 5,
          shutdownDelayMs: 0,
          onShutdown: resolve
        }
      });
    });
    origin = await listen(server);

    expect((await post(`${origin}/api/heartbeat?clientId=stale`)).status).toBe(204);
    await expect(shutdown).resolves.toBeUndefined();
  });
});
