export function createPoller(deps) {
    let running = false;
    let executing = false;
    let timer;
    let generation = 0;
    async function execute() {
        executing = true;
        try {
            await deps.run();
        }
        catch (error) {
            deps.onError(error);
        }
        finally {
            executing = false;
        }
    }
    function schedule(epoch) {
        timer = deps.timers.setTimeout(() => {
            // A cancelled callback may already be queued, including across stop/start.
            if (!running || epoch !== generation)
                return;
            schedule(epoch);
            if (!executing)
                void execute();
        }, deps.intervalMs);
    }
    return {
        start() {
            if (running)
                return;
            running = true;
            schedule(++generation);
        },
        stop() {
            if (!running)
                return;
            running = false;
            deps.timers.clearTimeout(timer);
        },
        isRunning: () => running,
    };
}
//# sourceMappingURL=poller.js.map