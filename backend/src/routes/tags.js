const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all tags
router.get('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const tags = await prisma.tag.findMany({
      include: {
        _count: { select: { leads: true, properties: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json(tags);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

// Get tag by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const tag = await prisma.tag.findUnique({
      where: { id: req.params.id },
      include: {
        leads: { include: { lead: true } },
        properties: { include: { property: true } }
      }
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json(tag);
  } catch (error) {
    console.error('Get tag error:', error);
    res.status(500).json({ error: 'Failed to get tag' });
  }
});

// Create tag
router.post('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, color } = req.body;

    const tag = await prisma.tag.create({
      data: {
        name,
        color: color || '#3B82F6'
      }
    });

    res.status(201).json(tag);
  } catch (error) {
    console.error('Create tag error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Tag with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Update tag
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, color } = req.body;

    const tag = await prisma.tag.update({
      where: { id: req.params.id },
      data: { name, color }
    });

    res.json(tag);
  } catch (error) {
    console.error('Update tag error:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// Delete tag
router.delete('/:id', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.tag.delete({ where: { id: req.params.id } });
    res.json({ message: 'Tag deleted' });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

module.exports = router;
