import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import DataTable from '../components/Common/DataTable'
import FormModal from '../components/Common/FormModal'
import DeleteConfirm from '../components/Common/DeleteConfirm'
import ImportExportButtons from '../components/Common/ImportExportButtons'

const initialFormData = { bank_name: '', branch: '', address: '', active: true }

export default function Banks() {
  const [banks, setBanks] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [formData, setFormData] = useState(initialFormData)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingItem, setDeletingItem] = useState(null)

  const columns = [
    { key: 'bank_id', label: 'ID' },
    { key: 'bank_name', label: 'Bank Name' },
    { key: 'branch', label: 'Branch' },
    { key: 'address', label: 'Address' },
    { key: 'created_on', label: 'Created', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    {
      key: 'active',
      label: 'Status',
      render: (val, row) => (
        <button
          onClick={() => handleToggleStatus(row)}
          className={`px-2 py-1 text-xs font-medium transition-colors ${
            val
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          style={{ borderRadius: '3px' }}
        >
          {val ? 'Active' : 'Inactive'}
        </button>
      )
    },
  ]

  useEffect(() => { fetchBanks() }, [search])

  const fetchBanks = async (page = 1) => {
    setLoading(true)
    try {
      const response = await api.get('/banks', { params: { page, limit: 10, search } })
      setBanks(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Failed to fetch banks')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (bank) => {
    try {
      await api.put(`/banks/${bank.bank_id}`, {
        bank_name: bank.bank_name,
        branch: bank.branch || '',
        address: bank.address || '',
        active: !bank.active
      })
      toast.success(`Bank ${!bank.active ? 'activated' : 'deactivated'}`)
      fetchBanks()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleSubmit = async () => {
    if (!formData.bank_name.trim()) {
      toast.error('Bank name is required')
      return
    }
    setSubmitting(true)
    try {
      if (editingId) {
        await api.put(`/banks/${editingId}`, formData)
        toast.success('Bank updated')
      } else {
        await api.post('/banks', formData)
        toast.success('Bank created')
      }
      setModalOpen(false)
      setFormData(initialFormData)
      setEditingId(null)
      fetchBanks()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (bank) => {
    setFormData({
      bank_name: bank.bank_name || '',
      branch: bank.branch || '',
      address: bank.address || '',
      active: bank.active
    })
    setEditingId(bank.bank_id)
    setModalOpen(true)
  }

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      await api.delete(`/banks/${deletingItem.bank_id}`)
      toast.success('Bank deleted')
      setDeleteOpen(false)
      setDeletingItem(null)
      fetchBanks()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Banks</h1>
        <div className="flex items-center gap-2">
          <ImportExportButtons
            entityName="Banks"
            exportEndpoint="/import-export/banks/export"
            importEndpoint="/import-export/banks/import"
            onImportSuccess={() => fetchBanks()}
            sampleFields={['bank_name', 'account_number', 'branch_name', 'ifsc_code', 'active']}
          />
          <button
            onClick={() => { setFormData(initialFormData); setEditingId(null); setModalOpen(true) }}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Bank
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search banks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-sm"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={banks}
          pagination={pagination}
          onPageChange={fetchBanks}
          onEdit={handleEdit}
          onDelete={(item) => { setDeletingItem(item); setDeleteOpen(true) }}
          loading={loading}
          hideExport
        />
      </div>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Bank' : 'Add Bank'}
        onSubmit={handleSubmit}
        loading={submitting}
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Bank Name *</label>
            <input
              type="text"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="form-label">Branch</label>
            <input
              type="text"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              className="input-field"
              placeholder="e.g. Main Branch, City Center"
            />
          </div>
          <div>
            <label className="form-label">Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input-field"
              rows={2}
              placeholder="Bank address..."
            />
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
        title="Delete Bank"
        message={`Delete "${deletingItem?.bank_name}"? This cannot be undone.`}
        loading={submitting}
      />
    </div>
  )
}
