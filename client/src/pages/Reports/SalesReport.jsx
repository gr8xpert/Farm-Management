import { useState, useEffect, useRef } from 'react'
import { FileText, Download, Calendar, Filter, Printer } from 'lucide-react'
import api from '../../services/api'

export default function SalesReport() {
  const printRef = useRef(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    groupBy: 'day'
  })

  useEffect(() => {
    fetchReport()
  }, [filters])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(filters).toString()
      const res = await api.get(`/reports/sales?${params}`)
      if (res.data.success) {
        setData(res.data.data)
      }
    } catch (error) {
      console.error('Error fetching sales report:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => `Rs.${Number(value || 0).toLocaleString()}`

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  const exportCSV = () => {
    if (!data?.sales) return

    const headers = ['Date', 'Sale #', 'Customer', 'Items', 'Amount']
    const rows = data.sales.map(s => [
      formatDate(s.sale_date),
      s.sale_id,
      s.customer?.customer_name || '',
      s.details?.length || 0,
      s.total_amount || 0
    ])

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-report-${filters.startDate}-${filters.endDate}.csv`
    a.click()
  }

  const exportPDF = () => {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales Report - ${filters.startDate} to ${filters.endDate}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 24px; margin-bottom: 5px; }
            .subtitle { color: #666; margin-bottom: 20px; }
            .summary { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
            .summary-item { padding: 15px; background: #f5f5f5; border-radius: 8px; min-width: 150px; }
            .summary-label { font-size: 12px; color: #666; }
            .summary-value { font-size: 20px; font-weight: bold; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #f5f5f5; font-weight: 600; }
            .text-right { text-align: right; }
            .footer { margin-top: 30px; font-size: 12px; color: #999; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Sales Report</h1>
          <p class="subtitle">${formatDate(filters.startDate)} to ${formatDate(filters.endDate)}</p>

          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">Total Sales</div>
              <div class="summary-value">${formatCurrency(data?.summary?.total)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Transactions</div>
              <div class="summary-value">${data?.summary?.count || 0}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Average Sale</div>
              <div class="summary-value">${formatCurrency(data?.summary?.average)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Sale #</th>
                <th>Customer</th>
                <th>Items</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data?.sales?.map(sale => `
                <tr>
                  <td>${formatDate(sale.sale_date)}</td>
                  <td>#${sale.sale_id}</td>
                  <td>${sale.customer?.customer_name || '-'}</td>
                  <td>${sale.details?.length || 0}</td>
                  <td class="text-right">${formatCurrency(sale.total_amount)}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>

          <p class="footer">Generated on ${new Date().toLocaleString()}</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <FileText className="w-5 h-5 text-emerald-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Sales Report</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportPDF}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print/PDF
          </button>
          <button
            onClick={exportCSV}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="input py-1.5 text-sm"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="input py-1.5 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filters.groupBy}
              onChange={(e) => setFilters({ ...filters, groupBy: e.target.value })}
              className="input py-1.5 text-sm"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
              <p className="text-sm text-emerald-600 font-medium">Total Sales</p>
              <p className="text-2xl font-bold text-emerald-700">{formatCurrency(data.summary?.total)}</p>
            </div>
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
              <p className="text-sm text-blue-600 font-medium">Transactions</p>
              <p className="text-2xl font-bold text-blue-700">{data.summary?.count || 0}</p>
            </div>
            <div className="card bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
              <p className="text-sm text-purple-600 font-medium">Average Sale</p>
              <p className="text-2xl font-bold text-purple-700">{formatCurrency(data.summary?.average)}</p>
            </div>
            <div className="card bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
              <p className="text-sm text-amber-600 font-medium">Items Sold</p>
              <p className="text-2xl font-bold text-amber-700">{data.summary?.itemCount || 0}</p>
            </div>
          </div>

          {/* Top Customers */}
          {data.topCustomers?.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Top Customers</h2>
              <div className="space-y-2">
                {data.topCustomers.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-700">{c.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{formatCurrency(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sales Table */}
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Sale #</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Customer</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Items</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.sales?.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500">
                      No sales found for selected period
                    </td>
                  </tr>
                ) : (
                  data.sales?.map((sale) => (
                    <tr key={sale.sale_id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-4 text-sm text-gray-600">{formatDate(sale.sale_date)}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-800">#{sale.sale_id}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{sale.customer?.customer_name}</td>
                      <td className="py-3 px-4 text-sm text-center text-gray-600">{sale.details?.length || 0}</td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-gray-800">
                        {formatCurrency(sale.total_amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
