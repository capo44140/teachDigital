import { describe, it, expect } from 'vitest'
import { withProgressBridge, parseProgressMessage, PROGRESS_MESSAGE_TYPE } from '../../src/services/coursePageService.js'

describe('withProgressBridge', () => {
  it('insère le script avant </body>', () => {
    const out = withProgressBridge('<html><body><p>x</p></body></html>')
    expect(out).toMatch(/<p>x<\/p><script>[\s\S]*<\/script><\/body><\/html>$/)
    expect(out).toContain('window.TeachDigital')
    expect(out).toContain(PROGRESS_MESSAGE_TYPE)
  })

  it('ajoute le script à la fin sans </body>', () => {
    const out = withProgressBridge('<p>x</p>')
    expect(out.startsWith('<p>x</p><script>')).toBe(true)
  })

  it('le script tolère une balise </BODY> en majuscules', () => {
    expect(withProgressBridge('<BODY>x</BODY>')).toMatch(/<script>[\s\S]*<\/script><\/BODY>$/)
  })
})

describe('parseProgressMessage', () => {
  it('accepte un message valide et borne la série', () => {
    expect(parseProgressMessage({ type: PROGRESS_MESSAGE_TYPE, ok: 3, total: 5, streak: 2 })).toEqual({ ok: 3, total: 5, streak: 2 })
    expect(parseProgressMessage({ type: PROGRESS_MESSAGE_TYPE, ok: 0, total: 1, streak: -4 })).toEqual({ ok: 0, total: 1, streak: 0 })
  })

  it('rejette les messages d\'un autre type ou incohérents', () => {
    expect(parseProgressMessage({ type: 'autre', ok: 1, total: 1 })).toBeNull()
    expect(parseProgressMessage({ type: PROGRESS_MESSAGE_TYPE, ok: 6, total: 5 })).toBeNull()
    expect(parseProgressMessage({ type: PROGRESS_MESSAGE_TYPE, ok: 1, total: 0 })).toBeNull()
    expect(parseProgressMessage({ type: PROGRESS_MESSAGE_TYPE, ok: '1.5', total: 3 })).toBeNull()
    expect(parseProgressMessage(null)).toBeNull()
  })
})
