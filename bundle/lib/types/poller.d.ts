/** Timer provider whose handles remain valid for cancellation by the same provider. */
export interface PollerTimers {
    setTimeout(callback: () => void, ms: number): unknown;
    clearTimeout(handle: unknown): void;
}
/** Start and stop are idempotent; stopping cancels future ticks but neither cancels nor awaits an active run. */
export interface Poller {
    start(): void;
    stop(): void;
    isRunning(): boolean;
}
/**
 * Create a delayed periodic runner that skips ticks while a previous run remains active.
 * @param deps - Interval, asynchronous work, timer provider, and an error callback that must not throw.
 * @returns An initially stopped poller; run failures reach onError without stopping future ticks.
 */
export declare function createPoller(deps: {
    readonly intervalMs: number;
    readonly run: () => Promise<void>;
    readonly timers: PollerTimers;
    readonly onError: (error: unknown) => void;
}): Poller;
//# sourceMappingURL=poller.d.ts.map