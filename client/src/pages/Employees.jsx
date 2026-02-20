import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import DataTable from '../components/Common/DataTable'
import FormModal from '../components/Common/FormModal'
import DeleteConfirm from '../components/Common/DeleteConfirm'

const columns = [
  { key: 'employee_no', label: 'ID' },
  { key: 'employee_name', label: 'Name' },
  { key: 'father_name', label: 'Father Name' },
  { key: 'nic_no', label: 'NIC No' },
  { key: 'dob', label: 'DOB', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
  { key: 'doj', label: 'DOJ', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
  { key: 'phone_no', label: 'Phone' },
  { key: 'mobile_no', label: 'Mobile' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'Province' },
  { key: 'address', label: 'Address' },
  { key: 'ref_name', label: 'Reference' },
  { key: 'monthly_salary', label: 'Monthly Salary', render: (val) => val ? `Rs.${parseFloat(val).toLocaleString('en-PK', { minimumFractionDigits: 2 })}` : '-' },
  { key: 'status', label: 'Status', render: (val) => (
    <span
      className={`px-2 py-1 text-xs font-medium ${val === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
      style={{ borderRadius: '3px' }}
    >
      {val}
    </span>
  )},
]

const initialFormData = {
  employee_name: '', father_name: '', dob: '', doj: '', nic_no: '',
  city: '', state: '', address: '', phone_no: '', mobile_no: '', status: 'active', ref_name: '',
  monthly_salary: ''
}

export default function Employees() {
  const [employees, setEmployees] = useState([])
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

  useEffect(() => { fetchEmployees() }, [search])

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

  const fetchEmployees = async (page = 1) => {
    setLoading(true)
    try {
      const response = await api.get('/employees', { params: { page, limit: 10, search } })
      setEmployees(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Failed to fetch employees')
    } finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!formData.employee_name.trim()) { toast.error('Employee name is required'); return }
    setSubmitting(true)
    try {
      if (editingId) {
        await api.put(`/employees/${editingId}`, formData)
        toast.success('Employee updated successfully')
      } else {
        await api.post('/employees', formData)
        toast.success('Employee created successfully')
      }
      setModalOpen(false); setFormData(initialFormData); setEditingId(null); fetchEmployees()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally { setSubmitting(false) }
  }

  const handleEdit = (emp) => {
    setFormData({
      employee_name: emp.employee_name || '', father_name: emp.father_name || '',
      dob: emp.dob ? emp.dob.split('T')[0] : '', doj: emp.doj ? emp.doj.split('T')[0] : '',
      nic_no: emp.nic_no || '', city: emp.city || '', state: emp.state || '',
      address: emp.address || '', phone_no: emp.phone_no || '', mobile_no: emp.mobile_no || '',
      status: emp.status || 'active', ref_name: emp.ref_name || '',
      monthly_salary: emp.monthly_salary || ''
    })
    setEditingId(emp.employee_no); setModalOpen(true)
  }

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      await api.delete(`/employees/${deletingItem.employee_no}`)
      toast.success('Employee deleted successfully')
      setDeleteOpen(false); setDeletingItem(null); fetchEmployees()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Employees</h1>
        <button
          onClick={() => { setFormData(initialFormData); setEditingId(null); setModalOpen(true) }}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-sm"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={employees}
          pagination={pagination}
          onPageChange={fetchEmployees}
          onEdit={handleEdit}
          onDelete={(item) => { setDeletingItem(item); setDeleteOpen(true) }}
          loading={loading}
        />
      </div>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Employee' : 'Add Employee'}
        onSubmit={handleSubmit}
        loading={submitting}
        size="lg"
      >
        <div className="space-y-4">
          <div className="form-grid-2">
            <div>
              <label className="form-label">Employee Name *</label>
              <input
                type="text"
                value={formData.employee_name}
                onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="form-label">Father Name</label>
              <input
                type="text"
                value={formData.father_name}
                onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="form-grid-3">
            <div>
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label">Date of Joining</label>
              <input
                type="date"
                value={formData.doj}
                onChange={(e) => setFormData({ ...formData, doj: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label">NIC No</label>
              <input
                type="text"
                value={formData.nic_no}
                onChange={(e) => setFormData({ ...formData, nic_no: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div>
              <label className="form-label">Phone</label>
              <input
                type="text"
                value={formData.phone_no}
                onChange={(e) => setFormData({ ...formData, phone_no: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label">Mobile</label>
              <input
                type="text"
                value={formData.mobile_no}
                onChange={(e) => setFormData({ ...formData, mobile_no: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="form-grid-2">
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

          <div className="form-grid-3">
            <div>
              <label className="form-label">Monthly Salary</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.monthly_salary}
                onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value })}
                className="input-field"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="form-label">Reference Name</label>
              <input
                type="text"
                value={formData.ref_name}
                onChange={(e) => setFormData({ ...formData, ref_name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input-field"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </FormModal>

      <DeleteConfirm
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Employee"
        message={`Delete "${deletingItem?.employee_name}"? This cannot be undone.`}
        loading={submitting}
      />
    </div>
  )
}
