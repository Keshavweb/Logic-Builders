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
        return
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
      <section className="mx-auto max-w-4xl rounded-2xl border border-gray-800 bg-gray-900/90 p-6 shadow-2xl backdrop-blur-sm">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Incoming dispute batch
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">
              Upload CSV
            </h2>
          </div>
          <button
            type="button"
            className="rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-800/60 px-5 py-2.5 text-xs font-semibold text-blue-200 transition duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!uploadedRows.length || isBatchActive}
            onClick={onRunBatch}
          >
            Run batch
          </button>
        </div>

        {/* Drop zone */}
        <div
          className={`relative flex min-h-48 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200 ${
            dragActive
              ? 'border-blue-500 bg-blue-950/30'
              : 'border-gray-800 bg-gray-950/60 hover:border-gray-700'
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
          <div className="flex flex-col items-center gap-2 text-center p-6">
            <div className="w-12 h-12 rounded-full bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400 mb-1">
              <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <strong className="text-base font-semibold text-white">Drag and drop CSV</strong>
            <span className="text-xs text-gray-400">or click anywhere to browse files</span>
          </div>
        </div>

        {/* Parse error */}
        {parseError && (
          <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/40 p-3 text-xs text-red-300">
            {parseError}
          </div>
        )}

        {/* Preview table */}
        {uploadedRows.length > 0 ? (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-200">Batch preview</h3>
              <span className="rounded-full bg-blue-950 border border-blue-800/60 px-3 py-0.5 text-xs font-semibold text-blue-300">
                {uploadedRows.length} rows
              </span>
            </div>
            <div className="w-full overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
              <table className="w-full min-w-190 border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/80 text-gray-400 font-medium uppercase">
                    {REQUIRED_CSV_COLUMNS.map((col) => (
                      <th key={col} className="px-3.5 py-3">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 text-gray-300">
                  {uploadedRows.map((row) => (
                    <tr key={`${row.dispute_id}-${row.transaction_id}`} className="hover:bg-gray-900/50 transition">
                      <td className="px-3.5 py-3 font-mono text-blue-400">{row.dispute_id}</td>
                      <td className="px-3.5 py-3 font-mono text-gray-300">{row.order_id}</td>
                      <td className="px-3.5 py-3 text-gray-300">{row.customer_id}</td>
                      <td className="px-3.5 py-3 text-gray-400">{row.reason_code}</td>
                      <td className="px-3.5 py-3 font-medium text-white">{formatCurrency(Number.parseFloat(row.amount) || 0)}</td>
                      <td className="px-3.5 py-3 text-gray-400">{formatDate(row.deadline)}</td>
                      <td className="px-3.5 py-3 font-mono text-gray-400">{row.transaction_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : !batchProgress.length ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-800 bg-gray-950/40 p-8 text-center text-gray-400">
            <h3 className="mb-1 text-sm font-semibold text-gray-300">No batch uploaded yet</h3>
            <p className="text-xs text-gray-500">Upload a CSV with 10–15 disputes to begin the review loop.</p>
          </div>
        ) : null}

        {/* Batch processing progress */}
        {batchProgress.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-200">Processing status</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {batchProgress.map((entry) => (
                <div key={entry.disputeId} className="rounded-xl border border-gray-800 bg-gray-950 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-mono font-medium text-gray-400">
                      {entry.disputeId}
                    </span>
                    <StatusChip status={entry.status} label={entry.label} />
                  </div>
                  {entry.error && (
                    <p className="mt-2 text-xs text-red-400">{entry.error}</p>
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