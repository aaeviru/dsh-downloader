import { describe, expect, it, vi } from 'vitest'
import { createPoller } from '../src/poller.ts'
import type { PollerTimers } from '../src/poller.ts'

function setup(run = vi.fn(async () => {})) {
  const scheduled: { callback: () => void; ms: number }[] = []
  const pending = new Set<unknown>()
  const timers: PollerTimers = {
    setTimeout(callback, ms) {
      const timer = { callback, ms }
      scheduled.push(timer)
      pending.add(timer)
      return timer
    },
    clearTimeout(handle) { pending.delete(handle) },
  }
  const onError = vi.fn()
  const poller = createPoller({ intervalMs: 100, run, timers, onError })
  function fire(index: number) {
    const timer = scheduled[index]!
    pending.delete(timer)
    timer.callback()
  }
  return { poller, run, onError, scheduled, pending, fire }
}

describe('createPoller', () => {
  it('waits the full interval, starts once, and schedules subsequent ticks', async () => {
    const state = setup()
    expect(state.poller.isRunning()).toBe(false)
    state.poller.start()
    state.poller.start()
    expect(state.poller.isRunning()).toBe(true)
    expect(state.scheduled).toHaveLength(1)
    expect(state.scheduled[0]!.ms).toBe(100)
    expect(state.run).not.toHaveBeenCalled()
    state.fire(0)
    expect(state.run).toHaveBeenCalledTimes(1)
    expect(state.scheduled[1]!.ms).toBe(100)
    await Promise.resolve(undefined)
    state.fire(1)
    expect(state.run).toHaveBeenCalledTimes(2)
    state.poller.stop()
  })

  it('skips ticks during a slow run and resumes after it settles', async () => {
    const gate = Promise.withResolvers<undefined>()
    const state = setup(vi.fn(() => gate.promise))
    state.poller.start()
    state.fire(0)
    state.fire(1)
    expect(state.run).toHaveBeenCalledTimes(1)
    expect(state.scheduled).toHaveLength(3)
    gate.resolve(undefined)
    await gate.promise
    state.fire(2)
    expect(state.run).toHaveBeenCalledTimes(2)
    state.poller.stop()
  })

  it('reports rejected runs and keeps scheduling', async () => {
    const error = new Error('run failed')
    const run = vi.fn(async () => {}).mockRejectedValueOnce(error)
    const state = setup(run)
    state.poller.start()
    state.fire(0)
    await Promise.resolve(undefined)
    expect(state.onError).toHaveBeenCalledExactlyOnceWith(error)
    state.fire(1)
    expect(run).toHaveBeenCalledTimes(2)
    state.poller.stop()
  })

  it('stops safely and ignores cancelled callbacks across restarts', () => {
    const state = setup()
    state.poller.stop()
    state.poller.start()
    state.poller.stop()
    state.poller.stop()
    expect(state.poller.isRunning()).toBe(false)
    expect(state.pending.size).toBe(0)
    state.fire(0)
    expect(state.scheduled).toHaveLength(1)
    state.poller.start()
    state.fire(0)
    expect(state.run).not.toHaveBeenCalled()
    state.fire(1)
    expect(state.run).toHaveBeenCalledOnce()
    state.poller.stop()
  })

  it('does not reschedule on completion after stopping during a run', async () => {
    const gate = Promise.withResolvers<undefined>()
    const state = setup(vi.fn(() => gate.promise))
    state.poller.start()
    state.fire(0)
    state.poller.stop()
    gate.resolve(undefined)
    await gate.promise
    expect(state.pending.size).toBe(0)
    expect(state.scheduled).toHaveLength(2)
    expect(state.poller.isRunning()).toBe(false)
  })
})
