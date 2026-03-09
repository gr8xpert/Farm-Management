import { useState, useEffect, useRef } from 'react'
import { X, Printer, Download } from 'lucide-react'
import api from '../../services/api'

export default function InvoiceModal({ saleId, onClose }) {
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef(null)

  useEffect(() => {
    fetchInvoice()
  }, [saleId])

  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/reports/invoice/${saleId}`)
      if (res.data.success) {
        // Transform backend data to match frontend expectations
        const inv = res.data.data.invoice
        setInvoice({
          invoiceNo: inv.invoiceNo,
          date: inv.date,
          customer: {
            name: inv.customer?.customer_name || 'N/A',
            address: inv.customer?.address,
            city: inv.customer?.city,
            phone: inv.customer?.phone
          },
          items: inv.items.map(item => ({
            description: item.description,
            qty: item.qty,
            price: item.price,
            total: item.amount
          })),
          subtotal: inv.subtotal,
          total: inv.totalAmount,
          amountPaid: inv.totalPaid,
          balanceDue: inv.outstanding
        })
      }
    } catch (error) {
      console.error('Failed to fetch invoice')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val) => `Rs.${parseFloat(val || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`
  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${invoice.invoiceNo}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .invoice-header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .company-info h1 { font-size: 28px; color: #16a34a; margin-bottom: 5px; }
            .company-info p { color: #666; font-size: 14px; }
            .invoice-info { text-align: right; }
            .invoice-info h2 { font-size: 24px; color: #333; margin-bottom: 10px; }
            .invoice-info p { font-size: 14px; color: #666; margin: 3px 0; }
            .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .party { flex: 1; }
            .party h3 { font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 10px; }
            .party p { margin: 4px 0; }
            .party .name { font-weight: bold; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f5f5f5; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
            td { padding: 12px; border-bottom: 1px solid #eee; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .totals { margin-top: 20px; margin-left: auto; width: 300px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .totals-row.grand { font-size: 18px; font-weight: bold; border-top: 2px solid #333; border-bottom: none; padding-top: 15px; }
            .footer { margin-top: 50px; text-align: center; color: #999; font-size: 12px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <div class="company-info">
              <h1>Kun Farm</h1>
              <p>Farm Management System</p>
            </div>
            <div class="invoice-info">
              <h2>INVOICE</h2>
              <p><strong>#${invoice.invoiceNo}</strong></p>
              <p>Date: ${formatDate(invoice.date)}</p>
            </div>
          </div>

          <div class="parties">
            <div class="party">
              <h3>Bill To</h3>
              <p class="name">${invoice.customer.name}</p>
              ${invoice.customer.address ? `<p>${invoice.customer.address}</p>` : ''}
              ${invoice.customer.city ? `<p>${invoice.customer.city}</p>` : ''}
              ${invoice.customer.phone ? `<p>Phone: ${invoice.customer.phone}</p>` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map((item, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${item.description}</td>
                  <td class="text-center">${item.qty}</td>
                  <td class="text-right">${formatCurrency(item.price)}</td>
                  <td class="text-right">${formatCurrency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(invoice.subtotal)}</span>
            </div>
            <div class="totals-row">
              <span>Amount Paid:</span>
              <span>${formatCurrency(invoice.amountPaid)}</span>
            </div>
            <div class="totals-row">
              <span>Balance Due:</span>
              <span>${formatCurrency(invoice.balanceDue)}</span>
            </div>
            <div class="totals-row grand">
              <span>Total:</span>
              <span>${formatCurrency(invoice.total)}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-3xl modal-content animate-fadeIn max-h-[90vh] overflow-y-auto">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
            <h3 className="text-base font-semibold text-gray-800">
              Invoice {invoice ? `#${invoice.invoiceNo}` : ''}
            </h3>
            <div className="flex items-center gap-2">
              {invoice && (
                <button
                  onClick={handlePrint}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-6" ref={printRef}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
              </div>
            ) : invoice ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold text-green-600">Kun Farm</h1>
                    <p className="text-sm text-gray-500">Farm Management System</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-semibold text-gray-800">INVOICE</h2>
                    <p className="text-sm text-gray-600 mt-1">#{invoice.invoiceNo}</p>
                    <p className="text-sm text-gray-500">{formatDate(invoice.date)}</p>
                  </div>
                </div>

                {/* Bill To */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-xs uppercase text-gray-500 mb-2">Bill To</h3>
                  <p className="font-semibold text-gray-800">{invoice.customer.name}</p>
                  {invoice.customer.address && <p className="text-sm text-gray-600">{invoice.customer.address}</p>}
                  {invoice.customer.city && <p className="text-sm text-gray-600">{invoice.customer.city}</p>}
                  {invoice.customer.phone && <p className="text-sm text-gray-600">Phone: {invoice.customer.phone}</p>}
                </div>

                {/* Items */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 font-semibold text-gray-600">#</th>
                      <th className="text-left py-3 font-semibold text-gray-600">Description</th>
                      <th className="text-center py-3 font-semibold text-gray-600">Qty</th>
                      <th className="text-right py-3 font-semibold text-gray-600">Price</th>
                      <th className="text-right py-3 font-semibold text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-3 text-gray-500">{i + 1}</td>
                        <td className="py-3 text-gray-800">{item.description}</td>
                        <td className="py-3 text-center text-gray-800">{item.qty}</td>
                        <td className="py-3 text-right text-gray-800">{formatCurrency(item.price)}</td>
                        <td className="py-3 text-right font-medium text-gray-800">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal:</span>
                      <span className="text-gray-800">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Amount Paid:</span>
                      <span className="text-green-600">{formatCurrency(invoice.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Balance Due:</span>
                      <span className={invoice.balanceDue > 0 ? 'text-red-600' : 'text-gray-800'}>
                        {formatCurrency(invoice.balanceDue)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t-2 border-gray-300 pt-2 mt-2">
                      <span className="text-gray-800">Total:</span>
                      <span className="text-gray-800">{formatCurrency(invoice.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-gray-500 pt-6 border-t border-gray-100">
                  <p>Thank you for your business!</p>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Failed to load invoice</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
