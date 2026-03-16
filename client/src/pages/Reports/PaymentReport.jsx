import { useState, useEffect } from 'react'
import { CreditCard, Download, Calendar, Filter, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import api from '../../services/api'

const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899']

export default function PaymentReport() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    paymentType: ''
  })

  useEffect(() => {
    fetchReport()
  }, [filters])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      ).toString()
      const res = await api.get(`/reports/payments?${params}`)
      if (res.data.success) {
        setData(res.data.data)
      }
    } catch (error) {
      console.error('Error fetching payment report:', error)
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
    if (!data?.payments) return

    const headers = ['Date', 'Type', 'Mode', 'Amount', 'Reference', 'Party']
    const rows = data.payments.map(p => [
      formatDate(p.payment_date),
      p.payment_type,
      p.payment_mode,
      p.payment_amount,
      p.reference_no || p.cheque_no || '',
      p.supplier?.supplier_name || p.customer?.customer_name || p.employee?.employee_name || ''
    ])

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payment-report-${filters.startDate}-${filters.endDate}.csv`
    a.click()
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'RECEIPT': return 'bg-green-100 text-green-700'
      case 'PAYMENT': return 'bg-red-100 text-red-700'
      case 'REFUND': return 'bg-amber-100 text-amber-700'
      case 'SALARY': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getModeColor = (mode) => {
    switch (mode) {
      case 'CASH': return 'bg-green-50 text-green-600'
      case 'CHEQUE': return 'bg-blue-50 text-blue-600'
      case 'BANK_TRANSFER': return 'bg-purple-50 text-purple-600'
      case 'ONLINE': return 'bg-indigo-50 text-indigo-600'
      case 'CARD': return 'bg-pink-50 text-pink-600'
      default: return 'bg-gray-50 text-gray-600'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Payment Report</h1>
        </div>
        <button
          onClick={exportCSV}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
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
              value={filters.paymentType}
              onChange={(e) => setFilters({ ...filters, paymentType: e.target.value })}
              className="input py-1.5 text-sm"
            >
              <option value="">All Types</option>
              <option value="RECEIPT">Receipts</option>
              <option value="PAYMENT">Payments</option>
              <option value="REFUND">Refunds</option>
              <option value="SALARY">Salaries</option>
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
            <div className="card bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-green-500" />
                <p className="text-sm text-green-600 font-medium">Money In</p>
              </div>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(data.summary?.totalReceipts)}</p>
            </div>
            <div className="card bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-600 font-medium">Money Out</p>
              </div>
              <p className="text-2xl font-bold text-red-700">{formatCurrency(data.summary?.totalPayments)}</p>
            </div>
            <div className="card bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
              <p className="text-sm text-purple-600 font-medium">Salaries Paid</p>
              <p className="text-2xl font-bold text-purple-700">{formatCurrency(data.summary?.totalSalaries)}</p>
            </div>
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
              <p className="text-sm text-blue-600 font-medium">Net Cash Flow</p>
              <p className={`text-2xl font-bold ${(data.summary?.netFlow || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(data.summary?.netFlow)}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* By Mode */}
            {data.byMode?.length > 0 && (
              <div className="card">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">By Payment Mode</h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.byMode}
                        dataKey="total"
                        nameKey="mode"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ mode }) => mode}
                      >
                        {data.byMode.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* By Type */}
            {data.byType?.length > 0 && (
              <div className="card">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">By Payment Type</h2>
                <div className="space-y-3">
                  {data.byType.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(item.type)}`}>
                          {item.type}
                        </span>
                        <span className="text-sm text-gray-600">{item.count} transactions</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payments Table */}
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Mode</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Party</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Reference</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.payments?.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500">
                      No payments found for selected period
                    </td>
                  </tr>
                ) : (
                  data.payments?.map((payment) => (
                    <tr key={payment.payment_id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-4 text-sm text-gray-600">{formatDate(payment.payment_date)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(payment.payment_type)}`}>
                          {payment.payment_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${getModeColor(payment.payment_mode)}`}>
                          {payment.payment_mode?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {payment.supplier?.supplier_name ||
                         payment.customer?.customer_name ||
                         payment.employee?.employee_name || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {payment.reference_no || payment.cheque_no || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-gray-800">
                        {formatCurrency(payment.payment_amount)}
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
