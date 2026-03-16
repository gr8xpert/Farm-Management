import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import DataTable from '../components/Common/DataTable'
import FormModal from '../components/Common/FormModal'
import DeleteConfirm from '../components/Common/DeleteConfirm'
import ImportExportButtons from '../components/Common/ImportExportButtons'

const columns = [
  { key: 'category_id', label: 'ID' },
  { key: 'category_name', label: 'Name' },
  { key: 'description', label: 'Description' },
]

const initialFormData = { category_name: '', description: '' }

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [formData, setFormData] = useState(initialFormData)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingItem, setDeletingItem] = useState(null)

  useEffect(() => { fetchCategories() }, [search])

  const fetchCategories = async (page = 1) => {
    setLoading(true)
    try {
      const response = await api.get('/categories', { params: { page, limit: 10, search } })
      setCategories(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.category_name.trim()) { toast.error('Category name is required'); return }
    setSubmitting(true)
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, formData)
        toast.success('Category updated successfully')
      } else {
        await api.post('/categories', formData)
        toast.success('Category created successfully')
      }
      setModalOpen(false); setFormData(initialFormData); setEditingId(null); fetchCategories()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally { setSubmitting(false) }
  }

  const handleEdit = (category) => {
    setFormData({ category_name: category.category_name || '', description: category.description || '' })
    setEditingId(category.category_id); setModalOpen(true)
  }

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      await api.delete(`/categories/${deletingItem.category_id}`)
      toast.success('Category deleted successfully')
      setDeleteOpen(false); setDeletingItem(null); fetchCategories()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Categories</h1>
        <div className="flex items-center gap-2">
          <ImportExportButtons
            entityName="Categories"
            exportEndpoint="/import-export/categories/export"
            importEndpoint="/import-export/categories/import"
            onImportSuccess={() => fetchCategories()}
            sampleFields={['category_name', 'remarks']}
          />
          <button
            onClick={() => { setFormData(initialFormData); setEditingId(null); setModalOpen(true) }}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-sm"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={categories}
          pagination={pagination}
          onPageChange={fetchCategories}
          onEdit={handleEdit}
          onDelete={(item) => { setDeletingItem(item); setDeleteOpen(true) }}
          loading={loading}
          hideExport
        />
      </div>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Category' : 'Add Category'}
        onSubmit={handleSubmit}
        loading={submitting}
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Category Name *</label>
            <input
              type="text"
              value={formData.category_name}
              onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
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
        title="Delete Category"
        message={`Delete "${deletingItem?.category_name}"? This cannot be undone.`}
        loading={submitting}
      />
    </div>
  )
}
