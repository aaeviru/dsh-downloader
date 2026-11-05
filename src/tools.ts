import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import type { DownloadService } from './service.ts'

/** Build the three model tools over a service instance. */
export function createDownloadTools(service: DownloadService, options: {
  readonly clock: () => Date
}): readonly ToolDefinition[] {
  return [
    defineTool({
      name: 'download_search',
      description: 'Search download candidates by title.',
      parameters: { keyword: { type: 'string', required: true } },
      output: {
        schema: {
          type: 'object', additionalProperties: false,
          properties: {
            candidates: {
              type: 'array', required: true,
              items: {
                type: 'object', additionalProperties: false,
                properties: {
                  id: { type: 'string', required: true },
                  title: { type: 'string', required: true },
                  submittable: { type: 'boolean', required: true },
                  sizeBytes: { oneOf: [{ type: 'number' }, { type: 'null' }], required: true },
                  infoHash: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
                },
              },
            },
          },
        },
        render: (_args, value) => [{ type: 'text', text: `Found ${value.candidates.length} candidates.` }],
      },
      async execute({ keyword }) {
        const candidates = await service.search(keyword, 1)
        return { candidates: candidates.map(({ id, title, submittable, sizeBytes, infoHash }) => ({
          id, title, submittable, sizeBytes, infoHash,
        })) }
      },
    }),
    defineTool({
      name: 'download_add',
      description: 'Submit a cached download candidate.',
      parameters: { candidateId: { type: 'string', required: true } },
      output: {
        schema: {
          type: 'object', additionalProperties: false,
          properties: {
            candidateId: { type: 'string', required: true },
            outcome: { type: 'string', required: true, enum: ['added', 'alreadySubmitted', 'alreadySubmitting', 'unsubmittable'] },
            gid: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
            triggeredAt: { type: 'string', required: true },
            callId: { type: 'string', required: true },
          },
        },
        render: (_args, value) => [{ type: 'text', text: `Download submission: ${value.outcome}.` }],
      },
      async execute({ candidateId }, exec) {
        const triggeredAt = options.clock().toISOString()
        const result = await service.add(candidateId)
        if ('gid' in result) return { candidateId, outcome: 'added' as const, gid: result.gid, triggeredAt, callId: exec.callId }
        if ('alreadySubmitted' in result) {
          return { candidateId, outcome: 'alreadySubmitted' as const, gid: result.alreadySubmitted, triggeredAt, callId: exec.callId }
        }
        return {
          candidateId,
          outcome: 'alreadySubmitting' in result ? 'alreadySubmitting' as const : 'unsubmittable' as const,
          gid: null,
          triggeredAt,
          callId: exec.callId,
        }
      },
    }),
    defineTool({
      name: 'download_status',
      description: 'Get the status of a download.',
      parameters: { gid: { type: 'string', required: true } },
      output: {
        schema: {
          type: 'object', additionalProperties: false,
          properties: {
            gid: { type: 'string', required: true },
            state: { type: 'string', required: true },
          },
        },
        render: (_args, value) => [{ type: 'text', text: `Download status: ${value.state}.` }],
      },
      async execute({ gid }) {
        const { state } = await service.status(gid)
        return { gid, state }
      },
    }),
  ]
}
