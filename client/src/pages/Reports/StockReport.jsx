import { useState, useEffect } from 'react'
import { Package, AlertTriangle, Download, Search } from 'lucide-react'
import api from '../../services/api'

export default function StockReport() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)

  useEffect(() => {
    fetchReport()
  }, [showLowStock])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/reports/stock${showLowStock ? '?lowStock=true' : ''}`)
      if (res.data.success) {
        setData(res.data.data)
      }
    } catch (error) {
      console.error('Error fetching stock report:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => `Rs.${Number(value || 0).toLocaleString()}`

  const exportCSV = () => {
    if (!data?.items) return

    const headers = ['Item', 'Category', 'Stock', 'Reorder Level', 'Unit', 'Last Purchase Price', 'Last Sale Price', 'Stock Value']
    const rows = data.items.map(i => [
      i.items_description,
      i.category?.category_name || '',
      i.stock_on_hand,
      i.reorder_level,
      i.unit_of_measure || '',
      i.last_purchase_price || 0,
      i.last_sale_price || 0,
      (parseFloat(i.stock_on_hand) * parseFloat(i.last_purchase_price || 0))
    ])

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stock-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const filteredItems = data?.items?.filter(item =>
    item.items_description.toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Stock Report</h1>
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
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="input pl-10 py-1.5 text-sm w-full"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLowStock}
              onChange={(e) => setShowLowStock(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">Show only low stock items</span>
          </label>
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
            <div className="card bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
              <p className="text-sm text-purple-600 font-medium">Total Items</p>
              <p className="text-2xl font-bold text-purple-700">{data.summary?.totalItems || 0}</p>
            </div>
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
              <p className="text-sm text-blue-600 font-medium">Total Stock</p>
              <p className="text-2xl font-bold text-blue-700">{Number(data.summary?.totalStock || 0).toLocaleString()}</p>
            </div>
            <div className="card bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
              <p className="text-sm text-emerald-600 font-medium">Stock Value</p>
              <p className="text-2xl font-bold text-emerald-700">{formatCurrency(data.summary?.stockValue)}</p>
            </div>
            <div className="card bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-600 font-medium">Low Stock Items</p>
              </div>
              <p className="text-2xl font-bold text-red-700">{data.summary?.lowStockCount || 0}</p>
            </div>
          </div>

          {/* Low Stock Alert */}
          {data.lowStockItems?.length > 0 && (
            <div className="card border-red-200 bg-red-50/50">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h2 className="text-sm font-semibold text-red-700">Low Stock Alert</h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.lowStockItems.map((item) => (
                  <div key={item.item_id} className="bg-white p-3 rounded-lg border border-red-200">
                    <p className="font-medium text-gray-800 text-sm">{item.items_description}</p>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="text-red-600">Stock: {parseFloat(item.stock_on_hand)}</span>
                      <span className="text-gray-500">Reorder: {parseFloat(item.reorder_level)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stock Table */}
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Item</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Category</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Stock</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Reorder</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Purchase Price</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Sale Price</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-gray-500">
                      No items found
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isLow = parseFloat(item.stock_on_hand) <= parseFloat(item.reorder_level)
                    return (
                      <tr key={item.item_id} className={`border-b border-gray-100 hover:bg-gray-50/50 ${isLow ? 'bg-red-50/50' : ''}`}>
                        <td className="py-3 px-4 text-sm font-medium text-gray-800">
                          {item.items_description}
                          {isLow && <AlertTriangle className="w-3 h-3 text-red-500 inline ml-2" />}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{item.category?.category_name || '-'}</td>
                        <td className={`py-3 px-4 text-sm text-center font-semibold ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
                          {parseFloat(item.stock_on_hand)}
                        </td>
                        <td className="py-3 px-4 text-sm text-center text-gray-600">{parseFloat(item.reorder_level)}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-600">
                          {item.last_purchase_price ? formatCurrency(item.last_purchase_price) : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-600">
                          {item.last_sale_price ? formatCurrency(item.last_sale_price) : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-gray-800">
                          {formatCurrency(parseFloat(item.stock_on_hand) * parseFloat(item.last_purchase_price || 0))}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
