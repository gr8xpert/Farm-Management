import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import DataTable from '../components/Common/DataTable'
import FormModal from '../components/Common/FormModal'
import DeleteConfirm from '../components/Common/DeleteConfirm'
import ImportExportButtons from '../components/Common/ImportExportButtons'

const columns = [
  { key: 'supplier_id', label: 'ID' },
  { key: 'supplier_name', label: 'Name' },
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
  supplier_name: '',
  contact_person: '',
  country: '',
  state: '',
  city: '',
  address: '',
  email_address: '',
  webpage_address: '',
  phone_number: ''
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
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

  useEffect(() => {
    fetchSuppliers()
  }, [search])

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

  const fetchSuppliers = async (page = 1) => {
    setLoading(true)
    try {
      const response = await api.get('/suppliers', {
        params: { page, limit: 10, search }
      })
      setSuppliers(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Failed to fetch suppliers')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.supplier_name.trim()) {
      toast.error('Supplier name is required')
      return
    }

    setSubmitting(true)
    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, formData)
        toast.success('Supplier updated')
      } else {
        await api.post('/suppliers', formData)
        toast.success('Supplier created')
      }
      setModalOpen(false)
      setFormData(initialFormData)
      setEditingId(null)
      fetchSuppliers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (supplier) => {
    setFormData({
      supplier_name: supplier.supplier_name || '',
      contact_person: supplier.contact_person || '',
      country: supplier.country || '',
      state: supplier.state || '',
      city: supplier.city || '',
      address: supplier.address || '',
      email_address: supplier.email_address || '',
      webpage_address: supplier.webpage_address || '',
      phone_number: supplier.phone_number || ''
    })
    setEditingId(supplier.supplier_id)
    setModalOpen(true)
  }

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      await api.delete(`/suppliers/${deletingItem.supplier_id}`)
      toast.success('Supplier deleted')
      setDeleteOpen(false)
      setDeletingItem(null)
      fetchSuppliers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Suppliers</h1>
        <div className="flex items-center gap-2">
          <ImportExportButtons
            entityName="Suppliers"
            exportEndpoint="/import-export/suppliers/export"
            importEndpoint="/import-export/suppliers/import"
            onImportSuccess={() => fetchSuppliers()}
            sampleFields={['supplier_name', 'contact_person', 'phone_number', 'email_address', 'country', 'state', 'city', 'address']}
          />
          <button
            onClick={() => { setFormData(initialFormData); setEditingId(null); setModalOpen(true) }}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-sm"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={suppliers}
          pagination={pagination}
          onPageChange={fetchSuppliers}
          onEdit={handleEdit}
          onDelete={(item) => { setDeletingItem(item); setDeleteOpen(true) }}
          loading={loading}
          hideExport
        />
      </div>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Supplier' : 'Add Supplier'}
        onSubmit={handleSubmit}
        loading={submitting}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Supplier Name *</label>
            <input
              type="text"
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
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
        title="Delete Supplier"
        message={`Delete "${deletingItem?.supplier_name}"? This cannot be undone.`}
        loading={submitting}
      />
    </div>
  )
}
