import { describe, it, expect, vi } from 'vitest'
import {
  callAnthropic,
  buildAuditPrompt,
  AUDIT_SYSTEM_PROMPT,
} from '../prompts.mjs'
import { setupFixture, saveRecordedFixture } from './helpers/anthropic-recorder.mjs'

const RECORD_MODE = process.env.RECORD_FIXTURES === '1'

describe('callAnthropic', () => {
  it('returns text on successful 200 response', async () => {
    const fixtureName = 'audit-200-simple-css'
    const css = 'body { color: #ff0000; font-size: 16px; }'
    const prompt = buildAuditPrompt(css)

    if (RECORD_MODE) {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        throw new Error(
          'ANTHROPIC_API_KEY is required when RECORD_FIXTURES=1'
        )
      }

      const realFetch = globalThis.fetch.bind(globalThis)
      let captured

      globalThis.fetch = async (...args) => {
        const response = await realFetch(...args)
        const body = await response.clone().json()
        captured = { status: response.status, ok: response.ok, body }
        return response
      }

      let result
      try {
        result = await callAnthropic({
          apiKey,
          prompt,
          system: AUDIT_SYSTEM_PROMPT,
          maxTokens: 3000,
        })
      } finally {
        globalThis.fetch = realFetch
      }

      if (!captured) {
        throw new Error('No response captured. Did the API call complete?')
      }

      await saveRecordedFixture(fixtureName, captured)

      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    } else {
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      await setupFixture(fixtureName, fetchSpy)

      const result = await callAnthropic({
        apiKey: 'fake-key',
        prompt,
        system: AUDIT_SYSTEM_PROMPT,
        maxTokens: 3000,
      })

      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)

      fetchSpy.mockRestore()
    }
  })

  it('throws when apiKey is missing', async () => {
    await expect(
      callAnthropic({ apiKey: undefined, prompt: 'test' })
    ).rejects.toThrow('ANTHROPIC_API_KEY is required')
  })

  it.each([
    [400, 'invalid_request_error', 'Bad request'],
    [401, 'authentication_error', 'Invalid key'],
    [402, 'billing_error', 'Payment issue'],
    [403, 'permission_error', 'No permission'],
    [404, 'not_found_error', 'Resource not found'],
    [413, 'request_too_large', 'Request too large'],
    [429, 'rate_limit_error', 'Rate limited'],
    [500, 'api_error', 'Internal error'],
    [504, 'timeout_error', 'Request timeout'],
    [529, 'overloaded_error', 'API overloaded'],
  ])(
    'throws on %i %s',
    async (status, type, message) => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status,
        json: async () => ({
          error: { type, message },
        }),
      })

      await expect(
        callAnthropic({ apiKey: 'sk-test', prompt: 'test' })
      ).rejects.toThrow(message)

      fetchSpy.mockRestore()
    }
  )

  it('throws generic error when response message is missing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    })

    await expect(
      callAnthropic({ apiKey: 'sk-test', prompt: 'test' })
    ).rejects.toThrow('Anthropic API error (500)')

    fetchSpy.mockRestore()
  })
})
