import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

/** Build a fixture recorder scoped to a single provider.
 *  Fixtures live under lib/__fixtures__/<provider>/<name>.json. */
export function createFixtureRecorder(provider) {
  const fixturesDir = path.resolve(__dirname, '../../__fixtures__', provider)

  /** Load a previously recorded fixture from disk.
   *  Throws a helpful error with recording instructions if the fixture is missing. */
  async function loadFixture(name) {
    const filePath = path.join(fixturesDir, `${name}.json`)
    try {
      const raw = await fs.readFile(filePath, 'utf8')
      return JSON.parse(raw)
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(
          `Fixture "${name}" not found at ${filePath}\n\n` +
            `To record it, run:\n` +
             `  RECORD_FIXTURES=1 npx vitest run lib/__tests__/clients.test.mjs`
        )
      }
      throw err
    }
  }

  /** Persist a captured HTTP response to disk as a JSON fixture.
   *  `captured` must be an object with { status, ok, body }. */
  async function saveRecordedFixture(name, captured) {
    if (!captured) {
      throw new Error(
        `No response captured for fixture "${name}". Did fetch run?`
      )
    }

    await ensureDir(fixturesDir)

    const fixture = {
      _meta: {
        recordedAt: new Date().toISOString(),
        scenario: name,
        provider,
      },
      response: captured,
    }

    const filePath = path.join(fixturesDir, `${name}.json`)
    await fs.writeFile(
      filePath,
      JSON.stringify(fixture, null, 2) + '\n',
      'utf8'
    )
  }

  /** Wire a Vitest fetch spy to replay a saved fixture instead of making real network calls. */
  async function setupFixture(name, fetchSpy) {
    const fixture = await loadFixture(name)

    fetchSpy.mockImplementation(async () => ({
      ok: fixture.response.ok,
      status: fixture.response.status,
      json: async () => fixture.response.body,
    }))
  }

  return { loadFixture, saveRecordedFixture, setupFixture }
}
