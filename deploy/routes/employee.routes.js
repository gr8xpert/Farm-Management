const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all employees
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      active: true,
      ...(search && {
        OR: [
          { employee_name: { contains: search, mode: 'insensitive' } },
          { nic_no: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [employees, total] = await Promise.all([
      req.prisma.employee.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { employee_name: 'asc' }
      }),
      req.prisma.employee.count({ where })
    ]);

    res.json({
      success: true,
      data: employees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employees' });
  }
});

// Get single employee
router.get('/:id', async (req, res) => {
  try {
    const employee = await req.prisma.employee.findUnique({
      where: { employee_no: parseInt(req.params.id) }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employee' });
  }
});

// Create employee
router.post('/',
  [body('employee_name').trim().notEmpty().withMessage('Employee name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { dob, doj, ...rest } = req.body;

      const employee = await req.prisma.employee.create({
        data: {
          ...rest,
          dob: dob ? new Date(dob) : null,
          doj: doj ? new Date(doj) : null
        }
      });

      res.status(201).json({
        success: true,
        data: employee,
        message: 'Employee created successfully'
      });
    } catch (error) {
      console.error('Create employee error:', error);
      res.status(500).json({ success: false, message: 'Failed to create employee' });
    }
  }
);

// Update employee
router.put('/:id',
  [body('employee_name').trim().notEmpty().withMessage('Employee name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { dob, doj, ...rest } = req.body;

      const employee = await req.prisma.employee.update({
        where: { employee_no: parseInt(req.params.id) },
        data: {
          ...rest,
          dob: dob ? new Date(dob) : null,
          doj: doj ? new Date(doj) : null
        }
      });

      res.json({
        success: true,
        data: employee,
        message: 'Employee updated successfully'
      });
    } catch (error) {
      console.error('Update employee error:', error);
      res.status(500).json({ success: false, message: 'Failed to update employee' });
    }
  }
);

// Delete employee (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.employee.update({
      where: { employee_no: parseInt(req.params.id) },
      data: { active: false }
    });

    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete employee' });
  }
});

module.exports = router;
