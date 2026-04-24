const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

// CSV export for leads
router.get('/leads/csv', authenticateToken, async (req, res) => {
  try {
    const { Parser } = require('json2csv');
    const prisma = req.app.get('prisma');
    const { ids } = req.query;

    const where = ids ? { id: { in: ids.split(',') } } : {};
    const leads = await prisma.lead.findMany({
      where,
      include: { agent: { include: { user: { select: { firstName: true, lastName: true } } } }, source: true },
      orderBy: { createdAt: 'desc' }
    });

    const data = leads.map(l => ({
      'First Name': l.firstName,
      'Last Name': l.lastName,
      'Email': l.email,
      'Phone': l.phone || '',
      'Status': l.status,
      'Score': l.score,
      'Budget': l.budget || '',
      'Source': l.source?.name || '',
      'Agent': l.agent ? `${l.agent.user.firstName} ${l.agent.user.lastName}` : '',
      'Created': new Date(l.createdAt).toLocaleDateString()
    }));

    const parser = new Parser();
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename=leads-export.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export leads CSV error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// PDF export for leads
router.get('/leads/pdf', authenticateToken, async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const prisma = req.app.get('prisma');
    const { ids } = req.query;

    const where = ids ? { id: { in: ids.split(',') } } : {};
    const leads = await prisma.lead.findMany({
      where,
      include: { agent: { include: { user: { select: { firstName: true, lastName: true } } } }, source: true },
      orderBy: { createdAt: 'desc' }
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', 'attachment; filename=leads-export.pdf');
    doc.pipe(res);

    doc.fontSize(20).text('Leads Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}  |  Total: ${leads.length}`, { align: 'center' });
    doc.moveDown();

    // Table header
    const headers = ['Name', 'Email', 'Status', 'Score', 'Source', 'Agent'];
    const colWidths = [120, 160, 80, 50, 100, 120];
    let x = 50;
    doc.fontSize(9).font('Helvetica-Bold');
    headers.forEach((h, i) => { doc.text(h, x, doc.y, { width: colWidths[i], continued: false }); x += colWidths[i]; });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(750, doc.y).stroke();
    doc.moveDown(0.5);

    // Table rows
    doc.font('Helvetica').fontSize(8);
    leads.forEach((l) => {
      if (doc.y > 500) { doc.addPage(); }
      x = 50;
      const row = [
        `${l.firstName} ${l.lastName}`,
        l.email,
        l.status,
        String(l.score),
        l.source?.name || '-',
        l.agent ? `${l.agent.user.firstName} ${l.agent.user.lastName}` : '-'
      ];
      const startY = doc.y;
      row.forEach((cell, i) => { doc.text(cell, x, startY, { width: colWidths[i] }); x += colWidths[i]; });
      doc.moveDown(0.3);
    });

    doc.end();
  } catch (error) {
    console.error('Export leads PDF error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// CSV export for properties
router.get('/properties/csv', authenticateToken, async (req, res) => {
  try {
    const { Parser } = require('json2csv');
    const prisma = req.app.get('prisma');
    const { ids } = req.query;
    const where = ids ? { id: { in: ids.split(',') } } : {};
    const properties = await prisma.property.findMany({ where, include: { agent: { include: { user: { select: { firstName: true, lastName: true } } } } }, orderBy: { createdAt: 'desc' } });

    const data = properties.map(p => ({
      'Title': p.title, 'Address': p.address, 'City': p.city, 'State': p.state, 'Zip': p.zipCode,
      'Price': p.price, 'Status': p.status, 'Type': p.type, 'Beds': p.bedrooms, 'Baths': p.bathrooms,
      'Sq Ft': p.squareFeet || '', 'Year Built': p.yearBuilt || '',
      'Agent': p.agent ? `${p.agent.user.firstName} ${p.agent.user.lastName}` : ''
    }));

    const parser = new Parser();
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename=properties-export.csv');
    res.send(parser.parse(data));
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

router.get('/properties/pdf', authenticateToken, async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const prisma = req.app.get('prisma');
    const { ids } = req.query;
    const where = ids ? { id: { in: ids.split(',') } } : {};
    const properties = await prisma.property.findMany({ where, orderBy: { createdAt: 'desc' } });

    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', 'attachment; filename=properties-export.pdf');
    doc.pipe(res);

    doc.fontSize(20).text('Properties Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}  |  Total: ${properties.length}`, { align: 'center' });
    doc.moveDown();

    doc.font('Helvetica').fontSize(8);
    properties.forEach((p) => {
      if (doc.y > 500) doc.addPage();
      doc.font('Helvetica-Bold').text(`${p.title} - $${p.price?.toLocaleString()}`);
      doc.font('Helvetica').text(`${p.address}, ${p.city}, ${p.state} ${p.zipCode}  |  ${p.bedrooms}bd/${p.bathrooms}ba  |  ${p.status}`);
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// CSV/PDF for transactions
router.get('/transactions/csv', authenticateToken, async (req, res) => {
  try {
    const { Parser } = require('json2csv');
    const prisma = req.app.get('prisma');
    const { ids } = req.query;
    const where = ids ? { id: { in: ids.split(',') } } : {};
    const transactions = await prisma.transaction.findMany({ where, include: { property: true, agent: { include: { user: { select: { firstName: true, lastName: true } } } } }, orderBy: { createdAt: 'desc' } });

    const data = transactions.map(t => ({
      'Property': t.property?.address || '', 'Type': t.type, 'Status': t.status,
      'List Price': t.listPrice, 'Sale Price': t.salePrice || '',
      'Closing Date': t.closingDate ? new Date(t.closingDate).toLocaleDateString() : '',
      'Agent': t.agent ? `${t.agent.user.firstName} ${t.agent.user.lastName}` : ''
    }));

    const parser = new Parser();
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename=transactions-export.csv');
    res.send(parser.parse(data));
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

router.get('/transactions/pdf', authenticateToken, async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const prisma = req.app.get('prisma');
    const { ids } = req.query;
    const where = ids ? { id: { in: ids.split(',') } } : {};
    const transactions = await prisma.transaction.findMany({ where, include: { property: true }, orderBy: { createdAt: 'desc' } });

    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', 'attachment; filename=transactions-export.pdf');
    doc.pipe(res);

    doc.fontSize(20).text('Transactions Report', { align: 'center' }).moveDown();
    doc.fontSize(8);
    transactions.forEach(t => {
      if (doc.y > 500) doc.addPage();
      doc.font('Helvetica-Bold').text(`${t.property?.address || 'N/A'} - ${t.type} - $${t.listPrice?.toLocaleString()}`);
      doc.font('Helvetica').text(`Status: ${t.status}  |  Closing: ${t.closingDate ? new Date(t.closingDate).toLocaleDateString() : 'TBD'}`);
      doc.moveDown(0.5);
    });
    doc.end();
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// CSV/PDF for agents
router.get('/agents/csv', authenticateToken, async (req, res) => {
  try {
    const { Parser } = require('json2csv');
    const prisma = req.app.get('prisma');
    const agents = await prisma.agent.findMany({ include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } }, team: true, _count: { select: { leads: true, properties: true, transactions: true } } } });

    const data = agents.map(a => ({
      'Name': `${a.user.firstName} ${a.user.lastName}`, 'Email': a.user.email, 'Phone': a.user.phone || '',
      'License': a.licenseNumber || '', 'Experience': a.yearsExperience, 'Team': a.team?.name || '',
      'Leads': a._count.leads, 'Listings': a._count.properties, 'Transactions': a._count.transactions
    }));

    const parser = new Parser();
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename=agents-export.csv');
    res.send(parser.parse(data));
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

router.get('/agents/pdf', authenticateToken, async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const prisma = req.app.get('prisma');
    const agents = await prisma.agent.findMany({ include: { user: { select: { firstName: true, lastName: true, email: true } }, _count: { select: { leads: true, properties: true, transactions: true } } } });

    const doc = new PDFDocument({ margin: 50 });
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', 'attachment; filename=agents-export.pdf');
    doc.pipe(res);

    doc.fontSize(20).text('Agents Report', { align: 'center' }).moveDown();
    doc.fontSize(10);
    agents.forEach(a => {
      if (doc.y > 700) doc.addPage();
      doc.font('Helvetica-Bold').text(`${a.user.firstName} ${a.user.lastName}`);
      doc.font('Helvetica').text(`${a.user.email}  |  ${a.yearsExperience} yrs exp  |  Leads: ${a._count.leads}  |  Listings: ${a._count.properties}  |  Transactions: ${a._count.transactions}`);
      doc.moveDown(0.5);
    });
    doc.end();
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// CSV/PDF for commissions
router.get('/commissions/csv', authenticateToken, async (req, res) => {
  try {
    const { Parser } = require('json2csv');
    const prisma = req.app.get('prisma');
    const { ids } = req.query;
    const where = ids ? { id: { in: ids.split(',') } } : {};
    const commissions = await prisma.commission.findMany({ where, include: { transaction: { include: { property: true } }, agent: { include: { user: { select: { firstName: true, lastName: true } } } } }, orderBy: { createdAt: 'desc' } });

    const data = commissions.map(c => ({
      'Property': c.transaction?.property?.address || '', 'Agent': c.agent ? `${c.agent.user.firstName} ${c.agent.user.lastName}` : '',
      'Type': c.type, 'Amount': c.amount, 'Split %': c.splitPercentage, 'Split Amount': c.splitAmount,
      'Status': c.status, 'Date': new Date(c.createdAt).toLocaleDateString()
    }));

    const parser = new Parser();
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename=commissions-export.csv');
    res.send(parser.parse(data));
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

router.get('/commissions/pdf', authenticateToken, async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const prisma = req.app.get('prisma');
    const { ids } = req.query;
    const where = ids ? { id: { in: ids.split(',') } } : {};
    const commissions = await prisma.commission.findMany({ where, include: { transaction: { include: { property: true } }, agent: { include: { user: { select: { firstName: true, lastName: true } } } } }, orderBy: { createdAt: 'desc' } });

    const doc = new PDFDocument({ margin: 50, layout: 'landscape' });
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', 'attachment; filename=commissions-export.pdf');
    doc.pipe(res);

    doc.fontSize(20).text('Commissions Report', { align: 'center' }).moveDown();
    doc.fontSize(8);
    commissions.forEach(c => {
      if (doc.y > 500) doc.addPage();
      doc.font('Helvetica-Bold').text(`${c.transaction?.property?.address || 'N/A'} - $${c.splitAmount?.toLocaleString()}`);
      doc.font('Helvetica').text(`Agent: ${c.agent?.user?.firstName} ${c.agent?.user?.lastName}  |  Type: ${c.type}  |  Status: ${c.status}  |  Split: ${c.splitPercentage}%`);
      doc.moveDown(0.5);
    });
    doc.end();
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

module.exports = router;
