import { useState, useEffect } from 'react'
import { Plus, Search, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import DataTable from '../components/Common/DataTable'
import FormModal from '../components/Common/FormModal'
import DeleteConfirm from '../components/Common/DeleteConfirm'

const columns = [
  { key: 'user_id', label: 'ID' },
  { key: 'username', label: 'Username' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role', render: (val) => (
    <span
      className={`px-2 py-1 text-xs font-medium ${
        val === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
      }`}
      style={{ borderRadius: '3px' }}
    >{val}</span>
  )},
  { key: 'last_login', label: 'Last Login', render: (val) => val ? new Date(val).toLocaleDateString() : 'Never' },
  { key: 'created_on', label: 'Created', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
  {
    key: 'active',
    label: 'Status',
    render: (val) => (
      <span
        className={`px-2 py-1 text-xs font-medium ${
          val ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}
        style={{ borderRadius: '3px' }}
      >
        {val ? 'Active' : 'Inactive'}
      </span>
    )
  },
]

const initialFormData = {
  username: '',
  email: '',
  password: '',
  role: 'STAFF',
  active: true
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [formData, setFormData] = useState(initialFormData)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingItem, setDeletingItem] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => { fetchUsers() }, [search])

  const fetchUsers = async (page = 1) => {
    setLoading(true)
    try {
      const response = await api.get('/users', { params: { page, limit: 10, search } })
      setUsers(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Failed to fetch users')
    } finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!formData.username.trim()) {
      toast.error('Username is required')
      return
    }
    if (!formData.email.trim()) {
      toast.error('Email is required')
      return
    }
    if (!editingId && !formData.password) {
      toast.error('Password is required for new users')
      return
    }
    if (formData.password && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setSubmitting(true)
    try {
      const payload = { ...formData }
      if (editingId && !formData.password) {
        delete payload.password
      }

      if (editingId) {
        await api.put(`/users/${editingId}`, payload)
        toast.success('User updated')
      } else {
        await api.post('/users', payload)
        toast.success('User created')
      }
      setModalOpen(false)
      setFormData(initialFormData)
      setEditingId(null)
      setShowPassword(false)
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally { setSubmitting(false) }
  }

  const handleEdit = (user) => {
    setFormData({
      username: user.username || '',
      email: user.email || '',
      password: '',
      role: user.role || 'STAFF',
      active: user.active
    })
    setEditingId(user.user_id)
    setShowPassword(false)
    setModalOpen(true)
  }

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      await api.delete(`/users/${deletingItem.user_id}`)
      toast.success('User deleted')
      setDeleteOpen(false)
      setDeletingItem(null)
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Users</h1>
        <button
          onClick={() => { setFormData(initialFormData); setEditingId(null); setShowPassword(false); setModalOpen(true) }}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-sm"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={users}
          pagination={pagination}
          onPageChange={fetchUsers}
          onEdit={handleEdit}
          onDelete={(item) => { setDeletingItem(item); setDeleteOpen(true) }}
          loading={loading}
        />
      </div>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit User' : 'Add User'}
        onSubmit={handleSubmit}
        loading={submitting}
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Username *</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="form-label">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="form-label">
              Password {editingId ? '(leave blank to keep current)' : '*'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input-field pr-10"
                placeholder={editingId ? 'Enter new password to change' : 'Enter password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="form-label">Role *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="input-field"
            >
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          {editingId && (
            <div>
              <label className="form-label">Status</label>
              <div className="flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, active: true })}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    formData.active
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={{ borderRadius: '4px' }}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, active: false })}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    !formData.active
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={{ borderRadius: '4px' }}
                >
                  Inactive
                </button>
              </div>
            </div>
          )}
        </div>
      </FormModal>

      <DeleteConfirm
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Delete user "${deletingItem?.username}"? This will deactivate the account.`}
        loading={submitting}
      />
    </div>
  )
}
