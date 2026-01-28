const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all documents
router.get('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { transactionId, type, signatureStatus, page = 1, limit = 20 } = req.query;

    const where = {};
    if (transactionId) where.transactionId = transactionId;
    if (type) where.type = type;
    if (signatureStatus) where.signatureStatus = signatureStatus;

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          transaction: {
            include: {
              property: { select: { address: true, city: true } }
            }
          }
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.document.count({ where })
    ]);

    res.json({ documents, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

// Get document by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: { transaction: { include: { property: true } } }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

// Create document
router.post('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { transactionId, name, type, url, signatureStatus, expiresAt, notes } = req.body;

    const document = await prisma.document.create({
      data: {
        transactionId,
        name,
        type,
        url,
        signatureStatus: signatureStatus || 'NOT_REQUIRED',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        notes
      }
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Update document
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, type, url, signatureStatus, signedAt, expiresAt, notes } = req.body;

    const document = await prisma.document.update({
      where: { id: req.params.id },
      data: {
        name,
        type,
        url,
        signatureStatus,
        signedAt: signedAt ? new Date(signedAt) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        notes
      }
    });

    res.json(document);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.document.delete({ where: { id: req.params.id } });
    res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Update signature status
router.put('/:id/signature', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { signatureStatus } = req.body;

    // Map common status values to valid enum values
    const statusMap = {
      'SIGNED': 'COMPLETED',
      'PENDING': 'PENDING',
      'SENT': 'SENT',
      'COMPLETED': 'COMPLETED',
      'DECLINED': 'DECLINED',
      'EXPIRED': 'EXPIRED'
    };
    const validStatus = statusMap[signatureStatus?.toUpperCase()] || signatureStatus;

    const document = await prisma.document.update({
      where: { id: req.params.id },
      data: {
        signatureStatus: validStatus,
        signedAt: validStatus === 'COMPLETED' ? new Date() : undefined
      }
    });

    res.json(document);
  } catch (error) {
    console.error('Update signature error:', error);
    res.status(500).json({ error: 'Failed to update signature status' });
  }
});

// Get documents pending signature
router.get('/pending/signatures', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const documents = await prisma.document.findMany({
      where: {
        signatureStatus: { in: ['PENDING', 'PARTIALLY_SIGNED'] }
      },
      include: {
        transaction: { include: { property: true, agent: { include: { user: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(documents);
  } catch (error) {
    console.error('Get pending documents error:', error);
    res.status(500).json({ error: 'Failed to get pending documents' });
  }
});

// Get documents by transaction
router.get('/transaction/:transactionId', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const documents = await prisma.document.findMany({
      where: { transactionId: req.params.transactionId },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }]
    });

    res.json(documents);
  } catch (error) {
    console.error('Get transaction documents error:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

module.exports = router;
