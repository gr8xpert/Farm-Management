import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import DataTable from '../components/Common/DataTable'
import FormModal from '../components/Common/FormModal'
import DeleteConfirm from '../components/Common/DeleteConfirm'

const columns = [
  { key: 'unit_id', label: 'ID' },
  { key: 'unit_name', label: 'Unit Name' },
  { key: 'description', label: 'Description' },
]

const initialFormData = { unit_name: '', description: '' }

export default function WeightUnits() {
  const [weightUnits, setWeightUnits] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [formData, setFormData] = useState(initialFormData)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingItem, setDeletingItem] = useState(null)

  useEffect(() => { fetchWeightUnits() }, [search])

  const fetchWeightUnits = async (page = 1) => {
    setLoading(true)
    try {
      const response = await api.get('/weight-units', { params: { page, limit: 10, search } })
      setWeightUnits(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Failed to fetch weight units')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.unit_name.trim()) { toast.error('Unit name is required'); return }
    setSubmitting(true)
    try {
      if (editingId) {
        await api.put(`/weight-units/${editingId}`, formData)
        toast.success('Weight unit updated successfully')
      } else {
        await api.post('/weight-units', formData)
        toast.success('Weight unit created successfully')
      }
      setModalOpen(false); setFormData(initialFormData); setEditingId(null); fetchWeightUnits()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally { setSubmitting(false) }
  }

  const handleEdit = (unit) => {
    setFormData({ unit_name: unit.unit_name || '', description: unit.description || '' })
    setEditingId(unit.unit_id); setModalOpen(true)
  }

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      await api.delete(`/weight-units/${deletingItem.unit_id}`)
      toast.success('Weight unit deleted successfully')
      setDeleteOpen(false); setDeletingItem(null); fetchWeightUnits()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Weight Units</h1>
        <button
          onClick={() => { setFormData(initialFormData); setEditingId(null); setModalOpen(true) }}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Weight Unit
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search weight units..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-sm"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={weightUnits}
          pagination={pagination}
          onPageChange={fetchWeightUnits}
          onEdit={handleEdit}
          onDelete={(item) => { setDeletingItem(item); setDeleteOpen(true) }}
          loading={loading}
        />
      </div>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Weight Unit' : 'Add Weight Unit'}
        onSubmit={handleSubmit}
        loading={submitting}
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Unit Name *</label>
            <input
              type="text"
              value={formData.unit_name}
              onChange={(e) => setFormData({ ...formData, unit_name: e.target.value })}
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
        title="Delete Weight Unit"
        message={`Delete "${deletingItem?.unit_name}"? This cannot be undone.`}
        loading={submitting}
      />
    </div>
  )
}
