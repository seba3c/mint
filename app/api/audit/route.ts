import { NextRequest, NextResponse } from 'next/server'
import { buildAuditPrompt, stripFences } from '@/lib/prompts.mjs'
import { getLlmProvider } from '@/lib/llm-providers.mjs'
import { settings } from '@/lib/settings.mjs'

export async function POST(req: NextRequest) {
  const { css } = await req.json()

  if (!css || typeof css !== 'string') {
    return NextResponse.json({ error: 'CSS required' }, { status: 400 })
  }

  try {
    const provider = getLlmProvider(settings)
    const text = await provider.audit(buildAuditPrompt(css))
    const audit = JSON.parse(stripFences(text))
    return NextResponse.json({ audit })
  } catch (err) {
    console.error('Audit error:', err)
    return NextResponse.json({ error: 'Error auditing CSS' }, { status: 500 })
  }
}
