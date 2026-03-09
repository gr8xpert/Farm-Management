import { useState, useEffect } from 'react'
import { Plus, Search, FileText, Paperclip } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import DataTable from '../components/Common/DataTable'
import FormModal from '../components/Common/FormModal'
import DeleteConfirm from '../components/Common/DeleteConfirm'
import ImageUploader from '../components/Common/ImageUploader'

const columns = [
  { key: 'payment_id', label: 'ID' },
  { key: 'payment_date', label: 'Date', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
  { key: 'payment_type', label: 'Type', render: (val) => (
    <span
      className={`px-2 py-1 text-xs font-medium ${
        val === 'PAYMENT' ? 'bg-red-100 text-red-700' :
        val === 'RECEIPT' ? 'bg-green-100 text-green-700' :
        val === 'SALARY' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
      }`}
      style={{ borderRadius: '3px' }}
    >{val}</span>
  )},
  { key: 'payment_amount', label: 'Amount', render: (val) => `Rs.${parseFloat(val).toLocaleString('en-PK', { minimumFractionDigits: 2 })}` },
  { key: 'payment_mode', label: 'Mode', render: (val) => val?.replace('_', ' ') || '-' },
  { key: 'bank', label: 'Bank', render: (val) => val?.bank_name || '-' },
  { key: 'supplier', label: 'Supplier', render: (val) => val?.supplier_name || '-' },
  { key: 'customer', label: 'Customer', render: (val) => val?.customer_name || '-' },
  { key: 'purchase', label: 'PO #', render: (val) => val ? `#${val.po_no}` : '-' },
  { key: 'sale', label: 'Sale #', render: (val) => val ? `#${val.sale_id}` : '-' },
  { key: 'employee', label: 'Employee', render: (val) => val?.employee_name || '-' },
  { key: 'salary_type', label: 'Salary Type', render: (val) => val || '-' },
  { key: 'cheque_no', label: 'Cheque No' },
  { key: 'images', label: 'Files', render: (val) => val?.length > 0 ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
      <Paperclip className="w-3 h-3" />
      {val.length}
    </span>
  ) : '-' },
  { key: 'remarks', label: 'Remarks' },
]

const initialFormData = {
  payment_amount: '',
  payment_mode: 'CASH',
  payment_type: 'PAYMENT',
  bank_id: '',
  supplier_id: '',
  customer_id: '',
  po_no: '',
  sale_id: '',
  employee_no: '',
  salary_month: '',
  salary_type: 'REGULAR',
  cheque_no: '',
  cheque_date: '',
  remarks: '',
  images: []
}

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [formData, setFormData] = useState(initialFormData)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingItem, setDeletingItem] = useState(null)

  // Dropdown data
  const [banks, setBanks] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [customers, setCustomers] = useState([])
  const [purchases, setPurchases] = useState([])
  const [sales, setSales] = useState([])
  const [employees, setEmployees] = useState([])
  const [salaryBalance, setSalaryBalance] = useState(null)
  const [viewingPayment, setViewingPayment] = useState(null)

  useEffect(() => {
    fetchPayments()
    fetchDropdownData()
  }, [])

  const fetchPayments = async (page = 1) => {
    setLoading(true)
    try {
      const response = await api.get('/payments', { params: { page, limit: 10 } })
      setPayments(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Failed to fetch payments')
    } finally { setLoading(false) }
  }

  const fetchDropdownData = async () => {
    try {
      const [banksRes, suppliersRes, customersRes, purchasesRes, salesRes, employeesRes] = await Promise.all([
        api.get('/banks', { params: { limit: 100 } }),
        api.get('/suppliers', { params: { limit: 100 } }),
        api.get('/customers', { params: { limit: 100 } }),
        api.get('/purchases', { params: { limit: 100 } }),
        api.get('/sales', { params: { limit: 100 } }),
        api.get('/employees', { params: { limit: 100 } })
      ])
      setBanks(banksRes.data.data.filter(b => b.active))
      setSuppliers(suppliersRes.data.data)
      setCustomers(customersRes.data.data)
      setPurchases(purchasesRes.data.data)
      setSales(salesRes.data.data)
      setEmployees(employeesRes.data.data)
    } catch (error) {
      console.error('Failed to fetch dropdown data')
    }
  }

  const handleSubmit = async () => {
    if (!formData.payment_amount || parseFloat(formData.payment_amount) <= 0) {
      toast.error('Valid payment amount is required')
      return
    }
    if (formData.payment_type === 'SALARY') {
      if (!formData.employee_no) {
        toast.error('Please select an employee')
        return
      }
      if (!formData.salary_month) {
        toast.error('Please select a salary month')
        return
      }
    }
    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        bank_id: formData.bank_id || null,
        supplier_id: formData.supplier_id || null,
        customer_id: formData.customer_id || null,
        po_no: formData.po_no || null,
        sale_id: formData.sale_id || null,
        employee_no: formData.employee_no || null,
        salary_month: formData.salary_month || null,
        salary_type: formData.payment_type === 'SALARY' ? formData.salary_type : null,
        images: formData.images || []
      }

      if (editingId) {
        await api.put(`/payments/${editingId}`, payload)
        toast.success('Payment updated')
      } else {
        await api.post('/payments', payload)
        toast.success('Payment created')
      }
      setModalOpen(false)
      setFormData(initialFormData)
      setEditingId(null)
      fetchPayments()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally { setSubmitting(false) }
  }

  const handleEdit = (payment) => {
    setFormData({
      payment_amount: payment.payment_amount,
      payment_mode: payment.payment_mode,
      payment_type: payment.payment_type,
      bank_id: payment.bank_id || '',
      supplier_id: payment.supplier_id || '',
      customer_id: payment.customer_id || '',
      po_no: payment.po_no || '',
      sale_id: payment.sale_id || '',
      employee_no: payment.employee_no || '',
      salary_month: payment.salary_month ? payment.salary_month.substring(0, 7) : '',
      salary_type: payment.salary_type || 'REGULAR',
      cheque_no: payment.cheque_no || '',
      cheque_date: payment.cheque_date ? payment.cheque_date.split('T')[0] : '',
      remarks: payment.remarks || '',
      images: payment.images || []
    })
    setEditingId(payment.payment_id)
    setSalaryBalance(null)
    if (payment.payment_type === 'SALARY' && payment.employee_no && payment.salary_month) {
      const d = new Date(payment.salary_month)
      fetchSalaryBalance(payment.employee_no, d.getFullYear(), d.getMonth() + 1)
    }
    setModalOpen(true)
  }

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      await api.delete(`/payments/${deletingItem.payment_id}`)
      toast.success('Payment deleted')
      setDeleteOpen(false)
      setDeletingItem(null)
      fetchPayments()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    } finally { setSubmitting(false) }
  }

  const handleTypeChange = (type) => {
    setSalaryBalance(null)
    setFormData({
      ...formData,
      payment_type: type,
      // Clear opposite party when switching types
      supplier_id: type === 'RECEIPT' || type === 'SALARY' ? '' : formData.supplier_id,
      customer_id: type === 'PAYMENT' || type === 'SALARY' ? '' : formData.customer_id,
      po_no: type === 'RECEIPT' || type === 'SALARY' ? '' : formData.po_no,
      sale_id: type === 'PAYMENT' || type === 'SALARY' ? '' : formData.sale_id,
      // Clear salary fields when switching away from SALARY
      employee_no: type === 'SALARY' ? formData.employee_no : '',
      salary_month: type === 'SALARY' ? formData.salary_month : '',
      salary_type: type === 'SALARY' ? formData.salary_type : 'REGULAR',
      payment_amount: type === 'SALARY' ? '' : formData.payment_amount
    })
  }

  const fetchSalaryBalance = async (employeeNo, year, month) => {
    try {
      const res = await api.get(`/payments/salary-balance/${employeeNo}/${year}/${month}`)
      setSalaryBalance(res.data.data)
    } catch (error) {
      console.error('Failed to fetch salary balance')
      setSalaryBalance(null)
    }
  }

  const handleEmployeeChange = (employeeNo) => {
    const emp = employees.find(e => e.employee_no === parseInt(employeeNo))
    const amount = emp?.monthly_salary ? parseFloat(emp.monthly_salary) : ''
    setFormData({ ...formData, employee_no: employeeNo, payment_amount: amount })
    setSalaryBalance(null)
    if (employeeNo && formData.salary_month) {
      const [y, m] = formData.salary_month.split('-')
      fetchSalaryBalance(employeeNo, parseInt(y), parseInt(m))
    }
  }

  const handleSalaryMonthChange = (month) => {
    setFormData({ ...formData, salary_month: month })
    setSalaryBalance(null)
    if (formData.employee_no && month) {
      const [y, m] = month.split('-')
      fetchSalaryBalance(formData.employee_no, parseInt(y), parseInt(m))
    }
  }

  // Filter purchases by selected supplier
  const filteredPurchases = formData.supplier_id
    ? purchases.filter(p => p.supplier_id === parseInt(formData.supplier_id))
    : purchases

  // Filter sales by selected customer
  const filteredSales = formData.customer_id
    ? sales.filter(s => s.customer_id === parseInt(formData.customer_id))
    : sales

  const handleView = (payment) => {
    setViewingPayment(payment)
  }

  const isPdf = (img) => {
    return img.mime_type === 'application/pdf' || img.original_name?.endsWith('.pdf')
  }

  const renderImageThumbnails = (images) => {
    if (!images || images.length === 0) return <span className="text-gray-400">No attachments</span>
    return (
      <div className="flex flex-wrap gap-2">
        {images.map((img) => (
          <a
            key={img.id || img.file_path}
            href={`/uploads/${img.file_path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-20 h-20 rounded border border-gray-200 overflow-hidden bg-gray-50 hover:border-green-400 transition-colors"
            title={img.original_name}
          >
            {isPdf(img) ? (
              <span className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <FileText className="w-6 h-6" />
                <span className="text-[9px] mt-1">PDF</span>
              </span>
            ) : (
              <img
                src={`/uploads/${img.file_path}`}
                alt={img.original_name}
                className="w-full h-full object-cover"
              />
            )}
          </a>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Payments</h1>
        <button
          onClick={() => { setFormData(initialFormData); setEditingId(null); setModalOpen(true) }}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Payment
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={payments}
          pagination={pagination}
          onPageChange={fetchPayments}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={(item) => { setDeletingItem(item); setDeleteOpen(true) }}
          loading={loading}
        />
      </div>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Payment' : 'Add Payment'}
        onSubmit={handleSubmit}
        loading={submitting}
        size="lg"
      >
        <div className="space-y-4">
          {/* Payment Type Selection */}
          <div>
            <label className="form-label">Payment Type *</label>
            <div className="flex w-full mt-1" style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <button
                type="button"
                onClick={() => handleTypeChange('PAYMENT')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  formData.payment_type === 'PAYMENT'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Payment (To Supplier)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('RECEIPT')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-l border-r border-gray-200 ${
                  formData.payment_type === 'RECEIPT'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Receipt (From Customer)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('REFUND')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-r border-gray-200 ${
                  formData.payment_type === 'REFUND'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Refund
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('SALARY')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  formData.payment_type === 'SALARY'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Salary (To Employee)
              </button>
            </div>
          </div>

          <div className={formData.payment_type === 'SALARY' ? 'form-grid-2' : 'form-grid-3'}>
            {formData.payment_type !== 'SALARY' && (
              <div>
                <label className="form-label">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.payment_amount}
                  onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            )}
            <div>
              <label className="form-label">Mode *</label>
              <select
                value={formData.payment_mode}
                onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                className="input-field"
              >
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
            <div>
              <label className="form-label">Bank</label>
              <select
                value={formData.bank_id}
                onChange={(e) => setFormData({ ...formData, bank_id: e.target.value })}
                className="input-field"
              >
                <option value="">Select Bank</option>
                {banks.map(bank => (
                  <option key={bank.bank_id} value={bank.bank_id}>{bank.bank_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Supplier/PO fields - shown for PAYMENT type */}
          {formData.payment_type === 'PAYMENT' && (
            <div className="form-grid-2">
              <div>
                <label className="form-label">Supplier</label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value, po_no: '' })}
                  className="input-field"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Purchase Order</label>
                <select
                  value={formData.po_no}
                  onChange={(e) => setFormData({ ...formData, po_no: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select PO</option>
                  {filteredPurchases.map(p => (
                    <option key={p.po_no} value={p.po_no}>
                      PO #{p.po_no} - Rs.{parseFloat(p.total_amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Customer/Sale fields - shown for RECEIPT type */}
          {formData.payment_type === 'RECEIPT' && (
            <div className="form-grid-2">
              <div>
                <label className="form-label">Customer</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value, sale_id: '' })}
                  className="input-field"
                >
                  <option value="">Select Customer</option>
                  {customers.map(c => (
                    <option key={c.customer_id} value={c.customer_id}>{c.customer_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Sale Invoice</label>
                <select
                  value={formData.sale_id}
                  onChange={(e) => setFormData({ ...formData, sale_id: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select Sale</option>
                  {filteredSales.map(s => (
                    <option key={s.sale_id} value={s.sale_id}>
                      Sale #{s.sale_id} - Rs.{parseFloat(s.total_amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Salary fields - shown for SALARY type */}
          {formData.payment_type === 'SALARY' && (
            <div className="space-y-4">
              <div className="form-grid-2">
                <div>
                  <label className="form-label">Employee *</label>
                  <select
                    value={formData.employee_no}
                    onChange={(e) => handleEmployeeChange(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp.employee_no} value={emp.employee_no}>{emp.employee_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Salary Type *</label>
                  <select
                    value={formData.salary_type}
                    onChange={(e) => setFormData({ ...formData, salary_type: e.target.value })}
                    className="input-field"
                  >
                    <option value="REGULAR">Regular</option>
                    <option value="ADVANCE">Advance</option>
                  </select>
                </div>
              </div>
              <div className="form-grid-2">
                <div>
                  <label className="form-label">Salary Month *</label>
                  <input
                    type="month"
                    value={formData.salary_month}
                    onChange={(e) => handleSalaryMonthChange(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="form-label">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.payment_amount}
                    onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>
              {salaryBalance && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-sm" style={{ borderRadius: '6px' }}>
                  <div className="font-medium text-blue-800 mb-2">Salary Balance Info</div>
                  <div className="grid grid-cols-2 gap-2 text-blue-700">
                    <div>Monthly Salary: <span className="font-medium">Rs.{salaryBalance.monthly_salary.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span></div>
                    <div>Advance Paid: <span className="font-medium">Rs.{salaryBalance.advance_paid.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span></div>
                    <div>Regular Paid: <span className="font-medium">Rs.{salaryBalance.regular_paid.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span></div>
                    <div>Remaining: <span className={`font-medium ${salaryBalance.remaining <= 0 ? 'text-red-600' : ''}`}>Rs.{salaryBalance.remaining.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cheque fields - shown for CHEQUE or BANK_TRANSFER mode */}
          {(formData.payment_mode === 'CHEQUE' || formData.payment_mode === 'BANK_TRANSFER') && (
            <div className="form-grid-2">
              <div>
                <label className="form-label">Cheque No</label>
                <input
                  type="text"
                  value={formData.cheque_no}
                  onChange={(e) => setFormData({ ...formData, cheque_no: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="form-label">Cheque Date</label>
                <input
                  type="date"
                  value={formData.cheque_date}
                  onChange={(e) => setFormData({ ...formData, cheque_date: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          )}

          <div>
            <label className="form-label">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="input-field"
              rows={2}
            />
          </div>

          <div>
            <ImageUploader
              images={formData.images}
              onChange={(imgs) => setFormData({ ...formData, images: imgs })}
              maxImages={5}
              label="Attachments"
            />
          </div>
        </div>
      </FormModal>

      {/* View Modal */}
      {viewingPayment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setViewingPayment(null)}
            />
            <div className="relative w-full max-w-lg modal-content animate-fadeIn">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-base font-semibold text-gray-800">Payment #{viewingPayment.payment_id}</h3>
                <button
                  onClick={() => setViewingPayment(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Date:</span> <span className="text-gray-800">{new Date(viewingPayment.payment_date).toLocaleDateString()}</span></div>
                  <div><span className="text-gray-500">Type:</span> <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    viewingPayment.payment_type === 'PAYMENT' ? 'bg-red-100 text-red-700' :
                    viewingPayment.payment_type === 'RECEIPT' ? 'bg-green-100 text-green-700' :
                    viewingPayment.payment_type === 'SALARY' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>{viewingPayment.payment_type}</span></div>
                  <div><span className="text-gray-500">Amount:</span> <span className="text-gray-800 font-medium">Rs.{parseFloat(viewingPayment.payment_amount).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span></div>
                  <div><span className="text-gray-500">Mode:</span> <span className="text-gray-800">{viewingPayment.payment_mode?.replace('_', ' ')}</span></div>
                  {viewingPayment.bank && <div><span className="text-gray-500">Bank:</span> <span className="text-gray-800">{viewingPayment.bank.bank_name}</span></div>}
                  {viewingPayment.supplier && <div><span className="text-gray-500">Supplier:</span> <span className="text-gray-800">{viewingPayment.supplier.supplier_name}</span></div>}
                  {viewingPayment.customer && <div><span className="text-gray-500">Customer:</span> <span className="text-gray-800">{viewingPayment.customer.customer_name}</span></div>}
                  {viewingPayment.employee && <div><span className="text-gray-500">Employee:</span> <span className="text-gray-800">{viewingPayment.employee.employee_name}</span></div>}
                  {viewingPayment.purchase && (
                    <div className="col-span-2 mt-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      <span className="text-indigo-600 font-medium text-xs uppercase">Linked Purchase</span>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-indigo-500">PO #:</span> <span className="text-indigo-800 font-medium">#{viewingPayment.purchase.po_no}</span></div>
                        <div><span className="text-indigo-500">Date:</span> <span className="text-indigo-800">{new Date(viewingPayment.purchase.po_date).toLocaleDateString()}</span></div>
                        <div><span className="text-indigo-500">Total Amount:</span> <span className="text-indigo-800 font-medium">Rs.{parseFloat(viewingPayment.purchase.total_amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span></div>
                        {viewingPayment.purchase.remarks && <div><span className="text-indigo-500">Remarks:</span> <span className="text-indigo-800">{viewingPayment.purchase.remarks}</span></div>}
                      </div>
                    </div>
                  )}
                  {viewingPayment.sale && (
                    <div className="col-span-2 mt-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                      <span className="text-emerald-600 font-medium text-xs uppercase">Linked Sale</span>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-emerald-500">Sale #:</span> <span className="text-emerald-800 font-medium">#{viewingPayment.sale.sale_id}</span></div>
                        <div><span className="text-emerald-500">Date:</span> <span className="text-emerald-800">{new Date(viewingPayment.sale.sale_date).toLocaleDateString()}</span></div>
                        <div><span className="text-emerald-500">Total Amount:</span> <span className="text-emerald-800 font-medium">Rs.{parseFloat(viewingPayment.sale.total_amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span></div>
                        {viewingPayment.sale.remarks && <div><span className="text-emerald-500">Remarks:</span> <span className="text-emerald-800">{viewingPayment.sale.remarks}</span></div>}
                      </div>
                    </div>
                  )}
                  {viewingPayment.cheque_no && <div><span className="text-gray-500">Cheque:</span> <span className="text-gray-800">{viewingPayment.cheque_no}</span></div>}
                  {viewingPayment.salary_type && <div><span className="text-gray-500">Salary Type:</span> <span className="text-gray-800">{viewingPayment.salary_type}</span></div>}
                </div>
                {viewingPayment.remarks && (
                  <div className="text-sm">
                    <span className="text-gray-500">Remarks:</span>
                    <p className="text-gray-800 mt-1">{viewingPayment.remarks}</p>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="font-medium text-gray-700 mb-3 text-sm">Attachments</h4>
                  {renderImageThumbnails(viewingPayment.images)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirm
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Payment"
        message="Delete this payment? This cannot be undone."
        loading={submitting}
      />
    </div>
  )
}
