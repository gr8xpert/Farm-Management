import { ChevronLeft, ChevronRight, Edit2, Trash2, Eye, Download } from 'lucide-react'

export default function DataTable({
  columns,
  data,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  onView,
  loading,
  exportFileName = 'export',
  hideExport = false
}) {
  const handleExportCSV = () => {
    if (data.length === 0) return

    // Build CSV header
    const headers = columns.map(col => col.label).join(',')

    // Build CSV rows
    const rows = data.map(row => {
      return columns.map(col => {
        let value = row[col.key]

        // Handle nested objects (like supplier.supplier_name)
        if (col.render) {
          // For rendered columns, try to get a plain text value
          if (typeof value === 'object' && value !== null) {
            // Common patterns for related data
            value = value.supplier_name || value.customer_name || value.bank_name ||
                    value.items_description || value.category_name || value.employee_name ||
                    value.po_no || value.sale_id || JSON.stringify(value)
          }
        }

        // Handle dates
        if (value instanceof Date) {
          value = value.toLocaleDateString()
        }

        // Handle null/undefined
        if (value === null || value === undefined) {
          value = ''
        }

        // Convert to string and escape quotes
        value = String(value).replace(/"/g, '""')

        // Wrap in quotes if contains comma or newline
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          value = `"${value}"`
        }

        return value
      }).join(',')
    }).join('\n')

    // Create and download CSV
    const csv = `${headers}\n${rows}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${exportFileName}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-600 border-t-transparent" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        No records found
      </div>
    )
  }

  return (
    <div>
      {/* Export button */}
      {!hideExport && (
        <div className="flex justify-end mb-3">
          <button
            onClick={handleExportCSV}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table-compact">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
              {(onEdit || onDelete || onView) && <th />}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={row.id || idx}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] || '-')}
                  </td>
                ))}
                {(onEdit || onDelete || onView) && (
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onView && (
                        <button
                          onClick={() => onView(row)}
                          className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                          style={{ borderRadius: '4px' }}
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          className="p-1.5 hover:bg-green-50 text-gray-500 hover:text-green-600 transition-colors"
                          style={{ borderRadius: '4px' }}
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row)}
                          className="p-1.5 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                          style={{ borderRadius: '4px' }}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between px-2 py-3 border-t border-gray-100 mt-2">
          <div className="text-xs text-gray-500">
            {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-1.5 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{ borderRadius: '4px' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-600 px-2">
              {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="p-1.5 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{ borderRadius: '4px' }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
