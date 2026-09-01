import 'dotenv/config'

const PORT = parseInt(process.env.PORT ?? '4000', 10)

export const config = {
  PORT,
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  USE_MOCK_PIPELINE: process.env.USE_MOCK_PIPELINE === 'true', // default false
  // Backing-service lookups. Defaults to this same server (mock routes are
  // mounted at /api/mock), so nothing extra to deploy. Point at the standalone
  // apps/mock-services instead by setting MOCK_SERVICES_URL.
  MOCK_SERVICES_URL: process.env.MOCK_SERVICES_URL ?? `http://127.0.0.1:${PORT}`,
  // Letter drafting: if GEMINI_API_KEY is set, use Gemini; otherwise fall back
  // to a local Ollama model; if neither works, a templated letter is used.
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? 'gemini-3.6-flash',
  OLLAMA_URL: process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL ?? 'llama3.2',
  CONCURRENCY_LIMIT: parseInt(process.env.CONCURRENCY_LIMIT ?? '100', 10),
} as const

// Validate critical config at startup
export function validateConfig(): void {
  if (!config.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  if (!config.USE_MOCK_PIPELINE) {
    const letterEngine = config.GEMINI_API_KEY
      ? `Gemini (${config.GEMINI_MODEL})`
      : `Ollama ${config.OLLAMA_URL} (${config.OLLAMA_MODEL})`
    console.log(
      `[config] Real pipeline: evidence lookups -> ${config.MOCK_SERVICES_URL}, letter draft -> ${letterEngine}`,
    )
  }
}
