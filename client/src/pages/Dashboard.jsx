import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Truck,
  Users,
  Package,
  UserCircle,
  ShoppingCart,
  DollarSign,
  RotateCcw,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../services/api'

const statCards = [
  { name: 'Suppliers', key: 'suppliers', icon: Truck, color: 'bg-blue-500', href: '/suppliers' },
  { name: 'Customers', key: 'customers', icon: Users, color: 'bg-green-500', href: '/customers' },
  { name: 'Items', key: 'items', icon: Package, color: 'bg-purple-500', href: '/items' },
  { name: 'Employees', key: 'employees', icon: UserCircle, color: 'bg-orange-500', href: '/employees' },
  { name: 'Purchases', key: 'purchases', icon: ShoppingCart, color: 'bg-indigo-500', href: '/purchases' },
  { name: 'Sales', key: 'sales', icon: DollarSign, color: 'bg-emerald-500', href: '/sales' },
  { name: 'Purchase Returns', key: 'purchaseReturns', icon: RotateCcw, color: 'bg-red-400', href: '/purchase-returns' },
  { name: 'Sale Returns', key: 'saleReturns', icon: RotateCcw, color: 'bg-amber-500', href: '/sale-returns' },
]

export default function Dashboard() {
  const [stats, setStats] = useState({})
  const [recentPurchases, setRecentPurchases] = useState([])
  const [recentSales, setRecentSales] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, purchasesRes, salesRes, monthlyRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-purchases'),
        api.get('/dashboard/recent-sales'),
        api.get('/dashboard/monthly-summary')
      ])

      setStats(statsRes.data.data)
      setRecentPurchases(purchasesRes.data.data)
      setRecentSales(salesRes.data.data)
      setMonthlyData(monthlyRes.data.data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <Link
            key={stat.key}
            to={stat.href}
            className="card hover:shadow-md transition-all p-4"
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 ${stat.color}`}
                style={{ borderRadius: '4px' }}
              >
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-800">
                  {stats[stat.key] || 0}
                </p>
                <p className="text-xs text-gray-600">{stat.name}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Chart */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Monthly Purchases vs Sales
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(value) => `${value / 1000}k`} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label) => `Month: ${label}`}
                contentStyle={{ borderRadius: '4px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="purchases" name="Purchases" fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="sales" name="Sales" fill="#16a34a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Recent Purchases */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Recent Purchases</h2>
            <Link to="/purchases" className="text-xs text-green-600 hover:text-green-700 font-medium">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {recentPurchases.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent purchases</p>
            ) : (
              recentPurchases.map((purchase) => (
                <div
                  key={purchase.po_no}
                  className="flex items-center justify-between py-2 border-b border-gray-100/50 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-800 text-sm">PO #{purchase.po_no}</p>
                    <p className="text-xs text-gray-500">{purchase.supplier?.supplier_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-800 text-sm">
                      {formatCurrency(purchase.total_amount || 0)}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(purchase.po_date)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Recent Sales</h2>
            <Link to="/sales" className="text-xs text-green-600 hover:text-green-700 font-medium">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {recentSales.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent sales</p>
            ) : (
              recentSales.map((sale) => (
                <div
                  key={sale.sale_id}
                  className="flex items-center justify-between py-2 border-b border-gray-100/50 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-800 text-sm">Sale #{sale.sale_id}</p>
                    <p className="text-xs text-gray-500">{sale.customer?.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-800 text-sm">
                      {formatCurrency(sale.total_amount || 0)}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(sale.sale_date)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
