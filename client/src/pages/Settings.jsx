import { useState, useEffect } from 'react'
import { Loader2, User, Lock, Database, Download, HardDrive, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState({
    username: '',
    email: ''
  })
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [backupStats, setBackupStats] = useState(null)
  const [backupLoading, setBackupLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username || '',
        email: user.email || ''
      })
    }
    fetchBackupStats()
  }, [user])

  const fetchBackupStats = async () => {
    setBackupLoading(true)
    try {
      const res = await api.get('/backup/stats')
      if (res.data.success) {
        setBackupStats(res.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch backup stats')
    } finally {
      setBackupLoading(false)
    }
  }

  const handleExportBackup = async () => {
    setExportLoading(true)
    try {
      const res = await api.get('/backup/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `farm-backup-${new Date().toISOString().split('T')[0]}.json`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Backup exported successfully')
    } catch (error) {
      toast.error('Failed to export backup')
    } finally {
      setExportLoading(false)
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put('/auth/update-profile', profileData)
      toast.success('Profile updated. Please login again.')
      logout()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordData.new_password.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await api.put('/auth/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      })
      toast.success('Password changed successfully')
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Settings</h1>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Profile Settings */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-green-600" />
            <h2 className="text-sm font-semibold text-gray-700">Profile Settings</h2>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="form-label">Username</label>
              <input
                type="text"
                value={profileData.username}
                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                className="input-field"
                required
                minLength={3}
              />
            </div>

            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Profile
            </button>
          </form>

          <p className="text-xs text-gray-500 mt-3">
            Note: Changing username will require you to login again.
          </p>
        </div>

        {/* Password Settings */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-green-600" />
            <h2 className="text-sm font-semibold text-gray-700">Change Password</h2>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="form-label">Current Password</label>
              <input
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="form-label">New Password</label>
              <input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                className="input-field"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Change Password
            </button>
          </form>
        </div>
      </div>

      {/* Data Backup */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-green-600" />
          <h2 className="text-sm font-semibold text-gray-700">Data Backup</h2>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Export all your data as a JSON backup file. This includes suppliers, customers, items, purchases, sales, payments, and returns.
        </p>

        {backupLoading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading backup info...</span>
          </div>
        ) : backupStats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <HardDrive className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">Total Records</span>
              </div>
              <p className="text-lg font-semibold text-gray-800">{backupStats.totalRecords?.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <span className="text-xs text-blue-600">Suppliers</span>
              <p className="text-lg font-semibold text-blue-800">{backupStats.suppliers}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <span className="text-xs text-green-600">Customers</span>
              <p className="text-lg font-semibold text-green-800">{backupStats.customers}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <span className="text-xs text-purple-600">Items</span>
              <p className="text-lg font-semibold text-purple-800">{backupStats.items}</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg">
              <span className="text-xs text-indigo-600">Purchases</span>
              <p className="text-lg font-semibold text-indigo-800">{backupStats.purchases}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <span className="text-xs text-emerald-600">Sales</span>
              <p className="text-lg font-semibold text-emerald-800">{backupStats.sales}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportBackup}
            disabled={exportLoading}
            className="btn-primary text-sm flex items-center gap-2"
          >
            {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export Backup
          </button>
          <button
            onClick={fetchBackupStats}
            disabled={backupLoading}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${backupLoading ? 'animate-spin' : ''}`} />
            Refresh Stats
          </button>
        </div>
      </div>
    </div>
  )
}
