const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get user's favorites
router.get('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      include: {
        property: {
          include: {
            photos: { where: { isPrimary: true }, take: 1 },
            agent: { include: { user: { select: { firstName: true, lastName: true } } } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(favorites);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Failed to get favorites' });
  }
});

// Add to favorites
router.post('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { propertyId, notes } = req.body;

    // Check if already favorited
    const existing = await prisma.favorite.findUnique({
      where: { userId_propertyId: { userId: req.user.id, propertyId } }
    });

    if (existing) {
      return res.status(400).json({ error: 'Property already in favorites' });
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId: req.user.id,
        propertyId,
        notes
      },
      include: { property: true }
    });

    res.status(201).json(favorite);
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

// Update favorite notes
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { notes } = req.body;

    const favorite = await prisma.favorite.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!favorite) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    const updated = await prisma.favorite.update({
      where: { id: req.params.id },
      data: { notes },
      include: { property: true }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update favorite error:', error);
    res.status(500).json({ error: 'Failed to update favorite' });
  }
});

// Remove from favorites
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const favorite = await prisma.favorite.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!favorite) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    await prisma.favorite.delete({ where: { id: req.params.id } });
    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Failed to remove from favorites' });
  }
});

// Remove by property ID
router.delete('/property/:propertyId', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    await prisma.favorite.delete({
      where: {
        userId_propertyId: {
          userId: req.user.id,
          propertyId: req.params.propertyId
        }
      }
    });

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Failed to remove from favorites' });
  }
});

// Check if property is favorited
router.get('/check/:propertyId', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_propertyId: {
          userId: req.user.id,
          propertyId: req.params.propertyId
        }
      }
    });

    res.json({ isFavorited: !!favorite, favorite });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ error: 'Failed to check favorite status' });
  }
});

// Toggle favorite
router.post('/toggle/:propertyId', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { notes } = req.body;

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_propertyId: {
          userId: req.user.id,
          propertyId: req.params.propertyId
        }
      }
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      res.json({ isFavorited: false, message: 'Removed from favorites' });
    } else {
      const favorite = await prisma.favorite.create({
        data: {
          userId: req.user.id,
          propertyId: req.params.propertyId,
          notes
        },
        include: { property: true }
      });
      res.json({ isFavorited: true, favorite });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

module.exports = router;
