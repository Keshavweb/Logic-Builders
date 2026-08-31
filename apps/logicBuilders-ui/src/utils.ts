import { CONFIDENCE_THRESHOLDS } from './constants'

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)

export const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Not available'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export const getDeadlineWarning = (deadline?: string): boolean => {
  if (!deadline) return false
  const date = new Date(deadline)
  if (Number.isNaN(date.getTime())) return false
  const hoursLeft = (date.getTime() - Date.now()) / (1000 * 60 * 60)
  return hoursLeft < 48
}

export type ConfidenceMeta = {
  label: string
  severity: 'strong' | 'moderate' | 'weak'
}

export const getConfidenceMeta = (score?: number): ConfidenceMeta => {
  if (score == null) {
    return { label: 'Not available', severity: 'weak' }
  }
  if (score >= CONFIDENCE_THRESHOLDS.strong) {
    return { label: 'Strong case', severity: 'strong' }
  }
  if (score >= CONFIDENCE_THRESHOLDS.moderate) {
    return { label: 'Moderate case', severity: 'moderate' }
  }
  return { label: 'Weak case · Missing evidence', severity: 'weak' }
}

export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const safeText = (value?: string | null, fallback = 'Not available'): string =>
  value && value.trim() !== '' ? value : fallback

export const deviceMatchLabel = (match?: string): string => {
  if (match === 'yes') return 'Yes'
  if (match === 'no') return 'No'
  return 'Unknown'
}
