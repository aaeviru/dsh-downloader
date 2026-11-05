export interface PollerTimers {
  setTimeout(callback: () => void, ms: number): unknown
  clearTimeout(handle: unknown): void
}

export interface Poller {
  start(): void
  stop(): void
  isRunning(): boolean
}

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
