export const settings = {
  llmProvider: {
    name: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    args: {
      url: 'https://api.anthropic.com/v1/messages',
      apiKey: process.env.ANTHROPIC_API_KEY ?? undefined,
      maxTokens: {
        audit: 3000,
        parse: 4000,
        export: 6000,
      },
    },
  },
}
