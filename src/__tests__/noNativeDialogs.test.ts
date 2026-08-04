import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'

const sourceRoot = join(process.cwd(), 'src')
const nativeDialogPattern = new RegExp(`(?:window\\.)?(?:${['alert', 'confirm', 'prompt'].join('|')})\\s*\\(`)

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : sourceFiles(path)
    }
    return ['.ts', '.vue'].includes(extname(entry.name)) && !entry.name.endsWith('.test.ts')
      ? [path]
      : []
  })
}

describe('native browser dialogs', () => {
  it('does not allow alert, confirm, or prompt calls in application source', () => {
    const offenders = sourceFiles(sourceRoot)
      .filter(path => nativeDialogPattern.test(readFileSync(path, 'utf8')))
      .map(path => path.slice(sourceRoot.length + 1))

    expect(offenders).toEqual([])
  })
})
