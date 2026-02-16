import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import DataTable from '../components/Common/DataTable'
import DeleteConfirm from '../components/Common/DeleteConfirm'

export default function Purchases() {
  const navigate = useNavigate()
  const [purchases, setPurchases] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [viewingPurchase, setViewingPurchase] = useState(null)

  const columns = [
    { key: 'po_no', label: 'PO #' },
    { key: 'po_date', label: 'Date', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { key: 'supplier', label: 'Supplier', render: (val) => val?.supplier_name || '-' },
    { key: 'total_amount', label: 'Total', render: (val) => `€${parseFloat(val || 0).toFixed(2)}` },
    { key: 'details', label: 'Items', render: (val) => `${val?.length || 0} items` },
    { key: 'remarks', label: 'Remarks' },
  ]

  useEffect(() => { fetchPurchases() }, [search])

  const fetchPurchases = async (page = 1) => {
    setLoading(true)
    try {
      const response = await api.get('/purchases', { params: { page, limit: 10, search } })
      setPurchases(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Failed to fetch purchases')
    } finally { setLoading(false) }
  }

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      await api.delete(`/purchases/${deletingItem.po_no}`)
      toast.success('Purchase deleted')
      setDeleteOpen(false); setDeletingItem(null); fetchPurchases()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Purchases</h1>
        <button
          onClick={() => navigate('/purchases/new')}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Purchase
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search purchases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-sm"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={purchases}
          pagination={pagination}
          onPageChange={fetchPurchases}
          onView={(item) => setViewingPurchase(item)}
          onEdit={(item) => navigate(`/purchases/${item.po_no}/edit`)}
          onDelete={(item) => { setDeletingItem(item); setDeleteOpen(true) }}
          loading={loading}
        />
      </div>

      {/* View Modal */}
      {viewingPurchase && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setViewingPurchase(null)}
            />
            <div
              className="relative w-full max-w-2xl modal-content animate-fadeIn"
            >
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-base font-semibold text-gray-800">Purchase Order #{viewingPurchase.po_no}</h3>
                <button
                  onClick={() => setViewingPurchase(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Date:</span> <span className="text-gray-800">{new Date(viewingPurchase.po_date).toLocaleDateString()}</span></div>
                  <div><span className="text-gray-500">Supplier:</span> <span className="text-gray-800">{viewingPurchase.supplier?.supplier_name}</span></div>
                  <div><span className="text-gray-500">Total:</span> <span className="text-gray-800 font-medium">€{parseFloat(viewingPurchase.total_amount || 0).toFixed(2)}</span></div>
                  <div><span className="text-gray-500">Remarks:</span> <span className="text-gray-800">{viewingPurchase.remarks || '-'}</span></div>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="font-medium text-gray-700 mb-2 text-sm">Items</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 text-gray-600 font-medium">Item</th>
                        <th className="text-right py-2 text-gray-600 font-medium">Qty</th>
                        <th className="text-right py-2 text-gray-600 font-medium">Price</th>
                        <th className="text-right py-2 text-gray-600 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingPurchase.details?.map((d, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-2 text-gray-800">{d.item?.items_description}</td>
                          <td className="text-right text-gray-800">{d.qty}</td>
                          <td className="text-right text-gray-800">€{parseFloat(d.price).toFixed(2)}</td>
                          <td className="text-right text-gray-800 font-medium">€{(parseFloat(d.qty) * parseFloat(d.price)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirm
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Purchase"
        message={`Delete PO #${deletingItem?.po_no}? This cannot be undone.`}
        loading={submitting}
      />
    </div>
  )
}
