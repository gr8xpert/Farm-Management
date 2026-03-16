const express = require('express')
const multer = require('multer')
const { Parser } = require('json2csv')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// Apply auth middleware to all routes
router.use(authMiddleware)

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('Only CSV files are allowed'))
    }
  }
})

// Helper to parse CSV
const parseCSV = (csvText) => {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  const parseLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, '').trim())
  const rows = lines.slice(1).map(line => {
    const values = parseLine(line)
    const row = {}
    headers.forEach((header, i) => {
      row[header] = values[i]?.replace(/^"|"$/g, '').trim() || ''
    })
    return row
  })

  return { headers, rows }
}

// ============= SUPPLIERS =============
router.get('/suppliers/export', async (req, res) => {
  try {
    const suppliers = await req.prisma.supplier.findMany({
      where: { active: true },
      orderBy: { supplier_id: 'asc' }
    })

    const fields = ['supplier_id', 'supplier_name', 'contact_person', 'phone_number', 'email_address', 'country', 'state', 'city', 'address', 'webpage_address']
    const parser = new Parser({ fields })
    const csv = parser.parse(suppliers)

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=suppliers.csv')
    res.send(csv)
  } catch (error) {
    console.error('Export suppliers error:', error)
    res.status(500).json({ success: false, message: 'Export failed' })
  }
})

router.post('/suppliers/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' })

    const csvText = req.file.buffer.toString('utf8')
    const { headers, rows } = parseCSV(csvText)

    if (!headers.includes('supplier_name')) {
      return res.status(400).json({ success: false, message: 'CSV must contain supplier_name column' })
    }

    // Get existing IDs to skip duplicates
    const existing = await req.prisma.supplier.findMany({ select: { supplier_id: true } })
    const existingIds = new Set(existing.map(e => e.supplier_id))

    let imported = 0
    let skipped = 0
    let skippedExisting = 0
    const errors = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        // Skip rows with existing ID
        const idValue = row.supplier_id
        if (idValue && idValue.toString().trim()) {
          const idInt = parseInt(idValue.toString().trim(), 10)
          if (!isNaN(idInt) && existingIds.has(idInt)) {
            skippedExisting++
            continue
          }
        }

        if (!row.supplier_name) {
          skipped++
          errors.push({ row: i + 2, error: 'Missing supplier_name' })
          continue
        }

        await req.prisma.supplier.create({
          data: {
            supplier_name: row.supplier_name,
            contact_person: row.contact_person || null,
            phone_number: row.phone_number || null,
            email_address: row.email_address || null,
            country: row.country || null,
            state: row.state || null,
            city: row.city || null,
            address: row.address || null,
            webpage_address: row.webpage_address || null,
            created_by: req.user.username
          }
        })
        imported++
      } catch (err) {
        skipped++
        errors.push({ row: i + 2, error: err.message })
      }
    }

    res.json({ success: true, imported, skipped: skipped + skippedExisting, skippedExisting, errors })
  } catch (error) {
    console.error('Import suppliers error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ============= CUSTOMERS =============
router.get('/customers/export', async (req, res) => {
  try {
    const customers = await req.prisma.customer.findMany({
      where: { active: true },
      orderBy: { customer_id: 'asc' }
    })

    const fields = ['customer_id', 'customer_name', 'contact_person', 'phone_number', 'email_address', 'country', 'state', 'city', 'address', 'webpage_address']
    const parser = new Parser({ fields })
    const csv = parser.parse(customers)

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv')
    res.send(csv)
  } catch (error) {
    console.error('Export customers error:', error)
    res.status(500).json({ success: false, message: 'Export failed' })
  }
})

router.post('/customers/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' })

    const csvText = req.file.buffer.toString('utf8')
    const { headers, rows } = parseCSV(csvText)

    if (!headers.includes('customer_name')) {
      return res.status(400).json({ success: false, message: 'CSV must contain customer_name column' })
    }

    // Get existing IDs to skip duplicates
    const existing = await req.prisma.customer.findMany({ select: { customer_id: true } })
    const existingIds = new Set(existing.map(e => e.customer_id))

    let imported = 0
    let skipped = 0
    let skippedExisting = 0
    const errors = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        // Skip rows with existing ID
        const idValue = row.customer_id
        if (idValue && idValue.toString().trim()) {
          const idInt = parseInt(idValue.toString().trim(), 10)
          if (!isNaN(idInt) && existingIds.has(idInt)) {
            skippedExisting++
            continue
          }
        }

        if (!row.customer_name) {
          skipped++
          errors.push({ row: i + 2, error: 'Missing customer_name' })
          continue
        }

        await req.prisma.customer.create({
          data: {
            customer_name: row.customer_name,
            contact_person: row.contact_person || null,
            phone_number: row.phone_number || null,
            email_address: row.email_address || null,
            country: row.country || null,
            state: row.state || null,
            city: row.city || null,
            address: row.address || null,
            webpage_address: row.webpage_address || null,
            created_by: req.user.username
          }
        })
        imported++
      } catch (err) {
        skipped++
        errors.push({ row: i + 2, error: err.message })
      }
    }

    res.json({ success: true, imported, skipped: skipped + skippedExisting, skippedExisting, errors })
  } catch (error) {
    console.error('Import customers error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ============= ITEMS =============
router.get('/items/export', async (req, res) => {
  try {
    const items = await req.prisma.item.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: { item_id: 'asc' }
    })

    const data = items.map(item => ({
      item_id: item.item_id,
      items_description: item.items_description,
      category_name: item.category?.category_name || '',
      remarks: item.remarks || ''
    }))

    const fields = ['item_id', 'items_description', 'category_name', 'remarks']
    const parser = new Parser({ fields })
    const csv = parser.parse(data)

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=items.csv')
    res.send(csv)
  } catch (error) {
    console.error('Export items error:', error)
    res.status(500).json({ success: false, message: 'Export failed' })
  }
})

router.post('/items/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' })

    const csvText = req.file.buffer.toString('utf8')
    const { headers, rows } = parseCSV(csvText)

    if (!headers.includes('items_description')) {
      return res.status(400).json({ success: false, message: 'CSV must contain items_description column' })
    }

    // Get existing IDs to skip duplicates
    const existing = await req.prisma.item.findMany({ select: { item_id: true } })
    const existingIds = new Set(existing.map(e => e.item_id))

    const categories = await req.prisma.category.findMany()
    const categoryMap = new Map(categories.map(c => [c.category_name.toLowerCase(), c.category_id]))

    let imported = 0
    let skipped = 0
    let skippedExisting = 0
    const errors = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        // Skip rows with existing ID
        const idValue = row.item_id
        if (idValue && idValue.toString().trim()) {
          const idInt = parseInt(idValue.toString().trim(), 10)
          if (!isNaN(idInt) && existingIds.has(idInt)) {
            skippedExisting++
            continue
          }
        }

        if (!row.items_description) {
          skipped++
          errors.push({ row: i + 2, error: 'Missing items_description' })
          continue
        }

        const categoryId = row.category_name
          ? categoryMap.get(row.category_name.toLowerCase()) || null
          : null

        await req.prisma.item.create({
          data: {
            items_description: row.items_description,
            category_id: categoryId,
            remarks: row.remarks || null,
            created_by: req.user.username
          }
        })
        imported++
      } catch (err) {
        skipped++
        errors.push({ row: i + 2, error: err.message })
      }
    }

    res.json({ success: true, imported, skipped: skipped + skippedExisting, skippedExisting, errors })
  } catch (error) {
    console.error('Import items error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ============= EMPLOYEES =============
router.get('/employees/export', async (req, res) => {
  try {
    const employees = await req.prisma.employee.findMany({
      where: { active: true },
      orderBy: { employee_no: 'asc' }
    })

    const data = employees.map(emp => ({
      employee_no: emp.employee_no,
      employee_name: emp.employee_name,
      father_name: emp.father_name || '',
      phone_no: emp.phone_no || '',
      mobile_no: emp.mobile_no || '',
      address: emp.address || '',
      monthly_salary: emp.monthly_salary || '',
      doj: emp.doj ? new Date(emp.doj).toISOString().split('T')[0] : '',
      status: emp.status || ''
    }))

    const fields = ['employee_no', 'employee_name', 'father_name', 'phone_no', 'mobile_no', 'address', 'monthly_salary', 'doj', 'status']
    const parser = new Parser({ fields })
    const csv = parser.parse(data)

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=employees.csv')
    res.send(csv)
  } catch (error) {
    console.error('Export employees error:', error)
    res.status(500).json({ success: false, message: 'Export failed' })
  }
})

router.post('/employees/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' })

    const csvText = req.file.buffer.toString('utf8')
    const { headers, rows } = parseCSV(csvText)

    if (!headers.includes('employee_name')) {
      return res.status(400).json({ success: false, message: 'CSV must contain employee_name column' })
    }

    // Get existing IDs to skip duplicates
    const existing = await req.prisma.employee.findMany({ select: { employee_no: true } })
    const existingIds = new Set(existing.map(e => e.employee_no))

    let imported = 0
    let skipped = 0
    let skippedExisting = 0
    const errors = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        // Skip rows with existing ID
        const idValue = row.employee_no
        if (idValue && idValue.toString().trim()) {
          const idInt = parseInt(idValue.toString().trim(), 10)
          if (!isNaN(idInt) && existingIds.has(idInt)) {
            skippedExisting++
            continue
          }
        }

        if (!row.employee_name) {
          skipped++
          errors.push({ row: i + 2, error: 'Missing employee_name' })
          continue
        }

        await req.prisma.employee.create({
          data: {
            employee_name: row.employee_name,
            father_name: row.father_name || null,
            phone_no: row.phone_no || null,
            mobile_no: row.mobile_no || null,
            address: row.address || null,
            monthly_salary: row.monthly_salary ? parseFloat(row.monthly_salary) : null,
            doj: row.doj ? new Date(row.doj) : null,
            status: row.status || 'active'
          }
        })
        imported++
      } catch (err) {
        skipped++
        errors.push({ row: i + 2, error: err.message })
      }
    }

    res.json({ success: true, imported, skipped: skipped + skippedExisting, skippedExisting, errors })
  } catch (error) {
    console.error('Import employees error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ============= BANKS =============
router.get('/banks/export', async (req, res) => {
  try {
    const banks = await req.prisma.bank.findMany({
      orderBy: { bank_id: 'asc' }
    })

    const data = banks.map(b => ({
      bank_id: b.bank_id,
      bank_name: b.bank_name,
      branch: b.branch || '',
      account_number: b.account_number || '',
      address: b.address || '',
      active: b.active ? 'true' : 'false'
    }))

    const fields = ['bank_id', 'bank_name', 'branch', 'account_number', 'address', 'active']
    const parser = new Parser({ fields })
    const csv = parser.parse(data)

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=banks.csv')
    res.send(csv)
  } catch (error) {
    console.error('Export banks error:', error)
    res.status(500).json({ success: false, message: 'Export failed' })
  }
})

router.post('/banks/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' })

    const csvText = req.file.buffer.toString('utf8')
    const { headers, rows } = parseCSV(csvText)

    if (!headers.includes('bank_name')) {
      return res.status(400).json({ success: false, message: 'CSV must contain bank_name column' })
    }

    // Get existing IDs to skip duplicates
    const existing = await req.prisma.bank.findMany({ select: { bank_id: true } })
    const existingIds = new Set(existing.map(e => e.bank_id))

    let imported = 0
    let skipped = 0
    let skippedExisting = 0
    const errors = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        // Skip rows with existing ID
        const idValue = row.bank_id
        if (idValue && idValue.toString().trim()) {
          const idInt = parseInt(idValue.toString().trim(), 10)
          if (!isNaN(idInt) && existingIds.has(idInt)) {
            skippedExisting++
            continue
          }
        }

        if (!row.bank_name) {
          skipped++
          errors.push({ row: i + 2, error: 'Missing bank_name' })
          continue
        }

        await req.prisma.bank.create({
          data: {
            bank_name: row.bank_name,
            branch: row.branch || null,
            account_number: row.account_number || null,
            address: row.address || null,
            active: row.active?.toLowerCase() !== 'false',
            created_by: req.user.username
          }
        })
        imported++
      } catch (err) {
        skipped++
        errors.push({ row: i + 2, error: err.message })
      }
    }

    res.json({ success: true, imported, skipped: skipped + skippedExisting, skippedExisting, errors })
  } catch (error) {
    console.error('Import banks error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ============= CATEGORIES =============
router.get('/categories/export', async (req, res) => {
  try {
    const categories = await req.prisma.category.findMany({
      where: { active: true },
      orderBy: { category_id: 'asc' }
    })

    const data = categories.map(c => ({
      category_id: c.category_id,
      category_name: c.category_name,
      description: c.description || ''
    }))

    const fields = ['category_id', 'category_name', 'description']
    const parser = new Parser({ fields })
    const csv = parser.parse(data)

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=categories.csv')
    res.send(csv)
  } catch (error) {
    console.error('Export categories error:', error)
    res.status(500).json({ success: false, message: 'Export failed' })
  }
})

router.post('/categories/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' })

    const csvText = req.file.buffer.toString('utf8')
    const { headers, rows } = parseCSV(csvText)

    if (!headers.includes('category_name')) {
      return res.status(400).json({ success: false, message: 'CSV must contain category_name column' })
    }

    // Get existing IDs to skip duplicates
    const existing = await req.prisma.category.findMany({ select: { category_id: true } })
    const existingIds = new Set(existing.map(e => e.category_id))

    let imported = 0
    let skipped = 0
    let skippedExisting = 0
    const errors = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        // Skip rows with existing ID
        const idValue = row.category_id
        if (idValue && idValue.toString().trim()) {
          const idInt = parseInt(idValue.toString().trim(), 10)
          if (!isNaN(idInt) && existingIds.has(idInt)) {
            skippedExisting++
            continue
          }
        }

        if (!row.category_name) {
          skipped++
          errors.push({ row: i + 2, error: 'Missing category_name' })
          continue
        }

        await req.prisma.category.create({
          data: {
            category_name: row.category_name,
            description: row.description || null
          }
        })
        imported++
      } catch (err) {
        skipped++
        errors.push({ row: i + 2, error: err.message })
      }
    }

    res.json({ success: true, imported, skipped: skipped + skippedExisting, skippedExisting, errors })
  } catch (error) {
    console.error('Import categories error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ============= CITIES =============
router.get('/cities/export', async (req, res) => {
  try {
    const cities = await req.prisma.city.findMany({
      where: { active: true },
      orderBy: { city_id: 'asc' }
    })

    const data = cities.map(c => ({
      city_id: c.city_id,
      city_name: c.city_name,
      description: c.description || ''
    }))

    const fields = ['city_id', 'city_name', 'description']
    const parser = new Parser({ fields })
    const csv = parser.parse(data)

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=cities.csv')
    res.send(csv)
  } catch (error) {
    console.error('Export cities error:', error)
    res.status(500).json({ success: false, message: 'Export failed' })
  }
})

router.post('/cities/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' })

    const csvText = req.file.buffer.toString('utf8')
    const { headers, rows } = parseCSV(csvText)

    if (!headers.includes('city_name')) {
      return res.status(400).json({ success: false, message: 'CSV must contain city_name column' })
    }

    // Get existing IDs to skip duplicates
    const existing = await req.prisma.city.findMany({ select: { city_id: true } })
    const existingIds = new Set(existing.map(e => e.city_id))

    let imported = 0
    let skipped = 0
    let skippedExisting = 0
    const errors = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        // Skip rows with existing ID
        const idValue = row.city_id
        if (idValue && idValue.toString().trim()) {
          const idInt = parseInt(idValue.toString().trim(), 10)
          if (!isNaN(idInt) && existingIds.has(idInt)) {
            skippedExisting++
            continue
          }
        }

        if (!row.city_name) {
          skipped++
          errors.push({ row: i + 2, error: 'Missing city_name' })
          continue
        }

        await req.prisma.city.create({
          data: {
            city_name: row.city_name,
            description: row.description || null
          }
        })
        imported++
      } catch (err) {
        skipped++
        errors.push({ row: i + 2, error: err.message })
      }
    }

    res.json({ success: true, imported, skipped: skipped + skippedExisting, skippedExisting, errors })
  } catch (error) {
    console.error('Import cities error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ============= PAYMENTS =============
router.get('/payments/export', async (req, res) => {
  try {
    const payments = await req.prisma.payment.findMany({
      include: {
        bank: true,
        supplier: true,
        customer: true,
        employee: true,
        purchase: true,
        sale: true
      },
      orderBy: { payment_id: 'asc' }
    })

    const data = payments.map(p => ({
      payment_id: p.payment_id,
      payment_date: p.payment_date ? new Date(p.payment_date).toISOString().split('T')[0] : '',
      payment_type: p.payment_type,
      payment_amount: p.payment_amount,
      payment_mode: p.payment_mode,
      bank_name: p.bank?.bank_name || '',
      supplier_name: p.supplier?.supplier_name || '',
      customer_name: p.customer?.customer_name || '',
      employee_name: p.employee?.employee_name || '',
      po_no: p.purchase?.po_no || '',
      sale_id: p.sale?.sale_id || '',
      salary_type: p.salary_type || '',
      salary_month: p.salary_month ? new Date(p.salary_month).toISOString().split('T')[0].substring(0, 7) : '',
      cheque_no: p.cheque_no || '',
      cheque_date: p.cheque_date ? new Date(p.cheque_date).toISOString().split('T')[0] : '',
      remarks: p.remarks || ''
    }))

    const fields = ['payment_id', 'payment_date', 'payment_type', 'payment_amount', 'payment_mode', 'bank_name', 'supplier_name', 'customer_name', 'employee_name', 'po_no', 'sale_id', 'salary_type', 'salary_month', 'cheque_no', 'cheque_date', 'remarks']
    const parser = new Parser({ fields })
    const csv = parser.parse(data)

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=payments.csv')
    res.send(csv)
  } catch (error) {
    console.error('Export payments error:', error)
    res.status(500).json({ success: false, message: 'Export failed' })
  }
})

router.post('/payments/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' })

    const csvText = req.file.buffer.toString('utf8')
    const { headers, rows } = parseCSV(csvText)

    if (!headers.includes('payment_amount') || !headers.includes('payment_type')) {
      return res.status(400).json({ success: false, message: 'CSV must contain payment_amount and payment_type columns' })
    }

    // Get existing IDs to skip duplicates
    const existing = await req.prisma.payment.findMany({ select: { payment_id: true } })
    const existingIds = new Set(existing.map(e => e.payment_id))

    const banks = await req.prisma.bank.findMany()
    const suppliers = await req.prisma.supplier.findMany()
    const customers = await req.prisma.customer.findMany()
    const employees = await req.prisma.employee.findMany()

    const bankMap = new Map(banks.map(b => [b.bank_name.toLowerCase(), b.bank_id]))
    const supplierMap = new Map(suppliers.map(s => [s.supplier_name.toLowerCase(), s.supplier_id]))
    const customerMap = new Map(customers.map(c => [c.customer_name.toLowerCase(), c.customer_id]))
    const employeeMap = new Map(employees.map(e => [e.employee_name.toLowerCase(), e.employee_no]))

    let imported = 0
    let skipped = 0
    let skippedExisting = 0
    const errors = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        // Skip rows with existing ID
        const idValue = row.payment_id
        if (idValue && idValue.toString().trim()) {
          const idInt = parseInt(idValue.toString().trim(), 10)
          if (!isNaN(idInt) && existingIds.has(idInt)) {
            skippedExisting++
            continue
          }
        }

        if (!row.payment_amount || !row.payment_type) {
          skipped++
          errors.push({ row: i + 2, error: 'Missing payment_amount or payment_type' })
          continue
        }

        const bankId = row.bank_name ? bankMap.get(row.bank_name.toLowerCase()) || null : null
        const supplierId = row.supplier_name ? supplierMap.get(row.supplier_name.toLowerCase()) || null : null
        const customerId = row.customer_name ? customerMap.get(row.customer_name.toLowerCase()) || null : null
        const employeeNo = row.employee_name ? employeeMap.get(row.employee_name.toLowerCase()) || null : null

        await req.prisma.payment.create({
          data: {
            payment_date: row.payment_date ? new Date(row.payment_date) : new Date(),
            payment_type: row.payment_type.toUpperCase(),
            payment_amount: parseFloat(row.payment_amount),
            payment_mode: row.payment_mode?.toUpperCase() || 'CASH',
            bank_id: bankId,
            supplier_id: supplierId,
            customer_id: customerId,
            employee_no: employeeNo,
            po_no: row.po_no ? parseInt(row.po_no) : null,
            sale_id: row.sale_id ? parseInt(row.sale_id) : null,
            salary_type: row.salary_type || null,
            salary_month: row.salary_month ? new Date(row.salary_month + '-01') : null,
            cheque_no: row.cheque_no || null,
            cheque_date: row.cheque_date ? new Date(row.cheque_date) : null,
            remarks: row.remarks || null,
            created_by: req.user.username
          }
        })
        imported++
      } catch (err) {
        skipped++
        errors.push({ row: i + 2, error: err.message })
      }
    }

    res.json({ success: true, imported, skipped: skipped + skippedExisting, skippedExisting, errors })
  } catch (error) {
    console.error('Import payments error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ============= PURCHASES =============
router.post('/purchases/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' })

    const csvText = req.file.buffer.toString('utf8')
    const { headers, rows } = parseCSV(csvText)

    // Required columns
    if (!headers.includes('supplier_name') || !headers.includes('item_description') || !headers.includes('qty') || !headers.includes('price')) {
      return res.status(400).json({ success: false, message: 'CSV must contain supplier_name, item_description, qty, and price columns' })
    }

    // Get lookup data
    const suppliers = await req.prisma.supplier.findMany({ where: { active: true } })
    const items = await req.prisma.item.findMany({ where: { active: true } })
    const supplierMap = new Map(suppliers.map(s => [s.supplier_name.toLowerCase(), s.supplier_id]))
    const itemMap = new Map(items.map(i => [i.items_description.toLowerCase(), i.item_id]))

    // Get existing po_no values to skip duplicates
    const existingPurchases = await req.prisma.purchaseMaster.findMany({ select: { po_no: true } })
    const existingPoNos = new Set(existingPurchases.map(p => p.po_no))

    // Group rows by po_no (if exists) or po_date + supplier_name + remarks
    const purchaseGroups = new Map()
    const errors = []
    let skippedExisting = 0
    const debugInfo = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2

      // Skip rows with existing po_no - check multiple possible column names
      const poNoValue = row.po_no || row['po_no'] || row['PO_NO'] || row['Po_No']
      if (poNoValue && poNoValue.toString().trim()) {
        const poNoStr = poNoValue.toString().trim()
        const poNoInt = parseInt(poNoStr, 10)
        if (!isNaN(poNoInt) && existingPoNos.has(poNoInt)) {
          skippedExisting++
          debugInfo.push(`Row ${rowNum}: Skipped existing po_no=${poNoInt}`)
          continue
        }
      }

      // Validate required fields
      if (!row.supplier_name) {
        errors.push({ row: rowNum, error: 'Missing supplier_name' })
        continue
      }
      if (!row.item_description) {
        errors.push({ row: rowNum, error: 'Missing item_description' })
        continue
      }
      if (!row.qty || !row.price) {
        errors.push({ row: rowNum, error: 'Missing qty or price' })
        continue
      }

      const supplierId = supplierMap.get(row.supplier_name.toLowerCase())
      if (!supplierId) {
        errors.push({ row: rowNum, error: `Supplier "${row.supplier_name}" not found` })
        continue
      }

      const itemId = itemMap.get(row.item_description.toLowerCase())
      if (!itemId) {
        errors.push({ row: rowNum, error: `Item "${row.item_description}" not found` })
        continue
      }

      // Create group key - use po_no if available, otherwise date+supplier+remarks
      const poDate = row.po_date || new Date().toISOString().split('T')[0]
      const groupKey = row.po_no
        ? `po_${row.po_no}`
        : `${poDate}|${row.supplier_name.toLowerCase()}|${(row.remarks || '').toLowerCase()}`

      if (!purchaseGroups.has(groupKey)) {
        purchaseGroups.set(groupKey, {
          po_date: new Date(poDate),
          supplier_id: supplierId,
          remarks: row.remarks || null,
          details: []
        })
      }

      purchaseGroups.get(groupKey).details.push({
        item_id: itemId,
        qty: parseFloat(row.qty),
        price: parseFloat(row.price),
        rowNum
      })
    }

    // Create purchases with transactions
    let imported = 0
    let skipped = errors.length + skippedExisting

    for (const [, purchase] of purchaseGroups) {
      try {
        const totalAmount = purchase.details.reduce((sum, d) => sum + (d.qty * d.price), 0)

        await req.prisma.$transaction(async (tx) => {
          const master = await tx.purchaseMaster.create({
            data: {
              po_date: purchase.po_date,
              supplier_id: purchase.supplier_id,
              remarks: purchase.remarks,
              total_amount: totalAmount,
              created_by: req.user.username
            }
          })

          for (let i = 0; i < purchase.details.length; i++) {
            const d = purchase.details[i]
            await tx.purchaseDetail.create({
              data: {
                po_no: master.po_no,
                sno: i + 1,
                item_id: d.item_id,
                qty: d.qty,
                price: d.price
              }
            })
          }
        })

        imported++
      } catch (err) {
        skipped++
        errors.push({ row: purchase.details[0]?.rowNum || 0, error: err.message })
      }
    }

    res.json({
      success: true,
      imported,
      skipped,
      skippedExisting,
      errors,
      message: `Created ${imported} purchase orders${skippedExisting > 0 ? `, skipped ${skippedExisting} existing` : ''}`,
      debug: {
        existingPoNos: [...existingPoNos].slice(0, 20),
        csvHeaders: headers,
        firstRowData: rows[0],
        totalRows: rows.length,
        debugLog: debugInfo.slice(0, 10)
      }
    })
  } catch (error) {
    console.error('Import purchases error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/purchases/export', async (req, res) => {
  try {
    const purchases = await req.prisma.purchaseMaster.findMany({
      include: {
        supplier: true,
        details: {
          include: { item: true }
        }
      },
      orderBy: { po_no: 'asc' }
    })

    const data = []
    for (const p of purchases) {
      if (p.details.length === 0) {
        data.push({
          po_no: p.po_no,
          po_date: p.po_date ? new Date(p.po_date).toISOString().split('T')[0] : '',
          supplier_name: p.supplier?.supplier_name || '',
          total_amount: p.total_amount,
          remarks: p.remarks || '',
          item_description: '',
          qty: '',
          price: ''
        })
      } else {
        for (const d of p.details) {
          data.push({
            po_no: p.po_no,
            po_date: p.po_date ? new Date(p.po_date).toISOString().split('T')[0] : '',
            supplier_name: p.supplier?.supplier_name || '',
            total_amount: p.total_amount,
            remarks: p.remarks || '',
            item_description: d.item?.items_description || '',
            qty: d.qty,
            price: d.price
          })
        }
      }
    }

    const fields = ['po_no', 'po_date', 'supplier_name', 'total_amount', 'remarks', 'item_description', 'qty', 'price']
    const parser = new Parser({ fields })
    const csv = parser.parse(data)

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=purchases.csv')
    res.send(csv)
  } catch (error) {
    console.error('Export purchases error:', error)
    res.status(500).json({ success: false, message: 'Export failed' })
  }
})

// ============= SALES =============
router.post('/sales/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' })

    const csvText = req.file.buffer.toString('utf8')
    const { headers, rows } = parseCSV(csvText)

    // Required columns
    if (!headers.includes('customer_name') || !headers.includes('item_description') || !headers.includes('qty') || !headers.includes('price')) {
      return res.status(400).json({ success: false, message: 'CSV must contain customer_name, item_description, qty, and price columns' })
    }

    // Get lookup data
    const customers = await req.prisma.customer.findMany({ where: { active: true } })
    const items = await req.prisma.item.findMany({ where: { active: true } })
    const customerMap = new Map(customers.map(c => [c.customer_name.toLowerCase(), c.customer_id]))
    const itemMap = new Map(items.map(i => [i.items_description.toLowerCase(), i.item_id]))

    // Get existing sale_id values to skip duplicates
    const existingSales = await req.prisma.saleMaster.findMany({ select: { sale_id: true } })
    const existingSaleIds = new Set(existingSales.map(s => s.sale_id))

    // Group rows by sale_id (if exists) or sale_date + customer_name + remarks
    const saleGroups = new Map()
    const errors = []
    let skippedExisting = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2

      // Skip rows with existing sale_id
      if (row.sale_id && existingSaleIds.has(parseInt(row.sale_id))) {
        skippedExisting++
        continue
      }

      // Validate required fields
      if (!row.customer_name) {
        errors.push({ row: rowNum, error: 'Missing customer_name' })
        continue
      }
      if (!row.item_description) {
        errors.push({ row: rowNum, error: 'Missing item_description' })
        continue
      }
      if (!row.qty || !row.price) {
        errors.push({ row: rowNum, error: 'Missing qty or price' })
        continue
      }

      const customerId = customerMap.get(row.customer_name.toLowerCase())
      if (!customerId) {
        errors.push({ row: rowNum, error: `Customer "${row.customer_name}" not found` })
        continue
      }

      const itemId = itemMap.get(row.item_description.toLowerCase())
      if (!itemId) {
        errors.push({ row: rowNum, error: `Item "${row.item_description}" not found` })
        continue
      }

      // Create group key - use sale_id if available, otherwise date+customer+remarks
      const saleDate = row.sale_date || new Date().toISOString().split('T')[0]
      const groupKey = row.sale_id
        ? `sale_${row.sale_id}`
        : `${saleDate}|${row.customer_name.toLowerCase()}|${(row.remarks || '').toLowerCase()}`

      if (!saleGroups.has(groupKey)) {
        saleGroups.set(groupKey, {
          sale_date: new Date(saleDate),
          customer_id: customerId,
          remarks: row.remarks || null,
          details: []
        })
      }

      saleGroups.get(groupKey).details.push({
        item_id: itemId,
        qty: parseFloat(row.qty),
        price: parseFloat(row.price),
        rowNum
      })
    }

    // Create sales with transactions
    let imported = 0
    let skipped = errors.length + skippedExisting

    for (const [, sale] of saleGroups) {
      try {
        const totalAmount = sale.details.reduce((sum, d) => sum + (d.qty * d.price), 0)

        await req.prisma.$transaction(async (tx) => {
          const master = await tx.saleMaster.create({
            data: {
              sale_date: sale.sale_date,
              customer_id: sale.customer_id,
              remarks: sale.remarks,
              total_amount: totalAmount,
              created_by: req.user.username
            }
          })

          for (let i = 0; i < sale.details.length; i++) {
            const d = sale.details[i]
            await tx.saleDetail.create({
              data: {
                sale_id: master.sale_id,
                sno: i + 1,
                item_id: d.item_id,
                qty: d.qty,
                price: d.price
              }
            })
          }
        })

        imported++
      } catch (err) {
        skipped++
        errors.push({ row: sale.details[0]?.rowNum || 0, error: err.message })
      }
    }

    res.json({
      success: true,
      imported,
      skipped,
      errors,
      message: `Created ${imported} sales${skippedExisting > 0 ? `, skipped ${skippedExisting} existing` : ''}`
    })
  } catch (error) {
    console.error('Import sales error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/sales/export', async (req, res) => {
  try {
    const sales = await req.prisma.saleMaster.findMany({
      include: {
        customer: true,
        details: {
          include: { item: true }
        }
      },
      orderBy: { sale_id: 'asc' }
    })

    const data = []
    for (const s of sales) {
      if (s.details.length === 0) {
        data.push({
          sale_id: s.sale_id,
          sale_date: s.sale_date ? new Date(s.sale_date).toISOString().split('T')[0] : '',
          customer_name: s.customer?.customer_name || '',
          total_amount: s.total_amount,
          remarks: s.remarks || '',
          item_description: '',
          qty: '',
          price: ''
        })
      } else {
        for (const d of s.details) {
          data.push({
            sale_id: s.sale_id,
            sale_date: s.sale_date ? new Date(s.sale_date).toISOString().split('T')[0] : '',
            customer_name: s.customer?.customer_name || '',
            total_amount: s.total_amount,
            remarks: s.remarks || '',
            item_description: d.item?.items_description || '',
            qty: d.qty,
            price: d.price
          })
        }
      }
    }

    const fields = ['sale_id', 'sale_date', 'customer_name', 'total_amount', 'remarks', 'item_description', 'qty', 'price']
    const parser = new Parser({ fields })
    const csv = parser.parse(data)

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=sales.csv')
    res.send(csv)
  } catch (error) {
    console.error('Export sales error:', error)
    res.status(500).json({ success: false, message: 'Export failed' })
  }
})

module.exports = router
