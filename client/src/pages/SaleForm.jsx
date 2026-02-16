import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

const emptyDetail = { item_id: '', qty: '', price: '', age: '', weight: '', remarks: '' }

export default function SaleForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [formData, setFormData] = useState({
    customer_id: '',
    sale_date: new Date().toISOString().split('T')[0],
    remarks: '',
    ref_name: '',
    details: [{ ...emptyDetail }]
  })
  const [customers, setCustomers] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchDropdownData()
    if (isEditing) fetchSale()
  }, [id])

  const fetchDropdownData = async () => {
    try {
      const [customersRes, itemsRes] = await Promise.all([
        api.get('/customers', { params: { limit: 100 } }),
        api.get('/items', { params: { limit: 100 } })
      ])
      setCustomers(customersRes.data.data)
      setItems(itemsRes.data.data)
    } catch (error) {
      toast.error('Failed to load data')
    }
  }

  const fetchSale = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/sales/${id}`)
      const sale = response.data.data
      setFormData({
        customer_id: sale.customer_id,
        sale_date: sale.sale_date.split('T')[0],
        remarks: sale.remarks || '',
        ref_name: sale.ref_name || '',
        details: sale.details.map(d => ({
          item_id: d.item_id,
          qty: d.qty,
          price: d.price,
          age: d.age || '',
          weight: d.weight || '',
          remarks: d.remarks || ''
        }))
      })
    } catch (error) {
      toast.error('Failed to load sale')
      navigate('/sales')
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
    return formData.details.reduce((sum, d) => sum + ((parseFloat(d.qty) || 0) * (parseFloat(d.price) || 0)), 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.customer_id) { toast.error('Please select a customer'); return }
    if (formData.details.some(d => !d.item_id || !d.qty || !d.price)) {
      toast.error('Please fill all item details'); return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        customer_id: parseInt(formData.customer_id),
        details: formData.details.map(d => ({
          item_id: parseInt(d.item_id),
          qty: parseFloat(d.qty),
          price: parseFloat(d.price),
          age: d.age ? parseInt(d.age) : null,
          weight: d.weight ? parseFloat(d.weight) : null,
          remarks: d.remarks
        }))
      }

      if (isEditing) {
        await api.put(`/sales/${id}`, payload)
        toast.success('Sale updated')
      } else {
        await api.post('/sales', payload)
        toast.success('Sale created')
      }
      navigate('/sales')
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
          onClick={() => navigate('/sales')}
          className="p-2 hover:bg-white/50 transition-colors"
          style={{ borderRadius: '4px' }}
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-semibold text-gray-800">
          {isEditing ? 'Edit Sale' : 'New Sale'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Sale Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Customer *</label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Select Customer</option>
                {customers.map(c => (
                  <option key={c.customer_id} value={c.customer_id}>{c.customer_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Date *</label>
              <input
                type="date"
                value={formData.sale_date}
                onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
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
                    <td className="py-2 px-2 text-right font-medium text-gray-800">
                      €{((parseFloat(detail.qty) || 0) * (parseFloat(detail.price) || 0)).toFixed(2)}
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
                  <td colSpan="5" className="py-3 px-2 text-right font-semibold text-gray-700">
                    Grand Total:
                  </td>
                  <td className="py-3 px-2 text-right font-bold text-base text-green-600">
                    €{calculateTotal().toFixed(2)}
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
            onClick={() => navigate('/sales')}
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
            {isEditing ? 'Update Sale' : 'Create Sale'}
          </button>
        </div>
      </form>
    </div>
  )
}
