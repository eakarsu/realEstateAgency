const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

// AI error helper — surfaces 503 for missing keys, else 500.
function handleAIError(err, res, fallbackMsg) {
  if (err && (err.code === 'NO_API_KEY' || /OPENROUTER_API_KEY not configured/i.test(err.message || ''))) {
    return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
  }
  console.error(fallbackMsg || 'AI error:', err);
  return res.status(500).json({ error: fallbackMsg || 'AI request failed' });
}

// OpenRouter API helper with temperature control
async function callOpenRouter(prompt, systemPrompt = '', options = {}) {
  if (!process.env.OPENROUTER_API_KEY || /your-/i.test(process.env.OPENROUTER_API_KEY)) {
    const e = new Error('OPENROUTER_API_KEY not configured');
    e.code = 'NO_API_KEY';
    throw e;
  }
  const temperature = options.temperature !== undefined ? options.temperature : 0.7;

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
      max_tokens: options.max_tokens || 10000,
      temperature: temperature
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  let content = data.choices[0].message.content;
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  content = content.replace(/^```(?:\w+)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
  return content;
}

// AI Lead Qualifier - Score and prioritize leads
router.post('/lead-qualifier', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { leadId, firstName, lastName, email, phone, budget, timeline, propertyType, preferredAreas } = req.body;

    let lead = null;
    let activityCount = 0;
    let showingsCount = 0;

    // If leadId provided, look up the lead
    if (leadId) {
      lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { activities: true, showings: true, source: true }
      });
      if (lead) {
        activityCount = lead.activities?.length || 0;
        showingsCount = lead.showings?.length || 0;
      }
    }

    // Use form data if no lead found
    if (!lead) {
      lead = {
        firstName: firstName || 'Unknown',
        lastName: lastName || '',
        email: email || '',
        phone: phone || '',
        budget: budget || null,
        timeline: timeline || 'Not specified',
        propertyType: propertyType || 'Any',
        preferredAreas: preferredAreas ? preferredAreas.split(',').map(a => a.trim()) : [],
        source: { name: 'AI Hub Form' }
      };
    }

    // Use AI to analyze the lead
    const prompt = `Score and prioritize this real estate lead using the BANT framework with weighted criteria.

LEAD DATA:
- Name: ${lead.firstName} ${lead.lastName}
- Email: ${lead.email || 'Not provided'}
- Phone: ${lead.phone || 'Not provided'}
- Budget: $${lead.budget || 'Unknown'}
- Timeline: ${lead.timeline || 'Unknown'}
- Property Type: ${lead.propertyType || 'Any'}
- Preferred Areas: ${lead.preferredAreas?.join(', ') || 'Not specified'}
- Lead Source: ${lead.source?.name || 'Unknown'}
- Total Activities: ${activityCount} recorded interactions
- Property Showings: ${showingsCount} viewings attended

SCORING METHODOLOGY (use BANT framework, weighted):
1. Budget (25 points max):
   - Pre-approved / proof of funds = 25
   - Stated budget with financing plan = 20
   - Vague budget / "just looking" = 5-10
   - No budget info = 0
2. Authority (20 points max):
   - Primary decision maker, ready to sign = 20
   - Co-decision maker (spouse/partner involved) = 15
   - Influencer only (researching for someone else) = 5
3. Need (25 points max):
   - Urgent need (relocating, lease expiring, pre-approved, life event) = 25
   - Defined need with clear criteria = 15-20
   - Exploratory / "nice to have" = 5-10
4. Timeline (20 points max):
   - Immediate / within 30 days = 20
   - 1-3 months = 15
   - 3-6 months = 10
   - 6-12 months = 5
   - 12+ months / no timeline = 2
5. Engagement Bonus (10 points max):
   - Each showing attended = +3 (max 9)
   - Repeat website visits / saved properties = +2
   - Responded to follow-ups = +2

LEAD SOURCE QUALITY MULTIPLIERS:
- Referral from past client: 1.15x
- Open house sign-in: 1.10x
- Direct inquiry on listing: 1.05x
- Web lead (portal): 1.0x
- Cold lead / purchased list: 0.85x

URGENCY SIGNALS (flag if present):
- Pre-approved for mortgage
- Relocating for job
- Lease expiring within 60 days
- Recent life event (marriage, baby, divorce, retirement)
- Currently in temporary housing
- Lost out on previous offer

LEAD TEMPERATURE DEFINITIONS:
- HOT (80-100): Contact within 4 hours. High intent, qualified, ready to act.
- WARM (50-79): Contact within 24-48 hours. Interested but needs nurturing.
- NURTURE (30-49): Add to drip campaign. Early stage, building relationship.
- COLD (0-29): Monitor quarterly. Low engagement, unqualified, or tire-kicker.

Respond in JSON format:
{
  "score": <number 0-100>,
  "temperature": "HOT|WARM|NURTURE|COLD",
  "recommendation": "<actionable recommendation>",
  "reasoning": "<2-3 sentence explanation>",
  "categoryScores": {
    "budget": <0-25>,
    "authority": <0-20>,
    "need": <0-25>,
    "timeline": <0-20>,
    "engagement": <0-10>
  },
  "urgencySignals": ["<any detected urgency signals>"],
  "sourceQuality": "<lead source quality assessment>",
  "nextSteps": ["<step1>", "<step2>", "<step3>"]
}`;

    let score = 50;
    let recommendation = 'WARM - Schedule follow-up';
    let reasoning = '';
    let nextSteps = [];

    try {
      const aiResponse = await callOpenRouter(prompt, 'You are a senior real estate lead qualification specialist with 15+ years of experience in buyer/seller lead conversion. You use the BANT framework, behavioral scoring, and source-quality analysis to accurately score and prioritize leads. You understand urgency signals like lease expirations, job relocations, and pre-approvals. Respond only in valid JSON.');
      const parsed = JSON.parse(aiResponse);
      score = parsed.score || 50;
      recommendation = parsed.recommendation || recommendation;
      reasoning = parsed.reasoning || '';
      nextSteps = parsed.nextSteps || [];
    } catch (aiError) {
      console.error('Lead Qualifier AI error:', aiError.message);
      // Fallback to rule-based scoring
      if (lead.budget) {
        if (lead.budget >= 500000) score += 25;
        else if (lead.budget >= 300000) score += 20;
        else if (lead.budget >= 150000) score += 15;
        else score += 10;
      }
      if (lead.timeline?.includes('Immediate') || lead.timeline?.includes('1-3 months')) score += 25;
      else if (lead.timeline?.includes('3-6 months')) score += 20;
      else if (lead.timeline?.includes('6-12 months')) score += 10;

      if (lead.email) score += 5;
      if (lead.phone) score += 5;

      score += Math.min(activityCount * 2, 20);
      score += Math.min(showingsCount * 5, 20);

      recommendation = score >= 70 ? 'HOT - Contact immediately' :
                       score >= 50 ? 'WARM - Schedule follow-up' :
                       score >= 30 ? 'NURTURE - Add to drip campaign' : 'COLD - Monitor for engagement';

      reasoning = `Score based on: Budget ($${lead.budget?.toLocaleString() || 'unknown'}), Timeline (${lead.timeline}), Contact info completeness.`;

      nextSteps = score >= 70 ? ['Call within 24 hours', 'Send personalized property matches', 'Schedule showing'] :
                  score >= 50 ? ['Send follow-up email', 'Add to weekly newsletter', 'Schedule call for next week'] :
                  ['Add to nurture campaign', 'Send market updates monthly', 'Re-evaluate in 30 days'];
    }

    // Update lead score if we have a real leadId
    if (leadId && lead.id) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { score: Math.min(score, 100) }
      });
    }

    res.json({
      leadId,
      leadName: `${lead.firstName} ${lead.lastName}`,
      score: Math.min(score, 100),
      recommendation,
      reasoning,
      nextSteps,
      breakdown: {
        budget: lead.budget ? `$${lead.budget.toLocaleString()}` : 'Unknown',
        timeline: lead.timeline || 'Unknown',
        propertyType: lead.propertyType || 'Any',
        contactInfo: {
          email: lead.email || 'Not provided',
          phone: lead.phone || 'Not provided'
        },
        activityCount,
        showingsCount
      }
    });
  } catch (error) {
    console.error('Lead qualifier error:', error);
    res.status(500).json({ error: 'Failed to qualify lead' });
  }
});

// AI Property Matcher - Match buyers to properties
router.post('/property-matcher', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { leadId, limit = 5, buyerName, budget, propertyType, bedrooms, bathrooms, preferredAreas, mustHaves } = req.body;

    let lead = null;

    // If leadId provided, look up the lead
    if (leadId) {
      lead = await prisma.lead.findUnique({ where: { id: leadId } });
    }

    // Use form data if no lead found
    if (!lead) {
      lead = {
        firstName: buyerName ? buyerName.split(' ')[0] : 'Buyer',
        lastName: buyerName ? buyerName.split(' ').slice(1).join(' ') : '',
        budget: budget || 500000,
        propertyType: propertyType || 'Single Family',
        preferredAreas: preferredAreas ? preferredAreas.split(',').map(a => a.trim()) : [],
        timeline: 'Not specified',
        bedrooms: bedrooms || 3,
        bathrooms: bathrooms || 2,
        mustHaves: mustHaves || ''
      };
    }

    const where = { status: 'ACTIVE' };
    if (lead.budget) where.price = { lte: lead.budget * 1.1 };
    if (lead.propertyType) {
      const typeMap = {
        'Single Family': 'SINGLE_FAMILY',
        'Condo': 'CONDO',
        'Townhouse': 'TOWNHOUSE',
        'Multi-Family': 'MULTI_FAMILY'
      };
      where.type = typeMap[lead.propertyType] || lead.propertyType;
    }

    const properties = await prisma.property.findMany({
      where,
      include: { photos: { where: { isPrimary: true }, take: 1 } },
      take: parseInt(limit) * 3,
      orderBy: { createdAt: 'desc' }
    });

    // Use AI to rank properties
    const prompt = `Match and rank properties for this buyer using multi-criteria weighted scoring.

BUYER PROFILE:
- Buyer: ${lead.firstName} ${lead.lastName}
- Budget: $${lead.budget || 'Flexible'}
- Preferred Areas: ${lead.preferredAreas?.join(', ') || preferredAreas || 'Any'}
- Property Type: ${lead.propertyType || 'Any'}
- Bedrooms Needed: ${lead.bedrooms || 'Any'}
- Bathrooms Needed: ${lead.bathrooms || 'Any'}
- Must-Haves: ${lead.mustHaves || mustHaves || 'None specified'}

AVAILABLE PROPERTIES:
${properties.map(p => `ID: ${p.id} - ${p.address}, ${p.city} - $${p.price} - ${p.bedrooms}bd/${p.bathrooms}ba - ${p.squareFeet || 'N/A'} sqft - ${p.type}`).join('\n')}

WEIGHTED SCORING METHODOLOGY (score each property 0-100):
1. Price Fit (30% weight):
   - Within budget = full score
   - 1-5% over budget = slight penalty
   - 5-10% over budget = moderate penalty (but flag as "stretch" if exceptional match)
   - >10% over budget = heavy penalty
   - Significantly under budget = slight penalty (may signal lower quality)
2. Location Match (25% weight):
   - Exact preferred area = full score
   - Adjacent/nearby area = partial score
   - Consider commute patterns, school districts, walkability
3. Size & Layout Fit (20% weight):
   - Meets or exceeds bedroom/bathroom requirements = full score
   - One bedroom short = moderate penalty
   - Square footage appropriateness for household size
4. Features & Amenities (15% weight):
   - Must-haves present = full score
   - Each missing must-have = significant penalty
   - Bonus features the buyer didn't request but would likely value
5. Condition & Value (10% weight):
   - Move-in ready vs needs work
   - Price per square foot vs area average
   - Age and maintenance considerations

SPECIAL CONSIDERATIONS:
- Flag "Stretch Properties" that exceed budget by 5-10% but score exceptionally on other criteria
- Note lifestyle compatibility (family-friendly features for families, urban amenities for young professionals)
- Consider resale value and investment potential as tiebreakers
- Explain WHY each property matches or doesn't with specific compatibility notes

Respond with JSON:
{
  "rankedIds": ["id1", "id2", ...],
  "reasoning": "<overall matching strategy explanation>",
  "matchScores": {"id1": 95, "id2": 85},
  "matchDetails": {
    "id1": {
      "overallScore": 95,
      "priceFit": 28,
      "locationMatch": 23,
      "sizeLayoutFit": 19,
      "featuresAmenities": 14,
      "conditionValue": 9,
      "compatibilityNote": "<why this property is a good/bad match>",
      "isStretchProperty": false
    }
  }
}`;

    let rankedProperties = properties;
    let reasoning = '';
    try {
      const aiResponse = await callOpenRouter(prompt, 'You are a senior buyer\'s agent with 20+ years of experience matching clients to their ideal properties. You understand that a great match goes beyond price and bedrooms—it accounts for lifestyle, commute, school quality, neighborhood character, and long-term value. You use weighted multi-criteria scoring to provide transparent, data-driven recommendations. Respond only in valid JSON.');
      const parsed = JSON.parse(aiResponse);
      reasoning = parsed.reasoning || '';
      if (parsed.rankedIds) {
        rankedProperties = parsed.rankedIds
          .map(id => {
            const prop = properties.find(p => p.id === id);
            if (prop && parsed.matchScores) {
              prop.matchScore = parsed.matchScores[id] || 50;
            }
            return prop;
          })
          .filter(Boolean);
      }
    } catch (aiError) {
      // Fallback: score by price proximity and bedrooms
      rankedProperties = properties.map(p => {
        let score = 50;
        if (lead.budget) {
          const priceDiff = Math.abs(p.price - lead.budget) / lead.budget;
          score += (1 - priceDiff) * 30;
        }
        if (lead.bedrooms && p.bedrooms >= lead.bedrooms) score += 10;
        if (lead.bathrooms && p.bathrooms >= lead.bathrooms) score += 10;
        return { ...p, matchScore: Math.round(Math.min(score, 100)) };
      }).sort((a, b) => b.matchScore - a.matchScore);
      reasoning = 'Matched based on budget, bedrooms, and bathrooms criteria.';
    }

    res.json({
      buyerName: `${lead.firstName} ${lead.lastName}`,
      criteria: {
        budget: lead.budget,
        propertyType: lead.propertyType,
        bedrooms: lead.bedrooms,
        bathrooms: lead.bathrooms,
        preferredAreas: lead.preferredAreas
      },
      reasoning,
      matches: rankedProperties.slice(0, parseInt(limit))
    });
  } catch (error) {
    console.error('Property matcher error:', error);
    res.status(500).json({ error: 'Failed to match properties' });
  }
});

// AI Listing Description Generator
router.post('/listing-description', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { propertyId, style = 'professional', address, propertyType, bedrooms, bathrooms, sqft, yearBuilt, features, price } = req.body;

    let property = null;

    // If propertyId is provided, look up the property
    if (propertyId) {
      property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { photos: true }
      });
      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }
    } else {
      // Use form data directly
      property = {
        type: propertyType || 'Single Family',
        address: address || 'Property',
        city: '',
        state: '',
        zipCode: '',
        price: price || 0,
        bedrooms: bedrooms || 3,
        bathrooms: bathrooms || 2,
        squareFeet: sqft || 1800,
        yearBuilt: yearBuilt || 2000,
        lotSize: null,
        garage: null,
        features: features ? features.split(',').map(f => f.trim()) : []
      };
      // Parse address if it contains city/state
      if (address && address.includes(',')) {
        const parts = address.split(',').map(p => p.trim());
        property.address = parts[0];
        if (parts.length >= 2) property.city = parts[1];
        if (parts.length >= 3) property.state = parts[2];
      }
    }

    const prompt = `Write a ${style} real estate listing description for the property below, following MLS-compliant copywriting best practices.

PROPERTY DATA:
- Type: ${property.type}
- Address: ${property.address}${property.city ? `, ${property.city}` : ''}${property.state ? `, ${property.state}` : ''} ${property.zipCode || ''}
- Price: $${property.price?.toLocaleString()}
- Bedrooms: ${property.bedrooms}
- Bathrooms: ${property.bathrooms}
- Square Feet: ${property.squareFeet?.toLocaleString()}
- Year Built: ${property.yearBuilt}
${property.lotSize ? `- Lot Size: ${property.lotSize} acres` : ''}
${property.garage ? `- Garage: ${property.garage} car` : ''}
- Features: ${property.features?.join(', ') || 'Modern amenities'}

WRITING STYLE: "${style}"
${style === 'luxury' ? '- Use aspirational, exclusive language. Emphasize craftsmanship, premium materials, designer finishes, and lifestyle elevation. Words: exquisite, bespoke, resort-style, curated, unparalleled.' : ''}
${style === 'professional' ? '- Use clean, factual, confident language. Lead with key specs and value propositions. Words: well-maintained, move-in ready, desirable, updated, spacious.' : ''}
${style === 'cozy' ? '- Use warm, inviting language that evokes comfort and home. Emphasize livability and character. Words: charming, sun-drenched, nestled, welcoming, retreat.' : ''}
${style === 'modern' ? '- Use sleek, contemporary language. Emphasize design, technology, and efficiency. Words: stunning, open-concept, smart home, seamless, architectural.' : ''}

COPYWRITING STRUCTURE (follow this flow):
1. HOOK (1 sentence): Attention-grabbing opening that creates immediate interest. Lead with the most compelling feature or lifestyle benefit.
2. LIFESTYLE VISION (2-3 sentences): Paint a picture of daily life in this home. Help the buyer see themselves living here.
3. KEY FEATURES (3-5 sentences): Highlight standout features with specific details. Use sensory language—what you see, feel, experience in each space.
4. NEIGHBORHOOD & LOCATION (1-2 sentences): Proximity to schools, shopping, dining, parks, transit. Mention the community character.
5. CALL TO ACTION (1 sentence): Create urgency. Encourage scheduling a showing.

MLS COMPLIANCE RULES (MUST follow):
- NEVER use language that violates Fair Housing Act (no references to race, religion, national origin, familial status, disability, sex, or age preference)
- AVOID: "perfect for families," "great for young couples," "walking distance to church," "master bedroom" (use "primary bedroom")
- DO NOT make guarantees about appreciation, school quality rankings, or neighborhood safety ratings
- Use "primary bedroom/suite" instead of "master bedroom/suite"

SEO KEYWORD STRATEGY:
- Naturally incorporate: "${property.city || ''} homes for sale", "${property.type?.toLowerCase().replace('_', ' ') || 'home'} for sale", "${property.bedrooms} bedroom ${property.city || ''}"
- Include neighborhood name if known
- Use long-tail keywords: "move-in ready", "updated kitchen", "open floor plan" where applicable

POWER WORDS TO USE (where appropriate):
stunning, sun-drenched, move-in ready, turn-key, meticulously maintained, freshly updated, sought-after, entertainer's dream, chef's kitchen, spa-like, retreat, panoramic, custom, soaring ceilings, natural light

TARGET LENGTH: 150-300 words for MLS listing. Write the description only—no title or headers needed.`;

    let description = '';
    try {
      description = await callOpenRouter(prompt, 'You are a top-producing real estate copywriter who has written 10,000+ MLS listings. You specialize in SEO-optimized, Fair Housing-compliant descriptions that generate showings. You understand emotional storytelling, sensory language, and platform-specific optimization for Zillow, Realtor.com, and Redfin. You never violate Fair Housing guidelines and always use "primary bedroom" instead of "master bedroom."');
    } catch (aiError) {
      // Fallback description
      const typeStr = property.type?.toLowerCase().replace('_', ' ') || 'home';
      const cityStr = property.city || 'this great location';
      description = `Welcome to this stunning ${typeStr} located in ${cityStr}. This beautiful ${property.bedrooms} bedroom, ${property.bathrooms} bathroom home offers ${property.squareFeet?.toLocaleString()} sq ft of living space. ${property.features?.length > 0 ? `Features include ${property.features.slice(0, 3).join(', ')}.` : ''} Priced at $${property.price?.toLocaleString()}, this is an incredible opportunity!`;
    }

    // Only save to DB if we have a propertyId
    if (propertyId) {
      await prisma.aIGeneratedContent.create({
        data: {
          type: 'listing_description',
          referenceId: propertyId,
          content: description
        }
      });
    }

    res.json({ propertyId, description, style });
  } catch (error) {
    console.error('Listing description error:', error);
    res.status(500).json({ error: 'Failed to generate description' });
  }
});

// AI Market Analysis / CMA
router.post('/market-analysis', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { propertyId, address, city, state, zipCode } = req.body;

    const comparables = await prisma.property.findMany({
      where: {
        status: { in: ['SOLD', 'ACTIVE'] },
        city: { equals: city, mode: 'insensitive' }
      },
      take: 15,
      orderBy: { soldAt: 'desc' }
    });

    const soldComps = comparables.filter(p => p.status === 'SOLD');
    const activeComps = comparables.filter(p => p.status === 'ACTIVE');

    const avgSoldPrice = soldComps.length > 0
      ? soldComps.reduce((sum, p) => sum + p.price, 0) / soldComps.length : 0;
    const avgPricePerSqft = soldComps.filter(p => p.squareFeet).length > 0
      ? soldComps.filter(p => p.squareFeet).reduce((sum, p) => sum + (p.price / p.squareFeet), 0) / soldComps.filter(p => p.squareFeet).length : 0;

    const prompt = `Perform a professional Comparative Market Analysis (CMA) using the data below.

SUBJECT PROPERTY AREA:
- Location: ${city}, ${state} ${zipCode || ''}
${propertyId ? `- Property ID: ${propertyId}` : ''}
${address ? `- Subject Address: ${address}` : ''}

MARKET DATA:
- Recent Sold Comparables: ${soldComps.length} properties
- Average Sold Price: $${Math.round(avgSoldPrice).toLocaleString()}
- Average Price/SqFt: $${Math.round(avgPricePerSqft)}
- Active Listings (Competition): ${activeComps.length}

COMPARABLE SALES (most recent):
${soldComps.slice(0, 5).map(p => `- ${p.address}: $${p.price.toLocaleString()}, ${p.squareFeet || 'N/A'} sqft, ${p.bedrooms}bd/${p.bathrooms}ba, $/sqft: $${p.squareFeet ? Math.round(p.price / p.squareFeet) : 'N/A'}`).join('\n')}

ACTIVE COMPETITION:
${activeComps.slice(0, 5).map(p => `- ${p.address}: $${p.price.toLocaleString()}, ${p.squareFeet || 'N/A'} sqft, ${p.bedrooms}bd/${p.bathrooms}ba`).join('\n')}

CMA METHODOLOGY (apply these adjustments):
1. Comparable Adjustments:
   - Size difference: adjust ~$50-150/sqft depending on market
   - Age/condition: newer/renovated comps command 5-15% premium
   - Lot size: larger lots add 3-8% in suburban markets
   - Garage: each car adds $5,000-$15,000
   - Pool/outdoor: adds $10,000-$30,000 depending on climate
   - Basement (finished): adds $15,000-$40,000

2. Absorption Rate Analysis:
   - Calculate months of inventory: Active Listings ÷ Monthly Sales Rate
   - <3 months = Strong Seller's Market (upward price pressure)
   - 3-6 months = Balanced Market
   - >6 months = Buyer's Market (downward price pressure)

3. Price Per Square Foot Analysis:
   - Calculate range, median, and trend direction
   - Compare subject to comp average

4. Days on Market (DOM) Trends:
   - Low DOM (<21 days) = high demand, aggressive pricing possible
   - Average DOM (21-45 days) = balanced, competitive pricing recommended
   - High DOM (>45 days) = soft demand, consider pricing below comps

5. List-to-Sold Price Ratio:
   - >100% = multiple offers common, list competitively to drive bidding
   - 97-100% = healthy market, price at market value
   - <97% = buyers negotiating, price with room for negotiation

6. Seasonal Adjustment Factors:
   - Spring (Mar-May): +2-5% premium, peak buyer activity
   - Summer (Jun-Aug): +1-3%, families buying before school year
   - Fall (Sep-Nov): -1-3%, market cooling
   - Winter (Dec-Feb): -3-5%, lowest activity but serious buyers

PRICING STRATEGIES (provide all three):
1. Competitive Strategy: Price at market value to sell within 30 days
2. Aggressive Strategy: Price 3-5% below market to generate multiple offers and bidding wars
3. Conservative Strategy: Price 3-5% above market for maximum proceeds, accept longer DOM

Provide your analysis as a detailed narrative covering: market conditions assessment, absorption rate, pricing trends, comparable adjustments, recommended list price with all three strategies, and seasonal considerations for timing the listing.`;

    let analysisText = '';
    try {
      analysisText = await callOpenRouter(prompt, 'You are a certified real estate appraiser and market analyst (MAI, SRA designated) with 20+ years of experience preparing CMAs and broker price opinions. You use rigorous comparable adjustment methodology, absorption rate analysis, and seasonal trend data to provide accurate pricing recommendations. You always provide three pricing strategies (competitive, aggressive, conservative) with specific dollar amounts and justify each recommendation with market data.');
    } catch (aiError) {
      analysisText = `Market Analysis for ${city}: Based on ${soldComps.length} recent sales, the average sold price is $${Math.round(avgSoldPrice).toLocaleString()} with an average price per square foot of $${Math.round(avgPricePerSqft)}. There are currently ${activeComps.length} active listings in the area.`;
    }

    const analysis = await prisma.marketAnalysis.create({
      data: {
        propertyId,
        address: address || '',
        analysisType: 'CMA',
        comparables: comparables.map(c => ({
          id: c.id, address: c.address, price: c.price, status: c.status, soldAt: c.soldAt, squareFeet: c.squareFeet
        })),
        estimatedValue: avgSoldPrice,
        analysis: analysisText
      }
    });

    res.json({
      analysis,
      statistics: {
        soldCount: soldComps.length,
        activeCount: activeComps.length,
        avgSoldPrice,
        avgPricePerSqft,
        estimatedValueLow: avgSoldPrice * 0.95,
        estimatedValueHigh: avgSoldPrice * 1.05
      }
    });
  } catch (error) {
    console.error('Market analysis error:', error);
    res.status(500).json({ error: 'Failed to generate market analysis' });
  }
});

// AI Follow-up Sequence Generator
router.post('/follow-up-sequence', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { leadId, sequenceType = 'nurturing', leadName, leadType, interests, timeline } = req.body;

    let lead = null;

    if (leadId) {
      lead = await prisma.lead.findUnique({ where: { id: leadId } });
    }

    // Use form data if no lead found
    if (!lead) {
      lead = {
        firstName: leadName ? leadName.split(' ')[0] : 'Valued Client',
        lastName: leadName ? leadName.split(' ').slice(1).join(' ') : '',
        budget: null,
        timeline: timeline || 'Not specified',
        preferredAreas: interests ? interests.split(',').map(i => i.trim()) : [],
        propertyType: leadType || 'Buyer'
      };
    }

    const prompt = `Create a professional ${sequenceType} email follow-up sequence for this real estate lead:

Lead Profile:
- Name: ${lead.firstName} ${lead.lastName}
- Type: ${leadType || 'Buyer'}
- Budget: $${lead.budget?.toLocaleString() || 'Not specified'}
- Timeline: ${lead.timeline || timeline || 'Not specified'}
- Interests: ${lead.preferredAreas?.join(', ') || interests || 'Not specified'}
- Property Type: ${lead.propertyType || 'Any'}

Generate 5 detailed, personalized emails with timing (Day 0, Day 3, Day 7, Day 14, Day 30).

IMPORTANT: Each email should be:
- At least 150-200 words in length
- Professional yet warm and personalized
- Include a clear call-to-action
- Mention specific details relevant to the lead's preferences
- Include the agent's value proposition

Format each email with proper paragraphs and professional structure including greeting, body paragraphs, and closing.

Respond in JSON format:
{
  "emails": [
    {
      "day": 0,
      "subject": "Compelling subject line",
      "body": "Full detailed email content with multiple paragraphs..."
    }
  ]
}`;

    let emails = [];
    try {
      // Use higher max_tokens for longer emails
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
            { role: 'system', content: 'You are an expert real estate email marketer. Create detailed, personalized, professional email sequences that nurture leads and build trust. Each email should be substantial (150-200+ words) with clear value and calls to action. Always respond in valid JSON format.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 10000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter API error response:', errorText);
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      let aiResponse = data.choices[0].message.content;
      console.log('AI Response received, length:', aiResponse.length);

      // Extract JSON from response (handle markdown code blocks)
      let jsonString = aiResponse;
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1].trim();
      } else {
        // Try to find JSON object directly
        const startIdx = aiResponse.indexOf('{');
        const endIdx = aiResponse.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
          jsonString = aiResponse.substring(startIdx, endIdx + 1);
        }
      }

      const parsed = JSON.parse(jsonString);
      emails = parsed.emails || [];
      console.log('Successfully parsed', emails.length, 'emails from AI response');
    } catch (aiError) {
      console.error('AI email generation error:', aiError.message);
      // Fallback sequences with detailed content
      const leadName = lead.firstName;
      const budget = lead.budget ? `$${lead.budget.toLocaleString()}` : 'your budget';
      const areas = lead.preferredAreas?.join(', ') || 'your preferred neighborhoods';
      const propertyType = lead.propertyType?.toLowerCase().replace('_', ' ') || 'home';

      emails = [
        {
          day: 0,
          subject: `Welcome ${leadName}! Let's Find Your Perfect Home Together`,
          body: `Dear ${leadName},

Thank you so much for reaching out about your home search! I'm thrilled to have the opportunity to help you find the perfect ${propertyType} that matches your needs and lifestyle.

Based on our initial conversation, I understand you're looking for properties in the ${areas} area with a budget of around ${budget}. This is an exciting market with plenty of opportunities, and I'm confident we can find something that exceeds your expectations.

Here's what you can expect working with me:
• Personalized property recommendations tailored to your specific criteria
• Immediate notifications when new listings match your preferences
• Expert guidance through every step of the buying process
• Access to off-market opportunities and coming-soon listings
• Skilled negotiation to get you the best possible deal

I'd love to schedule a brief call to discuss your home buying goals in more detail. This will help me better understand your must-haves, nice-to-haves, and any deal-breakers.

Please let me know your availability this week, and I'll make it work with my schedule.

Looking forward to connecting with you soon!

Best regards,
Your Real Estate Agent`
        },
        {
          day: 3,
          subject: `${leadName}, New Listings Matching Your Criteria Just Hit the Market!`,
          body: `Hi ${leadName},

I hope this email finds you well! I've been keeping a close eye on the market since we last connected, and I'm excited to share that several new properties have become available that might be perfect for you.

Given your interest in ${areas} and your budget of ${budget}, I've identified a few listings that I think you'll want to see before they get snatched up. The current market is moving quickly, and the best properties often receive multiple offers within days of listing.

Here's what I can do for you right now:
1. Send you a curated list of properties that match your specific criteria
2. Set up private showings at times that work with your schedule
3. Provide you with detailed neighborhood insights and market analysis

I've also been researching some upcoming listings that haven't hit the market yet. These "coming soon" properties can give you a competitive advantage if you're ready to act quickly.

Would you like me to send over the listings I've found? Or better yet, let's schedule a time to tour some properties together. Sometimes seeing a home in person can really help clarify what you're looking for.

Let me know your thoughts and availability!

Warm regards,
Your Real Estate Agent`
        },
        {
          day: 7,
          subject: `Market Insights for ${areas} - What You Need to Know`,
          body: `Dear ${leadName},

I wanted to share some valuable market insights that could help inform your home buying decisions. Understanding the current market conditions is crucial for making a smart investment.

Here's what's happening in ${areas} right now:

**Current Market Conditions:**
The real estate market in your preferred area is experiencing steady activity. Properties priced competitively are selling within 2-3 weeks on average, while homes that are priced right and show well are often receiving multiple offers.

**What This Means for You:**
As a buyer in this market, it's important to:
• Be prepared with mortgage pre-approval to move quickly on properties you love
• Know your must-haves vs. nice-to-haves to make faster decisions
• Consider properties that might need minor updates – they often offer better value

**Upcoming Opportunities:**
I'm tracking several properties that are expected to list soon in your price range. I can give you advance notice so you can be among the first to see them.

If you haven't already, I'd recommend getting pre-approved for a mortgage if you haven't done so yet. This will strengthen your position when you find the right home and are ready to make an offer.

Want to discuss your strategy over a quick call? I'm here to help you navigate this market successfully.

Best regards,
Your Real Estate Agent`
        },
        {
          day: 14,
          subject: `Checking In - How's Your Home Search Going, ${leadName}?`,
          body: `Hi ${leadName},

I wanted to check in and see how your home search is progressing. Whether you've been actively looking or life has gotten busy, I'm here to help in whatever way works best for you.

If you've been searching on your own, you might be feeling a bit overwhelmed by all the options out there. That's completely normal! Here's how I can help streamline your search:

**Curated Property Matches:** Rather than sifting through hundreds of listings, I can send you only the properties that truly match your criteria for ${propertyType} in ${areas}.

**Market Knowledge:** I can tell you which neighborhoods are up-and-coming, where you'll get the best value, and which areas to potentially avoid.

**Time Savings:** Let me handle the research, scheduling, and legwork so you can focus on visualizing your future home.

I'd also love to know if anything has changed in your search criteria. Sometimes as people look at more properties, their priorities shift – and that's perfectly okay! Keeping me updated helps me find you the best matches.

Are you available for a quick 15-minute call this week? I'd love to hear about your experience so far and discuss any questions you might have.

Looking forward to hearing from you!

Warmly,
Your Real Estate Agent`
        },
        {
          day: 30,
          subject: `Still Dreaming of Your Perfect ${propertyType}? I'm Here to Help`,
          body: `Dear ${leadName},

It's been a month since we first connected about your home search, and I wanted to reach out personally to let you know I'm still here and ready to help whenever you're ready.

I understand that buying a home is one of the biggest decisions you'll make, and it's important to move at a pace that feels right for you. There's no pressure here – just genuine support and expertise when you need it.

**A Few Things Have Changed in the Market:**
Over the past month, I've seen some interesting shifts in the ${areas} area. New inventory has come on the market, and some sellers have adjusted their pricing. This could mean new opportunities that weren't available when we first spoke.

**What I Can Offer You:**
• A fresh look at available properties in your price range of ${budget}
• Updated market analysis to help you make informed decisions
• Flexible showing schedules to fit your busy life
• Patient, pressure-free guidance every step of the way

Whether you're ready to actively start touring homes or just want to stay informed about the market, I'm here to support you. Sometimes it takes a while to find the right home – and that's perfectly fine.

Feel free to reach out anytime, even if it's just to ask a quick question. I truly enjoy helping people find their dream homes, and I'd be honored to assist you when the time is right.

Wishing you all the best,
Your Real Estate Agent

P.S. If your circumstances have changed and you're no longer in the market, please let me know. I appreciate your time and wish you well in all your endeavors!`
        }
      ];
    }

    res.json({ leadId, sequenceType, emails });
  } catch (error) {
    console.error('Follow-up sequence error:', error);
    res.status(500).json({ error: 'Failed to generate follow-up sequence' });
  }
});

// AI Chatbot - Handle website inquiries
router.post('/chatbot', async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { sessionId, message, visitorInfo } = req.body;

    let conversation = await prisma.aIConversation.findFirst({
      where: { sessionId, status: 'active' }
    });

    if (!conversation) {
      conversation = await prisma.aIConversation.create({
        data: {
          sessionId,
          type: 'chatbot',
          visitorName: visitorInfo?.name,
          visitorEmail: visitorInfo?.email,
          visitorPhone: visitorInfo?.phone,
          messages: [],
          status: 'active'
        }
      });
    }

    const messages = conversation.messages || [];
    messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() });

    // Build conversation history for AI
    const chatHistory = messages.slice(-10).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    let response = '';
    try {
      const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
            { role: 'system', content: 'You are a helpful real estate assistant. Help visitors find properties, answer questions about buying/selling homes, and collect their contact info to connect them with an agent. Be friendly, professional, and informative. If they want to schedule a showing or speak with an agent, ask for their name, email, and phone number.' },
            ...chatHistory
          ],
          max_tokens: 10000
        })
      });
      const data = await aiResponse.json();
      response = data.choices[0].message.content;
    } catch (aiError) {
      response = "Thank you for your message! I'm here to help you find your perfect home. Could you tell me more about what you're looking for?";
    }

    messages.push({ role: 'assistant', content: response, timestamp: new Date().toISOString() });

    await prisma.aIConversation.update({
      where: { id: conversation.id },
      data: { messages }
    });

    res.json({ sessionId, response, conversationId: conversation.id });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// AI Price Predictor
router.post('/price-predictor', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { address, city, state, zipCode, bedrooms, bathrooms, squareFeet, sqft, yearBuilt, type, propertyType, condition } = req.body;

    // Normalize field names (frontend may send different names)
    const finalBedrooms = bedrooms || 3;
    const finalBathrooms = bathrooms || 2;
    const finalSqft = squareFeet || sqft || 1800;
    const finalType = type || propertyType || 'Single Family';
    const finalCondition = condition || 'Good';

    // Parse address for city/state if not provided separately
    let finalCity = city || '';
    let finalState = state || '';
    if (!finalCity && address && address.includes(',')) {
      const parts = address.split(',').map(p => p.trim());
      if (parts.length >= 2) finalCity = parts[1];
      if (parts.length >= 3) finalState = parts[2].split(' ')[0];
    }

    // Condition multipliers
    const conditionMultipliers = {
      'Excellent': 1.10,
      'Good': 1.00,
      'Fair': 0.90,
      'Needs Work': 0.75,
      'Poor': 0.65
    };
    const conditionMultiplier = conditionMultipliers[finalCondition] || 1.0;

    // Type mapping
    const typeMap = {
      'Single Family': 'SINGLE_FAMILY',
      'Condo': 'CONDO',
      'Townhouse': 'TOWNHOUSE',
      'Multi-Family': 'MULTI_FAMILY'
    };
    const dbType = typeMap[finalType] || finalType;

    const comparables = await prisma.property.findMany({
      where: {
        status: 'SOLD',
        ...(finalCity && { city: { equals: finalCity, mode: 'insensitive' } }),
        type: dbType,
        bedrooms: { gte: finalBedrooms - 1, lte: finalBedrooms + 1 }
      },
      take: 20,
      orderBy: { soldAt: 'desc' }
    });

    const prompt = `You are an expert real estate appraiser with deep knowledge of current 2024-2025 US housing markets. Estimate the current market value for this property.

Subject Property:
- Address: ${address}${finalCity ? `, ${finalCity}` : ''}${finalState ? `, ${finalState}` : ''} ${zipCode || ''}
- Property Type: ${finalType}
- Condition: ${finalCondition}
- Bedrooms: ${finalBedrooms}
- Bathrooms: ${finalBathrooms}
- Square Feet: ${finalSqft}
- Year Built: ${yearBuilt || 'Unknown'}

${comparables.length > 0 ? `Recent Comparable Sales in the Area:
${comparables.slice(0, 10).map(p => `- ${p.address}: $${p.price.toLocaleString()}, ${p.squareFeet} sqft, ${p.bedrooms}bd/${p.bathrooms}ba, built ${p.yearBuilt}`).join('\n')}` : `No local comparable sales data available.`}

CRITICAL PRICING REFERENCE (2024-2025 Median Home Prices by Metro Area):
- San Francisco Bay Area: $1,200,000 - $1,800,000 (median ~$1,400,000)
- Los Angeles: $850,000 - $1,200,000 (median ~$950,000)
- San Diego: $900,000 - $1,100,000 (median ~$950,000)
- Seattle: $750,000 - $950,000 (median ~$850,000)
- New York Metro: $600,000 - $900,000 (median ~$750,000)
- Boston: $650,000 - $850,000 (median ~$750,000)
- Washington DC Metro: $550,000 - $750,000 (median ~$650,000)
- Denver: $550,000 - $700,000 (median ~$600,000)
- Miami: $500,000 - $700,000 (median ~$580,000)
- Austin: $450,000 - $650,000 (median ~$550,000)
- Richmond VA (Short Pump/West End): $450,000 - $650,000 (median ~$550,000)
- Charlotte NC: $400,000 - $550,000 (median ~$475,000)
- Raleigh NC: $425,000 - $575,000 (median ~$500,000)
- Nashville: $425,000 - $575,000 (median ~$500,000)
- Atlanta: $375,000 - $525,000 (median ~$450,000)
- Phoenix: $400,000 - $550,000 (median ~$450,000)
- Dallas/Fort Worth: $350,000 - $500,000 (median ~$425,000)
- Chicago: $300,000 - $450,000 (median ~$350,000)
- Houston: $300,000 - $450,000 (median ~$350,000)
- National Average: $400,000 - $450,000

IMPORTANT PRICING RULES:
1. For 5+ bedroom homes: Add $50,000-$100,000 above median (larger homes are premium)
2. For homes 2000+ sqft: Price should be ABOVE the median for the area
3. Richmond VA 23233 (Short Pump): This is an affluent suburb - 5bd homes typically $550,000-$700,000

PRICING ADJUSTMENTS:
- Excellent condition: +15-20% above median
- Good condition: baseline (median price)
- Fair condition: -10-15% below median
- Needs Work: -25-35% below median
- 5+ bedrooms: +$75,000-$150,000 (premium for larger homes)
- Extra bathrooms above 2: +$15,000-$30,000 each
- Square footage: 2000+ sqft homes should be 10-20% above median
- Newer construction (< 10 years): +5-10%
- Older homes (> 40 years): -5-10%

You MUST use these market references to provide an ACCURATE price for ${finalCity || 'this location'}. DO NOT underestimate - use current 2024-2025 market values.

Respond ONLY with valid JSON (no other text):
{"estimatedPrice": number, "lowRange": number, "highRange": number, "confidence": number, "reasoning": "brief explanation"}`;

    // Market rates for fallback (defined outside so it's accessible everywhere)
    const marketRates = {
      'SINGLE_FAMILY': 275,  // ~$495k for 1800 sqft
      'CONDO': 350,          // ~$630k for 1800 sqft
      'TOWNHOUSE': 300,      // ~$540k for 1800 sqft
      'MULTI_FAMILY': 225    // ~$405k for 1800 sqft
    };

    let result = { estimatedPrice: 0, lowRange: 0, highRange: 0, confidence: 50, reasoning: '' };
    let usedAI = false;

    console.log('=== Price Predictor Request ===');
    console.log('Address:', address);
    console.log('City:', finalCity, 'State:', finalState);
    console.log('Bedrooms:', finalBedrooms, 'Bathrooms:', finalBathrooms);
    console.log('SqFt:', finalSqft, 'Type:', finalType, 'Condition:', finalCondition);
    console.log('Comparables found:', comparables.length);

    try {
      console.log('Calling OpenRouter AI with low temperature for consistency...');
      const aiResponse = await callOpenRouter(
        prompt,
        'You are a real estate appraiser with deep knowledge of US housing markets. Provide accurate, realistic price predictions. Respond ONLY in valid JSON format. Use numbers WITHOUT commas (e.g., 1500000 not 1,500,000).',
        { temperature: 0.1 }  // Low temperature for consistent results
      );
      console.log('AI Response received:', aiResponse);

      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];
        console.log('JSON extracted:', jsonStr);

        // Fix common AI JSON errors - remove commas from numbers
        // Match numbers with commas like 1,500,000 or 1,500000 and remove the commas
        jsonStr = jsonStr.replace(/:\s*(\d{1,3})(,\d{3})+(?=\s*[,}\]])/g, (match) => {
          return match.replace(/,/g, '');
        });
        // Also fix numbers that have commas mid-number like "1,550000"
        jsonStr = jsonStr.replace(/(\d),(\d)/g, '$1$2');

        console.log('JSON after cleanup:', jsonStr);
        const parsed = JSON.parse(jsonStr);
        console.log('Parsed result:', parsed);

        // Validate AI returned a real price
        if (parsed.estimatedPrice && parsed.estimatedPrice > 0) {
          result = parsed;
          usedAI = true;
          console.log('Using AI result - Price:', result.estimatedPrice);
        } else {
          console.log('AI returned invalid price, using fallback');
        }
      } else {
        console.log('No JSON found in AI response');
      }
    } catch (aiError) {
      console.log('AI Error, using fallback:', aiError.message);
    }

    // Fallback calculation if AI didn't work
    if (!usedAI) {
      console.log('Using fallback calculation...');
      let basePrice = 0;
      if (comparables.length > 0) {
        const avgPricePerSqft = comparables.reduce((sum, p) => sum + (p.price / (p.squareFeet || 1)), 0) / comparables.length;
        basePrice = Math.round(avgPricePerSqft * finalSqft);
        console.log('Using comparables, avgPricePerSqft:', avgPricePerSqft);
      } else {
        const ratePerSqft = marketRates[dbType] || 275;
        basePrice = Math.round(ratePerSqft * finalSqft);
        console.log('Using market rates, ratePerSqft:', ratePerSqft);

        // Add bedroom/bathroom adjustments
        const bedroomValue = 15000;
        const bathroomValue = 10000;
        basePrice += (finalBedrooms - 3) * bedroomValue;
        basePrice += (finalBathrooms - 2) * bathroomValue;

        // Year built adjustment
        if (yearBuilt) {
          const age = new Date().getFullYear() - yearBuilt;
          if (age < 5) basePrice *= 1.10;
          else if (age < 15) basePrice *= 1.05;
          else if (age > 50) basePrice *= 0.90;
        }
      }

      // Apply condition multiplier
      result.estimatedPrice = Math.round(basePrice * conditionMultiplier);
      result.lowRange = Math.round(result.estimatedPrice * 0.93);
      result.highRange = Math.round(result.estimatedPrice * 1.07);
      result.confidence = comparables.length > 0 ? Math.min(comparables.length * 5, 80) : 45;
      result.reasoning = `Estimated based on ${comparables.length > 0 ? comparables.length + ' comparable sales' : 'current market rates (~$' + (marketRates[dbType] || 275) + '/sqft)'} with ${finalCondition.toLowerCase()} condition adjustment (${conditionMultiplier > 1 ? '+' : ''}${Math.round((conditionMultiplier - 1) * 100)}%).`;
      console.log('Fallback result:', result.estimatedPrice);
    }

    const responseData = {
      estimatedPrice: result.estimatedPrice,
      estimatedPriceLow: result.lowRange,
      estimatedPriceHigh: result.highRange,
      confidence: result.confidence,
      comparablesUsed: comparables.length,
      reasoning: result.reasoning,
      condition: finalCondition,
      conditionImpact: `${conditionMultiplier > 1 ? '+' : ''}${Math.round((conditionMultiplier - 1) * 100)}%`,
      source: usedAI ? 'AI Analysis' : 'Fallback Calculation'
    };

    res.json(responseData);
  } catch (error) {
    console.error('Price predictor error:', error);
    res.status(500).json({ error: 'Failed to predict price' });
  }
});

// AI Showing Scheduler - Smart scheduling
router.post('/showing-scheduler', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { propertyId, leadId, preferredDates, preferredTimes } = req.body;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { agent: true }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const existingShowings = await prisma.showing.findMany({
      where: { propertyId, status: { in: ['SCHEDULED', 'CONFIRMED'] } }
    });

    const availableSlots = [];
    const now = new Date();

    for (let i = 1; i <= 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const times = preferredTimes || ['10:00', '14:00', '16:00'];
      for (const time of times) {
        const [hours, minutes] = time.split(':');
        const slotDate = new Date(date);
        slotDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        const isBooked = existingShowings.some(s =>
          Math.abs(new Date(s.scheduledAt).getTime() - slotDate.getTime()) < 60 * 60 * 1000
        );

        if (!isBooked) {
          availableSlots.push({ date: dateStr, time, dateTime: slotDate.toISOString() });
        }
      }
    }

    res.json({ propertyId, availableSlots: availableSlots.slice(0, 10), existingShowingsCount: existingShowings.length });
  } catch (error) {
    console.error('Showing scheduler error:', error);
    res.status(500).json({ error: 'Failed to find available slots' });
  }
});

// AI Social Post Generator
router.post('/social-post', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { propertyId, platform = 'instagram', propertyAddress, propertyType, price, highlights } = req.body;

    let property = null;

    if (propertyId) {
      property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { photos: true }
      });
    }

    // Use form data if no propertyId or property not found
    if (!property) {
      property = {
        address: propertyAddress || 'Beautiful Property',
        city: '',
        price: price || 0,
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 1800,
        features: highlights ? highlights.split(',').map(h => h.trim()) : ['Beautiful home']
      };
      // Parse address for city
      if (propertyAddress && propertyAddress.includes(',')) {
        const parts = propertyAddress.split(',').map(p => p.trim());
        property.address = parts[0];
        if (parts.length >= 2) property.city = parts[1];
      }
    }

    const prompt = `Create a high-engagement ${platform} post for this real estate listing, optimized for the platform's algorithm and audience.

PROPERTY DATA:
- Address: ${property.address}${property.city ? `, ${property.city}` : ''}
- Price: $${property.price?.toLocaleString()}
- Type: ${propertyType || 'Home'}
- Bedrooms: ${property.bedrooms || 'N/A'}
- Bathrooms: ${property.bathrooms || 'N/A'}
- Square Feet: ${property.squareFeet?.toLocaleString() || 'N/A'}
- Highlights: ${property.features?.join(', ') || highlights || 'Beautiful home'}

PLATFORM: ${platform}

PLATFORM-SPECIFIC RULES:
${platform === 'Instagram' || platform === 'instagram' ? `- Max 2,200 characters for caption
- Use 20-25 hashtags (mix of high-volume and niche)
- First line must be a hook (viewers see only first 125 chars before "more")
- Use line breaks for readability
- Include a call-to-action (DM, link in bio, save this post)
- Emoji usage: moderate, 5-10 emojis to break up text
- Best content types: just listed, price drop, before/after, open house announcement
- Hashtag strategy: 5 high-volume (#realestate #homesforsale #dreamhome), 10 mid-volume (#[city]realestate #newlisting #househunting), 5-10 niche (#[neighborhood]homes #[city]realtor)` : ''}
${platform === 'Facebook' || platform === 'facebook' ? `- Longer form allowed (up to 63,206 chars, but 100-250 words optimal for engagement)
- Lead with a question or bold statement to stop the scroll
- Include a personal/storytelling element
- Minimal hashtags (3-5 max, Facebook deprioritizes hashtag-heavy posts)
- Add a clear CTA (comment, share, tag a friend)
- Emoji usage: light, 3-5 emojis
- Encourage sharing: "Know someone looking for a home in [city]? Tag them!"
- Best for: community engagement, open house events, market updates` : ''}
${platform === 'TikTok' || platform === 'tiktok' ? `- Caption max 150 characters (ultra-concise)
- Write a script/voiceover for a 30-60 second video tour
- Hook must grab attention in first 2 seconds
- Trending audio suggestions welcome
- 3-5 hashtags only (#fyp #realestate #housetour #[city])
- Conversational, energetic tone
- Focus on the "wow factor" of the property
- Best for: home tours, "wait for it" reveals, price guessing` : ''}
${platform === 'Twitter' || platform === 'twitter' || platform === 'X' ? `- Max 280 characters per tweet
- If content needs more space, write a thread (3-5 tweets)
- Lead with the most compelling fact or visual hook
- 2-3 hashtags max (Twitter penalizes hashtag stuffing)
- Minimal emoji usage (1-3)
- Include a link placeholder: [LISTING LINK]
- Conversational, punchy tone
- Best for: just listed announcements, market stats, price drops` : ''}
${platform === 'LinkedIn' || platform === 'linkedin' ? `- Professional, authoritative tone
- 1,300 characters optimal (up to 3,000)
- Lead with a market insight or industry hook, then pivot to the listing
- No hashtags in the body; add 3-5 at the end
- Minimal emojis (0-2, if any)
- Frame the listing as a market opportunity or investment insight
- Include agent value proposition
- Best for: luxury listings, investment properties, market commentary` : ''}

ENGAGEMENT OPTIMIZATION:
- First line = scroll-stopping hook (question, bold claim, or intriguing statement)
- Include a clear CTA (comment, DM, save, share, link in bio)
- Create urgency where authentic ("Just listed", "Open house this weekend", "Won't last long at this price")
- Ask a question to boost comments ("What's your favorite feature?", "Guess the price!")

CONTENT STRUCTURE:
1. Hook line (attention grabber)
2. Property highlights (2-3 key features)
3. Lifestyle/emotional benefit
4. CTA + urgency
5. Hashtags (platform-appropriate count)

Write the complete post ready to copy-paste.`;

    let content = '';
    try {
      content = await callOpenRouter(prompt, `You are a real estate social media strategist who manages accounts with 100K+ followers. You understand ${platform}'s algorithm, character limits, hashtag strategy, and what content goes viral on each platform. You create scroll-stopping posts that generate leads, not just likes. You know the difference between engagement bait and authentic content that converts followers into clients.`);
    } catch (aiError) {
      const cityTag = property.city ? `#${property.city.toLowerCase().replace(/\s/g, '')}` : '';
      content = `🏠 NEW LISTING! ${property.address}${property.city ? `, ${property.city}` : ''}\n\n💰 $${property.price?.toLocaleString()}\n✨ ${property.features?.slice(0, 3).join(' | ') || 'Amazing features'}\n\nDM for details!\n\n#realestate #newlisting #dreamhome ${cityTag}`;
    }

    res.json({ propertyId, platform, content });
  } catch (error) {
    console.error('Social post error:', error);
    res.status(500).json({ error: 'Failed to generate social post' });
  }
});

// =====================================================
// NEW AI FEATURES - ENHANCED CAPABILITIES
// =====================================================

// AI Virtual Staging - Transform empty rooms into staged rooms
router.post('/virtual-staging', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { photoId, style = 'modern', roomType = 'living_room', currentState = 'Empty', budget = 'Medium' } = req.body;

    // photoId is optional - can work without a specific photo
    let photo = null;
    if (photoId) {
      photo = await prisma.propertyPhoto.findUnique({
        where: { id: photoId },
        include: { property: true }
      });
    }

    // Map frontend roomType to backend format
    const roomTypeMap = {
      'Living Room': 'living_room',
      'Bedroom': 'bedroom',
      'Kitchen': 'kitchen',
      'Dining Room': 'dining_room',
      'Home Office': 'office',
      'Bathroom': 'bathroom'
    };
    const normalizedRoomType = roomTypeMap[roomType] || roomType.toLowerCase().replace(' ', '_');

    // Map frontend style to backend format
    const styleMap = {
      'Modern': 'modern',
      'Traditional': 'traditional',
      'Minimalist': 'contemporary',
      'Farmhouse': 'farmhouse',
      'Coastal': 'coastal',
      'Industrial': 'modern'
    };
    const normalizedStyle = styleMap[style] || style.toLowerCase();

    // Generate staging prompt based on room type and style
    const styleDescriptions = {
      modern: 'sleek modern furniture with clean lines, neutral colors, and minimalist decor',
      traditional: 'classic traditional furniture with warm woods, elegant fabrics, and timeless pieces',
      contemporary: 'contemporary furniture with bold colors, artistic pieces, and current trends',
      farmhouse: 'rustic farmhouse style with distressed wood, cozy textiles, and vintage accents',
      coastal: 'coastal beach style with light colors, natural textures, and nautical elements',
      luxury: 'high-end luxury furniture with premium materials, designer pieces, and sophisticated decor'
    };

    const roomDescriptions = {
      living_room: 'a welcoming living room with comfortable seating, coffee table, area rug, and tasteful artwork',
      bedroom: 'an inviting bedroom with a well-made bed, nightstands, dresser, and soft lighting',
      dining_room: 'an elegant dining room with a dining table, chairs, centerpiece, and ambient lighting',
      kitchen: 'a functional kitchen with organized counters, decorative items, and fresh produce display',
      office: 'a productive home office with a desk, chair, bookshelves, and professional decor',
      bathroom: 'a spa-like bathroom with fluffy towels, plants, and elegant accessories'
    };

    const prompt = `Create a professional virtual staging plan for this room, backed by NAR staging research and buyer psychology.

ROOM DETAILS:
- Room Type: ${normalizedRoomType.replace('_', ' ')}
- Current State: ${currentState}
- Target Style: ${normalizedStyle} — ${styleDescriptions[normalizedStyle] || styleDescriptions.modern}
- Room Description: ${roomDescriptions[normalizedRoomType] || roomDescriptions.living_room}
- Budget Level: ${budget}

STAGING INDUSTRY DATA (reference in your recommendations):
- NAR reports staged homes sell 73% faster than non-staged homes
- Staged homes sell for 6-25% more than non-staged comparable properties
- 82% of buyers' agents say staging makes it easier for buyers to visualize the property as a future home
- Living room is #1 most important room to stage (46% of buyers), followed by primary bedroom (43%), then kitchen (35%)
- ROI on staging: typically 5-15x the investment (e.g., $2,500 staging investment can yield $25,000+ higher sale price)

BUYER PSYCHOLOGY TRIGGERS BY ROOM:
${normalizedRoomType === 'living_room' ? '- Living room = social hub and first impression. Buyers imagine hosting, relaxing, family time. Create a welcoming focal point (fireplace, view, or media wall). Ensure conversation-friendly seating arrangement.' : ''}
${normalizedRoomType === 'bedroom' ? '- Primary bedroom = personal retreat and sanctuary. Buyers want to feel calm, luxurious, and rested. Hotel-style bedding, symmetrical nightstands, and soft lighting create aspiration. Remove personal items.' : ''}
${normalizedRoomType === 'kitchen' ? '- Kitchen = heart of the home and #1 ROI room. Buyers imagine cooking, gathering, morning coffee. Clear counters (80% empty), add a bowl of fruit or herb plant, style open shelving. Clean sight lines are critical.' : ''}
${normalizedRoomType === 'dining_room' ? '- Dining room = entertaining and family meals. Set the table for 4-6 (not full place settings—minimal and elegant). A centerpiece and ambient lighting suggest a lifestyle of entertaining.' : ''}
${normalizedRoomType === 'office' ? '- Home office = productivity and work-life balance. Post-pandemic, this room is a top-3 buyer priority. Clean desk, good lighting, organized shelves signal functionality. Add a plant and minimal art.' : ''}
${normalizedRoomType === 'bathroom' ? '- Bathroom = spa and self-care. Rolled white towels, a plant, a candle, and clear counters create a hotel/spa feel. Remove all personal products. Good lighting is essential.' : ''}

COLOR PSYCHOLOGY IN REAL ESTATE:
- Neutrals (warm gray, greige, soft white): Broadest buyer appeal, makes spaces feel larger, photograph well
- Warm accents (navy, forest green, terracotta): Add depth without alienating buyers
- AVOID: bold red (anxiety), bright yellow (polarizing), purple (too personal), all-white (cold/sterile)
- Best-photographing colors: Benjamin Moore Revere Pewter, Sherwin-Williams Agreeable Gray, warm whites

PHOTOGRAPHY STAGING TIPS (optimize for listing photos):
- Stage for camera angles, not just in-person viewing
- Ensure clear sight lines from doorway into room (this is the "hero shot" angle)
- Odd numbers of decor items photograph better (groups of 3 or 5)
- Remove anything reflective that could show camera/photographer
- Ensure window treatments allow natural light (buyers love bright spaces)

BUDGET-SPECIFIC RECOMMENDATIONS:
${budget === 'Low' ? '- Budget: $500-$1,500. Focus on decluttering, deep cleaning, paint touch-ups, rental furniture for 1-2 key rooms. Use accessories you already own. DIY staging with items from HomeGoods/Target.' : ''}
${budget === 'Medium' ? '- Budget: $1,500-$5,000. Full staging of main living areas (living, primary bedroom, kitchen/dining). Rent quality furniture for 60-90 days. Professional accessories and artwork. Expected ROI: 8-12x investment.' : ''}
${budget === 'High' || budget === 'Luxury' ? '- Budget: $5,000-$15,000+. Full home staging with designer furniture, custom artwork, luxury accessories. Professional styling for every room including outdoor spaces. White-glove service. Expected ROI: 5-8x investment.' : ''}

COMMON STAGING MISTAKES TO AVOID:
- Over-staging (too much furniture makes rooms look small)
- Furniture that's too large for the room
- Personal photos or religious items
- Strong scents (candles, plug-ins—some buyers have sensitivities)
- Ignoring the exterior/curb appeal
- Mismatched styles between rooms
- Blocking natural light with heavy drapes

Provide specific, actionable staging recommendations in JSON format:
{
  "furniture": ["item1 with specific dimensions/style", "item2"],
  "colorPalette": ["primary wall color", "accent color", "textile color"],
  "decor": ["specific decor item 1", "specific decor item 2"],
  "arrangement": "detailed furniture placement description optimized for both in-person viewing and listing photos",
  "lightingTips": "layered lighting recommendations (ambient, task, accent)",
  "photographyTips": "specific tips for photographing this staged room",
  "buyerPsychology": "what emotional response this staging creates and why it drives offers",
  "estimatedImpact": "expected impact on sale price and days on market with supporting data",
  "estimatedCost": "specific budget range with item breakdown",
  "mistakesToAvoid": ["room-specific staging mistakes to avoid"]
}`;

    let stagingPlan = {};
    try {
      const aiResponse = await callOpenRouter(prompt, 'You are an ASP (Accredited Staging Professional) certified home stager with 15+ years of experience and 500+ homes staged. You understand buyer psychology, color theory, furniture scale, and how staging translates to listing photography. You back your recommendations with NAR data and ROI projections. You know the difference between staging for in-person showings vs. listing photos. Respond in valid JSON.');
      stagingPlan = JSON.parse(aiResponse);
    } catch (aiError) {
      // Fallback staging recommendations
      stagingPlan = {
        furniture: ['Neutral-colored sofa', 'Wooden coffee table', 'Accent chairs', 'Floor lamp'],
        colorPalette: ['Warm gray', 'Cream white', 'Navy blue accents'],
        decor: ['Abstract wall art', 'Throw pillows', 'Indoor plants', 'Decorative vases'],
        arrangement: 'Arrange seating to create conversation areas with furniture facing the focal point',
        lightingTips: 'Layer lighting with overhead fixtures, floor lamps, and accent lighting',
        estimatedImpact: 'Staged homes typically sell 73% faster and for 6-25% more than non-staged homes',
        estimatedCost: budget === 'Low' ? '$500-$1,500' : budget === 'High' || budget === 'Luxury' ? '$5,000-$15,000' : '$1,500-$5,000'
      };
    }

    // Only update photo record if photoId is provided
    if (photoId && photo) {
      await prisma.propertyPhoto.update({
        where: { id: photoId },
        data: { isEnhanced: true }
      });

      // Save AI generated content
      await prisma.aIGeneratedContent.create({
        data: {
          type: 'virtual_staging',
          referenceId: photoId,
          content: JSON.stringify(stagingPlan)
        }
      });
    }

    res.json({
      photoId,
      style: normalizedStyle,
      roomType: normalizedRoomType,
      currentState,
      budget,
      stagingPlan,
      message: 'Virtual staging recommendations generated.'
    });
  } catch (error) {
    console.error('Virtual staging error:', error);
    res.status(500).json({ error: 'Failed to generate staging recommendations' });
  }
});

// AI Neighborhood Insights - Generate comprehensive neighborhood analysis
router.post('/neighborhood-insights', authenticateToken, async (req, res) => {
  try {
    const { address, city, state, zipCode } = req.body;

    const prompt = `Provide a comprehensive neighborhood analysis for ${address || ''} ${city}, ${state} ${zipCode || ''}, using standardized scoring methodologies.

SCORING METHODOLOGY (apply consistently):
- All scores are 0-100 scale
- 90-100: Exceptional — top 10% nationally
- 75-89: Above Average — better than most comparable areas
- 60-74: Average — typical for the region
- 40-59: Below Average — notable deficiencies
- 0-39: Poor — significant concerns

ANALYSIS CATEGORIES:

1. SAFETY & CRIME (use crime rate context):
   - Score based on property crime and violent crime rates per 1,000 residents
   - Compare to national average (property: 19.6/1000, violent: 3.7/1000)
   - Note trends (improving, stable, declining)
   - Mention specific safety features (neighborhood watch, police response times, lighting)

2. SCHOOLS (use GreatSchools-style 1-10 rating):
   - Rate elementary, middle, and high schools serving this address
   - Include test score performance vs state average
   - Note student-to-teacher ratios, special programs, extracurriculars
   - Mention private/charter school alternatives if public options are weak
   - School quality impacts home values by 10-20% (note this for buyers)

3. WALKABILITY (Walk Score equivalent):
   - 90-100: Walker's Paradise — daily errands do not require a car
   - 70-89: Very Walkable — most errands on foot
   - 50-69: Somewhat Walkable — some errands on foot
   - 25-49: Car-Dependent — most errands require a car
   - 0-24: Almost All Errands Require a Car
   - List specific walkable amenities within 0.25, 0.5, and 1 mile

4. TRANSIT SCORE (Transit Score equivalent):
   - 90-100: Rider's Paradise — world-class public transit
   - 70-89: Excellent Transit — convenient for most trips
   - 50-69: Good Transit — many nearby public transit options
   - 25-49: Some Transit — a few public transit options
   - 0-24: Minimal Transit
   - Include commute time estimates to downtown/major employment centers

5. BIKE SCORE:
   - 90-100: Biker's Paradise
   - 70-89: Very Bikeable
   - 50-69: Bikeable
   - 0-49: Somewhat/Not Bikeable
   - Note bike lanes, trails, bike share availability

6. DEMOGRAPHICS & COMMUNITY:
   - Population density and growth trends
   - Median household income (vs metro average)
   - Age distribution (median age, family vs singles mix)
   - Owner-occupied vs renter ratio
   - Community character (suburban family, urban professional, college town, retirement)

7. AMENITIES & LIFESTYLE:
   - Restaurants (count, variety, quality — note any award-winning or notable)
   - Shopping (grocery stores, retail, malls — distance)
   - Parks & Recreation (acreage, facilities, trails)
   - Entertainment (theaters, museums, nightlife, sports venues)
   - Healthcare (hospitals, urgent care — distance and quality)

8. REAL ESTATE MARKET TRENDS:
   - 1-year, 3-year, and 5-year appreciation rates
   - Compare appreciation to metro average and national average (historically ~3-5%/year)
   - Current median home price and trend direction
   - Average days on market
   - Inventory levels (months of supply)

9. COST OF LIVING:
   - Compare to metro average (100 = metro average)
   - Property tax rate and average annual bill
   - Utility costs estimate
   - Insurance considerations (flood zone, fire risk, etc.)

10. FUTURE DEVELOPMENT & OUTLOOK:
    - Known planned developments (commercial, residential, infrastructure)
    - Potential impact on property values (positive or negative)
    - Zoning changes or rezoning applications
    - Infrastructure projects (roads, transit expansions, schools)

LIFESTYLE FIT ASSESSMENT:
Rate compatibility (1-10) for each buyer type:
- Families with young children
- Empty nesters / downsizers
- Young professionals
- Retirees
- Investors (rental demand, appreciation potential)
- Remote workers (internet quality, coworking spaces, cafes)

SEASONAL CONSIDERATIONS:
- Weather impact on outdoor lifestyle
- Seasonal events or community activities
- Impact of seasons on commute or daily life

Respond in JSON format:
{
  "overallScore": 85,
  "safety": {"score": 80, "crimeRatePer1000": {"property": 0, "violent": 0}, "vsNationalAvg": "below/above", "trend": "improving/stable/declining", "summary": "..."},
  "schools": {"score": 85, "elementary": [{"name": "", "rating": 8, "distance": ""}], "middle": [{"name": "", "rating": 7}], "high": [{"name": "", "rating": 8}], "summary": "..."},
  "walkability": {"score": 70, "walkScoreLabel": "Somewhat Walkable", "nearbyAmenities": {"quarter_mile": [], "half_mile": [], "one_mile": []}, "summary": "..."},
  "transportation": {"score": 75, "transitScoreLabel": "Good Transit", "options": [], "commuteInfo": "..."},
  "bikeability": {"score": 60, "bikeScoreLabel": "Bikeable", "infrastructure": "..."},
  "demographics": {"medianIncome": "", "medianAge": 0, "ownerOccupiedPct": 0, "populationGrowth": "", "summary": "..."},
  "amenities": {"restaurants": [], "shopping": [], "parks": [], "entertainment": [], "healthcare": []},
  "marketTrends": {"appreciation1yr": "", "appreciation3yr": "", "appreciation5yr": "", "medianHomePrice": "", "avgDaysOnMarket": 0, "monthsOfSupply": 0, "summary": "..."},
  "costOfLiving": {"vsMetroAvg": 100, "propertyTaxRate": "", "summary": "..."},
  "futureDevelopment": {"projects": [], "impact": "..."},
  "lifestyleFit": {"families": 8, "emptyNesters": 6, "youngProfessionals": 7, "retirees": 5, "investors": 6, "remoteWorkers": 7},
  "seasonalNotes": "...",
  "prosAndCons": {"pros": [], "cons": []},
  "idealFor": ["families", "young professionals"]
}`;

    let insights = {};
    try {
      const aiResponse = await callOpenRouter(prompt, 'You are a neighborhood analytics expert who combines Walk Score, GreatSchools, FBI crime statistics, Census data, and real estate market data to create comprehensive area profiles. You use standardized 0-100 scoring with defined thresholds, compare metrics to national and metro averages, and assess lifestyle fit for different buyer demographics. You provide data-driven, balanced assessments—never oversell a neighborhood. Respond in valid JSON.');
      insights = JSON.parse(aiResponse);
    } catch (aiError) {
      // Fallback insights
      insights = {
        overallScore: 75,
        safety: { score: 75, summary: 'Generally safe residential area with active neighborhood watch' },
        schools: { score: 80, summary: 'Access to quality public schools with good ratings', elementary: [], middle: [], high: [] },
        walkability: { score: 65, nearbyAmenities: ['Grocery stores', 'Parks', 'Restaurants'], summary: 'Moderately walkable with most errands requiring a car' },
        transportation: { score: 70, options: ['Bus routes', 'Major highways nearby'], commuteInfo: 'Average commute times to downtown' },
        demographics: { summary: 'Diverse, family-friendly neighborhood with mix of young families and established residents' },
        amenities: { restaurants: ['Various dining options'], shopping: ['Local retail'], parks: ['Community parks'], entertainment: ['Movie theaters', 'Recreation centers'] },
        marketTrends: { appreciation: '3-5% annually', avgDaysOnMarket: 45, summary: 'Stable market with steady appreciation' },
        futureDevelopment: { projects: ['Potential commercial development'], impact: 'May increase property values' },
        prosAndCons: { pros: ['Good schools', 'Family-friendly', 'Safe'], cons: ['Limited nightlife', 'Car-dependent'] },
        idealFor: ['Families', 'First-time homebuyers']
      };
    }

    res.json({
      location: { address, city, state, zipCode },
      insights,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Neighborhood insights error:', error);
    res.status(500).json({ error: 'Failed to generate neighborhood insights' });
  }
});

// AI Contract Analyzer - Review and summarize contracts
router.post('/contract-analyzer', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { documentId, contractText } = req.body;

    let text = contractText;

    // If documentId provided, get the document
    if (documentId && !contractText) {
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      });
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      // In production, you'd extract text from the document URL
      text = 'Contract text would be extracted from document';
    }

    if (!text) {
      return res.status(400).json({ error: 'Contract text or documentId required' });
    }

    const prompt = `Analyze this real estate contract and provide a comprehensive review:

Contract Text:
${text.substring(0, 4000)} ${text.length > 4000 ? '... [truncated]' : ''}

Provide analysis in JSON format:
{
  "summary": "Brief overview of the contract (2-3 sentences)",
  "keyTerms": {
    "purchasePrice": "",
    "earnestMoney": "",
    "closingDate": "",
    "contingencies": [],
    "includedItems": [],
    "excludedItems": []
  },
  "criticalDates": [
    {"date": "", "event": "", "importance": "high/medium/low"}
  ],
  "potentialIssues": [
    {"issue": "", "severity": "high/medium/low", "recommendation": ""}
  ],
  "favorableTerms": [""],
  "unfavorableTerms": [""],
  "missingClauses": ["clauses that should be considered"],
  "negotiationPoints": ["areas where you might negotiate better terms"],
  "overallAssessment": {
    "buyerFriendly": true/false,
    "score": 75,
    "recommendation": ""
  }
}`;

    let analysis = {};
    try {
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
            { role: 'system', content: 'You are an expert real estate attorney and contract analyst. Review contracts thoroughly and identify important terms, potential issues, and provide actionable recommendations. Respond in valid JSON.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 10000
        })
      });
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error('AI contract analysis error:', aiError);
      analysis = {
        summary: 'Contract analysis requires manual review',
        keyTerms: { purchasePrice: 'See contract', earnestMoney: 'See contract', closingDate: 'See contract', contingencies: [], includedItems: [], excludedItems: [] },
        criticalDates: [],
        potentialIssues: [{ issue: 'AI analysis unavailable', severity: 'medium', recommendation: 'Have attorney review manually' }],
        favorableTerms: [],
        unfavorableTerms: [],
        missingClauses: [],
        negotiationPoints: [],
        overallAssessment: { buyerFriendly: null, score: null, recommendation: 'Consult with a real estate attorney for detailed review' }
      };
    }

    // Save analysis
    await prisma.aIGeneratedContent.create({
      data: {
        type: 'contract_analysis',
        referenceId: documentId,
        content: JSON.stringify(analysis)
      }
    });

    res.json({
      documentId,
      analysis,
      disclaimer: 'This AI analysis is for informational purposes only and does not constitute legal advice. Please consult with a licensed real estate attorney for professional legal review.'
    });
  } catch (error) {
    console.error('Contract analyzer error:', error);
    res.status(500).json({ error: 'Failed to analyze contract' });
  }
});

// AI Offer Analyzer - Compare multiple offers
router.post('/offer-analyzer', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { propertyId, propertyAddress, listPrice, offers } = req.body;

    if (!offers || !Array.isArray(offers) || offers.length === 0) {
      return res.status(400).json({ error: 'At least one offer is required' });
    }

    let property = null;
    if (propertyId) {
      property = await prisma.property.findUnique({
        where: { id: propertyId }
      });
    }

    // Use form data if no property found
    const propertyPrice = property?.price || listPrice || 500000;
    const propertyAddr = property?.address || propertyAddress || 'Property';

    const prompt = `Analyze these offers for a property at ${propertyAddr} listed at $${propertyPrice?.toLocaleString()}:

Offers:
${offers.map((o, i) => `
Offer ${i + 1}:
- Buyer: ${o.buyerName || 'Anonymous'}
- Price: $${o.price?.toLocaleString()}
- Earnest Money: $${o.earnestMoney?.toLocaleString()}
- Down Payment: ${o.downPayment}%
- Financing: ${o.financingType || 'Conventional'}
- Pre-approved: ${o.isPreApproved ? 'Yes' : 'No'}
- Contingencies: ${o.contingencies?.join(', ') || 'Standard'}
- Closing Date: ${o.closingDate || 'Standard'}
- Escalation Clause: ${o.hasEscalation ? `Yes, up to $${o.escalationCap?.toLocaleString()}` : 'No'}
- Additional Terms: ${o.additionalTerms || 'None'}
`).join('\n')}

Analyze each offer and recommend the best one. Consider:
1. Net proceeds to seller
2. Likelihood of closing
3. Timeline
4. Risk factors
5. Overall strength

Respond in JSON:
{
  "offers": [
    {
      "offerNumber": 1,
      "score": 85,
      "netProceeds": 500000,
      "strengths": ["Strong financing", "Quick close"],
      "weaknesses": ["Multiple contingencies"],
      "riskLevel": "low/medium/high",
      "likelihoodToClose": 90
    }
  ],
  "recommendation": {
    "bestOffer": 1,
    "reasoning": "Detailed explanation",
    "negotiationStrategy": "Suggestions for counter-offers or negotiations",
    "alternativeScenarios": ["If offer 1 falls through, offer 2 is strong because..."]
  },
  "marketContext": "How these offers compare to typical offers in this market"
}`;

    let analysis = {};
    try {
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
            { role: 'system', content: 'You are an expert real estate negotiator and offer analyst. Provide detailed, strategic analysis of offers to help sellers make informed decisions. Respond in valid JSON.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 10000
        })
      });
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error('AI offer analysis error:', aiError);
      // Fallback - simple comparison
      const sortedOffers = [...offers].sort((a, b) => (b.price || 0) - (a.price || 0));
      analysis = {
        offers: offers.map((o, i) => ({
          offerNumber: i + 1,
          score: o.isPreApproved ? 80 : 60,
          netProceeds: o.price,
          strengths: o.isPreApproved ? ['Pre-approved financing'] : [],
          weaknesses: o.contingencies?.length > 2 ? ['Multiple contingencies'] : [],
          riskLevel: o.isPreApproved ? 'low' : 'medium',
          likelihoodToClose: o.isPreApproved ? 85 : 70
        })),
        recommendation: {
          bestOffer: sortedOffers[0] ? offers.indexOf(sortedOffers[0]) + 1 : 1,
          reasoning: 'Based on highest price and financing terms',
          negotiationStrategy: 'Consider countering lower offers if they have stronger financing',
          alternativeScenarios: ['Have backup offers ready in case primary falls through']
        },
        marketContext: 'Analysis based on provided offer terms'
      };
    }

    res.json({
      propertyId,
      listPrice: property?.price,
      offersCount: offers.length,
      analysis
    });
  } catch (error) {
    console.error('Offer analyzer error:', error);
    res.status(500).json({ error: 'Failed to analyze offers' });
  }
});

// AI Investment Analyzer - Analyze property as investment
router.post('/investment-analyzer', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { propertyId, purchasePrice, downPayment, interestRate, loanTerm, estimatedRent, expenses } = req.body;

    const property = propertyId ? await prisma.property.findUnique({ where: { id: propertyId } }) : null;

    const price = purchasePrice || property?.price || 0;
    const down = downPayment || 20;
    const rate = interestRate || 7;
    const term = loanTerm || 30;
    const rent = estimatedRent || 0;
    const monthlyExpenses = expenses || {};

    // Calculate financials
    const loanAmount = price * (1 - down / 100);
    const monthlyRate = rate / 100 / 12;
    const numPayments = term * 12;
    const monthlyMortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);

    const totalMonthlyExpenses = (monthlyExpenses.taxes || price * 0.01 / 12) +
      (monthlyExpenses.insurance || price * 0.005 / 12) +
      (monthlyExpenses.maintenance || rent * 0.1) +
      (monthlyExpenses.vacancy || rent * 0.05) +
      (monthlyExpenses.propertyManagement || rent * 0.1) +
      (monthlyExpenses.hoa || 0);

    const monthlyCashFlow = rent - monthlyMortgage - totalMonthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;
    const totalCashInvested = price * (down / 100);
    const cashOnCashReturn = (annualCashFlow / totalCashInvested) * 100;
    const capRate = ((rent * 12 - totalMonthlyExpenses * 12) / price) * 100;
    const grossRentMultiplier = price / (rent * 12);

    const prompt = `Analyze this real estate investment opportunity using professional investor metrics and industry benchmarks.

PROPERTY FINANCIALS:
- Purchase Price: $${price.toLocaleString()}
- Down Payment: ${down}% ($${(price * down / 100).toLocaleString()})
- Loan Amount: $${loanAmount.toLocaleString()}
- Interest Rate: ${rate}%
- Loan Term: ${term} years
- Monthly Mortgage Payment: $${monthlyMortgage.toFixed(2)}

INCOME:
- Estimated Monthly Rent: $${rent.toLocaleString()}
- Annual Gross Rent: $${(rent * 12).toLocaleString()}

EXPENSES (Monthly):
- Property Taxes: $${(monthlyExpenses.taxes || price * 0.01 / 12).toFixed(2)}
- Insurance: $${(monthlyExpenses.insurance || price * 0.005 / 12).toFixed(2)}
- Maintenance Reserve: $${(monthlyExpenses.maintenance || rent * 0.1).toFixed(2)}
- Vacancy Reserve: $${(monthlyExpenses.vacancy || rent * 0.05).toFixed(2)}
- Property Management: $${(monthlyExpenses.propertyManagement || rent * 0.1).toFixed(2)}
- HOA: $${(monthlyExpenses.hoa || 0).toFixed(2)}
- Total Monthly Expenses: $${totalMonthlyExpenses.toFixed(2)}

CALCULATED METRICS:
- Monthly Cash Flow: $${monthlyCashFlow.toFixed(2)}
- Annual Cash Flow: $${annualCashFlow.toFixed(2)}
- Cash-on-Cash Return: ${cashOnCashReturn.toFixed(2)}%
- Cap Rate: ${capRate.toFixed(2)}%
- Gross Rent Multiplier: ${grossRentMultiplier.toFixed(2)}

INDUSTRY BENCHMARKS (evaluate this deal against these):
1. Cap Rate Benchmarks:
   - Excellent: 8-10%+ (strong cash flow market)
   - Good: 5-8% (balanced growth + cash flow)
   - Fair: 3-5% (appreciation play, thin cash flow)
   - Poor: <3% (negative leverage risk, only justified by high appreciation)
2. Cash-on-Cash Return Benchmarks:
   - Excellent: 12%+ (exceptional deal or value-add)
   - Good: 8-12% (solid investment)
   - Fair: 4-8% (acceptable but watch expenses)
   - Poor: <4% (underperforming, consider alternatives)
3. Quick Evaluation Rules:
   - The 1% Rule: Monthly rent should be ≥1% of purchase price ($${(price * 0.01).toFixed(0)}/mo needed). This property: ${((rent / price) * 100).toFixed(2)}% — ${rent >= price * 0.01 ? 'PASSES' : 'FAILS'}
   - The 50% Rule: Assume 50% of gross rent goes to expenses (not including mortgage). Actual expense ratio: ${((totalMonthlyExpenses / rent) * 100).toFixed(1)}%
   - GRM Benchmark: Good deals typically have GRM < 15. This property: ${grossRentMultiplier.toFixed(1)} — ${grossRentMultiplier < 15 ? 'PASSES' : 'FAILS'}
4. Vacancy Rate Benchmarks:
   - Class A (luxury): 5-7%
   - Class B (middle market): 7-10%
   - Class C (affordable): 10-15%
   - Student/seasonal: 15-20%

RISK-ADJUSTED ANALYSIS:
- Stress test: What happens if vacancy doubles? Rent drops 10%? Interest rates rise 2%?
- Break-even occupancy rate: at what vacancy % does cash flow hit $0?
- Identify single points of failure (one tenant, high leverage, thin margins)

TAX BENEFITS TO QUANTIFY:
- Annual Depreciation: $${(price * 0.8 / 27.5).toFixed(0)}/year (residential, 27.5-year straight line on 80% of value)
- Mortgage Interest Deduction: ~$${(loanAmount * rate / 100).toFixed(0)}/year in Year 1
- Tax bracket impact: estimate tax savings at 24% marginal rate
- 1031 Exchange potential for future tax-deferred exit
- Cost segregation study potential for accelerated depreciation

MARKET CYCLE CONSIDERATION:
- Expansion phase: rising rents, low vacancy, price appreciation — buy for cash flow
- Peak phase: high prices, compressed cap rates, speculation — be cautious, focus on fundamentals
- Contraction phase: rising vacancy, flat/declining rents — opportunity for value-add buyers
- Trough phase: distressed sales, high vacancy — best deals for well-capitalized investors

COMPARABLE INVESTMENT RETURNS (for context):
- S&P 500 historical average: ~10% annually (with high volatility)
- 10-Year Treasury bonds: ~4-5%
- REITs: ~8-12% (with liquidity advantage)
- CD/Savings: ~4-5% (risk-free)
- Real estate advantage: leverage, tax benefits, inflation hedge, tangible asset

VALUE-ADD OPPORTUNITIES:
- Identify potential to increase rents (renovations, amenity additions)
- Expense reduction opportunities
- Unit addition potential (ADU, basement conversion, garage apartment)
- Short-term rental conversion potential (if regulations allow)

Provide investment analysis in JSON:
{
  "overallRating": "excellent/good/fair/poor",
  "investmentScore": 75,
  "summary": "2-3 sentence investment thesis",
  "benchmarkAnalysis": {
    "capRateRating": "excellent/good/fair/poor",
    "cashOnCashRating": "excellent/good/fair/poor",
    "onePercentRule": "passes/fails",
    "fiftyPercentRule": "passes/fails",
    "grmRating": "good/fair/poor"
  },
  "strengths": ["specific strength with data"],
  "risks": ["specific risk with mitigation strategy"],
  "recommendations": ["actionable recommendation"],
  "taxBenefits": {
    "annualDepreciation": 0,
    "mortgageInterestDeduction": 0,
    "estimatedTaxSavings": 0,
    "notes": "1031 exchange and cost segregation considerations"
  },
  "stressTest": {
    "doubleVacancy": {"monthlyCashFlow": 0, "viable": true},
    "rentDrop10Pct": {"monthlyCashFlow": 0, "viable": true},
    "breakEvenVacancy": "X%"
  },
  "fiveYearProjection": {
    "equityBuildup": 0,
    "totalCashFlow": 0,
    "appreciation": 0,
    "taxSavings": 0,
    "totalReturn": 0,
    "roiPercentage": 0,
    "annualizedReturn": 0
  },
  "valueAddOpportunities": ["opportunity with estimated ROI"],
  "exitStrategies": ["strategy with timeline and rationale"],
  "marketComparison": "How total return compares to S&P 500, REITs, and bonds",
  "marketCycleNote": "Current market phase consideration"
}`;

    let analysis = {};
    try {
      const aiResponse = await callOpenRouter(prompt, 'You are a CCIM (Certified Commercial Investment Member) and real estate investment analyst who manages a $50M+ portfolio. You evaluate deals using cap rate, cash-on-cash return, GRM, the 1% rule, and the 50% rule. You always stress-test deals, quantify tax benefits (depreciation, 1031 exchanges), compare returns to alternative investments (S&P 500, REITs, bonds), and identify value-add opportunities. You are conservative in projections and always highlight risks alongside opportunities. Respond in valid JSON.');
      analysis = JSON.parse(aiResponse);
    } catch (aiError) {
      // Fallback analysis
      const rating = cashOnCashReturn > 10 ? 'excellent' : cashOnCashReturn > 6 ? 'good' : cashOnCashReturn > 3 ? 'fair' : 'poor';
      analysis = {
        overallRating: rating,
        investmentScore: Math.min(Math.max(cashOnCashReturn * 8, 20), 95),
        summary: `This property offers a ${cashOnCashReturn.toFixed(1)}% cash-on-cash return with monthly cash flow of $${monthlyCashFlow.toFixed(0)}`,
        strengths: monthlyCashFlow > 0 ? ['Positive cash flow'] : [],
        risks: monthlyCashFlow < 200 ? ['Thin margins - unexpected expenses could eliminate profits'] : [],
        recommendations: ['Consider getting a professional inspection', 'Verify rental estimates with local property managers'],
        fiveYearProjection: {
          equityBuildup: loanAmount * 0.15,
          totalCashFlow: annualCashFlow * 5,
          appreciation: price * 0.15,
          totalReturn: annualCashFlow * 5 + price * 0.15 + loanAmount * 0.15,
          roiPercentage: ((annualCashFlow * 5 + price * 0.15) / totalCashInvested) * 100
        },
        exitStrategies: ['Hold for cash flow', 'Sell after 5 years', '1031 exchange into larger property'],
        marketComparison: 'Average rental property returns 8-12% annually'
      };
    }

    res.json({
      propertyId,
      purchaseDetails: {
        price,
        downPayment: down,
        loanAmount,
        interestRate: rate,
        loanTerm: term
      },
      monthlyBreakdown: {
        rent,
        mortgage: monthlyMortgage,
        expenses: totalMonthlyExpenses,
        cashFlow: monthlyCashFlow
      },
      metrics: {
        cashOnCashReturn,
        capRate,
        grossRentMultiplier,
        annualCashFlow
      },
      analysis
    });
  } catch (error) {
    console.error('Investment analyzer error:', error);
    res.status(500).json({ error: 'Failed to analyze investment' });
  }
});

// AI Open House Summary - Generate summary from open house data
router.post('/open-house-summary', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { openHouseId } = req.body;

    const openHouse = await prisma.openHouse.findUnique({
      where: { id: openHouseId },
      include: {
        property: true,
        agent: { include: { user: true } }
      }
    });

    if (!openHouse) {
      return res.status(404).json({ error: 'Open house not found' });
    }

    const attendees = openHouse.attendees || [];

    const prompt = `Generate a comprehensive open house summary report:

Property: ${openHouse.property.address}, ${openHouse.property.city}
List Price: $${openHouse.property.price?.toLocaleString()}
Date: ${openHouse.date}
Time: ${openHouse.startTime} - ${openHouse.endTime}
Agent: ${openHouse.agent.user.firstName} ${openHouse.agent.user.lastName}

Attendees (${attendees.length}):
${attendees.map(a => `- ${a.name || 'Anonymous'}: ${a.email || 'No email'}, Interest Level: ${a.interestLevel || 'Unknown'}, Notes: ${a.notes || 'None'}`).join('\n')}

Generate a summary in JSON:
{
  "executiveSummary": "2-3 sentence overview of the open house",
  "attendance": {
    "total": 0,
    "hotLeads": 0,
    "warmLeads": 0,
    "coldLeads": 0
  },
  "commonFeedback": ["feedback points visitors mentioned"],
  "objections": ["common objections or concerns"],
  "competitorMentions": ["other properties visitors mentioned looking at"],
  "pricingFeedback": "general sentiment on pricing",
  "recommendations": {
    "immediate": ["actions to take now"],
    "followUp": ["follow-up strategies"],
    "propertyImprovements": ["suggestions to improve showing appeal"]
  },
  "hotLeadsSummary": ["summary of most interested visitors"],
  "nextSteps": ["prioritized action items"]
}`;

    let summary = {};
    try {
      const aiResponse = await callOpenRouter(prompt, 'You are a real estate open house analyst. Generate insightful summaries that help agents prioritize follow-up and improve future showings. Respond in valid JSON.');
      summary = JSON.parse(aiResponse);
    } catch (aiError) {
      summary = {
        executiveSummary: `Open house at ${openHouse.property.address} had ${attendees.length} attendees`,
        attendance: {
          total: attendees.length,
          hotLeads: attendees.filter(a => a.interestLevel === 'high').length,
          warmLeads: attendees.filter(a => a.interestLevel === 'medium').length,
          coldLeads: attendees.filter(a => a.interestLevel === 'low').length
        },
        commonFeedback: ['Feedback analysis requires more data'],
        objections: [],
        competitorMentions: [],
        pricingFeedback: 'No specific feedback recorded',
        recommendations: {
          immediate: ['Follow up with all attendees within 24 hours'],
          followUp: ['Send property info packet', 'Schedule private showings for interested parties'],
          propertyImprovements: ['Continue staging', 'Keep property show-ready']
        },
        hotLeadsSummary: attendees.filter(a => a.interestLevel === 'high').map(a => a.name || 'Anonymous'),
        nextSteps: ['Review and qualify leads', 'Update CRM', 'Plan follow-up calls']
      };
    }

    res.json({
      openHouseId,
      property: {
        address: openHouse.property.address,
        city: openHouse.property.city,
        price: openHouse.property.price
      },
      eventDetails: {
        date: openHouse.date,
        time: `${openHouse.startTime} - ${openHouse.endTime}`,
        agent: `${openHouse.agent.user.firstName} ${openHouse.agent.user.lastName}`
      },
      summary
    });
  } catch (error) {
    console.error('Open house summary error:', error);
    res.status(500).json({ error: 'Failed to generate open house summary' });
  }
});

// AI Buyer Persona Generator - Create ideal buyer profiles
router.post('/buyer-persona', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { propertyId, propertyType, priceRange, location, bedrooms, features } = req.body;

    let property = null;

    if (propertyId) {
      property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { photos: true }
      });
    }

    // Use form data if no property found
    if (!property) {
      property = {
        type: propertyType || 'Single Family',
        address: location || 'Property',
        city: '',
        state: '',
        price: priceRange ? parseInt(priceRange.replace(/[^0-9]/g, '')) || 500000 : 500000,
        bedrooms: bedrooms || 3,
        bathrooms: 2,
        squareFeet: 1800,
        yearBuilt: 2000,
        features: features ? features.split(',').map(f => f.trim()) : [],
        hoaFee: null
      };
      // Parse location for city/state
      if (location && location.includes(',')) {
        const parts = location.split(',').map(p => p.trim());
        property.city = parts[0];
        if (parts.length >= 2) property.state = parts[1];
      }
    }

    const prompt = `Create 3 data-driven ideal buyer personas for this property, using NAR buyer statistics and generational marketing insights.

PROPERTY DETAILS:
- Type: ${property.type}
- Location: ${property.address ? `${property.address}, ` : ''}${property.city}${property.state ? `, ${property.state}` : ''}
- Price: $${property.price?.toLocaleString()}
- Bedrooms: ${property.bedrooms}
- Bathrooms: ${property.bathrooms}
- Square Feet: ${property.squareFeet?.toLocaleString()}
- Year Built: ${property.yearBuilt}
- Features: ${property.features?.join(', ') || features || 'Standard features'}
- HOA: ${property.hoaFee ? `$${property.hoaFee}/month` : 'None'}

NAR BUYER STATISTICS (use to calibrate personas):
- Median first-time buyer age: 36 | Median repeat buyer age: 59
- Median household income of buyers: $107,000
- 88% of buyers use an agent | 97% use online search
- Top factors: location (43%), size (32%), price (31%), condition (24%)
- Median search duration: 10 weeks (8 weeks online before contacting agent)
- 26% of buyers are first-time buyers
- Most common financing: conventional (69%), FHA (24%), VA (6%)

GENERATIONAL BUYING PREFERENCES:
- Gen Z (18-27): Tech-savvy, social media discovery, value sustainability, smaller footprint OK, TikTok/Instagram-influenced, prefer turnkey/move-in ready
- Millennials (28-43): Largest buyer group (38%), value smart home tech, home offices, open floor plans, walkability. Heavy Zillow/Redfin users. Student debt impacts budget.
- Gen X (44-59): Second largest group (24%), often repeat buyers/upsizers, value space for family + aging parents, school districts, established neighborhoods. Use agents + online.
- Baby Boomers (60-78): Downsizing or relocating for retirement. Value single-story, low maintenance, community amenities. Less tech-dependent, trust agents more.
- Silent Gen (79+): Smallest segment, assisted living or multigenerational transitions. Accessibility features critical.

PSYCHOGRAPHIC PROFILING (include for each persona):
- Values (security, status, community, convenience, investment, independence)
- Lifestyle priorities (entertaining, outdoor living, commute, schools, quiet)
- Decision triggers (life events: marriage, baby, divorce, job change, retirement, inheritance)
- Risk tolerance (conservative, moderate, aggressive)
- Information processing style (data-driven, emotional, social proof, expert-guided)

DIGITAL MARKETING CHANNEL EFFECTIVENESS BY DEMOGRAPHIC:
- Gen Z: TikTok (67%), Instagram (62%), YouTube (54%)
- Millennials: Instagram (48%), Facebook (45%), Zillow/Redfin (71%), YouTube (38%)
- Gen X: Facebook (55%), Zillow/Realtor.com (63%), Email (42%), Google Search (51%)
- Boomers: Facebook (39%), Email (52%), Agent website (44%), Print (21%), Google Search (45%)

CONTENT TYPE PREFERENCES:
- Gen Z/Millennials: Video tours (78%), 3D virtual tours (65%), drone footage, Instagram Reels
- Gen X: Professional photos (82%), detailed floor plans (61%), neighborhood guides, virtual tours
- Boomers: Professional photos (79%), in-person showings (72%), printed brochures, detailed descriptions

SEASONAL BUYING PATTERNS:
- Families with school-age kids: Peak Apr-Jul (before school year)
- Young professionals: Year-round, slight spring peak
- Retirees/downsizers: Fall/winter (less competition, relocated after holidays)
- Investors: Counter-cyclical (buy in slow months for better deals)

FINANCING PREFERENCES BY PERSONA:
- First-time buyers: FHA (3.5% down), conventional with PMI, down payment assistance programs
- Move-up buyers: Conventional (20%+ down), bridge loans, contingent offers
- Investors: Conventional investment loans (25% down), DSCR loans, portfolio lenders
- Luxury buyers: Jumbo loans, cash purchases, asset-based lending
- Veterans: VA loans (0% down, no PMI)

OBJECTION PATTERNS (include data-backed responses):
- "It's too expensive" → compare to rent equivalent, show tax benefits, project appreciation
- "The market might crash" → cite historical data (US housing appreciates avg 3-5%/yr), note leverage benefits
- "I should wait for lower rates" → "marry the house, date the rate" analysis, show total cost of waiting
- "It needs work" → provide renovation ROI data (kitchen: 75% ROI, bathroom: 70%, paint: 100%+)
- "Wrong neighborhood" → present lifestyle data, future development plans, appreciation trends

Generate 3 distinct buyer personas, ranked by match likelihood. Each persona should represent a different generational/demographic segment appropriate for this property's price point, size, and features.

Respond in JSON:
{
  "personas": [
    {
      "name": "Persona name (e.g., 'Growing Millennial Family')",
      "generation": "Millennial/Gen X/Boomer/Gen Z",
      "demographics": {
        "ageRange": "30-40",
        "income": "$100k-150k",
        "familyStatus": "Married with young children",
        "occupation": "Dual-income professionals",
        "currentHousing": "Renting 2BR apartment"
      },
      "psychographics": {
        "values": ["security", "community", "investment"],
        "lifestyle": "Family-oriented, suburban",
        "decisionTrigger": "Outgrowing current rental, first child",
        "riskTolerance": "moderate",
        "infoProcessingStyle": "data-driven with emotional final decision"
      },
      "motivations": ["Why they'd buy this property specifically"],
      "painPoints": ["Current housing challenges driving the move"],
      "searchBehavior": {
        "primaryPlatforms": ["Zillow", "Redfin", "Instagram"],
        "contentPreferences": ["video tours", "3D walkthroughs", "school ratings"],
        "searchFrequency": "Daily",
        "decisionTimeline": "3-6 months",
        "seasonalTiming": "Spring (before school year)"
      },
      "financingProfile": {
        "likelyLoanType": "Conventional with 10-20% down",
        "preApprovalRange": "$X-$Y",
        "priceSensitivity": "moderate"
      },
      "keySellingPoints": ["Specific features to emphasize for this persona"],
      "objectionHandling": [
        {"objection": "common objection", "response": "data-backed response"}
      ],
      "marketingChannels": {
        "primary": ["channel with expected effectiveness"],
        "secondary": ["supporting channels"],
        "contentTypes": ["preferred content formats"]
      },
      "matchScore": 90
    }
  ],
  "marketingRecommendations": {
    "primaryTarget": "Persona name",
    "messagingThemes": ["Key messages that resonate across personas"],
    "visualContent": ["Types of photos/videos to produce"],
    "bestShowingTimes": ["Optimal showing schedule by persona"],
    "adBudgetAllocation": {"platform1": "X%", "platform2": "Y%"},
    "openHouseStrategy": "Recommendations for open house timing and format"
  }
}`;

    let personas = {};
    try {
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
            { role: 'system', content: 'You are a real estate marketing strategist who combines NAR buyer/seller statistics, generational research, and psychographic profiling to create data-driven buyer personas. You understand how Gen Z, Millennials, Gen X, and Boomers differ in search behavior, platform preferences, financing needs, and decision triggers. You create personas that are immediately actionable for targeted digital marketing campaigns, ad spend allocation, and showing strategies. Respond in valid JSON.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 10000
        })
      });
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        personas = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error('AI persona error:', aiError);
      personas = {
        personas: [
          {
            name: 'First-Time Homebuyer',
            demographics: { ageRange: '25-35', income: '$75k-100k', familyStatus: 'Single or couple', occupation: 'Young professional' },
            motivations: ['Building equity', 'Tired of renting'],
            painPoints: ['Down payment savings', 'Competitive market'],
            searchBehavior: { primaryPlatforms: ['Zillow', 'Redfin'], searchFrequency: 'Daily', decisionTimeline: '2-4 months' },
            keySellingPoints: ['Move-in ready', 'Low maintenance'],
            objectionHandling: ['Offer guidance on financing options'],
            marketingChannels: ['Social media', 'Online ads'],
            matchScore: 75
          }
        ],
        marketingRecommendations: {
          primaryTarget: 'First-Time Homebuyer',
          messagingThemes: ['Affordable homeownership', 'Great investment'],
          visualContent: ['Lifestyle photos', 'Virtual tour'],
          bestShowingTimes: ['Evenings', 'Weekends']
        }
      };
    }

    res.json({
      propertyId,
      property: {
        address: property.address,
        city: property.city,
        price: property.price,
        type: property.type
      },
      ...personas
    });
  } catch (error) {
    console.error('Buyer persona error:', error);
    res.status(500).json({ error: 'Failed to generate buyer personas' });
  }
});

// =====================================================
// ADDITIONAL AI FEATURES
// =====================================================

// AI Virtual Tour Creator - Generate virtual tour scripts and recommendations
router.post('/virtual-tour-creator', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { propertyId, address, propertyType, bedrooms, bathrooms, squareFeet, features, highlights } = req.body;

    let property = null;
    if (propertyId) {
      property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { photos: true }
      });
    }

    if (!property) {
      property = {
        type: propertyType || 'Single Family',
        address: address || 'Property',
        city: '',
        state: '',
        price: 0,
        bedrooms: bedrooms || 3,
        bathrooms: bathrooms || 2,
        squareFeet: squareFeet || 1800,
        features: features ? features.split(',').map(f => f.trim()) : [],
        description: highlights || ''
      };
    }

    const prompt = `Create a professional virtual tour script and production plan for this property:

Property Details:
- Type: ${property.type}
- Address: ${property.address}${property.city ? `, ${property.city}` : ''}
- Bedrooms: ${property.bedrooms}
- Bathrooms: ${property.bathrooms}
- Square Feet: ${property.squareFeet || squareFeet}
- Features: ${property.features?.join(', ') || features || 'Standard features'}
- Highlights: ${property.description || highlights || 'Beautiful home'}

Generate a comprehensive virtual tour plan in JSON format:
{
  "tourScript": {
    "introduction": "Welcome script for the tour",
    "rooms": [
      {
        "name": "Room name",
        "duration": "30 seconds",
        "script": "What to say while showing this room",
        "cameraAngles": ["angle1", "angle2"],
        "highlightFeatures": ["feature1", "feature2"]
      }
    ],
    "conclusion": "Closing script with call to action"
  },
  "productionTips": {
    "lighting": ["lighting recommendations"],
    "timing": "Best time of day to shoot",
    "equipment": ["recommended equipment"],
    "staging": ["staging tips for video"]
  },
  "musicRecommendations": {
    "genre": "Recommended music genre",
    "tempo": "Tempo description",
    "mood": "Mood to convey"
  },
  "estimatedDuration": "2-3 minutes",
  "platforms": {
    "youtube": { "optimizations": [] },
    "instagram": { "optimizations": [] },
    "tiktok": { "optimizations": [] },
    "mls": { "optimizations": [] }
  },
  "callToActions": ["CTA suggestions"]
}`;

    let tourPlan = {};
    try {
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
            { role: 'system', content: 'You are a professional real estate videographer and virtual tour specialist. Create engaging, professional tour scripts that showcase properties effectively. Respond in valid JSON.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 10000
        })
      });
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        tourPlan = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error('AI virtual tour error:', aiError);
      tourPlan = {
        tourScript: {
          introduction: `Welcome to this stunning ${property.bedrooms} bedroom, ${property.bathrooms} bathroom home. Let me take you on a tour of this beautiful property.`,
          rooms: [
            { name: 'Front Exterior', duration: '20 seconds', script: 'Starting with the impressive curb appeal...', cameraAngles: ['Wide shot', 'Detail shot of entrance'], highlightFeatures: ['Landscaping', 'Architecture'] },
            { name: 'Foyer/Entry', duration: '15 seconds', script: 'Step inside to discover...', cameraAngles: ['Entry reveal', 'Looking into home'], highlightFeatures: ['First impressions', 'Flow'] },
            { name: 'Living Room', duration: '30 seconds', script: 'The spacious living area features...', cameraAngles: ['Wide pan', 'Feature details'], highlightFeatures: ['Natural light', 'Space'] },
            { name: 'Kitchen', duration: '45 seconds', script: 'The heart of the home...', cameraAngles: ['Wide shot', 'Countertop level', 'Appliances'], highlightFeatures: ['Appliances', 'Counter space'] },
            { name: 'Master Bedroom', duration: '30 seconds', script: 'The primary suite offers...', cameraAngles: ['Bedroom wide', 'Closet', 'Bathroom'], highlightFeatures: ['Size', 'Privacy'] },
            { name: 'Backyard', duration: '25 seconds', script: 'Step outside to your private oasis...', cameraAngles: ['Wide yard shot', 'Patio area'], highlightFeatures: ['Outdoor space', 'Potential'] }
          ],
          conclusion: 'Thank you for touring this incredible home. Contact us today to schedule your private showing!'
        },
        productionTips: {
          lighting: ['Shoot during golden hour', 'Open all blinds', 'Turn on all lights'],
          timing: 'Mid-morning or late afternoon for best natural light',
          equipment: ['Gimbal stabilizer', 'Wide-angle lens', 'Drone for aerial'],
          staging: ['Remove personal items', 'Fresh flowers', 'Clean surfaces']
        },
        musicRecommendations: {
          genre: 'Ambient/Acoustic',
          tempo: 'Moderate, uplifting',
          mood: 'Warm, inviting, aspirational'
        },
        estimatedDuration: '2-3 minutes',
        platforms: {
          youtube: { optimizations: ['Full length tour', 'Detailed descriptions', 'Chapters'] },
          instagram: { optimizations: ['60-second highlight reel', 'Vertical format option'] },
          tiktok: { optimizations: ['15-30 second teaser', 'Trending audio'] },
          mls: { optimizations: ['Professional quality', 'Comprehensive coverage'] }
        },
        callToActions: ['Schedule a showing', 'Contact for more info', 'Save to favorites']
      };
    }

    res.json({
      propertyId,
      property: {
        address: property.address,
        type: property.type,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms
      },
      tourPlan,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Virtual tour creator error:', error);
    res.status(500).json({ error: 'Failed to create virtual tour plan' });
  }
});

// AI Rental Price Optimizer - Optimize rental pricing
router.post('/rental-price-optimizer', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const {
      address, city, state, zipCode,
      propertyType, bedrooms, bathrooms, squareFeet,
      amenities, condition, furnished, petPolicy,
      parkingSpaces, utilities, currentRent
    } = req.body;

    const prompt = `As a rental market expert, analyze and optimize the rental price for this property:

Property Details:
- Address: ${address || 'Not specified'}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''} ${zipCode || ''}
- Type: ${propertyType || 'Apartment'}
- Bedrooms: ${bedrooms || 2}
- Bathrooms: ${bathrooms || 1}
- Square Feet: ${squareFeet || 1000}
- Condition: ${condition || 'Good'}
- Furnished: ${furnished ? 'Yes' : 'No'}
- Pet Policy: ${petPolicy || 'No pets'}
- Parking: ${parkingSpaces || 0} spaces
- Utilities Included: ${utilities || 'None'}
- Amenities: ${amenities || 'Standard'}
${currentRent ? `- Current Rent: $${currentRent}` : ''}

Provide rental optimization analysis in JSON format:
{
  "recommendedRent": {
    "monthly": 0,
    "lowRange": 0,
    "highRange": 0,
    "perSqft": 0
  },
  "marketAnalysis": {
    "marketPosition": "below/at/above market",
    "demandLevel": "high/medium/low",
    "competitionLevel": "high/medium/low",
    "seasonalFactor": "peak/normal/slow season",
    "avgDaysOnMarket": 0
  },
  "pricingStrategy": {
    "strategy": "premium/market/value",
    "reasoning": "explanation",
    "targetTenant": "description of ideal tenant"
  },
  "valueAddOpportunities": [
    {
      "improvement": "description",
      "cost": "$0",
      "rentIncrease": "$0/month",
      "roi": "percentage"
    }
  ],
  "competitiveAdvantages": ["advantage1", "advantage2"],
  "potentialConcerns": ["concern1", "concern2"],
  "recommendations": {
    "shortTerm": ["immediate actions"],
    "longTerm": ["strategic improvements"]
  },
  "leaseTermSuggestions": {
    "recommended": "12 months",
    "alternatives": [
      { "term": "6 months", "adjustment": "+$100/month" }
    ]
  }
}`;

    let analysis = {};
    try {
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
            { role: 'system', content: 'You are a rental market expert and property manager. Provide accurate rental pricing analysis based on current market conditions. Respond in valid JSON.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 10000
        })
      });
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error('AI rental pricing error:', aiError);
      // Fallback calculation
      const baseRate = { 'Apartment': 1.5, 'House': 1.3, 'Condo': 1.6, 'Townhouse': 1.4 };
      const sqftRate = baseRate[propertyType] || 1.4;
      const baseRent = (squareFeet || 1000) * sqftRate;
      const bedroomBonus = (bedrooms || 2) * 150;
      const bathroomBonus = (bathrooms || 1) * 75;
      const estimatedRent = Math.round((baseRent + bedroomBonus + bathroomBonus) / 50) * 50;

      analysis = {
        recommendedRent: {
          monthly: estimatedRent,
          lowRange: Math.round(estimatedRent * 0.9 / 50) * 50,
          highRange: Math.round(estimatedRent * 1.1 / 50) * 50,
          perSqft: Math.round((estimatedRent / (squareFeet || 1000)) * 100) / 100
        },
        marketAnalysis: {
          marketPosition: 'at market',
          demandLevel: 'medium',
          competitionLevel: 'medium',
          seasonalFactor: 'normal season',
          avgDaysOnMarket: 21
        },
        pricingStrategy: {
          strategy: 'market',
          reasoning: 'Based on property specifications and general market rates',
          targetTenant: 'Working professionals or small families'
        },
        valueAddOpportunities: [
          { improvement: 'Updated appliances', cost: '$2,000', rentIncrease: '$50/month', roi: '30%' },
          { improvement: 'Fresh paint', cost: '$500', rentIncrease: '$25/month', roi: '60%' }
        ],
        competitiveAdvantages: [`${bedrooms} bedrooms`, `${bathrooms} bathrooms`],
        potentialConcerns: ['Standard market analysis'],
        recommendations: {
          shortTerm: ['Professional photography', 'Thorough cleaning'],
          longTerm: ['Consider minor upgrades', 'Build tenant relationships']
        },
        leaseTermSuggestions: {
          recommended: '12 months',
          alternatives: [
            { term: '6 months', adjustment: '+$100/month' },
            { term: 'Month-to-month', adjustment: '+$200/month' }
          ]
        }
      };
    }

    res.json({
      property: {
        address: address || 'Not specified',
        city: city || '',
        propertyType: propertyType || 'Apartment',
        bedrooms: bedrooms || 2,
        bathrooms: bathrooms || 1,
        squareFeet: squareFeet || 1000
      },
      currentRent: currentRent || null,
      analysis,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Rental price optimizer error:', error);
    res.status(500).json({ error: 'Failed to optimize rental price' });
  }
});

// AI Tenant Screener - Screen and evaluate potential tenants
router.post('/tenant-screener', authenticateToken, async (req, res) => {
  try {
    const {
      applicantName, email, phone,
      currentEmployer, jobTitle, annualIncome, employmentLength,
      currentAddress, currentRent, landlordName, landlordPhone, tenancyLength,
      creditScore, hasBankruptcy, hasEviction,
      hasPets, petDetails, numberOfOccupants,
      requestedMoveIn, requestedLeaseTerm,
      monthlyRent, references
    } = req.body;

    const incomeToRentRatio = annualIncome ? ((annualIncome / 12) / monthlyRent).toFixed(2) : 'Unknown';

    const prompt = `As a property manager and tenant screening expert, evaluate this rental application:

Applicant Information:
- Name: ${applicantName || 'Not provided'}
- Email: ${email || 'Not provided'}
- Phone: ${phone || 'Not provided'}

Employment:
- Employer: ${currentEmployer || 'Not provided'}
- Job Title: ${jobTitle || 'Not provided'}
- Annual Income: $${annualIncome || 'Not provided'}
- Employment Length: ${employmentLength || 'Not provided'}

Current Residence:
- Address: ${currentAddress || 'Not provided'}
- Current Rent: $${currentRent || 'Not provided'}
- Landlord: ${landlordName || 'Not provided'}
- Tenancy Length: ${tenancyLength || 'Not provided'}

Financial:
- Credit Score: ${creditScore || 'Not provided'}
- Bankruptcy History: ${hasBankruptcy ? 'Yes' : 'No'}
- Eviction History: ${hasEviction ? 'Yes' : 'No'}
- Income to Rent Ratio: ${incomeToRentRatio}x monthly rent

Additional Info:
- Pets: ${hasPets ? `Yes - ${petDetails || 'Details not provided'}` : 'No'}
- Number of Occupants: ${numberOfOccupants || 1}
- Requested Move-In: ${requestedMoveIn || 'Not specified'}
- Requested Lease Term: ${requestedLeaseTerm || '12 months'}

Property Details:
- Monthly Rent: $${monthlyRent || 'Not specified'}

${references ? `References: ${references}` : ''}

Provide tenant screening analysis in JSON format:
{
  "overallScore": 0,
  "recommendation": "approve/conditional/deny",
  "riskLevel": "low/medium/high",
  "analysis": {
    "income": {
      "score": 0,
      "assessment": "analysis",
      "concerns": []
    },
    "employment": {
      "score": 0,
      "assessment": "analysis",
      "concerns": []
    },
    "rental_history": {
      "score": 0,
      "assessment": "analysis",
      "concerns": []
    },
    "credit": {
      "score": 0,
      "assessment": "analysis",
      "concerns": []
    }
  },
  "redFlags": ["any concerns"],
  "greenFlags": ["positive indicators"],
  "verificationTasks": [
    {
      "task": "verification needed",
      "priority": "high/medium/low",
      "method": "how to verify"
    }
  ],
  "conditionalApprovalTerms": ["conditions if applicable"],
  "suggestedSecurityDeposit": {
    "amount": 0,
    "reasoning": "explanation"
  },
  "additionalRequirements": ["any extra requirements"],
  "summary": "brief overall assessment"
}`;

    let screening = {};
    try {
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
            { role: 'system', content: 'You are an experienced property manager and tenant screening expert. Provide fair, thorough, and legally compliant tenant evaluations. Focus on objective criteria. Respond in valid JSON.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 10000
        })
      });
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        screening = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error('AI tenant screening error:', aiError);
      // Fallback scoring
      let score = 50;
      const greenFlags = [];
      const redFlags = [];

      // Income check (recommended 3x rent)
      if (annualIncome && monthlyRent) {
        const ratio = (annualIncome / 12) / monthlyRent;
        if (ratio >= 3) { score += 20; greenFlags.push('Strong income-to-rent ratio'); }
        else if (ratio >= 2.5) { score += 10; }
        else { redFlags.push('Income-to-rent ratio below recommended 3x'); }
      }

      // Credit check
      if (creditScore) {
        if (creditScore >= 720) { score += 15; greenFlags.push('Excellent credit score'); }
        else if (creditScore >= 650) { score += 10; }
        else if (creditScore >= 580) { score += 5; }
        else { redFlags.push('Below average credit score'); }
      }

      // Employment
      if (employmentLength && employmentLength.includes('year')) {
        score += 10;
        greenFlags.push('Stable employment history');
      }

      // Red flags
      if (hasBankruptcy) { score -= 15; redFlags.push('Bankruptcy history'); }
      if (hasEviction) { score -= 25; redFlags.push('Previous eviction'); }

      score = Math.max(0, Math.min(100, score));
      const recommendation = score >= 70 ? 'approve' : score >= 50 ? 'conditional' : 'deny';

      screening = {
        overallScore: score,
        recommendation,
        riskLevel: score >= 70 ? 'low' : score >= 50 ? 'medium' : 'high',
        analysis: {
          income: { score: annualIncome ? 75 : 50, assessment: 'Based on provided income information', concerns: [] },
          employment: { score: currentEmployer ? 70 : 50, assessment: 'Employment verification needed', concerns: [] },
          rental_history: { score: landlordName ? 70 : 50, assessment: 'Previous landlord reference available', concerns: [] },
          credit: { score: creditScore || 50, assessment: 'Credit score evaluation', concerns: creditScore && creditScore < 650 ? ['Below average credit'] : [] }
        },
        redFlags,
        greenFlags,
        verificationTasks: [
          { task: 'Verify employment', priority: 'high', method: 'Contact employer HR department' },
          { task: 'Check landlord reference', priority: 'high', method: 'Call current landlord' },
          { task: 'Run credit report', priority: 'high', method: 'Use tenant screening service' }
        ],
        conditionalApprovalTerms: recommendation === 'conditional' ? ['Additional security deposit', 'Co-signer required'] : [],
        suggestedSecurityDeposit: {
          amount: monthlyRent * (score >= 70 ? 1 : score >= 50 ? 1.5 : 2),
          reasoning: score >= 70 ? 'Standard deposit for qualified applicant' : 'Additional deposit due to risk factors'
        },
        additionalRequirements: [],
        summary: `Applicant scored ${score}/100. ${recommendation === 'approve' ? 'Meets criteria for approval.' : recommendation === 'conditional' ? 'May be approved with additional conditions.' : 'Does not meet minimum criteria.'}`
      };
    }

    res.json({
      applicant: {
        name: applicantName,
        email,
        phone
      },
      propertyDetails: {
        monthlyRent
      },
      screening,
      disclaimer: 'This AI screening is for informational purposes only. Always comply with Fair Housing laws and local regulations. Verify all information independently.',
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Tenant screener error:', error);
    res.status(500).json({ error: 'Failed to screen tenant' });
  }
});

// AI Mortgage Calculator Pro - Advanced mortgage calculations and advice
router.post('/mortgage-calculator', authenticateToken, async (req, res) => {
  try {
    const {
      homePrice, downPayment, downPaymentPercent,
      interestRate, loanTerm, loanType,
      propertyTax, homeInsurance, pmi, hoaFees,
      annualIncome, monthlyDebts, creditScore
    } = req.body;

    // Calculate loan details
    const price = homePrice || 500000;
    const downPmt = downPayment || (price * (downPaymentPercent || 20) / 100);
    const downPmtPercent = downPaymentPercent || (downPayment ? (downPayment / price * 100) : 20);
    const loanAmount = price - downPmt;
    const rate = (interestRate || 7) / 100 / 12;
    const term = (loanTerm || 30) * 12;

    // Monthly mortgage payment (P&I)
    const monthlyPI = loanAmount * (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1);

    // Additional monthly costs
    const monthlyTax = (propertyTax || price * 0.0125) / 12;
    const monthlyInsurance = (homeInsurance || price * 0.005) / 12;
    const monthlyPMI = downPmtPercent < 20 ? (pmi || loanAmount * 0.01 / 12) : 0;
    const monthlyHOA = hoaFees || 0;

    const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance + monthlyPMI + monthlyHOA;

    // Total interest over life of loan
    const totalPayments = monthlyPI * term;
    const totalInterest = totalPayments - loanAmount;

    // DTI calculation
    const monthlyIncome = (annualIncome || 100000) / 12;
    const currentDTI = monthlyDebts ? (monthlyDebts / monthlyIncome * 100) : 0;
    const projectedDTI = ((monthlyDebts || 0) + totalMonthly) / monthlyIncome * 100;

    const prompt = `As a mortgage expert, analyze this mortgage scenario and provide comprehensive advice:

Loan Details:
- Home Price: $${price.toLocaleString()}
- Down Payment: $${downPmt.toLocaleString()} (${downPmtPercent.toFixed(1)}%)
- Loan Amount: $${loanAmount.toLocaleString()}
- Interest Rate: ${interestRate || 7}%
- Loan Term: ${loanTerm || 30} years
- Loan Type: ${loanType || 'Conventional'}

Monthly Costs:
- Principal & Interest: $${monthlyPI.toFixed(2)}
- Property Tax: $${monthlyTax.toFixed(2)}
- Home Insurance: $${monthlyInsurance.toFixed(2)}
- PMI: $${monthlyPMI.toFixed(2)}
- HOA: $${monthlyHOA.toFixed(2)}
- Total Monthly: $${totalMonthly.toFixed(2)}

Borrower Profile:
- Annual Income: $${(annualIncome || 100000).toLocaleString()}
- Monthly Debts: $${(monthlyDebts || 0).toLocaleString()}
- Credit Score: ${creditScore || 'Not provided'}
- Current DTI: ${currentDTI.toFixed(1)}%
- Projected DTI: ${projectedDTI.toFixed(1)}%

Total Interest Over Loan: $${totalInterest.toLocaleString()}

Provide mortgage analysis in JSON format:
{
  "affordabilityAssessment": {
    "status": "affordable/stretch/unaffordable",
    "reasoning": "explanation",
    "comfortLevel": "comfortable/manageable/tight"
  },
  "dtiAnalysis": {
    "frontEndRatio": 0,
    "backEndRatio": 0,
    "assessment": "analysis",
    "conventionalLimit": 43,
    "fhaLimit": 50
  },
  "loanRecommendations": [
    {
      "loanType": "type",
      "whyRecommended": "reason",
      "requirements": ["req1"],
      "pros": ["pro1"],
      "cons": ["con1"]
    }
  ],
  "savingsStrategies": [
    {
      "strategy": "description",
      "potentialSavings": "$X over loan life",
      "implementation": "how to do it"
    }
  ],
  "alternativeScenarios": [
    {
      "scenario": "description",
      "monthlyPayment": 0,
      "totalSavings": 0,
      "tradeoffs": "what you give up"
    }
  ],
  "pmiRemovalTimeline": {
    "automaticRemoval": "date/equity level",
    "acceleratedRemoval": "how to remove faster"
  },
  "refinanceConsiderations": {
    "breakEvenPeriod": "X months",
    "futureOpportunities": ["when to consider refinancing"]
  },
  "warnings": ["any concerns"],
  "tips": ["helpful advice"]
}`;

    let analysis = {};
    try {
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
            { role: 'system', content: 'You are an experienced mortgage advisor and financial planner. Provide accurate, helpful mortgage analysis and advice. Respond in valid JSON.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 10000
        })
      });
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error('AI mortgage analysis error:', aiError);
      analysis = {
        affordabilityAssessment: {
          status: projectedDTI <= 36 ? 'affordable' : projectedDTI <= 43 ? 'stretch' : 'unaffordable',
          reasoning: `With a ${projectedDTI.toFixed(1)}% debt-to-income ratio, this mortgage is ${projectedDTI <= 36 ? 'within comfortable limits' : projectedDTI <= 43 ? 'at the upper limit but possible' : 'above recommended limits'}`,
          comfortLevel: projectedDTI <= 28 ? 'comfortable' : projectedDTI <= 36 ? 'manageable' : 'tight'
        },
        dtiAnalysis: {
          frontEndRatio: ((totalMonthly / monthlyIncome) * 100).toFixed(1),
          backEndRatio: projectedDTI.toFixed(1),
          assessment: projectedDTI <= 43 ? 'Within conventional lending limits' : 'May need alternative loan program',
          conventionalLimit: 43,
          fhaLimit: 50
        },
        loanRecommendations: [
          { loanType: 'Conventional 30-year fixed', whyRecommended: 'Most common option with predictable payments', requirements: ['620+ credit score', '3-20% down'], pros: ['Stable payments', 'PMI removable'], cons: ['Higher down payment preferred'] }
        ],
        savingsStrategies: [
          { strategy: 'Extra principal payments', potentialSavings: `$${Math.round(totalInterest * 0.2).toLocaleString()} over loan life`, implementation: 'Add $100-200/month to principal' },
          { strategy: 'Bi-weekly payments', potentialSavings: `$${Math.round(totalInterest * 0.1).toLocaleString()} over loan life`, implementation: 'Pay half the monthly amount every two weeks' }
        ],
        alternativeScenarios: [
          { scenario: '15-year loan', monthlyPayment: Math.round(monthlyPI * 1.4), totalSavings: Math.round(totalInterest * 0.6), tradeoffs: 'Higher monthly payment' }
        ],
        pmiRemovalTimeline: {
          automaticRemoval: '78% LTV (22% equity)',
          acceleratedRemoval: 'Request removal at 80% LTV with good payment history'
        },
        refinanceConsiderations: {
          breakEvenPeriod: '24-36 months typically',
          futureOpportunities: ['Rate drops 0.75-1%', 'Credit score improves significantly']
        },
        warnings: projectedDTI > 43 ? ['DTI ratio exceeds conventional limits'] : [],
        tips: ['Build emergency fund of 3-6 months payments', 'Consider homebuyer education courses for better rates']
      };
    }

    res.json({
      loanDetails: {
        homePrice: price,
        downPayment: downPmt,
        downPaymentPercent: downPmtPercent,
        loanAmount,
        interestRate: interestRate || 7,
        loanTerm: loanTerm || 30,
        loanType: loanType || 'Conventional'
      },
      monthlyPayment: {
        principalAndInterest: Math.round(monthlyPI * 100) / 100,
        propertyTax: Math.round(monthlyTax * 100) / 100,
        homeInsurance: Math.round(monthlyInsurance * 100) / 100,
        pmi: Math.round(monthlyPMI * 100) / 100,
        hoaFees: monthlyHOA,
        total: Math.round(totalMonthly * 100) / 100
      },
      loanSummary: {
        totalPayments: Math.round(totalPayments),
        totalInterest: Math.round(totalInterest),
        totalCost: Math.round(totalPayments + downPmt)
      },
      borrowerMetrics: {
        annualIncome: annualIncome || 100000,
        monthlyIncome,
        currentDTI: Math.round(currentDTI * 10) / 10,
        projectedDTI: Math.round(projectedDTI * 10) / 10
      },
      analysis,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Mortgage calculator error:', error);
    res.status(500).json({ error: 'Failed to calculate mortgage' });
  }
});

// AI Investment Property Finder - Find and analyze investment properties
router.post('/investment-property-finder', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const {
      investmentBudget, targetCashFlow, targetCapRate, targetCashOnCash,
      preferredPropertyTypes, preferredLocations, investmentStrategy,
      riskTolerance, financingType, downPaymentPercent
    } = req.body;

    // Search for properties that might be good investments
    const where = { status: 'ACTIVE' };
    if (investmentBudget) {
      where.price = { lte: investmentBudget };
    }
    if (preferredPropertyTypes && preferredPropertyTypes.length > 0) {
      const typeMap = {
        'Single Family': 'SINGLE_FAMILY',
        'Multi-Family': 'MULTI_FAMILY',
        'Condo': 'CONDO',
        'Townhouse': 'TOWNHOUSE'
      };
      where.type = { in: preferredPropertyTypes.map(t => typeMap[t] || t) };
    }

    const properties = await prisma.property.findMany({
      where,
      take: 20,
      orderBy: { price: 'asc' },
      include: { photos: { where: { isPrimary: true }, take: 1 } }
    });

    // Calculate investment metrics for each property
    const analyzedProperties = properties.map(property => {
      const price = property.price;
      const down = price * (downPaymentPercent || 20) / 100;
      const loanAmount = price - down;
      const monthlyRate = 0.07 / 12; // Assume 7% rate
      const term = 360; // 30 years
      const monthlyMortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);

      // Estimate rent based on property characteristics
      const estimatedRent = Math.round((property.bedrooms * 400 + property.bathrooms * 200 + (property.squareFeet || 1500) * 0.8) / 50) * 50;

      // Monthly expenses
      const monthlyExpenses = (price * 0.0125 / 12) + (price * 0.005 / 12) + (estimatedRent * 0.1) + (estimatedRent * 0.08);

      const monthlyCashFlow = estimatedRent - monthlyMortgage - monthlyExpenses;
      const annualCashFlow = monthlyCashFlow * 12;
      const cashOnCash = (annualCashFlow / down) * 100;
      const capRate = ((estimatedRent * 12 - monthlyExpenses * 12) / price) * 100;
      const grm = price / (estimatedRent * 12);

      return {
        ...property,
        investmentMetrics: {
          estimatedRent,
          monthlyMortgage: Math.round(monthlyMortgage),
          monthlyExpenses: Math.round(monthlyExpenses),
          monthlyCashFlow: Math.round(monthlyCashFlow),
          annualCashFlow: Math.round(annualCashFlow),
          cashOnCash: Math.round(cashOnCash * 10) / 10,
          capRate: Math.round(capRate * 10) / 10,
          grossRentMultiplier: Math.round(grm * 10) / 10,
          cashInvested: down
        }
      };
    });

    // Sort by cash on cash return
    analyzedProperties.sort((a, b) => b.investmentMetrics.cashOnCash - a.investmentMetrics.cashOnCash);

    // Filter based on investment criteria
    let filteredProperties = analyzedProperties;
    if (targetCashFlow) {
      filteredProperties = filteredProperties.filter(p => p.investmentMetrics.monthlyCashFlow >= targetCashFlow);
    }
    if (targetCapRate) {
      filteredProperties = filteredProperties.filter(p => p.investmentMetrics.capRate >= targetCapRate);
    }
    if (targetCashOnCash) {
      filteredProperties = filteredProperties.filter(p => p.investmentMetrics.cashOnCash >= targetCashOnCash);
    }

    const prompt = `As a real estate investment advisor, analyze these investment criteria and provide recommendations:

Investment Criteria:
- Budget: $${(investmentBudget || 500000).toLocaleString()}
- Target Monthly Cash Flow: $${targetCashFlow || 'Not specified'}
- Target Cap Rate: ${targetCapRate || 'Not specified'}%
- Target Cash on Cash Return: ${targetCashOnCash || 'Not specified'}%
- Preferred Property Types: ${preferredPropertyTypes?.join(', ') || 'Any'}
- Preferred Locations: ${preferredLocations || 'Any'}
- Investment Strategy: ${investmentStrategy || 'Buy and hold'}
- Risk Tolerance: ${riskTolerance || 'Moderate'}
- Financing: ${financingType || 'Conventional'} with ${downPaymentPercent || 20}% down

Properties Found: ${filteredProperties.length}
Top Properties by Cash on Cash Return:
${filteredProperties.slice(0, 5).map(p =>
  `- ${p.address}, ${p.city}: $${p.price.toLocaleString()}, ${p.bedrooms}bd/${p.bathrooms}ba, CoC: ${p.investmentMetrics.cashOnCash}%, Cap: ${p.investmentMetrics.capRate}%, CF: $${p.investmentMetrics.monthlyCashFlow}/mo`
).join('\n')}

Provide investment recommendations in JSON format:
{
  "marketAssessment": {
    "overallOpportunity": "excellent/good/fair/limited",
    "marketConditions": "description",
    "timing": "good/neutral/wait"
  },
  "strategyRecommendations": {
    "primaryStrategy": "recommended strategy",
    "alternativeStrategies": ["other options"],
    "reasoning": "why this strategy"
  },
  "topPicksAnalysis": [
    {
      "rank": 1,
      "address": "property address",
      "whyRecommended": "reason",
      "strengths": ["strength1"],
      "risks": ["risk1"],
      "improvementPotential": "description"
    }
  ],
  "investmentTips": ["tip1", "tip2"],
  "riskFactors": ["market risks to consider"],
  "nextSteps": ["action items for investor"]
}`;

    let aiRecommendations = {};
    try {
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
            { role: 'system', content: 'You are an experienced real estate investment advisor. Provide practical, data-driven investment recommendations. Respond in valid JSON.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 10000
        })
      });
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiRecommendations = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error('AI investment finder error:', aiError);
      aiRecommendations = {
        marketAssessment: {
          overallOpportunity: filteredProperties.length > 5 ? 'good' : 'limited',
          marketConditions: 'Analysis based on available inventory',
          timing: 'neutral'
        },
        strategyRecommendations: {
          primaryStrategy: investmentStrategy || 'Buy and hold for cash flow',
          alternativeStrategies: ['BRRRR method', 'House hacking', 'Value-add renovation'],
          reasoning: 'Based on your criteria and available properties'
        },
        topPicksAnalysis: filteredProperties.slice(0, 3).map((p, i) => ({
          rank: i + 1,
          address: `${p.address}, ${p.city}`,
          whyRecommended: `Strong ${p.investmentMetrics.cashOnCash > 8 ? 'cash on cash return' : 'cap rate'}`,
          strengths: [`${p.investmentMetrics.cashOnCash}% CoC return`, `$${p.investmentMetrics.monthlyCashFlow}/mo cash flow`],
          risks: ['Market conditions may vary', 'Verify rent estimates'],
          improvementPotential: 'Consider value-add improvements'
        })),
        investmentTips: [
          'Always verify rental rates with local property managers',
          'Get professional inspections before purchasing',
          'Build 6 months of reserves before investing',
          'Consider property management costs if not self-managing'
        ],
        riskFactors: ['Interest rate changes', 'Local market fluctuations', 'Vacancy risk'],
        nextSteps: ['Schedule property tours', 'Get pre-approved for financing', 'Consult with a real estate attorney']
      };
    }

    res.json({
      criteria: {
        investmentBudget: investmentBudget || 500000,
        targetCashFlow,
        targetCapRate,
        targetCashOnCash,
        preferredPropertyTypes,
        investmentStrategy,
        riskTolerance,
        financingType,
        downPaymentPercent: downPaymentPercent || 20
      },
      propertiesFound: filteredProperties.length,
      topProperties: filteredProperties.slice(0, 10).map(p => ({
        id: p.id,
        address: p.address,
        city: p.city,
        state: p.state,
        price: p.price,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        squareFeet: p.squareFeet,
        type: p.type,
        photo: p.photos?.[0]?.url || null,
        metrics: p.investmentMetrics
      })),
      recommendations: aiRecommendations,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Investment property finder error:', error);
    res.status(500).json({ error: 'Failed to find investment properties' });
  }
});

// AI Real Estate Appraiser - Professional property valuation
router.post('/property-appraiser', authenticateToken, async (req, res) => {
  try {
    const {
      address, city, state, zipCode, propertyType, bedrooms, bathrooms,
      squareFeet, lotSize, yearBuilt, condition, recentUpgrades,
      garage, basement, pool, stories, appraisalPurpose
    } = req.body;

    if (!address || !city || !state) {
      return res.status(400).json({ error: 'Address, city, and state are required' });
    }

    const currentYear = new Date().getFullYear();
    const effectiveAge = currentYear - (yearBuilt || 2000);

    const systemPrompt = `You are a certified real estate appraiser (MAI, SRA designated) with 20+ years of experience performing USPAP-compliant appraisals. You specialize in residential property valuation using the Sales Comparison Approach, Cost Approach, and Income Approach.

APPRAISAL STANDARDS:
- Follow Uniform Standards of Professional Appraisal Practice (USPAP)
- Use the Sales Comparison Approach as the primary valuation method
- Apply the Cost Approach for newer properties or unique improvements
- Consider the Income Approach for investment properties
- All adjustments must be market-supported and defensible

VALUATION METHODOLOGY:
1. Sales Comparison Approach (primary, weight 60-70%):
   - Identify 3-5 comparable sales within 6 months and 1 mile radius
   - Apply line-item adjustments: location, size, age, condition, features
   - Standard adjustments per industry benchmarks:
     * Bedroom: +/- $10,000-$25,000 depending on market
     * Bathroom: +/- $8,000-$20,000
     * Square footage: $80-$250/sq ft depending on market tier
     * Garage: $15,000-$40,000 per bay
     * Pool: $15,000-$50,000 (varies by climate/market)
     * Lot size premium: $2-$15/sq ft for excess land
     * Age/condition: 1-3% depreciation per year of effective age
     * Basement (finished): $30-$60/sq ft
     * Recent renovations: 50-80% of cost recouped

2. Cost Approach (weight 15-25%):
   - Replacement cost new: $125-$350/sq ft by construction quality
   - Less depreciation (physical, functional, external)
   - Plus land value

3. Reconciliation:
   - Weight approaches based on data quality and property type
   - Apply final reconciled value with confidence range (+/- 3-8%)

CONDITION RATINGS (C1-C6 scale per Fannie Mae):
- C1: Recently constructed, no deferred maintenance
- C2: No updates needed, well maintained
- C3: Well maintained, limited updates needed
- C4: Adequate maintenance, some updates needed
- C5: Obvious deferred maintenance, significant updates needed
- C6: Substantial damage or deferred maintenance

MARKET FACTORS TO CONSIDER:
- Days on market trends
- Supply/demand dynamics
- Interest rate impact on values
- Seasonal adjustments
- Local economic conditions
- School district quality impact
- Flood zone / environmental factors`;

    const prompt = `Perform a professional real estate appraisal for the following property.

SUBJECT PROPERTY:
- Address: ${address}, ${city}, ${state} ${zipCode || ''}
- Property Type: ${propertyType || 'Single Family'}
- Bedrooms: ${bedrooms || 3} | Bathrooms: ${bathrooms || 2}
- Living Area: ${squareFeet || 1800} sq ft
- Lot Size: ${lotSize || 7500} sq ft
- Year Built: ${yearBuilt || 2000} (Effective Age: ${effectiveAge} years)
- Stories: ${stories || 1}
- Condition: ${condition || 'Good'}
- Garage: ${garage || 'None'}
- Basement: ${basement || 'None'}
- Pool: ${pool ? 'Yes' : 'No'}
- Recent Upgrades: ${recentUpgrades || 'None reported'}
- Appraisal Purpose: ${appraisalPurpose || 'Sale'}

Provide a comprehensive appraisal report. Return ONLY valid JSON in this exact format:
{
  "appraisal": {
    "estimatedValue": <number - reconciled market value>,
    "valueLow": <number - low end of range>,
    "valueHigh": <number - high end of range>,
    "confidenceLevel": "<High/Medium/Low>",
    "pricePerSqFt": <number>,
    "scores": {
      "location": <0-100>,
      "condition": <0-100>,
      "improvements": <0-100>,
      "marketAppeal": <0-100>
    },
    "comparables": [
      {
        "address": "<comparable address>",
        "salePrice": <number>,
        "bedrooms": <number>,
        "bathrooms": <number>,
        "squareFeet": <number>,
        "yearBuilt": <number>,
        "pricePerSqFt": <number>,
        "adjustedDifference": "<e.g., '+$12,000' or '-$8,000'>"
      }
    ],
    "adjustments": [
      {
        "factor": "<adjustment description>",
        "amount": <number - positive or negative>
      }
    ],
    "strengths": ["<value strength 1>", "<value strength 2>"],
    "concerns": ["<value concern 1>", "<value concern 2>"],
    "recommendations": ["<recommendation 1>", "<recommendation 2>"],
    "approachValues": {
      "salesComparison": <number>,
      "costApproach": <number>,
      "reconciliationNotes": "<explanation of final value reconciliation>"
    },
    "marketConditions": "<brief market conditions summary>",
    "effectiveDate": "${new Date().toISOString().split('T')[0]}",
    "conditionRating": "<C1-C6 rating>"
  }
}`;

    const aiResult = await callOpenRouter(prompt, systemPrompt, { temperature: 0.3, max_tokens: 10000 });

    let parsed;
    try {
      parsed = JSON.parse(aiResult);
    } catch (parseError) {
      parsed = { appraisal: { rawAnalysis: aiResult } };
    }

    res.json({
      property: {
        address, city, state, zipCode, propertyType,
        bedrooms, bathrooms, squareFeet, lotSize, yearBuilt,
        condition, garage, basement, pool, stories
      },
      appraisal: parsed.appraisal || parsed,
      appraisalPurpose: appraisalPurpose || 'Sale',
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Property appraiser error:', error);
    res.status(500).json({ error: 'Failed to generate property appraisal' });
  }
});

// AI Comparable Analysis - generate comp report from subject + nearby properties
router.post('/comparable-analysis', authenticateToken, async (req, res) => {
  try {
    const { subject, comparables, marketContext } = req.body;

    if (!subject) {
      return res.status(400).json({ error: 'subject (object) is required' });
    }

    const systemPrompt = 'You are a real estate analyst. Generate a comparable sales (CMA) report. Output strict JSON with keys: priceRange (low, high, recommended), adjustedComps (array with adjustments and reasoning), marketTrends, confidenceScore (0-1), notes.';

    const prompt = `Subject Property:\n${JSON.stringify(subject, null, 2)}\n\nComparables (${(comparables || []).length}):\n${JSON.stringify((comparables || []).slice(0, 10), null, 2)}\n\nMarket Context:\n${JSON.stringify(marketContext || {}, null, 2)}\n\nReturn JSON only.`;

    const aiResult = await callOpenRouter(prompt, systemPrompt, { temperature: 0.3, max_tokens: 4000 });

    let parsed;
    try {
      parsed = JSON.parse(aiResult);
    } catch (e) {
      parsed = { rawAnalysis: aiResult };
    }

    res.json({
      subject,
      analysis: parsed,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Comparable analysis error:', error);
    res.status(500).json({ error: 'Failed to generate comparable analysis' });
  }
});

// AI Compliance Checker - flag potential real-estate compliance issues
router.post('/compliance-checker', authenticateToken, async (req, res) => {
  try {
    const { listing, transaction, jurisdiction } = req.body;

    const systemPrompt = 'You are a real estate compliance reviewer. Identify potential compliance flags (Fair Housing, RESPA, agency disclosure, MLS rules, dual-agency, advertising rules, license display) in the provided context. Output strict JSON: { flags: [{ category, severity, issue, recommendation }], summary, jurisdictionNotes }. This is informational only and not legal advice.';

    const prompt = `Jurisdiction: ${jurisdiction || 'unspecified'}\n\nListing:\n${JSON.stringify(listing || {}, null, 2)}\n\nTransaction:\n${JSON.stringify(transaction || {}, null, 2)}\n\nReturn JSON only.`;

    const aiResult = await callOpenRouter(prompt, systemPrompt, { temperature: 0.2, max_tokens: 3000 });

    let parsed;
    try {
      parsed = JSON.parse(aiResult);
    } catch (e) {
      parsed = { rawAnalysis: aiResult };
    }

    res.json({
      jurisdiction: jurisdiction || 'unspecified',
      compliance: parsed,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Compliance checker error:', error);
    res.status(500).json({ error: 'Failed to run compliance check' });
  }
});

// AI Predictive Lead Scoring — score leads on likelihood-to-close using historical signals
router.post('/predictive-lead-scoring', authenticateToken, async (req, res) => {
  try {
    const { leads, historicalDealsContext, weighting } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'leads must be a non-empty array' });
    }

    const systemPrompt = 'You are a real estate sales-ops analyst. Predict close-probability for each lead based on stated attributes and (optionally) historical deal patterns. Output strict JSON: { rankedLeads: [{ leadId, score (0-100), tier ("hot"|"warm"|"cold"), reasons:[string], recommendedNextActions:[string], estimatedTimeToCloseDays, riskFlags:[string] }], modelNotes }.';

    const prompt = `Leads (max 50):
${JSON.stringify(leads.slice(0, 50), null, 2)}

Historical Deals Context (optional):
${JSON.stringify(historicalDealsContext || {}, null, 2)}

Weighting Hints (optional):
${JSON.stringify(weighting || {}, null, 2)}

Return JSON only.`;

    const aiResult = await callOpenRouter(prompt, systemPrompt, { temperature: 0.2, max_tokens: 5000 });
    let parsed;
    try { parsed = JSON.parse(aiResult); } catch (_) { parsed = { rawAnalysis: aiResult }; }

    res.json({
      leadCount: leads.length,
      scoring: parsed,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    return handleAIError(error, res, 'Failed to score leads');
  }
});

// AI Buyer Journey Personalization — produce targeted email/SMS triggers per buyer stage
router.post('/buyer-journey-personalization', authenticateToken, async (req, res) => {
  try {
    const { buyer, stage, recentInteractions, propertyShortlist, channels } = req.body;
    if (!buyer || typeof buyer !== 'object') {
      return res.status(400).json({ error: 'buyer (object) is required' });
    }

    const systemPrompt = 'You are a real estate marketing automation specialist. Produce a personalized journey plan for the buyer at the given stage. Output strict JSON: { stage, summary, recommendedTriggers:[{ channel ("email"|"sms"|"call"|"in-app"), timing, subject, message, callToAction, rationale }], nextStageCriteria, listingsToFeature:[string], avoidTopics:[string] }. Be compliant and avoid Fair Housing violations.';

    const allowedChannels = Array.isArray(channels) && channels.length ? channels : ['email', 'sms'];
    const prompt = `Buyer:
${JSON.stringify(buyer, null, 2)}

Stage: ${stage || 'unspecified (infer from context)'}
Allowed channels: ${allowedChannels.join(', ')}

Recent Interactions:
${JSON.stringify(recentInteractions || [], null, 2)}

Property Shortlist:
${JSON.stringify(propertyShortlist || [], null, 2)}

Return JSON only.`;

    const aiResult = await callOpenRouter(prompt, systemPrompt, { temperature: 0.5, max_tokens: 4000 });
    let parsed;
    try { parsed = JSON.parse(aiResult); } catch (_) { parsed = { rawAnalysis: aiResult }; }

    res.json({
      buyerId: buyer.id || buyer.leadId || null,
      stage: stage || null,
      personalization: parsed,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    return handleAIError(error, res, 'Failed to generate personalized journey');
  }
});

// AI Pipeline Forecast — sales/commission forecast from current pipeline
router.post('/pipeline-forecast', authenticateToken, async (req, res) => {
  try {
    const { pipeline, horizonMonths, commissionStructure, marketContext } = req.body;
    if (!Array.isArray(pipeline) || pipeline.length === 0) {
      return res.status(400).json({ error: 'pipeline must be a non-empty array of deals' });
    }
    const horizon = parseInt(horizonMonths, 10) || 3;
    if (horizon < 1 || horizon > 24) {
      return res.status(400).json({ error: 'horizonMonths must be between 1 and 24' });
    }

    const systemPrompt = 'You are a real estate sales forecaster. Produce a pipeline forecast across the requested horizon. Output strict JSON: { horizonMonths, baseCase:{ closedDeals, gci, netCommission }, optimisticCase:{...}, pessimisticCase:{...}, monthlyBreakdown:[{ monthIndex, expectedClosings, expectedGci, riskLevel }], topRisks:[string], topOpportunities:[string], assumptions:[string] }. Use probability-weighted close-rates.';

    const prompt = `Pipeline (max 100 deals):
${JSON.stringify(pipeline.slice(0, 100), null, 2)}

Horizon (months): ${horizon}

Commission Structure:
${JSON.stringify(commissionStructure || {}, null, 2)}

Market Context:
${JSON.stringify(marketContext || {}, null, 2)}

Return JSON only.`;

    const aiResult = await callOpenRouter(prompt, systemPrompt, { temperature: 0.3, max_tokens: 5000 });
    let parsed;
    try { parsed = JSON.parse(aiResult); } catch (_) { parsed = { rawAnalysis: aiResult }; }

    res.json({
      pipelineSize: pipeline.length,
      horizonMonths: horizon,
      forecast: parsed,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    return handleAIError(error, res, 'Failed to generate pipeline forecast');
  }
});

module.exports = router;
