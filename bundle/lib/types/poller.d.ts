export interface PollerTimers {
    setTimeout(callback: () => void, ms: number): unknown;
    clearTimeout(handle: unknown): void;
}
export interface Poller {
    start(): void;
    stop(): void;
    isRunning(): boolean;
}
export declare function createPoller(deps: {
    readonly intervalMs: number;
    readonly run: () => Promise<void>;
    readonly timers: PollerTimers;
    readonly onError: (error: unknown) => void;
}): Poller;
//# sourceMappingURL=poller.d.ts.map