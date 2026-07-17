export interface ClientLifecycleOptions {
  heartbeatTimeoutMs?: number;
  initialGraceMs?: number;
  shutdownDelayMs?: number;
  pruneIntervalMs?: number;
  now?: () => number;
  onShutdown: () => void;
}

const DEFAULT_HEARTBEAT_TIMEOUT_MS = 5000;
const DEFAULT_INITIAL_GRACE_MS = 15000;
const DEFAULT_SHUTDOWN_DELAY_MS = 100;
const DEFAULT_PRUNE_INTERVAL_MS = 1000;

export class ClientLifecycle {
  private readonly clients = new Map<string, number>();
  private readonly heartbeatTimeoutMs: number;
  private readonly initialGraceMs: number;
  private readonly shutdownDelayMs: number;
  private readonly now: () => number;
  private readonly onShutdown: () => void;
  private readonly startedAt: number;
  private hasSeenClient = false;
  private shutdownTimer: NodeJS.Timeout | undefined;
  private pruneTimer: NodeJS.Timeout | undefined;

  constructor(options: ClientLifecycleOptions) {
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? DEFAULT_HEARTBEAT_TIMEOUT_MS;
    this.initialGraceMs = options.initialGraceMs ?? DEFAULT_INITIAL_GRACE_MS;
    this.shutdownDelayMs = options.shutdownDelayMs ?? DEFAULT_SHUTDOWN_DELAY_MS;
    this.now = options.now ?? Date.now;
    this.onShutdown = options.onShutdown;
    this.startedAt = this.now();

    const pruneIntervalMs = options.pruneIntervalMs ?? DEFAULT_PRUNE_INTERVAL_MS;
    this.pruneTimer = setInterval(() => this.pruneExpired(), pruneIntervalMs);
    this.pruneTimer.unref?.();
  }

  heartbeat(clientId: string | null): boolean {
    if (!clientId) return false;

    this.hasSeenClient = true;
    this.clients.set(clientId, this.now());
    this.cancelShutdown();
    return true;
  }

  close(clientId: string | null): boolean {
    if (!clientId) return false;

    this.clients.delete(clientId);
    this.pruneExpired();
    return true;
  }

  pruneExpired(): void {
    const now = this.now();
    for (const [clientId, lastSeen] of this.clients) {
      if (now - lastSeen > this.heartbeatTimeoutMs) {
        this.clients.delete(clientId);
      }
    }

    if (this.clients.size > 0) return;
    if (!this.hasSeenClient && now - this.startedAt < this.initialGraceMs) return;

    this.scheduleShutdown();
  }

  activeClientCount(): number {
    this.pruneExpired();
    return this.clients.size;
  }

  stop(): void {
    this.cancelShutdown();
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = undefined;
    }
  }

  private scheduleShutdown(): void {
    if (this.shutdownTimer) return;

    if (this.shutdownDelayMs <= 0) {
      this.stop();
      this.onShutdown();
      return;
    }

    this.shutdownTimer = setTimeout(() => {
      this.stop();
      this.onShutdown();
    }, this.shutdownDelayMs);
    this.shutdownTimer.unref?.();
  }

  private cancelShutdown(): void {
    if (!this.shutdownTimer) return;
    clearTimeout(this.shutdownTimer);
    this.shutdownTimer = undefined;
  }
}
