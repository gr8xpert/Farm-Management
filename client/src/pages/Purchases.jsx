import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import DataTable from '../components/Common/DataTable'
import DeleteConfirm from '../components/Common/DeleteConfirm'
import ImageLightbox from '../components/Common/ImageLightbox'

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
  const [viewLoading, setViewLoading] = useState(false)
  const [lightboxImages, setLightboxImages] = useState([])
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const columns = [
    { key: 'po_no', label: 'PO #' },
    { key: 'po_date', label: 'Date', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { key: 'supplier', label: 'Supplier', render: (val) => val?.supplier_name || '-' },
    { key: 'total_amount', label: 'Total', render: (val) => `Rs.${parseFloat(val || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}` },
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

  const handleView = async (item) => {
    setViewLoading(true)
    setViewingPurchase(item) // Show modal immediately with basic data
    try {
      const response = await api.get(`/purchases/${item.po_no}`)
      setViewingPurchase(response.data.data)
    } catch (error) {
      toast.error('Failed to load purchase details')
    } finally { setViewLoading(false) }
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

  const isPdf = (img) => {
    return img.mime_type === 'application/pdf' || img.original_name?.endsWith('.pdf')
  }

  const openLightbox = (images, index) => {
    setLightboxImages(images)
    setLightboxIndex(index)
  }

  const renderImageThumbnails = (images, label) => {
    if (!images || images.length === 0) return null
    return (
      <div className="mt-2">
        <span className="text-xs text-gray-500">{label}</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {images.map((img, idx) => (
            <button
              key={img.id || img.file_path}
              type="button"
              onClick={() => openLightbox(images, idx)}
              className="block w-16 h-16 rounded border border-gray-200 overflow-hidden bg-gray-50 hover:border-green-400 transition-colors"
              title={img.original_name}
            >
              {isPdf(img) ? (
                <span className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <FileText className="w-5 h-5" />
                  <span className="text-[8px]">PDF</span>
                </span>
              ) : (
                <img
                  src={`/uploads/${img.file_path}`}
                  alt={img.original_name}
                  className="w-full h-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    )
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
          onView={handleView}
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
                  x
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Date:</span> <span className="text-gray-800">{new Date(viewingPurchase.po_date).toLocaleDateString()}</span></div>
                  <div><span className="text-gray-500">Supplier:</span> <span className="text-gray-800">{viewingPurchase.supplier?.supplier_name}</span></div>
                  <div><span className="text-gray-500">Total:</span> <span className="text-gray-800 font-medium">Rs.{parseFloat(viewingPurchase.total_amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span></div>
                  <div><span className="text-gray-500">Remarks:</span> <span className="text-gray-800">{viewingPurchase.remarks || '-'}</span></div>
                </div>

                {/* Master Images */}
                {renderImageThumbnails(viewingPurchase.master_images, 'Attachments')}

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
                        <>
                          <tr key={i} className="border-b border-gray-50">
                            <td className="py-2 text-gray-800">{d.item?.items_description}</td>
                            <td className="text-right text-gray-800">{d.qty}</td>
                            <td className="text-right text-gray-800">Rs.{parseFloat(d.price).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                            <td className="text-right text-gray-800 font-medium">Rs.{(parseFloat(d.qty) * parseFloat(d.price)).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                          </tr>
                          {d.images && d.images.length > 0 && (
                            <tr key={`img-${i}`}>
                              <td colSpan="4" className="py-1 pl-4">
                                {renderImageThumbnails(d.images, `Item #${i + 1} Photos`)}
                              </td>
                            </tr>
                          )}
                        </>
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

      {/* Image Lightbox */}
      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => { setLightboxIndex(null); setLightboxImages([]) }}
        />
      )}
    </div>
  )
}
