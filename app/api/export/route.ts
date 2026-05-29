import { NextRequest, NextResponse } from 'next/server'
import type { DSTokens, ExportTarget } from '@/lib/types'
import { buildExportPrompt, stripFences } from '@/lib/prompts.mjs'
import { getLlmProvider } from '@/lib/llm-providers.mjs'
import { settings } from '@/lib/settings.mjs'

export async function POST(req: NextRequest) {
  const { tokens, target }: { tokens: DSTokens; target: ExportTarget } = await req.json()

  const prompt = buildExportPrompt(tokens, target)
  if (!prompt) {
    return NextResponse.json({ error: 'Unknown target' }, { status: 400 })
  }

  try {
    const provider = getLlmProvider(settings)
    const text = await provider.export(prompt)
    return NextResponse.json({ code: stripFences(text) })
  } catch (err) {
    console.error('Export error:', err)
    return NextResponse.json({ error: 'Error generating export' }, { status: 500 })
  }
}
