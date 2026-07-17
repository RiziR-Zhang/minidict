import { ClientLifecycle } from '../src/gui/lifecycle.js';

describe('gui client lifecycle', () => {
  it('registers and refreshes heartbeats', () => {
    let now = 0;
    let shutdowns = 0;
    const lifecycle = new ClientLifecycle({
      now: () => now,
      heartbeatTimeoutMs: 5,
      initialGraceMs: 0,
      shutdownDelayMs: 0,
      onShutdown: () => {
        shutdowns += 1;
      }
    });

    expect(lifecycle.heartbeat('a')).toBe(true);
    now = 4;
    expect(lifecycle.heartbeat('a')).toBe(true);
    now = 9;

    expect(lifecycle.activeClientCount()).toBe(1);
    expect(shutdowns).toBe(0);

    lifecycle.stop();
  });

  it('shuts down only after the last client closes', () => {
    let shutdowns = 0;
    const lifecycle = new ClientLifecycle({
      heartbeatTimeoutMs: 5,
      initialGraceMs: 0,
      shutdownDelayMs: 0,
      onShutdown: () => {
        shutdowns += 1;
      }
    });

    lifecycle.heartbeat('a');
    lifecycle.heartbeat('b');
    lifecycle.close('a');

    expect(shutdowns).toBe(0);

    lifecycle.close('b');

    expect(shutdowns).toBe(1);
  });

  it('shuts down when all clients expire after the initial grace window', () => {
    let now = 0;
    let shutdowns = 0;
    const lifecycle = new ClientLifecycle({
      now: () => now,
      heartbeatTimeoutMs: 5,
      initialGraceMs: 5,
      shutdownDelayMs: 0,
      onShutdown: () => {
        shutdowns += 1;
      }
    });

    lifecycle.pruneExpired();
    expect(shutdowns).toBe(0);

    now = 6;
    lifecycle.pruneExpired();

    expect(shutdowns).toBe(1);
  });
});
