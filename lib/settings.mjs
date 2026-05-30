export const settings = {
  llmProvider: {
    name: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    apiKey: process.env.ANTHROPIC_API_KEY ?? undefined,
    args: {
      maxTokens: {
        audit: 3000,
        parse: 4000,
        export: 6000,
      },
    },
  },
}
