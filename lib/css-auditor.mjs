import { AnthropicLlmClient } from './llm_clients/anthropic.mjs'
import { settings } from './settings.mjs' 

export class CssAuditor {
  constructor(client, maxTokens) {
    this.client = client
    this.maxTokens = maxTokens
  }

  static stripFences(raw) {
    return String(raw)
      .replace(/^```[\w-]*\n?/m, '')
      .replace(/^```\n?/m, '')
      .replace(/\n?```$/m, '')
      .trim()
  }

  async audit(prompt) {
    const text = await this.client.sendPrompt(prompt, this.maxTokens.audit)
    return JSON.parse(CssAuditor.stripFences(text))
  }

  async parse(prompt) {
    const text = await this.client.sendPrompt(prompt, this.maxTokens.parse)
    return JSON.parse(CssAuditor.stripFences(text))
  }

  async export(prompt) {
    const text = await this.client.sendPrompt(prompt, this.maxTokens.export)
    return CssAuditor.stripFences(text)
  }
}

export function buildCssAuditorFromSettingsAndFlags(settings, flags) {
  const { name, model, args } = settings.llmProvider
  if (name === 'anthropic') {
    const apiKey =
      typeof flags?.['api-key'] === 'string' ? flags['api-key'] : settings.llmProvider.apiKey
    const client = new AnthropicLlmClient({ apiKey, model })
    return new CssAuditor(client, args.maxTokens)
  }
  throw new Error(`Unknown LLM provider: ${name}`)
}

export function getCssAuditor(flags) {
  return buildCssAuditorFromSettingsAndFlags(settings, flags)
}
