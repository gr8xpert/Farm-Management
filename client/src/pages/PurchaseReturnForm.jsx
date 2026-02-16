import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

export default function PurchaseReturnForm() {
  const navigate = useNavigate()
  const [purchases, setPurchases] = useState([])
  const [selectedPO, setSelectedPO] = useState('')
  const [purchaseDetails, setPurchaseDetails] = useState(null)
  const [formData, setFormData] = useState({
    pr_date: new Date().toISOString().split('T')[0],
    reason: 'DEFECTIVE',
    ref_name: '',
    details: []
  })
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchPurchases() }, [])

  const fetchPurchases = async () => {
    try {
      const response = await api.get('/purchases', { params: { limit: 100 } })
      setPurchases(response.data.data)
    } catch (error) {
      toast.error('Failed to load purchases')
    }
  }

  const handlePOChange = async (poNo) => {
    setSelectedPO(poNo)
    if (!poNo) { setPurchaseDetails(null); return }

    setLoading(true)
    try {
      const response = await api.get(`/purchase-returns/purchase/${poNo}/details`)
      setPurchaseDetails(response.data.data)
      setFormData({
        ...formData,
        details: response.data.data.details.map(d => ({
          item_id: d.item_id,
          item_name: d.item?.items_description,
          original_qty: parseFloat(d.qty),
          returned_qty: parseFloat(d.returned_qty),
          available_qty: parseFloat(d.available_qty),
          return_qty: '',
          price: d.price,
          age: d.age || '',
          weight: d.weight || '',
          remarks: ''
        }))
      })
    } catch (error) {
      toast.error('Failed to load purchase details')
    } finally { setLoading(false) }
  }

  const handleDetailChange = (index, field, value) => {
    const newDetails = [...formData.details]
    newDetails[index][field] = value
    setFormData({ ...formData, details: newDetails })
  }

  const calculateTotal = () => {
    return formData.details.reduce((sum, d) => {
      const qty = parseFloat(d.return_qty) || 0
      const price = parseFloat(d.price) || 0
      return sum + (qty * price)
    }, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedPO) { toast.error('Please select a purchase order'); return }

    const returnItems = formData.details.filter(d => parseFloat(d.return_qty) > 0)
    if (returnItems.length === 0) { toast.error('Please enter return quantity for at least one item'); return }

    for (const item of returnItems) {
      if (parseFloat(item.return_qty) > item.available_qty) {
        toast.error(`Return quantity exceeds available quantity for ${item.item_name}`); return
      }
    }

    setSubmitting(true)
    try {
      await api.post('/purchase-returns', {
        po_no: parseInt(selectedPO),
        pr_date: formData.pr_date,
        reason: formData.reason,
        ref_name: formData.ref_name,
        details: returnItems.map(d => ({
          item_id: d.item_id,
          qty: parseFloat(d.return_qty),
          price: parseFloat(d.price),
          age: d.age ? parseInt(d.age) : null,
          weight: d.weight ? parseFloat(d.weight) : null,
          remarks: d.remarks
        }))
      })
      toast.success('Purchase return created successfully')
      navigate('/purchase-returns')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchase-returns')} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Purchase Return</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Return Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Order *</label>
              <select value={selectedPO} onChange={(e) => handlePOChange(e.target.value)} className="input-field" required>
                <option value="">Select PO</option>
                {purchases.map(p => <option key={p.po_no} value={p.po_no}>PO #{p.po_no} - {p.supplier?.supplier_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Return Date *</label>
              <input type="date" value={formData.pr_date} onChange={(e) => setFormData({ ...formData, pr_date: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
              <select value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="input-field" required>
                <option value="STALE">Stale</option>
                <option value="DEFECTIVE">Defective</option>
                <option value="WRONG_ITEM">Wrong Item</option>
                <option value="QUALITY_ISSUE">Quality Issue</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>

        {loading && <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>}

        {purchaseDetails && !loading && (
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Items to Return</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 text-sm font-medium text-gray-600">Item</th>
                    <th className="text-right py-2 px-2 text-sm font-medium text-gray-600 w-24">Original</th>
                    <th className="text-right py-2 px-2 text-sm font-medium text-gray-600 w-24">Returned</th>
                    <th className="text-right py-2 px-2 text-sm font-medium text-gray-600 w-24">Available</th>
                    <th className="text-left py-2 px-2 text-sm font-medium text-gray-600 w-28">Return Qty</th>
                    <th className="text-right py-2 px-2 text-sm font-medium text-gray-600 w-24">Price</th>
                    <th className="text-right py-2 px-2 text-sm font-medium text-gray-600 w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.details.map((detail, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-2">{detail.item_name}</td>
                      <td className="py-2 px-2 text-right">{detail.original_qty}</td>
                      <td className="py-2 px-2 text-right text-gray-500">{detail.returned_qty}</td>
                      <td className="py-2 px-2 text-right font-medium">{detail.available_qty}</td>
                      <td className="py-2 px-2">
                        <input
                          type="number" step="0.01" min="0" max={detail.available_qty}
                          value={detail.return_qty}
                          onChange={(e) => handleDetailChange(index, 'return_qty', e.target.value)}
                          className="input-field"
                          disabled={detail.available_qty <= 0}
                        />
                      </td>
                      <td className="py-2 px-2 text-right">€{parseFloat(detail.price).toFixed(2)}</td>
                      <td className="py-2 px-2 text-right font-medium">€{((parseFloat(detail.return_qty) || 0) * parseFloat(detail.price)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="6" className="py-3 px-2 text-right font-semibold">Return Total:</td>
                    <td className="py-3 px-2 text-right font-bold text-lg text-red-600">€{calculateTotal().toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/purchase-returns')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={submitting || !selectedPO} className="btn-primary flex items-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Return
          </button>
        </div>
      </form>
    </div>
  )
}
