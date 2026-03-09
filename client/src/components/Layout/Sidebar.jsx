import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard,
  Truck,
  Users,
  Package,
  FolderTree,
  Building2,
  UserCircle,
  ShoppingCart,
  DollarSign,
  CreditCard,
  RotateCcw,
  Settings,
  X,
  Scale,
  MapPin,
  ShieldCheck,
  FileBarChart,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Suppliers', href: '/suppliers', icon: Truck },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Items', href: '/items', icon: Package },
  { name: 'Categories', href: '/categories', icon: FolderTree },
  { name: 'Weight Units', href: '/weight-units', icon: Scale },
  { name: 'Cities', href: '/cities', icon: MapPin },
  { name: 'Banks', href: '/banks', icon: Building2 },
  { name: 'Employees', href: '/employees', icon: UserCircle },
  { name: 'Purchases', href: '/purchases', icon: ShoppingCart },
  { name: 'Sales', href: '/sales', icon: DollarSign },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Purchase Returns', href: '/purchase-returns', icon: RotateCcw },
  { name: 'Sale Returns', href: '/sale-returns', icon: RotateCcw },
]

const reportNavigation = [
  { name: 'Sales Report', href: '/reports/sales', icon: DollarSign },
  { name: 'Purchase Report', href: '/reports/purchases', icon: ShoppingCart },
  { name: 'Stock Report', href: '/reports/stock', icon: Package },
  { name: 'Profit & Loss', href: '/reports/profit-loss', icon: TrendingUp },
  { name: 'Payment Report', href: '/reports/payments', icon: CreditCard },
  { name: 'Outstanding', href: '/reports/outstanding', icon: AlertCircle },
]

const adminNavigation = [
  { name: 'Users', href: '/users', icon: ShieldCheck },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar({ open, onClose }) {
  const [reportsOpen, setReportsOpen] = useState(false)

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-60 transform transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.05)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 flex items-center justify-center" style={{ borderRadius: '4px' }}>
            <span className="text-white font-bold text-sm">KC</span>
          </div>
          <span className="font-semibold text-gray-800 text-sm">Kun Farm</span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1 hover:bg-gray-100"
          style={{ borderRadius: '4px' }}
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-0.5 overflow-y-auto h-[calc(100vh-3.5rem)]">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <item.icon className="w-4 h-4" />
            <span className="text-sm">{item.name}</span>
          </NavLink>
        ))}

        {/* Reports Section */}
        <div className="pt-2">
          <button
            onClick={() => setReportsOpen(!reportsOpen)}
            className="sidebar-link w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <FileBarChart className="w-4 h-4" />
              <span className="text-sm">Reports</span>
            </div>
            {reportsOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {reportsOpen && (
            <div className="ml-4 mt-1 space-y-0.5">
              {reportNavigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'active' : ''}`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm">{item.name}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Admin Section */}
        <div className="pt-2 border-t border-gray-100 mt-2">
          {adminNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <item.icon className="w-4 h-4" />
              <span className="text-sm">{item.name}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  )
}
