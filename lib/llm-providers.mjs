
export class LLMProvider {
  async audit(prompt) {
    throw new Error('Not implemented')
  }

  async parse(prompt) {
    throw new Error('Not implemented')
  }

  async export(prompt) {
    throw new Error('Not implemented')
  }
}

export class AnthropicProvider extends LLMProvider {
  constructor(name, model, args) {
    super()
    this.url = 'https://api.anthropic.com/v1/messages'
    this.name = name
    this.model = model
    this.apiKey = args.apiKey
    this.maxTokens = args.maxTokens
  }

  async audit(prompt) {
    return this._call(prompt.content, prompt.system, 'audit')
  }

  async parse(prompt) {
    return this._call(prompt.content, prompt.system, 'parse')
  }

  async export(prompt) {
    return this._call(prompt.content, prompt.system, 'export')
  }

  async _call(content, system, maxTokensKey) {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required')
    }
    const maxTokens = this.maxTokens[maxTokensKey]
    const body = {
      model: this.model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content }],
    }
    if (system) body.system = system
    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      const msg = data?.error?.message || `Anthropic API error (${res.status})`
      throw new Error(msg)
    }
    const block = (data.content || []).find((b) => b && b.type === 'text')
    return block ? block.text : ''
  }
}

export function getLlmProvider(settings, flags) {
  const { name, model, args } = settings.llmProvider
  if (name === 'anthropic') {
    const apiKey = typeof flags?.['api-key'] === 'string' ? flags['api-key'] : args.apiKey
    return new AnthropicProvider(name, model, { ...args, apiKey })
  }
  throw new Error(`Unknown LLM provider: ${name}`)
}
