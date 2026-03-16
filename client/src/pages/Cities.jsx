import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import DataTable from '../components/Common/DataTable'
import FormModal from '../components/Common/FormModal'
import DeleteConfirm from '../components/Common/DeleteConfirm'
import ImportExportButtons from '../components/Common/ImportExportButtons'

const columns = [
  { key: 'city_id', label: 'ID' },
  { key: 'city_name', label: 'City Name' },
  { key: 'description', label: 'Description' },
]

const initialFormData = { city_name: '', description: '' }

export default function Cities() {
  const [cities, setCities] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [formData, setFormData] = useState(initialFormData)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingItem, setDeletingItem] = useState(null)

  useEffect(() => { fetchCities() }, [search])

  const fetchCities = async (page = 1) => {
    setLoading(true)
    try {
      const response = await api.get('/cities', { params: { page, limit: 10, search } })
      setCities(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Failed to fetch cities')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.city_name.trim()) { toast.error('City name is required'); return }
    setSubmitting(true)
    try {
      if (editingId) {
        await api.put(`/cities/${editingId}`, formData)
        toast.success('City updated successfully')
      } else {
        await api.post('/cities', formData)
        toast.success('City created successfully')
      }
      setModalOpen(false); setFormData(initialFormData); setEditingId(null); fetchCities()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally { setSubmitting(false) }
  }

  const handleEdit = (city) => {
    setFormData({ city_name: city.city_name || '', description: city.description || '' })
    setEditingId(city.city_id); setModalOpen(true)
  }

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      await api.delete(`/cities/${deletingItem.city_id}`)
      toast.success('City deleted successfully')
      setDeleteOpen(false); setDeletingItem(null); fetchCities()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Cities</h1>
        <div className="flex items-center gap-2">
          <ImportExportButtons
            entityName="Cities"
            exportEndpoint="/import-export/cities/export"
            importEndpoint="/import-export/cities/import"
            onImportSuccess={() => fetchCities()}
            sampleFields={['city_name', 'state', 'country']}
          />
          <button
            onClick={() => { setFormData(initialFormData); setEditingId(null); setModalOpen(true) }}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add City
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search cities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-sm"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={cities}
          pagination={pagination}
          onPageChange={fetchCities}
          onEdit={handleEdit}
          onDelete={(item) => { setDeletingItem(item); setDeleteOpen(true) }}
          loading={loading}
          hideExport
        />
      </div>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit City' : 'Add City'}
        onSubmit={handleSubmit}
        loading={submitting}
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">City Name *</label>
            <input
              type="text"
              value={formData.city_name}
              onChange={(e) => setFormData({ ...formData, city_name: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field"
              rows={3}
            />
          </div>
        </div>
      </FormModal>

      <DeleteConfirm
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete City"
        message={`Delete "${deletingItem?.city_name}"? This cannot be undone.`}
        loading={submitting}
      />
    </div>
  )
}
