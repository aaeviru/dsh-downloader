/** Timer provider whose handles remain valid for cancellation by the same provider. */
export interface PollerTimers {
  setTimeout(callback: () => void, ms: number): unknown
  clearTimeout(handle: unknown): void
}

/** Start and stop are idempotent; stopping cancels future ticks but neither cancels nor awaits an active run. */
export interface Poller {
  start(): void
  stop(): void
  isRunning(): boolean
}

/**
 * Create a delayed periodic runner that skips ticks while a previous run remains active.
 * @param deps - Interval, asynchronous work, timer provider, and an error callback that must not throw.
 * @returns An initially stopped poller; run failures reach onError without stopping future ticks.
 */
export function createPoller(deps: {
  readonly intervalMs: number
  readonly run: () => Promise<void>
  readonly timers: PollerTimers
  readonly onError: (error: unknown) => void
}): Poller {
  let running = false
  let executing = false
  let timer: unknown
  let generation = 0

  async function execute() {
    executing = true
    try {
      await deps.run()
    } catch (error) {
      deps.onError(error)
    } finally {
      executing = false
    }
  }

  function schedule(epoch: number) {
    timer = deps.timers.setTimeout(() => {
      // A cancelled callback may already be queued, including across stop/start.
      if (!running || epoch !== generation) return
      schedule(epoch)
      if (!executing) void execute()
    }, deps.intervalMs)
  }

  return {
    start() {
      if (running) return
      running = true
      schedule(++generation)
    },
    stop() {
      if (!running) return
      running = false
      deps.timers.clearTimeout(timer)
    },
    isRunning: () => running,
  }
}
