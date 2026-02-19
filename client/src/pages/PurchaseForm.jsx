import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

const emptyDetail = { item_id: '', qty: '', price: '', age: '', weight: '', weight_unit: '', remarks: '' }

export default function PurchaseForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [formData, setFormData] = useState({
    supplier_id: '',
    po_date: new Date().toISOString().split('T')[0],
    remarks: '',
    ref_name: '',
    details: [{ ...emptyDetail }]
  })
  const [suppliers, setSuppliers] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchDropdownData()
    if (isEditing) fetchPurchase()
  }, [id])

  const fetchDropdownData = async () => {
    try {
      const [suppliersRes, itemsRes] = await Promise.all([
        api.get('/suppliers', { params: { limit: 100 } }),
        api.get('/items', { params: { limit: 100 } })
      ])
      setSuppliers(suppliersRes.data.data)
      setItems(itemsRes.data.data)
    } catch (error) {
      toast.error('Failed to load data')
    }
  }

  const fetchPurchase = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/purchases/${id}`)
      const purchase = response.data.data
      setFormData({
        supplier_id: purchase.supplier_id,
        po_date: purchase.po_date.split('T')[0],
        remarks: purchase.remarks || '',
        ref_name: purchase.ref_name || '',
        details: purchase.details.map(d => ({
          item_id: d.item_id,
          qty: d.qty,
          price: d.price,
          age: d.age || '',
          weight: d.weight || '',
          weight_unit: d.weight_unit || '',
          remarks: d.remarks || ''
        }))
      })
    } catch (error) {
      toast.error('Failed to load purchase')
      navigate('/purchases')
    } finally { setLoading(false) }
  }

  const handleDetailChange = (index, field, value) => {
    const newDetails = [...formData.details]
    newDetails[index][field] = value
    setFormData({ ...formData, details: newDetails })
  }

  const addDetail = () => {
    setFormData({ ...formData, details: [...formData.details, { ...emptyDetail }] })
  }

  const removeDetail = (index) => {
    if (formData.details.length === 1) return
    const newDetails = formData.details.filter((_, i) => i !== index)
    setFormData({ ...formData, details: newDetails })
  }

  const calculateTotal = () => {
    return formData.details.reduce((sum, d) => {
      const qty = parseFloat(d.qty) || 0
      const price = parseFloat(d.price) || 0
      return sum + (qty * price)
    }, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.supplier_id) { toast.error('Please select a supplier'); return }
    if (formData.details.some(d => !d.item_id || !d.qty || !d.price)) {
      toast.error('Please fill all item details'); return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        supplier_id: parseInt(formData.supplier_id),
        details: formData.details.map(d => ({
          item_id: parseInt(d.item_id),
          qty: parseFloat(d.qty),
          price: parseFloat(d.price),
          age: d.age ? parseInt(d.age) : null,
          weight: d.weight ? parseFloat(d.weight) : null,
          weight_unit: d.weight_unit || null,
          remarks: d.remarks
        }))
      }

      if (isEditing) {
        await api.put(`/purchases/${id}`, payload)
        toast.success('Purchase updated')
      } else {
        await api.post('/purchases', payload)
        toast.success('Purchase created')
      }
      navigate('/purchases')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally { setSubmitting(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/purchases')}
          className="p-2 hover:bg-white/50 transition-colors"
          style={{ borderRadius: '4px' }}
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-semibold text-gray-800">
          {isEditing ? 'Edit Purchase' : 'New Purchase'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Purchase Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Supplier *</label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Date *</label>
              <input
                type="date"
                value={formData.po_date}
                onChange={(e) => setFormData({ ...formData, po_date: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="form-label">Reference</label>
              <input
                type="text"
                value={formData.ref_name}
                onChange={(e) => setFormData({ ...formData, ref_name: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="form-label">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="input-field"
              rows={2}
            />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Items</h2>
            <button
              type="button"
              onClick={addDetail}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Item *</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600 w-20">Qty *</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600 w-24">Price *</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600 w-16">Age</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600 w-20">Weight</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600 w-24">Unit</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600 w-24">Total</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {formData.details.map((detail, index) => (
                  <tr key={index} className="border-b border-gray-50">
                    <td className="py-2 px-2">
                      <select
                        value={detail.item_id}
                        onChange={(e) => handleDetailChange(index, 'item_id', e.target.value)}
                        className="input-field text-sm"
                      >
                        <option value="">Select Item</option>
                        {items.map(i => (
                          <option key={i.item_id} value={i.item_id}>{i.items_description}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={detail.qty}
                        onChange={(e) => handleDetailChange(index, 'qty', e.target.value)}
                        className="input-field text-sm"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={detail.price}
                        onChange={(e) => handleDetailChange(index, 'price', e.target.value)}
                        className="input-field text-sm"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        value={detail.age}
                        onChange={(e) => handleDetailChange(index, 'age', e.target.value)}
                        className="input-field text-sm"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={detail.weight}
                        onChange={(e) => handleDetailChange(index, 'weight', e.target.value)}
                        className="input-field text-sm"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={detail.weight_unit}
                        onChange={(e) => handleDetailChange(index, 'weight_unit', e.target.value)}
                        className="input-field text-sm"
                      >
                        <option value="">-</option>
                        <option value="KG">KG</option>
                        <option value="Mann">Mann</option>
                        <option value="Packet">Packet</option>
                        <option value="Loose">Loose</option>
                        <option value="Ton">Ton</option>
                        <option value="Gram">Gram</option>
                      </select>
                    </td>
                    <td className="py-2 px-2 text-right font-medium text-gray-800">
                      Rs.{((parseFloat(detail.qty) || 0) * (parseFloat(detail.price) || 0)).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2">
                      <button
                        type="button"
                        onClick={() => removeDetail(index)}
                        disabled={formData.details.length === 1}
                        className="p-1 hover:bg-red-50 text-red-500 disabled:opacity-30 transition-colors"
                        style={{ borderRadius: '3px' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="6" className="py-3 px-2 text-right font-semibold text-gray-700">
                    Grand Total:
                  </td>
                  <td className="py-3 px-2 text-right font-bold text-base text-green-600">
                    Rs.{calculateTotal().toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate('/purchases')}
            className="btn-secondary text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary text-sm flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Update Purchase' : 'Create Purchase'}
          </button>
        </div>
      </form>
    </div>
  )
}
