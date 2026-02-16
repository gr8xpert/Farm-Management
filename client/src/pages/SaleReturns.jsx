import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import DataTable from '../components/Common/DataTable'
import DeleteConfirm from '../components/Common/DeleteConfirm'

const reasonLabels = { STALE: 'Stale', DEFECTIVE: 'Defective', WRONG_ITEM: 'Wrong Item', QUALITY_ISSUE: 'Quality Issue', OTHER: 'Other' }

export default function SaleReturns() {
  const navigate = useNavigate()
  const [returns, setReturns] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [viewingReturn, setViewingReturn] = useState(null)

  const columns = [
    { key: 'sr_no', label: 'Return #' },
    { key: 'sr_date', label: 'Date', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { key: 'sale', label: 'Sale #', render: (val) => val?.sale_id || '-' },
    { key: 'customer', label: 'Customer', render: (val) => val?.customer_name || '-' },
    { key: 'reason', label: 'Reason', render: (val) => (
      <span
        className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700"
        style={{ borderRadius: '3px' }}
      >
        {reasonLabels[val] || val}
      </span>
    )},
    { key: 'total_amount', label: 'Total', render: (val) => `€${parseFloat(val || 0).toFixed(2)}` },
  ]

  useEffect(() => { fetchReturns() }, [])

  const fetchReturns = async (page = 1) => {
    setLoading(true)
    try {
      const response = await api.get('/sale-returns', { params: { page, limit: 10 } })
      setReturns(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Failed to fetch returns')
    } finally { setLoading(false) }
  }

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      await api.delete(`/sale-returns/${deletingItem.sr_no}`)
      toast.success('Return deleted')
      setDeleteOpen(false); setDeletingItem(null); fetchReturns()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Sale Returns</h1>
        <button
          onClick={() => navigate('/sale-returns/new')}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Return
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={returns}
          pagination={pagination}
          onPageChange={fetchReturns}
          onView={(item) => setViewingReturn(item)}
          onDelete={(item) => { setDeletingItem(item); setDeleteOpen(true) }}
          loading={loading}
        />
      </div>

      {/* View Modal */}
      {viewingReturn && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setViewingReturn(null)}
            />
            <div className="relative w-full max-w-2xl modal-content animate-fadeIn">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-base font-semibold text-gray-800">Sale Return #{viewingReturn.sr_no}</h3>
                <button
                  onClick={() => setViewingReturn(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Date:</span> <span className="text-gray-800">{new Date(viewingReturn.sr_date).toLocaleDateString()}</span></div>
                  <div><span className="text-gray-500">Original Sale:</span> <span className="text-gray-800">#{viewingReturn.sale?.sale_id}</span></div>
                  <div><span className="text-gray-500">Customer:</span> <span className="text-gray-800">{viewingReturn.customer?.customer_name}</span></div>
                  <div><span className="text-gray-500">Reason:</span> <span className="text-gray-800">{reasonLabels[viewingReturn.reason]}</span></div>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="font-medium text-gray-700 mb-2 text-sm">Returned Items</h4>
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
                      {viewingReturn.details?.map((d, i) => (
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
        title="Delete Return"
        message={`Delete Return #${deletingItem?.sr_no}? This cannot be undone.`}
        loading={submitting}
      />
    </div>
  )
}
