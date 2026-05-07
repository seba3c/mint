import { describe, it, expect } from 'vitest'
import {
  stripFences,
  resolveTarget,
  preprocessCss,
  buildAuditPrompt,
  buildResolvePrompt,
} from '../prompts.mjs'

describe('stripFences', () => {
  it('strips a js-fenced code block', () => {
    expect(stripFences('```js\nconst x = 1\n```')).toBe('const x = 1')
  })

  it('strips a css-fenced code block', () => {
    expect(stripFences('```css\nbody { color: red; }\n```')).toBe('body { color: red; }')
  })

  it('returns unfenced input unchanged', () => {
    expect(stripFences('const x = 1')).toBe('const x = 1')
  })
})

describe('resolveTarget', () => {
  it('returns a canonical target key unchanged', () => {
    expect(resolveTarget('css-variables')).toBe('css-variables')
  })

  it('resolves a short alias to its canonical key', () => {
    expect(resolveTarget('react')).toBe('react-component')
  })

  it('resolves tailwind alias', () => {
    expect(resolveTarget('tailwind')).toBe('tailwind-config')
  })

  it('returns null for an unknown target', () => {
    expect(resolveTarget('unknown-xyz')).toBeNull()
  })

  it('returns null for null input', () => {
    expect(resolveTarget(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(resolveTarget('')).toBeNull()
  })
})

describe('preprocessCss', () => {
  it('strips block comments', () => {
    expect(preprocessCss('/* comment */ body { color: red; }')).toBe('body { color: red; }')
  })

  it('strips line comments', () => {
    expect(preprocessCss('// comment\nbody { color: red; }')).toBe('body { color: red; }')
  })

  it('collapses multiple whitespace to a single space', () => {
    expect(preprocessCss('body  {   color:   red;   }')).toBe('body { color: red; }')
  })

  it('returns already-clean input unchanged', () => {
    expect(preprocessCss('body { color: red; }')).toBe('body { color: red; }')
  })
})

describe('buildAuditPrompt', () => {
  const css = 'body { color: #ff0000; font-size: 16px; }'

  it('returns a non-empty string', () => {
    expect(typeof buildAuditPrompt(css)).toBe('string')
    expect(buildAuditPrompt(css).length).toBeGreaterThan(0)
  })

  it('embeds the CSS source in the output', () => {
    expect(buildAuditPrompt(css)).toContain(css)
  })

  it('includes the AuditReport instruction', () => {
    expect(buildAuditPrompt(css)).toContain('AuditReport')
  })
})

describe('buildResolvePrompt', () => {
  const css = 'body { color: #6366f1; }'
  const decisions = {
    colors: [{ include: true, name: 'primary', value: '#6366f1' }],
    fonts: ['Inter'],
    spacingScale: { '1': '4px', '2': '8px' },
  }

  it('returns a non-empty string', () => {
    expect(typeof buildResolvePrompt(css, decisions)).toBe('string')
    expect(buildResolvePrompt(css, decisions).length).toBeGreaterThan(0)
  })

  it('embeds the original CSS', () => {
    expect(buildResolvePrompt(css, decisions)).toContain(css)
  })

  it('embeds the decisions as JSON', () => {
    expect(buildResolvePrompt(css, decisions)).toContain('"primary"')
  })

  it('includes DSTokens instructions', () => {
    expect(buildResolvePrompt(css, decisions)).toContain('DSTokens')
  })
})
