const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all social posts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { platform, status, page = 1, limit = 20 } = req.query;

    const where = {};
    if (platform) where.platform = platform;
    if (status) where.status = status;

    const [posts, total] = await Promise.all([
      prisma.socialPost.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.socialPost.count({ where })
    ]);

    res.json({ posts, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get social posts error:', error);
    res.status(500).json({ error: 'Failed to get social posts' });
  }
});

// Get social post by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const post = await prisma.socialPost.findUnique({
      where: { id: req.params.id }
    });

    if (!post) {
      return res.status(404).json({ error: 'Social post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Get social post error:', error);
    res.status(500).json({ error: 'Failed to get social post' });
  }
});

// Create social post
router.post('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { platform, propertyId, content, mediaUrls, hashtags, scheduledAt } = req.body;

    const post = await prisma.socialPost.create({
      data: {
        platform,
        propertyId,
        content,
        mediaUrls: mediaUrls || [],
        hashtags: hashtags || [],
        status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null
      }
    });

    res.status(201).json(post);
  } catch (error) {
    console.error('Create social post error:', error);
    res.status(500).json({ error: 'Failed to create social post' });
  }
});

// Update social post
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { platform, content, mediaUrls, hashtags, status, scheduledAt } = req.body;

    const post = await prisma.socialPost.update({
      where: { id: req.params.id },
      data: {
        platform,
        content,
        mediaUrls,
        hashtags,
        status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        publishedAt: status === 'PUBLISHED' ? new Date() : undefined
      }
    });

    res.json(post);
  } catch (error) {
    console.error('Update social post error:', error);
    res.status(500).json({ error: 'Failed to update social post' });
  }
});

// Delete social post
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.socialPost.delete({ where: { id: req.params.id } });
    res.json({ message: 'Social post deleted' });
  } catch (error) {
    console.error('Delete social post error:', error);
    res.status(500).json({ error: 'Failed to delete social post' });
  }
});

// Publish post
router.post('/:id/publish', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    // TODO: Integrate with social media APIs to actually publish

    const post = await prisma.socialPost.update({
      where: { id: req.params.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date()
      }
    });

    res.json(post);
  } catch (error) {
    console.error('Publish post error:', error);
    res.status(500).json({ error: 'Failed to publish post' });
  }
});

// Generate post for property
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { propertyId, platform } = req.body;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { photos: { where: { isPrimary: true }, take: 1 } }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Generate content based on platform
    let content = '';
    let hashtags = [];

    const baseContent = `${property.bedrooms}BR/${property.bathrooms}BA ${property.type.replace('_', ' ').toLowerCase()} in ${property.city} - $${property.price.toLocaleString()}`;

    switch (platform) {
      case 'INSTAGRAM':
        content = `🏠 NEW LISTING! ${baseContent}\n\n✨ ${property.squareFeet?.toLocaleString() || 'Spacious'} sq ft\n📍 ${property.address}\n\nDM for details or schedule a tour! 🔑`;
        hashtags = ['realestate', 'newlisting', 'homeforsale', property.city.toLowerCase().replace(/\s/g, ''), 'realtor', 'dreamhome', 'househunting'];
        break;
      case 'FACEBOOK':
        content = `🏡 Just Listed!\n\n${baseContent}\n\n${property.description || ''}\n\nContact me today for more information or to schedule a showing!`;
        hashtags = ['realestate', 'justlisted', property.city.toLowerCase().replace(/\s/g, '')];
        break;
      case 'TWITTER':
        content = `🏠 NEW: ${baseContent}\n\n📍 ${property.address}\n\n#RealEstate #${property.city.replace(/\s/g, '')}`;
        hashtags = [];
        break;
      case 'LINKEDIN':
        content = `Excited to announce a new listing!\n\n${baseContent}\n\nThis beautiful property features ${property.features?.slice(0, 3).join(', ') || 'amazing amenities'}.\n\nContact me for more details.`;
        hashtags = ['realestate', 'newlisting', 'property'];
        break;
      default:
        content = baseContent;
    }

    res.json({
      propertyId,
      platform,
      content,
      hashtags,
      mediaUrls: property.photos.map(p => p.url)
    });
  } catch (error) {
    console.error('Generate post error:', error);
    res.status(500).json({ error: 'Failed to generate post' });
  }
});

module.exports = router;
