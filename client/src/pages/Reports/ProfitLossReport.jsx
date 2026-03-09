import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Download, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import api from '../../services/api'

const COLORS = ['#16a34a', '#dc2626', '#3b82f6', '#f59e0b']

export default function ProfitLossReport() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchReport()
  }, [filters])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(filters).toString()
      const res = await api.get(`/reports/profit-loss?${params}`)
      if (res.data.success) {
        setData(res.data.data)
      }
    } catch (error) {
      console.error('Error fetching profit/loss report:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => `Rs.${Number(value || 0).toLocaleString()}`

  const exportCSV = () => {
    if (!data) return

    const rows = [
      ['Profit & Loss Report'],
      [`Period: ${filters.startDate} to ${filters.endDate}`],
      [''],
      ['Revenue'],
      ['Total Sales', data.totalSales || 0],
      ['Sale Returns', `-${data.saleReturns || 0}`],
      ['Net Sales', data.netSales || 0],
      [''],
      ['Cost of Goods'],
      ['Total Purchases', data.totalPurchases || 0],
      ['Purchase Returns', `-${data.purchaseReturns || 0}`],
      ['Net Purchases', data.netPurchases || 0],
      [''],
      ['Gross Profit/Loss', data.grossProfit || 0],
      ['Profit Margin', `${data.profitMargin || 0}%`]
    ]

    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `profit-loss-report-${filters.startDate}-${filters.endDate}.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Profit & Loss Report</h1>
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
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : data && (
        <>
          {/* Main Profit Card */}
          <div className={`card ${parseFloat(data.grossProfit || 0) >= 0 ? 'bg-gradient-to-br from-green-50 to-green-100/50 border-green-200' : 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${parseFloat(data.grossProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {parseFloat(data.grossProfit || 0) >= 0 ? 'Gross Profit' : 'Gross Loss'}
                </p>
                <p className={`text-3xl font-bold ${parseFloat(data.grossProfit || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(Math.abs(data.grossProfit || 0))}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Profit Margin: {data.profitMargin || 0}%
                </p>
              </div>
              <div className={`p-4 rounded-full ${parseFloat(data.grossProfit || 0) >= 0 ? 'bg-green-200' : 'bg-red-200'}`}>
                {parseFloat(data.grossProfit || 0) >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-600" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-600" />
                )}
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Revenue Section */}
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                Revenue
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Total Sales</span>
                  <span className="text-sm font-semibold text-gray-800">{formatCurrency(data.totalSales)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Sale Returns</span>
                  <span className="text-sm font-semibold text-red-600">-{formatCurrency(data.saleReturns)}</span>
                </div>
                <div className="flex justify-between py-2 bg-green-50 px-3 rounded-lg">
                  <span className="text-sm font-medium text-green-700">Net Sales</span>
                  <span className="text-sm font-bold text-green-700">{formatCurrency(data.netSales)}</span>
                </div>
              </div>
            </div>

            {/* Cost Section */}
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                Cost of Goods
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Total Purchases</span>
                  <span className="text-sm font-semibold text-gray-800">{formatCurrency(data.totalPurchases)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Purchase Returns</span>
                  <span className="text-sm font-semibold text-green-600">-{formatCurrency(data.purchaseReturns)}</span>
                </div>
                <div className="flex justify-between py-2 bg-red-50 px-3 rounded-lg">
                  <span className="text-sm font-medium text-red-700">Net Cost</span>
                  <span className="text-sm font-bold text-red-700">{formatCurrency(data.netPurchases)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Trend Chart */}
          {data.monthlyTrend?.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Profit Trend</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(value) => `${value / 1000}k`} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '4px', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="sales" name="Sales" fill="#16a34a" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="purchases" name="Purchases" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="profit" name="Profit" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Breakdown by Category */}
          {data.byCategory?.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Profit by Category</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.byCategory}
                        dataKey="profit"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {data.byCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {data.byCategory.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        <span className="text-sm font-medium text-gray-700">{cat.category}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{formatCurrency(cat.profit)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
