export type Part = {
  name: string
  functions: string
  matchedPercent: number
  filesDone: string
}

export type Build = {
  status: 'idle' | 'running' | 'done' | 'failed'
  startedAt: number
  seconds: number
  log: string[]
}

declare module 'claude-code' {
  interface PluginState {
    'sms-recompile': { build: Shaped<Build>; parts: Shaped<Part[]> }
  }
}
