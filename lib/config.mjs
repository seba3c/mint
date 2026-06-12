
const envSettings = {
  llmProvider: {
    name: process.env.LLM_PROVIDER_NAME ?? 'anthropic',
    url: process.env.LLM_API_URL,
    model: process.env.LLM_MODEL_NAME,
    apiKey: process.env.API_KEY,
  },
  cssAuditor: {
    maxTokens: {
      audit: process.env.CCS_MAX_TOKENS_AUDIT,
      parse: process.env.CCS_MAX_TOKENS_PARSE,
      export: process.env.CCS_MAX_TOKENS_EXPORT,
    }
  },
}

const configs = {
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    model: envSettings.llmProvider.model || 'claude-sonnet-4-20250514',
    apiKey: envSettings.llmProvider.apiKey ?? undefined,
    version: '2023-06-01',
    cssAuditor: {
      maxTokens: {
          audit: envSettings.cssAuditor.maxTokens.audit || 3000,
          parse: envSettings.cssAuditor.maxTokens.parse || 4000,
          export: envSettings.cssAuditor.maxTokens.export || 6000,
      },
    }
  },
  ollama: {
    url: envSettings.llmProvider.url || 'http://localhost:11434/api/chat',
    model: envSettings.llmProvider.model || 'gemma4',
    apiKey: envSettings.llmProvider.apiKey ?? undefined,
    cssAuditor: {
      maxTokens: {
          audit: envSettings.cssAuditor.maxTokens.audit || 10000,
          parse: envSettings.cssAuditor.maxTokens.parse || 10000,
          export: envSettings.cssAuditor.maxTokens.export || 10000,
      },
    }
  }
}


function buildConfigFromEnvAndFlags(env, flags) {
  const provider = typeof flags?.['provider'] === 'string' ? flags['provider'] : env.llmProvider.name
  let config = {...getDefaultConfig(provider)}
  config.apiKey = typeof flags?.['api-key'] === 'string' ? flags['api-key'] : config.apiKey 
  return {...config, name: provider}
}

function getDefaultConfig(providerName) {
  const config = configs[providerName]
  if (!config) 
    throw new Error(`Unsupported LLM provider: ${providerName}`)
  return config
}

export function buildConfigFromFlags(flags) {
  return buildConfigFromEnvAndFlags(envSettings, flags);
}
