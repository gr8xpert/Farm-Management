import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import DataTable from '../components/Common/DataTable'
import FormModal from '../components/Common/FormModal'
import DeleteConfirm from '../components/Common/DeleteConfirm'

const columns = [
  { key: 'customer_id', label: 'ID' },
  { key: 'customer_name', label: 'Name' },
  { key: 'contact_person', label: 'Contact' },
  { key: 'phone_number', label: 'Phone' },
  { key: 'email_address', label: 'Email' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'Province' },
  { key: 'country', label: 'Country' },
  { key: 'address', label: 'Address' },
  { key: 'webpage_address', label: 'Website' },
]

const initialFormData = {
  customer_name: '',
  contact_person: '',
  country: '',
  state: '',
  city: '',
  address: '',
  email_address: '',
  webpage_address: '',
  phone_number: ''
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [formData, setFormData] = useState(initialFormData)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingItem, setDeletingItem] = useState(null)
  const [cities, setCities] = useState([])

  useEffect(() => { fetchCustomers() }, [search])

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await api.get('/cities', { params: { limit: 200 } })
        setCities(res.data.data)
      } catch (error) {
        // silently fail — city dropdown will just be empty
      }
    }
    fetchCities()
  }, [])

  const fetchCustomers = async (page = 1) => {
    setLoading(true)
    try {
      const response = await api.get('/customers', { params: { page, limit: 10, search } })
      setCustomers(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Failed to fetch customers')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.customer_name.trim()) {
      toast.error('Customer name is required')
      return
    }
    setSubmitting(true)
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, formData)
        toast.success('Customer updated')
      } else {
        await api.post('/customers', formData)
        toast.success('Customer created')
      }
      setModalOpen(false)
      setFormData(initialFormData)
      setEditingId(null)
      fetchCustomers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (customer) => {
    setFormData({
      customer_name: customer.customer_name || '',
      contact_person: customer.contact_person || '',
      country: customer.country || '',
      state: customer.state || '',
      city: customer.city || '',
      address: customer.address || '',
      email_address: customer.email_address || '',
      webpage_address: customer.webpage_address || '',
      phone_number: customer.phone_number || ''
    })
    setEditingId(customer.customer_id)
    setModalOpen(true)
  }

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      await api.delete(`/customers/${deletingItem.customer_id}`)
      toast.success('Customer deleted')
      setDeleteOpen(false)
      setDeletingItem(null)
      fetchCustomers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Customers</h1>
        <button
          onClick={() => { setFormData(initialFormData); setEditingId(null); setModalOpen(true) }}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-sm"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={customers}
          pagination={pagination}
          onPageChange={fetchCustomers}
          onEdit={handleEdit}
          onDelete={(item) => { setDeletingItem(item); setDeleteOpen(true) }}
          loading={loading}
        />
      </div>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Customer' : 'Add Customer'}
        onSubmit={handleSubmit}
        loading={submitting}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Customer Name *</label>
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div className="form-grid-2">
            <div>
              <label className="form-label">Contact Person</label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={formData.email_address}
                onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label">Website</label>
              <input
                type="text"
                value={formData.webpage_address}
                onChange={(e) => setFormData({ ...formData, webpage_address: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="form-grid-3">
            <div>
              <label className="form-label">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label">Province</label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="input-field"
              >
                <option value="">Select Province</option>
                <option value="Sindh">Sindh</option>
                <option value="Punjab">Punjab</option>
                <option value="Balochistan">Balochistan</option>
                <option value="KPK">KPK</option>
                <option value="Gilgit">Gilgit</option>
              </select>
            </div>
            <div>
              <label className="form-label">City</label>
              <select
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="input-field"
              >
                <option value="">Select City</option>
                {cities.map(c => (
                  <option key={c.city_id} value={c.city_name}>{c.city_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input-field"
              rows={2}
            />
          </div>
        </div>
      </FormModal>

      <DeleteConfirm
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Customer"
        message={`Delete "${deletingItem?.customer_name}"? This cannot be undone.`}
        loading={submitting}
      />
    </div>
  )
}
