const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const router = express.Router();
router.use(authMiddleware);

// Helper: save attachment records for a purchase
async function saveAttachments(prisma, po_no, masterImages, details, username) {
  const records = [];

  // Master-level images
  if (masterImages && masterImages.length > 0) {
    for (const img of masterImages) {
      records.push({
        entity_type: 'PURCHASE_MASTER',
        entity_id: po_no,
        sno: null,
        file_path: img.file_path,
        original_name: img.original_name,
        mime_type: img.mime_type || null,
        file_size: img.file_size || null,
        created_by: username
      });
    }
  }

  // Detail-level images (keyed by sno)
  if (details && details.length > 0) {
    details.forEach((d, index) => {
      if (d.images && d.images.length > 0) {
        for (const img of d.images) {
          records.push({
            entity_type: 'PURCHASE_DETAIL',
            entity_id: po_no,
            sno: index + 1,
            file_path: img.file_path,
            original_name: img.original_name,
            mime_type: img.mime_type || null,
            file_size: img.file_size || null,
            created_by: username
          });
        }
      }
    });
  }

  if (records.length > 0) {
    await prisma.attachment.createMany({ data: records });
  }
}

// Helper: delete physical files for attachment records
function deletePhysicalFiles(attachments) {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  for (const att of attachments) {
    try {
      const fullPath = path.join(uploadsDir, att.file_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (err) {
      console.error('Failed to delete file:', att.file_path, err.message);
    }
  }
}

// Get all purchases with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', supplier_id } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(supplier_id && { supplier_id: parseInt(supplier_id) }),
      ...(search && {
        OR: [
          { supplier: { supplier_name: { contains: search, mode: 'insensitive' } } },
          { remarks: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [purchases, total] = await Promise.all([
      req.prisma.purchaseMaster.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          supplier: { select: { supplier_id: true, supplier_name: true } },
          details: {
            include: {
              item: { select: { item_id: true, items_description: true } }
            }
          }
        },
        orderBy: { po_date: 'desc' }
      }),
      req.prisma.purchaseMaster.count({ where })
    ]);

    res.json({
      success: true,
      data: purchases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch purchases' });
  }
});

// Get single purchase (with attachments)
router.get('/:id', async (req, res) => {
  try {
    const po_no = parseInt(req.params.id);
    const purchase = await req.prisma.purchaseMaster.findUnique({
      where: { po_no },
      include: {
        supplier: true,
        details: {
          include: { item: true },
          orderBy: { sno: 'asc' }
        }
      }
    });

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    // Fetch attachments
    const attachments = await req.prisma.attachment.findMany({
      where: {
        entity_type: { in: ['PURCHASE_MASTER', 'PURCHASE_DETAIL'] },
        entity_id: po_no
      }
    });

    // Separate master and detail images
    const master_images = attachments.filter(a => a.entity_type === 'PURCHASE_MASTER');
    const detailImages = attachments.filter(a => a.entity_type === 'PURCHASE_DETAIL');

    // Attach images to each detail by sno
    const detailsWithImages = purchase.details.map(d => ({
      ...d,
      images: detailImages.filter(a => a.sno === d.sno)
    }));

    res.json({
      success: true,
      data: {
        ...purchase,
        details: detailsWithImages,
        master_images
      }
    });
  } catch (error) {
    console.error('Get purchase error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch purchase' });
  }
});

// Create purchase (master + details in transaction)
router.post('/',
  [
    body('supplier_id').isInt().withMessage('Supplier is required'),
    body('details').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('details.*.item_id').isInt().withMessage('Item ID is required'),
    body('details.*.qty').isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),
    body('details.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { supplier_id, po_date, remarks, ref_name, details, master_images } = req.body;

      // Calculate total amount
      const total_amount = details.reduce((sum, d) => sum + (parseFloat(d.qty) * parseFloat(d.price)), 0);

      const purchase = await req.prisma.$transaction(async (prisma) => {
        // Create master
        const master = await prisma.purchaseMaster.create({
          data: {
            supplier_id: parseInt(supplier_id),
            po_date: po_date ? new Date(po_date) : new Date(),
            remarks,
            ref_name,
            created_by: req.user.username,
            total_amount
          }
        });

        // Create details
        await prisma.purchaseDetail.createMany({
          data: details.map((d, index) => ({
            po_no: master.po_no,
            sno: index + 1,
            item_id: parseInt(d.item_id),
            qty: parseFloat(d.qty),
            price: parseFloat(d.price),
            age: d.age ? parseInt(d.age) : null,
            weight: d.weight ? parseFloat(d.weight) : null,
            weight_unit: d.weight_unit || null,
            remarks: d.remarks
          }))
        });

        // Save attachments
        await saveAttachments(prisma, master.po_no, master_images, details, req.user.username);

        // Return with details
        return prisma.purchaseMaster.findUnique({
          where: { po_no: master.po_no },
          include: {
            supplier: true,
            details: { include: { item: true } }
          }
        });
      });

      res.status(201).json({
        success: true,
        data: purchase,
        message: 'Purchase created successfully'
      });
    } catch (error) {
      console.error('Create purchase error:', error);
      res.status(500).json({ success: false, message: 'Failed to create purchase' });
    }
  }
);

// Update purchase
router.put('/:id',
  [
    body('supplier_id').isInt().withMessage('Supplier is required'),
    body('details').isArray({ min: 1 }).withMessage('At least one item is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const po_no = parseInt(req.params.id);
      const { supplier_id, po_date, remarks, ref_name, details, master_images } = req.body;

      const total_amount = details.reduce((sum, d) => sum + (parseFloat(d.qty) * parseFloat(d.price)), 0);

      // Get existing attachments to reconcile
      const existingAttachments = await req.prisma.attachment.findMany({
        where: {
          entity_type: { in: ['PURCHASE_MASTER', 'PURCHASE_DETAIL'] },
          entity_id: po_no
        }
      });

      // Determine which existing attachments to keep (those with IDs in the incoming data)
      const incomingMasterIds = (master_images || []).filter(img => img.id).map(img => img.id);
      const incomingDetailIds = (details || []).flatMap(d => (d.images || []).filter(img => img.id).map(img => img.id));
      const keepIds = new Set([...incomingMasterIds, ...incomingDetailIds]);

      // Attachments to remove
      const toRemove = existingAttachments.filter(a => !keepIds.has(a.id));

      // New attachments (those without id)
      const newMasterImages = (master_images || []).filter(img => !img.id);
      const newDetails = (details || []).map(d => ({
        ...d,
        images: (d.images || []).filter(img => !img.id)
      }));

      const purchase = await req.prisma.$transaction(async (prisma) => {
        // Update master
        await prisma.purchaseMaster.update({
          where: { po_no },
          data: {
            supplier_id: parseInt(supplier_id),
            po_date: po_date ? new Date(po_date) : undefined,
            remarks,
            ref_name,
            total_amount
          }
        });

        // Delete existing details
        await prisma.purchaseDetail.deleteMany({ where: { po_no } });

        // Create new details
        await prisma.purchaseDetail.createMany({
          data: details.map((d, index) => ({
            po_no,
            sno: index + 1,
            item_id: parseInt(d.item_id),
            qty: parseFloat(d.qty),
            price: parseFloat(d.price),
            age: d.age ? parseInt(d.age) : null,
            weight: d.weight ? parseFloat(d.weight) : null,
            weight_unit: d.weight_unit || null,
            remarks: d.remarks
          }))
        });

        // Remove old attachments that are no longer referenced
        if (toRemove.length > 0) {
          await prisma.attachment.deleteMany({
            where: { id: { in: toRemove.map(a => a.id) } }
          });
        }

        // Update sno for kept detail attachments (rows may have been reordered)
        for (let i = 0; i < details.length; i++) {
          const keptImgs = (details[i].images || []).filter(img => img.id);
          for (const img of keptImgs) {
            await prisma.attachment.update({
              where: { id: img.id },
              data: { sno: i + 1 }
            });
          }
        }

        // Save new attachments
        await saveAttachments(prisma, po_no, newMasterImages, newDetails, req.user.username);

        return prisma.purchaseMaster.findUnique({
          where: { po_no },
          include: {
            supplier: true,
            details: { include: { item: true } }
          }
        });
      });

      // Delete physical files for removed attachments (outside transaction)
      deletePhysicalFiles(toRemove);

      res.json({
        success: true,
        data: purchase,
        message: 'Purchase updated successfully'
      });
    } catch (error) {
      console.error('Update purchase error:', error);
      res.status(500).json({ success: false, message: 'Failed to update purchase' });
    }
  }
);

// Delete purchase
router.delete('/:id', async (req, res) => {
  try {
    const po_no = parseInt(req.params.id);

    // Check for returns
    const returnCount = await req.prisma.purchaseReturnMaster.count({
      where: { po_no }
    });

    if (returnCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete purchase with existing returns'
      });
    }

    // Fetch attachments before deleting
    const attachments = await req.prisma.attachment.findMany({
      where: {
        entity_type: { in: ['PURCHASE_MASTER', 'PURCHASE_DETAIL'] },
        entity_id: po_no
      }
    });

    await req.prisma.$transaction(async (prisma) => {
      // Delete attachments from DB
      await prisma.attachment.deleteMany({
        where: {
          entity_type: { in: ['PURCHASE_MASTER', 'PURCHASE_DETAIL'] },
          entity_id: po_no
        }
      });
      await prisma.purchaseDetail.deleteMany({ where: { po_no } });
      await prisma.purchaseMaster.delete({ where: { po_no } });
    });

    // Delete physical files (outside transaction)
    deletePhysicalFiles(attachments);

    res.json({ success: true, message: 'Purchase deleted successfully' });
  } catch (error) {
    console.error('Delete purchase error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete purchase' });
  }
});

module.exports = router;
