import { useState, useRef } from 'react'
import { Upload, Download, X, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function ImportExportButtons({
  entityName,
  exportEndpoint,
  importEndpoint,
  onImportSuccess,
  sampleFields = [],
  columns = []
}) {
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await api.get(exportEndpoint, { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${entityName}-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success(`${entityName} exported successfully`)
    } catch (error) {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleImportClick = () => {
    setImportResult(null)
    setImportModalOpen(true)
  }

  const processFile = async (file) => {
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }

    setImporting(true)
    setImportResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await api.post(importEndpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setImportResult({
        success: true,
        imported: response.data.imported || 0,
        skipped: response.data.skipped || 0,
        skippedExisting: response.data.skippedExisting || 0,
        errors: response.data.errors || [],
        debug: response.data.debug
      })

      if (response.data.imported > 0) {
        toast.success(`Imported ${response.data.imported} ${entityName.toLowerCase()}`)
        onImportSuccess?.()
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: error.response?.data?.message || 'Import failed',
        errors: error.response?.data?.errors || []
      })
      toast.error(error.response?.data?.message || 'Import failed')
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    processFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (importing) return

    const file = e.dataTransfer.files?.[0]
    processFile(file)
  }

  const downloadSample = () => {
    const headers = sampleFields.length > 0
      ? sampleFields.join(',')
      : columns.map(c => c.key).join(',')

    const csv = headers + '\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${entityName}-sample.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {importEndpoint && (
          <button
            onClick={handleImportClick}
            disabled={importing}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
        )}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          {exporting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export
        </button>
      </div>

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !importing && setImportModalOpen(false)}
            />
            <div className="relative w-full max-w-md modal-content animate-fadeIn">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-base font-semibold text-gray-800">Import {entityName}</h3>
                <button
                  onClick={() => !importing && setImportModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                  disabled={importing}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="text-sm text-gray-600">
                  <p>Upload a CSV file to import {entityName.toLowerCase()}. The file should contain the following columns:</p>
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <code className="text-xs text-gray-700">
                      {sampleFields.length > 0 ? sampleFields.join(', ') : columns.map(c => c.key).join(', ')}
                    </code>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadSample}
                    className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                  >
                    <FileText className="w-4 h-4" />
                    Download Sample CSV
                  </button>
                </div>

                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragging
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="import-file"
                    disabled={importing}
                  />
                  <label
                    htmlFor="import-file"
                    className={`cursor-pointer block ${importing ? 'opacity-50' : ''}`}
                  >
                    {importing ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-600 border-t-transparent" />
                        <span className="text-sm text-gray-600">Importing...</span>
                      </div>
                    ) : isDragging ? (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-green-500" />
                        <span className="text-sm text-green-600 font-medium">Drop file here</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-gray-400" />
                        <span className="text-sm text-gray-600">Drag & drop or click to select CSV file</span>
                      </div>
                    )}
                  </label>
                </div>

                {/* Import Result */}
                {importResult && (
                  <div className={`p-4 rounded-lg ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start gap-2">
                      {importResult.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        {importResult.success ? (
                          <div className="text-sm text-green-800">
                            <p className="font-medium">Import Complete</p>
                            <p>Imported: {importResult.imported} records</p>
                            {importResult.skippedExisting > 0 && <p>Skipped (existing): {importResult.skippedExisting} records</p>}
                            {importResult.skipped > 0 && importResult.skipped !== importResult.skippedExisting && <p>Skipped (errors): {importResult.skipped - (importResult.skippedExisting || 0)} records</p>}
                          </div>
                        ) : (
                          <div className="text-sm text-red-800">
                            <p className="font-medium">Import Failed</p>
                            <p>{importResult.message}</p>
                          </div>
                        )}
                        {importResult.errors?.length > 0 && (
                          <div className="mt-2 text-xs text-gray-600 max-h-24 overflow-y-auto">
                            {importResult.errors.slice(0, 5).map((err, i) => (
                              <p key={i}>Row {err.row}: {err.error}</p>
                            ))}
                            {importResult.errors.length > 5 && (
                              <p>...and {importResult.errors.length - 5} more errors</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setImportModalOpen(false)}
                  disabled={importing}
                  className="btn-secondary text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
