import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import DashboardLayout from './components/Layout/DashboardLayout'
import LoginPage from './components/Auth/LoginPage'
import Dashboard from './pages/Dashboard'
import Suppliers from './pages/Suppliers'
import Customers from './pages/Customers'
import Items from './pages/Items'
import Categories from './pages/Categories'
import WeightUnits from './pages/WeightUnits'
import Cities from './pages/Cities'
import Banks from './pages/Banks'
import Employees from './pages/Employees'
import Purchases from './pages/Purchases'
import PurchaseForm from './pages/PurchaseForm'
import Sales from './pages/Sales'
import SaleForm from './pages/SaleForm'
import Payments from './pages/Payments'
import PurchaseReturns from './pages/PurchaseReturns'
import PurchaseReturnForm from './pages/PurchaseReturnForm'
import SaleReturns from './pages/SaleReturns'
import SaleReturnForm from './pages/SaleReturnForm'
import Settings from './pages/Settings'
import Users from './pages/Users'
import SalesReport from './pages/Reports/SalesReport'
import PurchaseReport from './pages/Reports/PurchaseReport'
import StockReport from './pages/Reports/StockReport'
import ProfitLossReport from './pages/Reports/ProfitLossReport'
import PaymentReport from './pages/Reports/PaymentReport'
import OutstandingReport from './pages/Reports/OutstandingReport'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="customers" element={<Customers />} />
            <Route path="items" element={<Items />} />
            <Route path="categories" element={<Categories />} />
            <Route path="weight-units" element={<WeightUnits />} />
            <Route path="cities" element={<Cities />} />
            <Route path="banks" element={<Banks />} />
            <Route path="employees" element={<Employees />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="purchases/new" element={<PurchaseForm />} />
            <Route path="purchases/:id/edit" element={<PurchaseForm />} />
            <Route path="sales" element={<Sales />} />
            <Route path="sales/new" element={<SaleForm />} />
            <Route path="sales/:id/edit" element={<SaleForm />} />
            <Route path="payments" element={<Payments />} />
            <Route path="purchase-returns" element={<PurchaseReturns />} />
            <Route path="purchase-returns/new" element={<PurchaseReturnForm />} />
            <Route path="sale-returns" element={<SaleReturns />} />
            <Route path="sale-returns/new" element={<SaleReturnForm />} />
            <Route path="settings" element={<Settings />} />
            <Route path="users" element={<Users />} />
            <Route path="reports/sales" element={<SalesReport />} />
            <Route path="reports/purchases" element={<PurchaseReport />} />
            <Route path="reports/stock" element={<StockReport />} />
            <Route path="reports/profit-loss" element={<ProfitLossReport />} />
            <Route path="reports/payments" element={<PaymentReport />} />
            <Route path="reports/outstanding" element={<OutstandingReport />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </AuthProvider>
  )
}

export default App
