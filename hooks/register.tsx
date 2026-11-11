import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Build, Part } from '../types'

const PANE = 'sms-recompile'
const TITLE = 'Recompile'

type Config = { root: string; version: string }

const VERSIONS: Record<string, string> = {
  GMSE01: 'US',
  GMSP01: 'PAL',
  GMSJ01: 'Japan',
  GMSJ01_01: 'Japan rev 1',
  GMSP01_NX: '3D All-Stars',
}

function readConfig(options: Record<string, unknown>): Config {
  const root = String(options['decomp_folder'] ?? '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
  const version = String(options['version'] || 'GMSE01')
  return { root, version }
}

const build = atom(
  { plugin: 'sms-recompile', key: 'build' } as const,
  { status: 'idle', startedAt: 0, seconds: 0, log: [] } as Build,
  { shape: 'build-1' },
)
const parts = atom({ plugin: 'sms-recompile', key: 'parts' } as const, [] as Part[], {
  shape: 'parts-1',
})

const NAMES: Record<string, string> = {
  game: 'Sunshine game code',
  jsystem: 'JSystem engine',
  sdk: 'Nintendo SDK',
}

type Measures = {
  matched_functions?: number
  total_functions?: number
  matched_code_percent?: number
  complete_units?: number
  total_units?: number
}

function toPart(name: string, m: Measures): Part {
  return {
    name,
    functions: `${(m.matched_functions ?? 0).toLocaleString()} / ${(m.total_functions ?? 0).toLocaleString()}`,
    matchedPercent: Math.round((m.matched_code_percent ?? 0) * 10) / 10,
    filesDone: `${m.complete_units ?? 0} / ${m.total_units ?? 0}`,
  }
}

async function loadReport($: EngineInterface, cfg: Config) {
  if (!cfg.root) return
  try {
    const text = await $.fs.read(`${cfg.root}/build/${cfg.version}/report.json`)
    const data = JSON.parse(String(text)) as {
      measures?: Measures
      categories?: { id: string; name?: string; measures?: Measures }[]
    }
    const list: Part[] = [toPart('All', data.measures ?? {})]
    for (const c of data.categories ?? []) {
      list.push(toPart(NAMES[c.id] ?? c.name ?? c.id, c.measures ?? {}))
    }
    await update($, parts, () => list)
  } catch {
    // No report yet: the pane says so.
  }
}

async function rebuild($: EngineInterface, cfg: Config) {
  if (!cfg.root) return
  const now = await read($, build)
  if (now.status === 'running') return
  const startedAt = Date.now()
  await update($, build, (): Build => ({ status: 'running', startedAt, seconds: 0, log: [] }))

  let ok = false
  try {
    const run = $.process.spawn({ argv: ['python', '-m', 'ninja', '-C', cfg.root] })
    let carry = ''
    for await (const { text } of run) {
      const lines = (carry + text).split(/\r?\n/)
      carry = lines.pop() ?? ''
      const fresh = lines.filter(l => l.trim() !== '')
      if (fresh.length) {
        await update($, build, b => ({ ...b, log: [...b.log, ...fresh].slice(-14) }))
      }
    }
    const end = await run.result
    ok = end.code === 0
  } catch (err) {
    await update($, build, b => ({ ...b, log: [...b.log, String(err)].slice(-14) }))
  }

  const failed = (await read($, build)).log.some(l => /FAILED|error:|ninja: build stopped/i.test(l))
  await update($, build, (b): Build => ({
    ...b,
    status: ok && !failed ? 'done' : 'failed',
    seconds: Math.round((Date.now() - startedAt) / 1000),
  }))
  await loadReport($, cfg)
}

export const register: Register = (on, options) => {
  const cfg = readConfig(options as Record<string, unknown>)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'recompile',
      description: 'Open the Super Mario Sunshine Recompile pane',
    })
    void loadReport($, cfg)
    void $.ui.open({ id: PANE, title: TITLE })

    return next(e)
  })

  on('command.run', { command: 'recompile' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })

    return { text: 'Recompile pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const b = await read($, build)
    const list = await read($, parts)
    const running = b.status === 'running'

    const statusLine =
      b.status === 'running'
        ? 'Building…'
        : b.status === 'done'
          ? `Built in ${b.seconds}s`
          : b.status === 'failed'
            ? `Build failed after ${b.seconds}s`
            : 'Ready'

    if (!cfg.root) {
      return (
        <Box flexDirection="column" gap={1}>
          <Text size="heading">Super Mario Sunshine</Text>
          <Text>Set the Decomp folder for sms-recompile in your plugin settings, then reopen this pane.</Text>
          <Text dimColor>It's your clone of github.com/doldecomp/sms, configured with configure.py.</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text size="heading">Super Mario Sunshine ({VERSIONS[cfg.version] ?? cfg.version})</Text>
          <Text dimColor>
            {cfg.root.split('/').pop()} · {cfg.version}
          </Text>
        </Box>

        <Box flexDirection="row" gap={1}>
          <Button
            variant="primary"
            onPress={() => {
              if (!running) void rebuild($, cfg)
            }}
          >
            {running ? 'Building…' : 'Rebuild'}
          </Button>
          <Text color={b.status === 'failed' ? 'red' : undefined} dimColor={b.status === 'idle'}>
            {statusLine}
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text size="footnote" dimColor>
            Matched code · functions · files fully matched
          </Text>
          {list.length === 0 && <Text dimColor>No build report yet. Press Rebuild.</Text>}
          {list.map(p => (
            <Box key={p.name} flexDirection="column">
              <Text>
                {p.name}: {p.matchedPercent}%
              </Text>
              <Text dimColor>
                {p.functions} functions · {p.filesDone} files
              </Text>
            </Box>
          ))}
        </Box>

        {b.log.length > 0 && (
          <Box flexDirection="column">
            <Text size="footnote" dimColor>
              Build output
            </Text>
            {b.log.map((line, i) => (
              <Text key={String(i)} dimColor wrap="truncate-end">
                {line}
              </Text>
            ))}
          </Box>
        )}
      </Box>
    )
  })
}
