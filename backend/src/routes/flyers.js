const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get all flyers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { type, propertyId, page = 1, limit = 20 } = req.query;

    const where = {};
    if (type) where.type = type;
    if (propertyId) where.propertyId = propertyId;

    const [flyers, total] = await Promise.all([
      prisma.flyer.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.flyer.count({ where })
    ]);

    res.json({ flyers, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get flyers error:', error);
    res.status(500).json({ error: 'Failed to get flyers' });
  }
});

// Get flyer by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const flyer = await prisma.flyer.findUnique({
      where: { id: req.params.id }
    });

    if (!flyer) {
      return res.status(404).json({ error: 'Flyer not found' });
    }

    res.json(flyer);
  } catch (error) {
    console.error('Get flyer error:', error);
    res.status(500).json({ error: 'Failed to get flyer' });
  }
});

// Create flyer
router.post('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { propertyId, templateId, name, type, content } = req.body;

    const flyer = await prisma.flyer.create({
      data: {
        propertyId,
        templateId,
        name,
        type,
        content: content || {}
      }
    });

    res.status(201).json(flyer);
  } catch (error) {
    console.error('Create flyer error:', error);
    res.status(500).json({ error: 'Failed to create flyer' });
  }
});

// Update flyer
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, type, content, pdfUrl, thumbnailUrl } = req.body;

    const flyer = await prisma.flyer.update({
      where: { id: req.params.id },
      data: { name, type, content, pdfUrl, thumbnailUrl }
    });

    res.json(flyer);
  } catch (error) {
    console.error('Update flyer error:', error);
    res.status(500).json({ error: 'Failed to update flyer' });
  }
});

// Delete flyer
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.flyer.delete({ where: { id: req.params.id } });
    res.json({ message: 'Flyer deleted' });
  } catch (error) {
    console.error('Delete flyer error:', error);
    res.status(500).json({ error: 'Failed to delete flyer' });
  }
});

// Generate flyer from property
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    let { propertyId, type = 'PROPERTY' } = req.body;

    // Map common type values to valid enum values
    const typeMap = {
      'STANDARD': 'PROPERTY',
      'PROPERTY': 'PROPERTY',
      'JUST_LISTED': 'JUST_LISTED',
      'JUST_SOLD': 'JUST_SOLD',
      'OPEN_HOUSE': 'OPEN_HOUSE'
    };
    type = typeMap[type?.toUpperCase()] || 'PROPERTY';

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        photos: { orderBy: { order: 'asc' }, take: 4 },
        agent: { include: { user: true } }
      }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const content = {
      headline: type === 'JUST_LISTED' ? 'JUST LISTED!' :
                type === 'JUST_SOLD' ? 'JUST SOLD!' :
                type === 'OPEN_HOUSE' ? 'OPEN HOUSE' : 'FOR SALE',
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      price: property.price,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      squareFeet: property.squareFeet,
      features: property.features?.slice(0, 6) || [],
      description: property.description?.substring(0, 200) || '',
      photos: property.photos.map(p => p.url),
      agent: property.agent ? {
        name: `${property.agent.user.firstName} ${property.agent.user.lastName}`,
        phone: property.agent.user.phone,
        email: property.agent.user.email
      } : null
    };

    const flyer = await prisma.flyer.create({
      data: {
        propertyId,
        name: `${content.headline} - ${property.address}`,
        type,
        content
      }
    });

    res.status(201).json(flyer);
  } catch (error) {
    console.error('Generate flyer error:', error);
    res.status(500).json({ error: 'Failed to generate flyer' });
  }
});

// Get flyer templates
router.get('/templates/list', authenticateToken, async (req, res) => {
  try {
    const templates = [
      { id: 'modern-1', name: 'Modern Clean', type: 'PROPERTY', preview: '/templates/modern-1.png' },
      { id: 'classic-1', name: 'Classic Elegant', type: 'PROPERTY', preview: '/templates/classic-1.png' },
      { id: 'luxury-1', name: 'Luxury Premium', type: 'PROPERTY', preview: '/templates/luxury-1.png' },
      { id: 'open-house-1', name: 'Open House Standard', type: 'OPEN_HOUSE', preview: '/templates/oh-1.png' },
      { id: 'just-listed-1', name: 'Just Listed Bold', type: 'JUST_LISTED', preview: '/templates/jl-1.png' },
      { id: 'just-sold-1', name: 'Just Sold Success', type: 'JUST_SOLD', preview: '/templates/js-1.png' }
    ];

    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

module.exports = router;
