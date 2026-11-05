import { describe, expect, it, vi } from 'vitest'
import { ToolArgsError } from '@deepseek-ai/dsh-tools'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import type { Candidate } from '../src/candidate.ts'
import type { SubmitResult } from '../src/coordinator.ts'
import { UnknownCandidateError } from '../src/service.ts'
import type { DownloadService } from '../src/service.ts'
import { createDownloadTools } from '../src/tools.ts'

const triggeredAt = '2026-11-05T01:02:03.000Z'
const exec: ToolRunContext = {
  callId: 'call' as ToolRunContext['callId'],
  rootCallId: 'call' as ToolRunContext['rootCallId'],
  token: Symbol('execution') as ToolRunContext['token'],
  name: 'test', arguments: {}, signal: new AbortController().signal,
  deferContext: vi.fn(), concludeTurn: vi.fn(),
}

function setup() {
  const entry: Candidate = {
    id: 'candidate', title: 'Example', sourceId: 'source', publishedAt: null,
    infoHash: null, sizeBytes: null, submittable: true, dedupeKey: 'key',
    sourceUrl: 'https://example.test/?token=secret', torrentUrl: null, magnetUri: null,
  }
  const service = {
    search: vi.fn<DownloadService['search']>().mockResolvedValue([entry]),
    listCandidates: vi.fn<DownloadService['listCandidates']>().mockResolvedValue([]),
    add: vi.fn<DownloadService['add']>().mockResolvedValue({ gid: 'gid' }),
    status: vi.fn<DownloadService['status']>().mockResolvedValue({ state: 'active' }),
    refresh: vi.fn<DownloadService['refresh']>(),
  } satisfies DownloadService
  const tools = createDownloadTools(service, { clock: () => new Date(triggeredAt) })
  function tool(name: string) {
    return tools.find(tool => tool.name === name)!
  }
  return { service, tools, tool }
}

describe('download tools', () => {
  it('B7/B8 executes valid search, projects only public fields and renders the count', async () => {
    const { service, tool, tools } = setup()
    expect(tools.map(tool => tool.name)).toEqual(['download_search', 'download_add', 'download_status'])
    const search = tool('download_search')
    const args = { keyword: 'Example' }
    const expected = { candidates: [{ id: 'candidate', title: 'Example', submittable: true, sizeBytes: null, infoHash: null }] }
    const result = await search.execute(args, exec)
    expect(result).toEqual(expected)
    expect(service.search).toHaveBeenCalledWith('Example')
    expect(search.output.render(args, expected)).toEqual([{ type: 'text', text: 'Found 1 candidates.' }])
    expect(JSON.stringify(result)).not.toContain('secret')
  })

  const outcomes: [SubmitResult, string, string | null][] = [
    [{ gid: 'gid' }, 'added', 'gid'],
    [{ alreadySubmitted: 'existing' }, 'alreadySubmitted', 'existing'],
    [{ alreadySubmitting: true }, 'alreadySubmitting', null],
    [{ unsubmittable: true }, 'unsubmittable', null],
  ]
  it.each(outcomes)('B7/B8 maps %j to a traceable JSON result', async (result, outcome, gid) => {
    const { service, tool } = setup()
    vi.mocked(service.add).mockResolvedValue(result)
    const add = tool('download_add')
    const args = { candidateId: 'candidate' }
    const expected = { candidateId: 'candidate', outcome, gid, triggeredAt }
    const output = await add.execute(args, exec)
    expect(output).toEqual(expected)
    expect(JSON.parse(JSON.stringify(output))).toEqual(output)
    expect(service.add).toHaveBeenCalledWith('candidate')
    expect(add.output.render(args, expected)).toEqual([{ type: 'text', text: `Download submission: ${outcome}.` }])
  })

  it('B7 executes valid status and renders a text block', async () => {
    const { service, tool } = setup()
    const status = tool('download_status')
    const args = { gid: 'gid' }
    const expected = { gid: 'gid', state: 'active' }
    expect(await status.execute(args, exec)).toEqual(expected)
    expect(service.status).toHaveBeenCalledWith('gid')
    expect(status.output.render(args, expected)).toEqual([{ type: 'text', text: 'Download status: active.' }])
  })

  it.each([
    ['download_search', 'keyword'], ['download_add', 'candidateId'], ['download_status', 'gid'],
  ])('B7 rejects missing and non-string arguments for %s', async (name, parameter) => {
    const { service, tool } = setup()
    await expect(tool(name).execute({}, exec)).rejects.toBeInstanceOf(ToolArgsError)
    await expect(tool(name).execute({ [parameter]: 42 }, exec)).rejects.toBeInstanceOf(ToolArgsError)
    expect(service.search).not.toHaveBeenCalled()
    expect(service.add).not.toHaveBeenCalled()
    expect(service.status).not.toHaveBeenCalled()
  })

  it('B9 propagates UnknownCandidateError unchanged', async () => {
    const { service, tool } = setup()
    const error = new UnknownCandidateError('missing')
    vi.mocked(service.add).mockRejectedValue(error)
    await expect(tool('download_add').execute({ candidateId: 'missing' }, exec)).rejects.toBe(error)
  })
})
