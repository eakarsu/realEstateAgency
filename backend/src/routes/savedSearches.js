const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get user's saved searches
router.get('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const searches = await prisma.savedSearch.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(searches);
  } catch (error) {
    console.error('Get saved searches error:', error);
    res.status(500).json({ error: 'Failed to get saved searches' });
  }
});

// Get saved search by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const search = await prisma.savedSearch.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!search) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    res.json(search);
  } catch (error) {
    console.error('Get saved search error:', error);
    res.status(500).json({ error: 'Failed to get saved search' });
  }
});

// Create saved search
router.post('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, criteria, alertFrequency } = req.body;

    const search = await prisma.savedSearch.create({
      data: {
        userId: req.user.id,
        name,
        criteria,
        alertFrequency: alertFrequency || 'DAILY',
        isActive: true
      }
    });

    res.status(201).json(search);
  } catch (error) {
    console.error('Create saved search error:', error);
    res.status(500).json({ error: 'Failed to create saved search' });
  }
});

// Update saved search
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, criteria, alertFrequency, isActive } = req.body;

    // Verify ownership
    const existing = await prisma.savedSearch.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    const search = await prisma.savedSearch.update({
      where: { id: req.params.id },
      data: { name, criteria, alertFrequency, isActive }
    });

    res.json(search);
  } catch (error) {
    console.error('Update saved search error:', error);
    res.status(500).json({ error: 'Failed to update saved search' });
  }
});

// Delete saved search
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    // Verify ownership
    const existing = await prisma.savedSearch.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    await prisma.savedSearch.delete({ where: { id: req.params.id } });
    res.json({ message: 'Saved search deleted' });
  } catch (error) {
    console.error('Delete saved search error:', error);
    res.status(500).json({ error: 'Failed to delete saved search' });
  }
});

// Run saved search (get matching properties)
router.get('/:id/results', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { page = 1, limit = 20 } = req.query;

    const search = await prisma.savedSearch.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!search) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    const criteria = search.criteria;
    const where = { status: 'ACTIVE' };

    // Build where clause from criteria
    if (criteria.type) where.type = criteria.type;
    if (criteria.city) where.city = { contains: criteria.city, mode: 'insensitive' };
    if (criteria.state) where.state = criteria.state;
    if (criteria.zipCode) where.zipCode = criteria.zipCode;

    if (criteria.minPrice || criteria.maxPrice) {
      where.price = {};
      if (criteria.minPrice) where.price.gte = criteria.minPrice;
      if (criteria.maxPrice) where.price.lte = criteria.maxPrice;
    }

    if (criteria.minBeds || criteria.maxBeds) {
      where.bedrooms = {};
      if (criteria.minBeds) where.bedrooms.gte = criteria.minBeds;
      if (criteria.maxBeds) where.bedrooms.lte = criteria.maxBeds;
    }

    if (criteria.minBaths || criteria.maxBaths) {
      where.bathrooms = {};
      if (criteria.minBaths) where.bathrooms.gte = criteria.minBaths;
      if (criteria.maxBaths) where.bathrooms.lte = criteria.maxBaths;
    }

    if (criteria.minSqft || criteria.maxSqft) {
      where.squareFeet = {};
      if (criteria.minSqft) where.squareFeet.gte = criteria.minSqft;
      if (criteria.maxSqft) where.squareFeet.lte = criteria.maxSqft;
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: { photos: { where: { isPrimary: true }, take: 1 } },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { listedAt: 'desc' }
      }),
      prisma.property.count({ where })
    ]);

    res.json({ properties, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Run saved search error:', error);
    res.status(500).json({ error: 'Failed to run saved search' });
  }
});

// Toggle alert for saved search
router.post('/:id/toggle-alert', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const existing = await prisma.savedSearch.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    const search = await prisma.savedSearch.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive }
    });

    res.json(search);
  } catch (error) {
    console.error('Toggle alert error:', error);
    res.status(500).json({ error: 'Failed to toggle alert' });
  }
});

module.exports = router;
