import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import DataTable from '../components/Common/DataTable'
import FormModal from '../components/Common/FormModal'
import DeleteConfirm from '../components/Common/DeleteConfirm'

const columns = [
  { key: 'item_id', label: 'ID' },
  { key: 'items_description', label: 'Description' },
  { key: 'category', label: 'Category', render: (val) => val?.category_name || '-' },
  { key: 'remarks', label: 'Remarks' },
  { key: 'created_on', label: 'Created', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
]

const initialFormData = {
  items_description: '',
  category_id: '',
  remarks: ''
}

export default function Items() {
  const [items, setItems] = useState([])
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

  useEffect(() => {
    fetchItems()
    fetchCategories()
  }, [search])

  const fetchItems = async (page = 1) => {
    setLoading(true)
    try {
      const response = await api.get('/items', { params: { page, limit: 10, search } })
      setItems(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Failed to fetch items')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories', { params: { limit: 100 } })
      setCategories(response.data.data)
    } catch (error) {
      console.error('Failed to fetch categories')
    }
  }

  const handleSubmit = async () => {
    if (!formData.items_description.trim()) {
      toast.error('Item description is required')
      return
    }
    setSubmitting(true)
    try {
      const data = {
        ...formData,
        category_id: formData.category_id ? parseInt(formData.category_id) : null
      }
      if (editingId) {
        await api.put(`/items/${editingId}`, data)
        toast.success('Item updated')
      } else {
        await api.post('/items', data)
        toast.success('Item created')
      }
      setModalOpen(false)
      setFormData(initialFormData)
      setEditingId(null)
      fetchItems()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (item) => {
    setFormData({
      items_description: item.items_description || '',
      category_id: item.category_id || '',
      remarks: item.remarks || ''
    })
    setEditingId(item.item_id)
    setModalOpen(true)
  }

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      await api.delete(`/items/${deletingItem.item_id}`)
      toast.success('Item deleted')
      setDeleteOpen(false)
      setDeletingItem(null)
      fetchItems()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Items</h1>
        <button
          onClick={() => { setFormData(initialFormData); setEditingId(null); setModalOpen(true) }}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-sm"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={items}
          pagination={pagination}
          onPageChange={fetchItems}
          onEdit={handleEdit}
          onDelete={(item) => { setDeletingItem(item); setDeleteOpen(true) }}
          loading={loading}
        />
      </div>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Item' : 'Add Item'}
        onSubmit={handleSubmit}
        loading={submitting}
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Item Description *</label>
            <input
              type="text"
              value={formData.items_description}
              onChange={(e) => setFormData({ ...formData, items_description: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="form-label">Category</label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="input-field"
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
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
        title="Delete Item"
        message={`Delete "${deletingItem?.items_description}"? This cannot be undone.`}
        loading={submitting}
      />
    </div>
  )
}
