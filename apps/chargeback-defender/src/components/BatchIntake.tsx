import type { ChangeEvent, DragEvent } from 'react'
import { useState } from 'react'
import Papa from 'papaparse'
import { REQUIRED_CSV_COLUMNS } from '../constants'
import type { BatchProgress, BatchRow } from '../types'
import { formatCurrency, formatDate } from '../utils'
import StatusChip from './StatusChip'

type Props = {
  uploadedRows: BatchRow[]
  setUploadedRows: (rows: BatchRow[]) => void
  batchProgress: BatchProgress[]
  isBatchActive: boolean
  onRunBatch: () => void
  showToast: (message: string) => void
}

export default function BatchIntake({
  uploadedRows,
  setUploadedRows,
  batchProgress,
  isBatchActive,
  onRunBatch,
  showToast,
}: Props) {
  const [dragActive, setDragActive] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const processCsvFile = (file: File) => {
    setParseError(null)

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      const msg = 'Please upload a .csv file.'
      setParseError(msg)
      showToast(msg)
      return
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          const msg = `CSV parse error: ${results.errors[0]?.message ?? 'unknown error'}`
          setParseError(msg)
          showToast(msg)
          return
        }

        // Validate columns
        const headers = results.meta.fields ?? []
        const missingColumns = REQUIRED_CSV_COLUMNS.filter((col) => !headers.includes(col))
        if (missingColumns.length > 0) {
          const msg = `Missing required columns: ${missingColumns.join(', ')}`
          setParseError(msg)
          showToast(msg)
          return
        }

        const parsed: BatchRow[] = results.data
          .filter((row) => row && Object.values(row).some((v) => v && String(v).trim() !== ''))
          .map((row, index) => ({
            dispute_id: String(row.dispute_id ?? `DISPUTE-${index + 1}`),
            order_id: String(row.order_id ?? `ORD-${index + 1}`),
            customer_id: String(row.customer_id ?? `CUST-${index + 1}`),
            reason_code: String(row.reason_code ?? 'UNKNOWN_REASON'),
            amount: String(row.amount ?? '0'),
            deadline: String(row.deadline ?? '2026-08-31T00:00:00.000Z'),
            transaction_id: String(row.transaction_id ?? `TXN-${index + 1}`),
          }))

        if (!parsed.length) {
          const msg = 'No valid rows found in the uploaded CSV.'
          setParseError(msg)
          showToast(msg)
          return
        }

        setUploadedRows(parsed)
        setParseError(null)
        showToast(`${parsed.length} disputes loaded into the batch preview.`)
      },
      error: (error) => {
        const msg = `CSV parse failed: ${error.message}`
        setParseError(msg)
        showToast(msg)
      },
    })
  }

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) processCsvFile(selectedFile)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragActive(false)
    const selectedFile = event.dataTransfer.files?.[0]
    if (selectedFile) processCsvFile(selectedFile)
  }

  return (
    <main className="px-8 pt-7 pb-12 max-sm:px-4">
      <section className="mx-auto max-w-4xl rounded-2xl border border-border bg-panel p-6 shadow-lg shadow-shadow-panel">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Incoming dispute batch</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">Upload CSV</h2>
          </div>
          <button
            type="button"
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={!uploadedRows.length || isBatchActive}
            onClick={onRunBatch}
          >
            Run batch
          </button>
        </div>

        {/* Drop zone */}
        <div
          className={`relative flex min-h-44 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${
            dragActive
              ? 'border-brand bg-brand-bg-light'
              : 'border-border bg-gradient-to-br from-surface to-surface-alt'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileInput}
            aria-label="CSV upload file"
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <div className="flex flex-col items-center gap-1.5 text-text-secondary">
            <svg className="mb-2 h-10 w-10 text-text-secondary opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <strong className="text-lg text-text-primary">Drag and drop CSV</strong>
            <span className="text-sm">or click to browse</span>
          </div>
        </div>

        {/* Parse error */}
        {parseError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger">
            {parseError}
          </div>
        )}

        {/* Preview table */}
        {uploadedRows.length > 0 ? (
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary">Batch preview</h3>
              <span className="rounded-full bg-brand-bg px-3 py-0.5 text-xs font-bold text-brand-dark">
                {uploadedRows.length} rows
              </span>
            </div>
            <div className="w-full overflow-x-auto rounded-xl border border-border bg-white">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr>
                    {REQUIRED_CSV_COLUMNS.map((col) => (
                      <th
                        key={col}
                        className="border-b border-border-light bg-surface px-3.5 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uploadedRows.map((row) => (
                    <tr key={`${row.dispute_id}-${row.transaction_id}`} className="transition-colors hover:bg-blue-50/40">
                      <td className="border-b border-border-light px-3.5 py-3 text-sm">{row.dispute_id}</td>
                      <td className="border-b border-border-light px-3.5 py-3 text-sm">{row.order_id}</td>
                      <td className="border-b border-border-light px-3.5 py-3 text-sm">{row.customer_id}</td>
                      <td className="border-b border-border-light px-3.5 py-3 text-sm">{row.reason_code}</td>
                      <td className="border-b border-border-light px-3.5 py-3 text-sm">{formatCurrency(Number.parseFloat(row.amount) || 0)}</td>
                      <td className="border-b border-border-light px-3.5 py-3 text-sm">{formatDate(row.deadline)}</td>
                      <td className="border-b border-border-light px-3.5 py-3 text-sm">{row.transaction_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : !batchProgress.length ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface p-7 text-center text-text-secondary">
            <h3 className="mb-1.5 text-base font-bold text-text-primary">No batch uploaded yet</h3>
            <p className="text-sm">Upload a CSV with 10–15 disputes to begin the review loop.</p>
          </div>
        ) : null}

        {/* Batch processing progress */}
        {batchProgress.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-3 text-base font-bold text-text-primary">Processing status</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {batchProgress.map((entry) => (
                <div key={entry.disputeId} className="rounded-xl border border-border bg-surface p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                      {entry.disputeId}
                    </span>
                    <StatusChip status={entry.status} label={entry.label} />
                  </div>
                  {entry.error && (
                    <p className="mt-2 text-xs text-danger">{entry.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
