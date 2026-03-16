const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all users
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      active: true,
      ...(search && {
        OR: [
          { username: { contains: search } },
          { email: { contains: search } }
        ]
      })
    };

    const [users, total] = await Promise.all([
      req.prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { created_on: 'desc' },
        select: {
          user_id: true,
          username: true,
          email: true,
          role: true,
          active: true,
          created_on: true,
          last_login: true
        }
      }),
      req.prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { user_id: parseInt(req.params.id) },
      select: {
        user_id: true,
        username: true,
        email: true,
        role: true,
        active: true,
        created_on: true,
        last_login: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

// Create user (admin only)
router.post('/',
  [
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Invalid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['ADMIN', 'STAFF']).withMessage('Invalid role')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { username, email, password, role } = req.body;

      // Check if user exists
      const existingUser = await req.prisma.user.findFirst({
        where: {
          OR: [{ username }, { email }]
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username or email already exists'
        });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Create user
      const user = await req.prisma.user.create({
        data: {
          username,
          email,
          password_hash,
          role: role.toUpperCase()
        },
        select: {
          user_id: true,
          username: true,
          email: true,
          role: true,
          active: true,
          created_on: true
        }
      });

      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully'
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ success: false, message: 'Failed to create user' });
    }
  }
);

// Update user
router.put('/:id',
  [
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Invalid email address'),
    body('role').isIn(['ADMIN', 'STAFF']).withMessage('Invalid role')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userId = parseInt(req.params.id);
      const { username, email, role, password, active } = req.body;

      // Check if username/email already taken by another user
      const existingUser = await req.prisma.user.findFirst({
        where: {
          OR: [{ username }, { email }],
          NOT: { user_id: userId }
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username or email already taken'
        });
      }

      // Build update data
      const updateData = {
        username,
        email,
        role: role.toUpperCase(),
        active: active !== undefined ? active : true
      };

      // If password provided, hash and update it
      if (password && password.length >= 6) {
        updateData.password_hash = await bcrypt.hash(password, 10);
      }

      const user = await req.prisma.user.update({
        where: { user_id: userId },
        data: updateData,
        select: {
          user_id: true,
          username: true,
          email: true,
          role: true,
          active: true,
          created_on: true
        }
      });

      res.json({
        success: true,
        data: user,
        message: 'User updated successfully'
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ success: false, message: 'Failed to update user' });
    }
  }
);

// Delete user (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent deleting yourself
    if (userId === req.user.user_id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await req.prisma.user.update({
      where: { user_id: userId },
      data: { active: false }
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

module.exports = router;
