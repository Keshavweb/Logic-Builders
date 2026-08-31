import 'dotenv/config'

export const config = {
  PORT: parseInt(process.env.PORT ?? '3001', 10),
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  USE_MOCK_PIPELINE: process.env.USE_MOCK_PIPELINE === 'true', // default false
  ROCKETRIDE_URI: process.env.ROCKETRIDE_URI ?? '',
  ROCKETRIDE_APIKEY: process.env.ROCKETRIDE_APIKEY ?? '',
  CONCURRENCY_LIMIT: parseInt(process.env.CONCURRENCY_LIMIT ?? '3', 10),
} as const

// Validate critical config at startup
export function validateConfig(): void {
  if (!config.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  if (!config.USE_MOCK_PIPELINE && (!config.ROCKETRIDE_URI || !config.ROCKETRIDE_APIKEY)) {
    throw new Error(
      'ROCKETRIDE_URI and ROCKETRIDE_APIKEY are required when USE_MOCK_PIPELINE is false',
    )
  }
}
