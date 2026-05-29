import { describe, it, expect, vi } from 'vitest'
import { AnthropicProvider, getLlmProvider } from '../llm-providers.mjs'
import { setupFixture, saveRecordedFixture } from './helpers/anthropic-recorder.mjs'
import { buildAuditPrompt } from '../prompts.mjs'

const RECORD_MODE = process.env.RECORD_FIXTURES === '1'

const DEFAULT_SETTINGS = {
  llmProvider: {
    name: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    args: {
      apiKey: process.env.ANTHROPIC_API_KEY ?? undefined,
      maxTokens: {
        audit: 3000,
        parse: 4000,
        export: 6000,
      },
    },
  },
}

describe('AnthropicProvider', () => {
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

      const provider = new AnthropicProvider(
        DEFAULT_SETTINGS.llmProvider.name,
        DEFAULT_SETTINGS.llmProvider.model,
        DEFAULT_SETTINGS.llmProvider.args
      )

      let result
      try {
        result = await provider.audit(prompt, null)
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

      const provider = new AnthropicProvider(
        DEFAULT_SETTINGS.llmProvider.name,
        DEFAULT_SETTINGS.llmProvider.model,
        { ...DEFAULT_SETTINGS.llmProvider.args, apiKey: 'fake-key' }
      )

      const result = await provider.audit(prompt, null)

      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)

      fetchSpy.mockRestore()
    }
  })

  it('throws when apiKey is missing', async () => {
    const provider = new AnthropicProvider(
      DEFAULT_SETTINGS.llmProvider.name,
      DEFAULT_SETTINGS.llmProvider.model,
      { ...DEFAULT_SETTINGS.llmProvider.args, apiKey: undefined }
    )

    await expect(provider.audit('test', null)).rejects.toThrow(
      'ANTHROPIC_API_KEY is required'
    )
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

      const provider = new AnthropicProvider(
        DEFAULT_SETTINGS.llmProvider.name,
        DEFAULT_SETTINGS.llmProvider.model,
        { ...DEFAULT_SETTINGS.llmProvider.args, apiKey: 'sk-test' }
      )

      await expect(provider.audit('test', null)).rejects.toThrow(message)

      fetchSpy.mockRestore()
    }
  )

  it('throws generic error when response message is missing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    })

    const provider = new AnthropicProvider(
      DEFAULT_SETTINGS.llmProvider.name,
      DEFAULT_SETTINGS.llmProvider.model,
      { ...DEFAULT_SETTINGS.llmProvider.args, apiKey: 'sk-test' }
    )

    await expect(provider.audit('test', null)).rejects.toThrow(
      'Anthropic API error (500)'
    )

    fetchSpy.mockRestore()
  })
})

describe('getLlmProvider', () => {
  it('returns AnthropicProvider for anthropic name', () => {
    const provider = getLlmProvider(DEFAULT_SETTINGS)
    expect(provider).toBeInstanceOf(AnthropicProvider)
    expect(provider.name).toBe('anthropic')
    expect(provider.model).toBe('claude-sonnet-4-20250514')
  })

  it('prefers apiKey from flags over settings', () => {
    const settings = DEFAULT_SETTINGS
    const flags = { 'api-key': 'flag-key' }
    const provider = getLlmProvider(settings, flags)
    expect(provider.apiKey).toBe('flag-key')
  })

  it('uses settings apiKey when no flag override', () => {
    const settings = {
      llmProvider: {
        name: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        args: {
          apiKey: 'settings-key',
          maxTokens: { audit: 3000, parse: 4000, export: 6000 },
        },
      },
    }
    const provider = getLlmProvider(settings)
    expect(provider.apiKey).toBe('settings-key')
  })

  it('throws for unknown provider name', () => {
    const settings = {
      llmProvider: {
        name: 'unknown-provider',
        model: 'some-model',
        args: { apiKey: 'key', maxTokens: { audit: 3000, parse: 4000, export: 6000 } },
      },
    }
    expect(() => getLlmProvider(settings)).toThrow(
      'Unknown LLM provider: unknown-provider'
    )
  })
})
