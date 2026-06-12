import { getClient } from './llm_providers/client.mjs'
import { buildConfigFromFlags } from './config.mjs' 

export class CssAuditor {
  constructor(client, config) {
    this.client = client
    this.config = config
  }

  static stripFences(raw) {
    return String(raw)
      .replace(/^```[\w-]*\n?/m, '')
      .replace(/^```\n?/m, '')
      .replace(/\n?```$/m, '')
      .trim()
  }

  async audit(prompt) {
    const text = await this.client.sendPrompt(prompt, this.config.maxTokens.audit)
    return JSON.parse(CssAuditor.stripFences(text))
  }

  async parse(prompt) {
    const text = await this.client.sendPrompt(prompt, this.config.maxTokens.parse)
    return JSON.parse(CssAuditor.stripFences(text))
  }

  async export(prompt) {
    const text = await this.client.sendPrompt(prompt, this.config.maxTokens.export)
    return CssAuditor.stripFences(text)
  }
}

export function buildCssAuditorFromConfig(config) {
  const client = getClient(config);
  return new CssAuditor(client, config.cssAuditor)
}

export function getCssAuditor(flags) {
  const config = buildConfigFromFlags(flags)
  return buildCssAuditorFromConfig(config)
}
