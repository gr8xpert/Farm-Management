import { Menu, LogOut, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()

  return (
    <header
      className="sticky top-0 z-30 border-b border-gray-100"
      style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}
    >
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 transition-colors"
          style={{ borderRadius: '4px' }}
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 bg-green-100 flex items-center justify-center"
              style={{ borderRadius: '4px' }}
            >
              <User className="w-4 h-4 text-green-600" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-800">{user?.username}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
            style={{ borderRadius: '4px' }}
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
