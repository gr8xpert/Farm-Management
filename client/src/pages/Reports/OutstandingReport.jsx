import { useState, useEffect } from 'react'
import { AlertCircle, Download, Users, Truck, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import api from '../../services/api'

export default function OutstandingReport() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('receivables')

  useEffect(() => {
    fetchReport()
  }, [])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await api.get('/reports/outstanding')
      if (res.data.success) {
        setData(res.data.data)
      }
    } catch (error) {
      console.error('Error fetching outstanding report:', error)
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
    if (!data) return

    const items = activeTab === 'receivables' ? data.receivables : data.payables
    const headers = activeTab === 'receivables'
      ? ['Customer', 'Sale #', 'Date', 'Total', 'Paid', 'Outstanding', 'Days']
      : ['Supplier', 'PO #', 'Date', 'Total', 'Paid', 'Outstanding', 'Days']

    const rows = items.map(i => [
      activeTab === 'receivables' ? i.customer?.customer_name : i.supplier?.supplier_name,
      activeTab === 'receivables' ? i.sale_id : i.po_no,
      formatDate(activeTab === 'receivables' ? i.sale_date : i.po_date),
      i.total,
      i.paid,
      i.outstanding,
      i.daysOutstanding
    ])

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `outstanding-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getAgeColor = (days) => {
    if (days <= 30) return 'text-green-600 bg-green-50'
    if (days <= 60) return 'text-amber-600 bg-amber-50'
    if (days <= 90) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Outstanding Balances</h1>
        </div>
        <button
          onClick={exportCSV}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
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
                <p className="text-sm text-green-600 font-medium">Total Receivables</p>
              </div>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(data.summary?.totalReceivables)}</p>
              <p className="text-xs text-green-600 mt-1">{data.summary?.receivableCount || 0} invoices</p>
            </div>
            <div className="card bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-600 font-medium">Total Payables</p>
              </div>
              <p className="text-2xl font-bold text-red-700">{formatCurrency(data.summary?.totalPayables)}</p>
              <p className="text-xs text-red-600 mt-1">{data.summary?.payableCount || 0} invoices</p>
            </div>
            <div className="card bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
              <p className="text-sm text-amber-600 font-medium">Overdue (30+ days)</p>
              <p className="text-2xl font-bold text-amber-700">{formatCurrency(data.summary?.overdueReceivables)}</p>
            </div>
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
              <p className="text-sm text-blue-600 font-medium">Net Position</p>
              <p className={`text-2xl font-bold ${(data.summary?.netPosition || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(data.summary?.netPosition)}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="card">
            <div className="flex border-b border-gray-200 mb-4">
              <button
                onClick={() => setActiveTab('receivables')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'receivables'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="w-4 h-4" />
                Receivables (Customers Owe)
              </button>
              <button
                onClick={() => setActiveTab('payables')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'payables'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Truck className="w-4 h-4" />
                Payables (Owed to Suppliers)
              </button>
            </div>

            {/* Aging Summary */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {['0-30', '31-60', '61-90', '90+'].map((range, idx) => {
                const aging = activeTab === 'receivables' ? data.receivableAging : data.payableAging
                const value = aging?.[range] || 0
                const colors = [
                  'bg-green-50 border-green-200 text-green-700',
                  'bg-amber-50 border-amber-200 text-amber-700',
                  'bg-orange-50 border-orange-200 text-orange-700',
                  'bg-red-50 border-red-200 text-red-700'
                ]
                return (
                  <div key={range} className={`p-3 rounded-lg border ${colors[idx]}`}>
                    <p className="text-xs font-medium">{range} days</p>
                    <p className="text-lg font-bold">{formatCurrency(value)}</p>
                  </div>
                )
              })}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                      {activeTab === 'receivables' ? 'Customer' : 'Supplier'}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                      {activeTab === 'receivables' ? 'Sale #' : 'PO #'}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Total</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Paid</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Outstanding</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'receivables' ? data.receivables : data.payables)?.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-gray-500">
                        No outstanding {activeTab} found
                      </td>
                    </tr>
                  ) : (
                    (activeTab === 'receivables' ? data.receivables : data.payables)?.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-800">
                          {activeTab === 'receivables'
                            ? item.customer?.customer_name
                            : item.supplier?.supplier_name}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          #{activeTab === 'receivables' ? item.sale_id : item.po_no}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(activeTab === 'receivables' ? item.sale_date : item.po_date)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-600">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-green-600">
                          {formatCurrency(item.paid)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-gray-800">
                          {formatCurrency(item.outstanding)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAgeColor(item.daysOutstanding)}`}>
                            {item.daysOutstanding} days
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
