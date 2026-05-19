const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { authenticateToken } = require('../middleware/auth');

// Deterministic synthesized lat/lng for properties missing coords (US-ish bounding box).
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
function synthLatLng(id, zip) {
  const h1 = hashStr(id || 'x');
  const h2 = hashStr((zip || '00000') + ':' + (id || 'x'));
  // Latitude 32..45, Longitude -118..-72 (continental US-ish)
  const lat = 32 + (h1 % 1300) / 100;
  const lng = -118 + (h2 % 4600) / 100;
  return { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };
}

// ===================================================================
// VIZ 1 — Property Map data
// ===================================================================
router.get('/property-map', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const props = await prisma.property.findMany({
      take: 250,
      select: {
        id: true, title: true, address: true, city: true, state: true,
        zipCode: true, status: true, price: true, bedrooms: true,
        bathrooms: true, squareFeet: true, latitude: true, longitude: true
      },
      orderBy: { createdAt: 'desc' }
    });
    const items = props.map(p => {
      let { latitude, longitude } = p;
      if (latitude == null || longitude == null) {
        const s = synthLatLng(p.id, p.zipCode);
        latitude = s.lat; longitude = s.lng;
      }
      return { ...p, latitude, longitude };
    });
    res.json({ items, count: items.length });
  } catch (e) {
    console.error('property-map error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ===================================================================
// VIZ 2 — Listing Price Trend (median price per zip per month)
// ===================================================================
router.get('/price-trend', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const props = await prisma.property.findMany({
      take: 1000,
      select: { zipCode: true, price: true, listedAt: true, createdAt: true }
    });

    // Group by month + zip
    const groups = {};
    for (const p of props) {
      const ts = p.listedAt || p.createdAt;
      if (!ts || !p.zipCode || !p.price) continue;
      const d = new Date(ts);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const k = `${month}|${p.zipCode}`;
      if (!groups[k]) groups[k] = { month, zip: p.zipCode, prices: [] };
      groups[k].prices.push(Number(p.price));
    }

    // Pick top 5 zips by listing volume
    const zipTotals = {};
    Object.values(groups).forEach(g => {
      zipTotals[g.zip] = (zipTotals[g.zip] || 0) + g.prices.length;
    });
    const topZips = Object.entries(zipTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(e => e[0]);

    const months = Array.from(new Set(Object.values(groups).map(g => g.month))).sort();
    const median = arr => {
      const s = [...arr].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
    };
    const series = months.map(month => {
      const row = { month };
      for (const z of topZips) {
        const g = groups[`${month}|${z}`];
        row[z] = g ? median(g.prices) : null;
      }
      return row;
    });
    res.json({ series, zips: topZips });
  } catch (e) {
    console.error('price-trend error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ===================================================================
// NON-VIZ 1 — Listing Brochure PDF
// ===================================================================
router.get('/properties-list', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const props = await prisma.property.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, address: true, city: true, state: true, price: true, status: true }
    });
    res.json({ properties: props });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/brochure/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const p = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
        agent: { include: { user: true } },
        photos: { take: 4 }
      }
    });
    if (!p) return res.status(404).json({ error: 'Property not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="brochure-${p.id}.pdf"`);

    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    doc.pipe(res);

    doc.fillColor('#1d4ed8').fontSize(26).text('Property Brochure', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('#000').fontSize(18).text(p.title || 'Listing', { align: 'center' });
    doc.moveDown();

    // Photos placeholder grid
    const photoCount = (p.photos && p.photos.length) || 0;
    doc.fillColor('#374151').fontSize(11)
      .text(`[Photo Gallery Placeholder — ${photoCount} photo${photoCount === 1 ? '' : 's'} on file]`,
        { align: 'center' });
    doc.rect(50, doc.y + 8, 512, 110).fillAndStroke('#e5e7eb', '#9ca3af');
    doc.fillColor('#6b7280').fontSize(10)
      .text('Photos placeholder', 50, doc.y + 50, { width: 512, align: 'center' });
    doc.moveDown(8);

    // Address & specs
    doc.fillColor('#111827').fontSize(14).text('Address');
    doc.fillColor('#374151').fontSize(12)
      .text(`${p.address}, ${p.city}, ${p.state} ${p.zipCode || ''}`);
    doc.moveDown(0.5);

    doc.fillColor('#111827').fontSize(14).text('Price');
    doc.fillColor('#059669').fontSize(16)
      .text(`$${Number(p.price || 0).toLocaleString()}`);
    doc.moveDown(0.5);

    doc.fillColor('#111827').fontSize(14).text('Specs');
    doc.fillColor('#374151').fontSize(12)
      .text(`Beds: ${p.bedrooms ?? '-'}    Baths: ${p.bathrooms ?? '-'}    SqFt: ${p.squareFeet ?? '-'}`);
    doc.text(`Year built: ${p.yearBuilt ?? '-'}    Lot: ${p.lotSize ?? '-'}    Garage: ${p.garage ?? '-'}`);
    doc.moveDown(0.5);

    // Features
    const feats = (p.features && p.features.length ? p.features : ['Updated kitchen', 'Hardwood floors', 'Spacious yard']);
    doc.fillColor('#111827').fontSize(14).text('Features');
    doc.fillColor('#374151').fontSize(11);
    feats.slice(0, 12).forEach(f => doc.text(`  • ${f}`));
    doc.moveDown(0.5);

    // Description
    if (p.description) {
      doc.fillColor('#111827').fontSize(14).text('Description');
      doc.fillColor('#374151').fontSize(11).text(p.description, { width: 512 });
      doc.moveDown(0.5);
    }

    // Agent contact
    doc.fillColor('#111827').fontSize(14).text('Agent Contact');
    if (p.agent && p.agent.user) {
      const u = p.agent.user;
      doc.fillColor('#374151').fontSize(12)
        .text(`${u.firstName || ''} ${u.lastName || ''}`.trim());
      doc.text(`Email: ${u.email || '-'}`);
      doc.text(`Phone: ${u.phone || p.agent.phone || '-'}`);
    } else {
      doc.fillColor('#374151').fontSize(12).text('Listing agent details available on request.');
    }

    doc.moveDown(2);
    doc.fillColor('#9ca3af').fontSize(9)
      .text(`Generated ${new Date().toISOString()} • Property ID ${p.id}`, { align: 'center' });

    doc.end();
  } catch (e) {
    console.error('brochure error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ===================================================================
// NON-VIZ 2 — Showing Scheduler
// ===================================================================
router.get('/scheduler-context', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const [properties, leads] = await Promise.all([
      prisma.property.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, address: true, city: true, state: true }
      }),
      prisma.lead.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        select: { id: true, firstName: true, lastName: true, email: true }
      })
    ]);
    res.json({ properties, leads });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/schedule-showing', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { propertyId, leadId, scheduledAt, duration, notes } = req.body || {};
    if (!propertyId || !scheduledAt) {
      return res.status(400).json({ error: 'propertyId and scheduledAt are required' });
    }
    const created = await prisma.showing.create({
      data: {
        propertyId,
        leadId: leadId || null,
        scheduledAt: new Date(scheduledAt),
        duration: duration ? parseInt(duration) : 30,
        notes: notes || null,
        status: 'SCHEDULED'
      }
    });
    res.status(201).json({ showing: created });
  } catch (e) {
    console.error('schedule-showing error:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/recent-showings', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const showings = await prisma.showing.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { title: true, address: true, city: true } },
        lead: { select: { firstName: true, lastName: true } }
      }
    });
    res.json({ showings });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
