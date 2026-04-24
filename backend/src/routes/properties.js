const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { filterFields } = require('../middleware/fieldFilter');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/properties');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all properties (public with filters)
router.get('/', optionalAuth, filterFields('property'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const {
      status, type, agentId, minPrice, maxPrice, minBeds, maxBeds,
      minBaths, maxBaths, minSqft, maxSqft, city, state, zipCode,
      search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const where = {};

    // Only show active listings to public
    if (!req.user || req.user.role === 'CLIENT') {
      where.status = 'ACTIVE';
    } else if (status) {
      where.status = status;
    }

    if (type) where.type = type;
    if (agentId) where.agentId = agentId;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (state) where.state = state;
    if (zipCode) where.zipCode = zipCode;

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    if (minBeds || maxBeds) {
      where.bedrooms = {};
      if (minBeds) where.bedrooms.gte = parseInt(minBeds);
      if (maxBeds) where.bedrooms.lte = parseInt(maxBeds);
    }

    if (minBaths || maxBaths) {
      where.bathrooms = {};
      if (minBaths) where.bathrooms.gte = parseFloat(minBaths);
      if (maxBaths) where.bathrooms.lte = parseFloat(maxBaths);
    }

    if (minSqft || maxSqft) {
      where.squareFeet = {};
      if (minSqft) where.squareFeet.gte = parseInt(minSqft);
      if (maxSqft) where.squareFeet.lte = parseInt(maxSqft);
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          photos: { where: { isPrimary: true }, take: 1 },
          agent: { include: { user: { select: { firstName: true, lastName: true } } } },
          _count: { select: { photos: true, showings: true, favorites: true } }
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.property.count({ where })
    ]);

    res.json({ properties, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ error: 'Failed to get properties' });
  }
});

// Get property by ID
router.get('/:id', optionalAuth, filterFields('property'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
        photos: { orderBy: { order: 'asc' } },
        virtualTours: true,
        agent: { include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } } },
        tags: { include: { tag: true } },
        openHouses: { where: { date: { gte: new Date() } }, orderBy: { date: 'asc' } },
        _count: { select: { showings: true, favorites: true } }
      }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Check if user has favorited
    if (req.user) {
      const favorite = await prisma.favorite.findUnique({
        where: { userId_propertyId: { userId: req.user.id, propertyId: property.id } }
      });
      property.isFavorited = !!favorite;
    }

    res.json(property);
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ error: 'Failed to get property' });
  }
});

// Create property
router.post('/', authenticateToken, requireRole('ADMIN', 'MANAGER', 'AGENT'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const {
      mlsNumber, status, type, propertyType, title, description,
      address, city, state, zipCode, county, latitude, longitude,
      price, listPrice, bedrooms, bathrooms, squareFeet, lotSize, yearBuilt, stories, garage,
      features, appliances, flooring, heating, cooling,
      hoaFee, taxAmount, taxYear, agentId
    } = req.body;

    // Support both 'type' and 'propertyType' for compatibility
    const propertyTypeValue = type || propertyType || 'SINGLE_FAMILY';
    // Support both 'price' and 'listPrice' for compatibility
    const priceValue = price || listPrice;

    // For admin/manager without agentId, get first available agent or use provided agentId
    let assignedAgentId = agentId || req.user.agentId;
    if (!assignedAgentId && (req.user.role === 'ADMIN' || req.user.role === 'MANAGER')) {
      const firstAgent = await prisma.agent.findFirst();
      assignedAgentId = firstAgent?.id;
    }

    const property = await prisma.property.create({
      data: {
        mlsNumber,
        agentId: assignedAgentId,
        status: status || 'DRAFT',
        type: propertyTypeValue,
        title: title || `${propertyTypeValue} in ${city || 'Unknown City'}`,
        description,
        address,
        city,
        state,
        zipCode,
        county,
        latitude,
        longitude,
        price: priceValue,
        originalPrice: priceValue,
        pricePerSqft: squareFeet && priceValue ? priceValue / squareFeet : null,
        bedrooms: bedrooms || 0,
        bathrooms: bathrooms || 0,
        squareFeet,
        lotSize,
        yearBuilt,
        stories: stories || 1,
        garage: garage || 0,
        features: features || [],
        appliances: appliances || [],
        flooring: flooring || [],
        heating,
        cooling,
        hoaFee,
        taxAmount,
        taxYear,
        listedAt: status === 'ACTIVE' ? new Date() : null
      },
      include: { agent: true }
    });

    res.status(201).json(property);
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// Update property
router.put('/:id', authenticateToken, requireRole('ADMIN', 'MANAGER', 'AGENT'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const {
      mlsNumber, status, type, title, description, aiDescription,
      address, city, state, zipCode, county, latitude, longitude,
      price, bedrooms, bathrooms, squareFeet, lotSize, yearBuilt, stories, garage,
      features, appliances, flooring, heating, cooling,
      hoaFee, taxAmount, taxYear
    } = req.body;

    const existing = await prisma.property.findUnique({ where: { id: req.params.id } });

    const updateData = {
      mlsNumber,
      status,
      type,
      title,
      description,
      aiDescription,
      address,
      city,
      state,
      zipCode,
      county,
      latitude,
      longitude,
      price,
      bedrooms,
      bathrooms,
      squareFeet,
      lotSize,
      yearBuilt,
      stories,
      garage,
      features,
      appliances,
      flooring,
      heating,
      cooling,
      hoaFee,
      taxAmount,
      taxYear
    };

    // Update price per sqft
    if (price && squareFeet) {
      updateData.pricePerSqft = price / squareFeet;
    }

    // Set listed date if becoming active
    if (status === 'ACTIVE' && existing.status !== 'ACTIVE') {
      updateData.listedAt = new Date();
    }

    // Set sold date if becoming sold
    if (status === 'SOLD' && existing.status !== 'SOLD') {
      updateData.soldAt = new Date();
    }

    const property = await prisma.property.update({
      where: { id: req.params.id },
      data: updateData,
      include: { photos: true, agent: true }
    });

    res.json(property);
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

// Delete property
router.delete('/:id', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const propertyId = req.params.id;

    // Delete related records first to avoid foreign key constraints
    await prisma.$transaction([
      prisma.propertyPhoto.deleteMany({ where: { propertyId } }),
      prisma.virtualTour.deleteMany({ where: { propertyId } }),
      prisma.tagOnProperty.deleteMany({ where: { propertyId } }),
      prisma.favorite.deleteMany({ where: { propertyId } }),
      prisma.showing.deleteMany({ where: { propertyId } }),
      prisma.openHouse.deleteMany({ where: { propertyId } }),
      prisma.socialPost.deleteMany({ where: { propertyId } }),
      prisma.flyer.deleteMany({ where: { propertyId } }),
      prisma.property.delete({ where: { id: propertyId } })
    ]);

    res.json({ message: 'Property deleted' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

// Add photos
router.post('/:id/photos', authenticateToken, requireRole('ADMIN', 'MANAGER', 'AGENT'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { photos } = req.body; // Array of { url, caption, isPrimary, order }

    // If setting a primary, unset existing primary
    if (photos.some(p => p.isPrimary)) {
      await prisma.propertyPhoto.updateMany({
        where: { propertyId: req.params.id },
        data: { isPrimary: false }
      });
    }

    const createdPhotos = await prisma.propertyPhoto.createMany({
      data: photos.map(photo => ({
        propertyId: req.params.id,
        url: photo.url,
        caption: photo.caption,
        isPrimary: photo.isPrimary || false,
        order: photo.order || 0
      }))
    });

    const allPhotos = await prisma.propertyPhoto.findMany({
      where: { propertyId: req.params.id },
      orderBy: { order: 'asc' }
    });

    res.status(201).json(allPhotos);
  } catch (error) {
    console.error('Add photos error:', error);
    res.status(500).json({ error: 'Failed to add photos' });
  }
});

// Delete photo
router.delete('/:id/photos/:photoId', authenticateToken, requireRole('ADMIN', 'MANAGER', 'AGENT'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.propertyPhoto.delete({ where: { id: req.params.photoId } });
    res.json({ message: 'Photo deleted' });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// Upload photos (file upload)
router.post('/:id/upload', authenticateToken, requireRole('ADMIN', 'MANAGER', 'AGENT'), upload.array('photos', 10), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Get existing photo count for ordering
    const existingCount = await prisma.propertyPhoto.count({
      where: { propertyId: req.params.id }
    });

    // Create photo records
    const photos = await Promise.all(files.map(async (file, index) => {
      const photo = await prisma.propertyPhoto.create({
        data: {
          propertyId: req.params.id,
          url: `/uploads/properties/${file.filename}`,
          caption: '',
          isPrimary: existingCount === 0 && index === 0,
          order: existingCount + index
        }
      });
      return photo;
    }));

    res.status(201).json(photos);
  } catch (error) {
    console.error('Upload photos error:', error);
    res.status(500).json({ error: 'Failed to upload photos' });
  }
});

// Add virtual tour
router.post('/:id/virtual-tours', authenticateToken, requireRole('ADMIN', 'MANAGER', 'AGENT'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { type, provider, url, thumbnailUrl } = req.body;

    const tour = await prisma.virtualTour.create({
      data: {
        propertyId: req.params.id,
        type: type || provider || 'MATTERPORT',
        url,
        thumbnailUrl
      }
    });

    res.status(201).json(tour);
  } catch (error) {
    console.error('Add virtual tour error:', error);
    res.status(500).json({ error: 'Failed to add virtual tour' });
  }
});

// Bulk delete properties
router.post('/bulk-delete', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    for (const id of ids) {
      await prisma.$transaction([
        prisma.propertyPhoto.deleteMany({ where: { propertyId: id } }),
        prisma.virtualTour.deleteMany({ where: { propertyId: id } }),
        prisma.tagOnProperty.deleteMany({ where: { propertyId: id } }),
        prisma.favorite.deleteMany({ where: { propertyId: id } }),
        prisma.showing.deleteMany({ where: { propertyId: id } }),
        prisma.openHouse.deleteMany({ where: { propertyId: id } }),
        prisma.socialPost.deleteMany({ where: { propertyId: id } }),
        prisma.flyer.deleteMany({ where: { propertyId: id } }),
        prisma.property.delete({ where: { id } })
      ]);
    }
    res.json({ message: `${ids.length} properties deleted`, count: ids.length });
  } catch (error) {
    console.error('Bulk delete properties error:', error);
    res.status(500).json({ error: 'Failed to bulk delete properties' });
  }
});

// Bulk update properties
router.post('/bulk-update', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { ids, data } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const allowedFields = ['status', 'agentId'];
    const updateData = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    await prisma.property.updateMany({ where: { id: { in: ids } }, data: updateData });
    res.json({ message: `${ids.length} properties updated`, count: ids.length });
  } catch (error) {
    console.error('Bulk update properties error:', error);
    res.status(500).json({ error: 'Failed to bulk update properties' });
  }
});

// Get property statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const where = {};
    if (req.user.role === 'AGENT' && req.user.agentId) {
      where.agentId = req.user.agentId;
    }

    const [total, byStatus, byType, avgPrice] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      prisma.property.groupBy({
        by: ['type'],
        where,
        _count: true
      }),
      prisma.property.aggregate({
        where: { ...where, status: 'ACTIVE' },
        _avg: { price: true }
      })
    ]);

    res.json({ total, byStatus, byType, avgPrice: avgPrice._avg.price });
  } catch (error) {
    console.error('Get property stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;
