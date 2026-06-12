import { AnthropicLlmClient } from './anthropic/client-impl.mjs'
import { OllamaLlmClient} from './ollama/client-impl.mjs'

export function getClient(config) {
  switch (config.name) {
    case 'anthropic':
      return new AnthropicLlmClient({ apiKey: config.apiKey, modelName: config.model, version: config.version, url: config.url });
    case 'ollama':
      return new OllamaLlmClient({ apiKey: config.apiKey, modelName: config.model, url: config.url })
    default:
      throw new Error(`Unknown client : ${config.name}`);
  }
}