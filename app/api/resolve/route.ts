import { NextRequest, NextResponse } from 'next/server'
import type { UserDecisions } from '@/lib/types'
import { buildResolvePrompt, stripFences } from '@/lib/prompts.mjs'
import { getLlmProvider } from '@/lib/llm-providers.mjs'
import { settings } from '@/lib/settings.mjs'

export async function POST(req: NextRequest) {
  const { css, decisions }: { css: string; decisions: UserDecisions } = await req.json()

  if (!css || !decisions) {
    return NextResponse.json({ error: 'CSS and decisions required' }, { status: 400 })
  }

  try {
    const provider = getLlmProvider(settings)
    const text = await provider.parse(buildResolvePrompt(css, decisions))
    const tokens = JSON.parse(stripFences(text))
    return NextResponse.json({ tokens })
  } catch (err) {
    console.error('Resolve error:', err)
    return NextResponse.json({ error: 'Error generating tokens' }, { status: 500 })
  }
}
