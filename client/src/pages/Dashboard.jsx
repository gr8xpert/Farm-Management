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
  TrendingDown,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
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

const COLORS = ['#16a34a', '#6366f1', '#f59e0b', '#ec4899']

export default function Dashboard() {
  const [stats, setStats] = useState({})
  const [recentPurchases, setRecentPurchases] = useState([])
  const [recentSales, setRecentSales] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [aiSummary, setAiSummary] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [financials, setFinancials] = useState(null)
  const [alerts, setAlerts] = useState(null)

  useEffect(() => {
    fetchDashboardData()
    fetchAiSummary()
    fetchAlerts()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, purchasesRes, salesRes, monthlyRes, outstandingRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-purchases'),
        api.get('/dashboard/recent-sales'),
        api.get('/dashboard/monthly-summary'),
        api.get('/reports/outstanding').catch(() => ({ data: { data: null } }))
      ])

      setStats(statsRes.data.data)
      setRecentPurchases(purchasesRes.data.data)
      setRecentSales(salesRes.data.data)
      setMonthlyData(monthlyRes.data.data)
      if (outstandingRes.data.data?.summary) {
        setFinancials(outstandingRes.data.data.summary)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAiSummary = async () => {
    setAiLoading(true)
    try {
      const res = await api.get('/ai/summary')
      if (res.data.success) {
        setAiSummary(res.data.data.summary)
      }
    } catch (error) {
      console.error('Error fetching AI summary:', error)
    } finally {
      setAiLoading(false)
    }
  }

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/reports/alerts')
      if (res.data.success) {
        setAlerts(res.data.data)
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
    }
  }

  const formatCurrency = (value) => {
    return `Rs.${Number(value).toLocaleString('en-PK')}`
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

      {/* AI Summary Card */}
      {(aiSummary || aiLoading) && (
        <div className="card bg-gradient-to-br from-green-50 to-emerald-100/50 border-green-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-green-800 mb-2">AI Business Insights</h2>
              {aiLoading ? (
                <div className="flex items-center gap-2 text-green-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
                  <span className="text-sm">Analyzing your business data...</span>
                </div>
              ) : (
                <p className="text-sm text-green-700 leading-relaxed">{aiSummary}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Financial Overview */}
      {financials && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownLeft className="w-4 h-4 text-green-500" />
              <p className="text-xs text-green-600 font-medium">Receivables</p>
            </div>
            <p className="text-lg font-bold text-green-700">{formatCurrency(financials.totalReceivables)}</p>
          </div>
          <div className="card bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="w-4 h-4 text-red-500" />
              <p className="text-xs text-red-600 font-medium">Payables</p>
            </div>
            <p className="text-lg font-bold text-red-700">{formatCurrency(financials.totalPayables)}</p>
          </div>
          <div className="card bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <p className="text-xs text-amber-600 font-medium">Overdue</p>
            </div>
            <p className="text-lg font-bold text-amber-700">{formatCurrency(financials.overdueReceivables)}</p>
          </div>
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              {(financials.netPosition || 0) >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <p className="text-xs text-blue-600 font-medium">Net Position</p>
            </div>
            <p className={`text-lg font-bold ${(financials.netPosition || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(financials.netPosition)}
            </p>
          </div>
        </div>
      )}

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

      {/* Alert Widgets */}
      {alerts && (alerts.lowStockCount > 0 || alerts.overdueCount > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Low Stock Alert */}
          {alerts.lowStockCount > 0 && (
            <div className="card border-red-200 bg-red-50/50">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h2 className="text-sm font-semibold text-red-700">Low Stock Alert ({alerts.lowStockCount})</h2>
              </div>
              <div className="space-y-2">
                {alerts.lowStock?.slice(0, 5).map((item) => (
                  <div key={item.item_id} className="flex items-center justify-between py-1 border-b border-red-100 last:border-0">
                    <span className="text-sm text-gray-700">{item.items_description}</span>
                    <span className="text-xs font-medium text-red-600">
                      {parseFloat(item.stock_on_hand).toFixed(1)} / {parseFloat(item.reorder_level).toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
              <Link to="/items" className="text-xs text-red-600 hover:text-red-700 font-medium mt-2 inline-block">
                View all items →
              </Link>
            </div>
          )}

          {/* Overdue Payments Alert */}
          {alerts.overdueCount > 0 && (
            <div className="card border-amber-200 bg-amber-50/50">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="text-sm font-semibold text-amber-700">Overdue Payments ({alerts.overdueCount})</h2>
              </div>
              <div className="space-y-2">
                {alerts.overduePayments?.slice(0, 5).map((payment, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-amber-100 last:border-0">
                    <div>
                      <span className="text-sm text-gray-700">{payment.customer}</span>
                      <span className="text-xs text-amber-600 ml-2">({payment.days} days)</span>
                    </div>
                    <span className="text-xs font-medium text-amber-700">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                ))}
              </div>
              <Link to="/payments" className="text-xs text-amber-600 hover:text-amber-700 font-medium mt-2 inline-block">
                View payments →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
