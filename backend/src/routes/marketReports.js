const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

// OpenRouter API helper
async function callOpenRouter(prompt, systemPrompt = '') {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'Real Estate Agency AI Platform'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// Get all market reports
router.get('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { area, page = 1, limit = 20 } = req.query;

    const where = {};
    if (area) where.area = { contains: area, mode: 'insensitive' };

    const [reports, total] = await Promise.all([
      prisma.marketReport.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { reportDate: 'desc' }
      }),
      prisma.marketReport.count({ where })
    ]);

    res.json({ reports, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get market reports error:', error);
    res.status(500).json({ error: 'Failed to get market reports' });
  }
});

// Get market report by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const report = await prisma.marketReport.findUnique({
      where: { id: req.params.id }
    });

    if (!report) {
      return res.status(404).json({ error: 'Market report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Get market report error:', error);
    res.status(500).json({ error: 'Failed to get market report' });
  }
});

// Generate market report
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { area, title } = req.body;

    // Get market data
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [
      activeListings,
      recentSales,
      previousPeriodSales
    ] = await Promise.all([
      prisma.property.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { city: { contains: area, mode: 'insensitive' } },
            { zipCode: area }
          ]
        }
      }),
      prisma.property.findMany({
        where: {
          status: 'SOLD',
          soldAt: { gte: thirtyDaysAgo },
          OR: [
            { city: { contains: area, mode: 'insensitive' } },
            { zipCode: area }
          ]
        }
      }),
      prisma.property.findMany({
        where: {
          status: 'SOLD',
          soldAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          OR: [
            { city: { contains: area, mode: 'insensitive' } },
            { zipCode: area }
          ]
        }
      })
    ]);

    // Calculate statistics
    const avgActivePrice = activeListings.length > 0
      ? activeListings.reduce((sum, p) => sum + p.price, 0) / activeListings.length
      : 0;

    const avgSoldPrice = recentSales.length > 0
      ? recentSales.reduce((sum, p) => sum + p.price, 0) / recentSales.length
      : 0;

    const previousAvgPrice = previousPeriodSales.length > 0
      ? previousPeriodSales.reduce((sum, p) => sum + p.price, 0) / previousPeriodSales.length
      : 0;

    const priceChange = previousAvgPrice > 0
      ? ((avgSoldPrice - previousAvgPrice) / previousAvgPrice * 100).toFixed(2)
      : 0;

    const avgDaysOnMarket = recentSales.filter(p => p.listedAt && p.soldAt).length > 0
      ? recentSales.filter(p => p.listedAt && p.soldAt)
          .reduce((sum, p) => sum + (new Date(p.soldAt) - new Date(p.listedAt)) / (1000 * 60 * 60 * 24), 0) /
          recentSales.filter(p => p.listedAt && p.soldAt).length
      : 0;

    const data = {
      activeListings: activeListings.length,
      recentSales: recentSales.length,
      avgActivePrice: Math.round(avgActivePrice),
      avgSoldPrice: Math.round(avgSoldPrice),
      priceChange: parseFloat(priceChange),
      avgDaysOnMarket: Math.round(avgDaysOnMarket),
      inventory: activeListings.length,
      monthsOfSupply: recentSales.length > 0 ? (activeListings.length / recentSales.length).toFixed(1) : 'N/A',
      priceRanges: {
        under200k: activeListings.filter(p => p.price < 200000).length,
        '200k-400k': activeListings.filter(p => p.price >= 200000 && p.price < 400000).length,
        '400k-600k': activeListings.filter(p => p.price >= 400000 && p.price < 600000).length,
        '600k-1m': activeListings.filter(p => p.price >= 600000 && p.price < 1000000).length,
        over1m: activeListings.filter(p => p.price >= 1000000).length
      }
    };

    // Generate AI analysis using OpenRouter
    const prompt = `Analyze this real estate market data for ${area} and provide a detailed market report:

Market Statistics:
- Active Listings: ${data.activeListings}
- Recent Sales (30 days): ${data.recentSales}
- Average Active Price: $${data.avgActivePrice.toLocaleString()}
- Average Sold Price: $${data.avgSoldPrice.toLocaleString()}
- Price Change vs Previous Period: ${data.priceChange}%
- Average Days on Market: ${data.avgDaysOnMarket} days
- Months of Supply: ${data.monthsOfSupply}

Price Distribution:
- Under $200K: ${data.priceRanges.under200k} listings
- $200K-$400K: ${data.priceRanges['200k-400k']} listings
- $400K-$600K: ${data.priceRanges['400k-600k']} listings
- $600K-$1M: ${data.priceRanges['600k-1m']} listings
- Over $1M: ${data.priceRanges.over1m} listings

Provide a comprehensive market analysis including:
1. Current market conditions (buyer's, seller's, or balanced market)
2. Price trends and what they indicate
3. Inventory analysis
4. Recommendations for buyers and sellers
5. Market outlook`;

    let analysis;
    try {
      analysis = await callOpenRouter(prompt, 'You are a professional real estate market analyst. Provide detailed, data-driven market insights.');
    } catch (aiError) {
      console.log('OpenRouter error, using fallback:', aiError.message);
      analysis = `Market Report for ${area}:

The ${area} real estate market shows ${recentSales.length} homes sold in the past 30 days with an average sale price of $${data.avgSoldPrice.toLocaleString()}. ${priceChange > 0 ? 'Prices have increased' : priceChange < 0 ? 'Prices have decreased' : 'Prices remained stable'} by ${Math.abs(priceChange)}% compared to the previous period.

Currently, there are ${activeListings.length} active listings with an average asking price of $${data.avgActivePrice.toLocaleString()}. The average days on market is ${data.avgDaysOnMarket} days.

${data.monthsOfSupply !== 'N/A' ? `With ${data.monthsOfSupply} months of supply, this indicates a ${parseFloat(data.monthsOfSupply) < 4 ? "seller's" : parseFloat(data.monthsOfSupply) > 6 ? "buyer's" : "balanced"} market.` : ''}`;
    }

    const report = await prisma.marketReport.create({
      data: {
        title: title || `${area} Market Report - ${now.toLocaleDateString()}`,
        area,
        reportDate: now,
        data,
        analysis
      }
    });

    res.status(201).json(report);
  } catch (error) {
    console.error('Generate market report error:', error);
    res.status(500).json({ error: 'Failed to generate market report' });
  }
});

// Delete market report
router.delete('/:id', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.marketReport.delete({ where: { id: req.params.id } });
    res.json({ message: 'Market report deleted' });
  } catch (error) {
    console.error('Delete market report error:', error);
    res.status(500).json({ error: 'Failed to delete market report' });
  }
});

module.exports = router;
