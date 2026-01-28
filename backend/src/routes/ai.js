const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

// OpenRouter API helper with temperature control
async function callOpenRouter(prompt, systemPrompt = '', options = {}) {
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
      max_tokens: options.max_tokens || 1000,
      temperature: temperature
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
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
    const prompt = `Analyze this real estate lead and provide a score from 0-100 and recommendation:
Lead: ${lead.firstName} ${lead.lastName}
Email: ${lead.email || 'Not provided'}
Phone: ${lead.phone || 'Not provided'}
Budget: $${lead.budget || 'Unknown'}
Timeline: ${lead.timeline || 'Unknown'}
Property Type: ${lead.propertyType || 'Any'}
Preferred Areas: ${lead.preferredAreas?.join(', ') || 'Not specified'}
Source: ${lead.source?.name || 'Unknown'}
Activities: ${activityCount} recorded interactions
Showings: ${showingsCount} property viewings

Respond in JSON format: {"score": number, "recommendation": "string", "reasoning": "string", "nextSteps": ["step1", "step2"]}`;

    let score = 50;
    let recommendation = 'WARM - Schedule follow-up';
    let reasoning = '';
    let nextSteps = [];

    try {
      const aiResponse = await callOpenRouter(prompt, 'You are a real estate lead scoring expert. Respond only in valid JSON.');
      const parsed = JSON.parse(aiResponse);
      score = parsed.score || 50;
      recommendation = parsed.recommendation || recommendation;
      reasoning = parsed.reasoning || '';
      nextSteps = parsed.nextSteps || [];
    } catch (aiError) {
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
    const prompt = `Given this buyer profile:
- Buyer: ${lead.firstName} ${lead.lastName}
- Budget: $${lead.budget || 'Flexible'}
- Preferred Areas: ${lead.preferredAreas?.join(', ') || preferredAreas || 'Any'}
- Property Type: ${lead.propertyType || 'Any'}
- Bedrooms: ${lead.bedrooms || 'Any'}
- Bathrooms: ${lead.bathrooms || 'Any'}
- Must-Haves: ${lead.mustHaves || mustHaves || 'None specified'}

Rank these properties from best to worst match (return property IDs in order):
${properties.map(p => `ID: ${p.id} - ${p.address}, ${p.city} - $${p.price} - ${p.bedrooms}bd/${p.bathrooms}ba - ${p.type}`).join('\n')}

Respond with JSON: {"rankedIds": ["id1", "id2", ...], "reasoning": "brief explanation", "matchScores": {"id1": 95, "id2": 85}}`;

    let rankedProperties = properties;
    let reasoning = '';
    try {
      const aiResponse = await callOpenRouter(prompt, 'You are a real estate matching expert. Respond only in valid JSON.');
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

    const prompt = `Write a compelling ${style} real estate listing description for:
Property Type: ${property.type}
Address: ${property.address}${property.city ? `, ${property.city}` : ''}${property.state ? `, ${property.state}` : ''} ${property.zipCode || ''}
Price: $${property.price?.toLocaleString()}
Bedrooms: ${property.bedrooms}
Bathrooms: ${property.bathrooms}
Square Feet: ${property.squareFeet?.toLocaleString()}
Year Built: ${property.yearBuilt}
${property.lotSize ? `Lot Size: ${property.lotSize} acres` : ''}
${property.garage ? `Garage: ${property.garage} car` : ''}
Features: ${property.features?.join(', ') || 'Modern amenities'}

Write an engaging, SEO-friendly description that highlights the property's best features and appeals to potential buyers. Use descriptive language and create an emotional connection.`;

    let description = '';
    try {
      description = await callOpenRouter(prompt, 'You are an expert real estate copywriter. Write compelling property descriptions that sell homes.');
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

    const prompt = `Analyze this real estate market data and provide insights:
Location: ${city}, ${state} ${zipCode || ''}
Recent Sales: ${soldComps.length} properties
Average Sold Price: $${Math.round(avgSoldPrice).toLocaleString()}
Average Price/SqFt: $${Math.round(avgPricePerSqft)}
Active Listings: ${activeComps.length}

Comparable Sales:
${soldComps.slice(0, 5).map(p => `- ${p.address}: $${p.price.toLocaleString()}, ${p.squareFeet} sqft, ${p.bedrooms}bd/${p.bathrooms}ba`).join('\n')}

Provide a market analysis including trends, pricing recommendations, and market conditions.`;

    let analysisText = '';
    try {
      analysisText = await callOpenRouter(prompt, 'You are a real estate market analyst. Provide data-driven insights and recommendations.');
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
          max_tokens: 4000
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
          max_tokens: 500
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

    const prompt = `Create an engaging ${platform} post for this real estate listing:
Property: ${property.address}${property.city ? `, ${property.city}` : ''}
Price: $${property.price?.toLocaleString()}
Type: ${propertyType || 'Home'}
Highlights: ${property.features?.join(', ') || highlights || 'Beautiful home'}

Include relevant hashtags and emojis. Make it engaging and shareable for ${platform}.`;

    let content = '';
    try {
      content = await callOpenRouter(prompt, `You are a social media expert for real estate. Create viral ${platform} content.`);
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

    const prompt = `Describe how to virtually stage this ${currentState.toLowerCase()} ${normalizedRoomType.replace('_', ' ')} in ${normalizedStyle} style with a ${budget.toLowerCase()} budget:

Style: ${styleDescriptions[normalizedStyle] || styleDescriptions.modern}
Room: ${roomDescriptions[normalizedRoomType] || roomDescriptions.living_room}
Current State: ${currentState}
Budget: ${budget}

Provide specific furniture placement, color schemes, and decor recommendations in JSON format:
{
  "furniture": ["item1", "item2"],
  "colorPalette": ["color1", "color2"],
  "decor": ["item1", "item2"],
  "arrangement": "description of furniture arrangement",
  "lightingTips": "lighting recommendations",
  "estimatedImpact": "how this staging will improve buyer perception",
  "estimatedCost": "budget range for this staging"
}`;

    let stagingPlan = {};
    try {
      const aiResponse = await callOpenRouter(prompt, 'You are an expert interior designer and real estate stager. Provide detailed, practical staging recommendations. Respond in valid JSON.');
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

    const prompt = `Provide comprehensive neighborhood insights for ${address || ''} ${city}, ${state} ${zipCode || ''}:

Include analysis of:
1. Safety & Crime: General safety assessment
2. Schools: Quality of local schools (elementary, middle, high)
3. Walkability: Access to amenities on foot
4. Transportation: Public transit options, commute times
5. Demographics: Community characteristics
6. Amenities: Nearby shopping, dining, entertainment, parks
7. Market Trends: Real estate value trends for this area
8. Future Development: Known planned developments

Respond in JSON format:
{
  "overallScore": 85,
  "safety": {"score": 80, "summary": "..."},
  "schools": {"score": 85, "elementary": [...], "middle": [...], "high": [...], "summary": "..."},
  "walkability": {"score": 70, "nearbyAmenities": [...], "summary": "..."},
  "transportation": {"score": 75, "options": [...], "commuteInfo": "..."},
  "demographics": {"summary": "..."},
  "amenities": {"restaurants": [...], "shopping": [...], "parks": [...], "entertainment": [...]},
  "marketTrends": {"appreciation": "5%", "avgDaysOnMarket": 30, "summary": "..."},
  "futureDevelopment": {"projects": [...], "impact": "..."},
  "prosAndCons": {"pros": [...], "cons": [...]},
  "idealFor": ["families", "young professionals", "retirees"]
}`;

    let insights = {};
    try {
      const aiResponse = await callOpenRouter(prompt, 'You are a real estate and neighborhood expert with extensive local knowledge. Provide detailed, helpful neighborhood insights. Respond in valid JSON.');
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
          max_tokens: 2000
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
          max_tokens: 2000
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

    const prompt = `Analyze this real estate investment opportunity:

Property Details:
- Purchase Price: $${price.toLocaleString()}
- Down Payment: ${down}% ($${(price * down / 100).toLocaleString()})
- Loan Amount: $${loanAmount.toLocaleString()}
- Interest Rate: ${rate}%
- Loan Term: ${term} years
- Monthly Mortgage: $${monthlyMortgage.toFixed(2)}

Income:
- Estimated Monthly Rent: $${rent.toLocaleString()}

Expenses (Monthly):
- Property Taxes: $${(monthlyExpenses.taxes || price * 0.01 / 12).toFixed(2)}
- Insurance: $${(monthlyExpenses.insurance || price * 0.005 / 12).toFixed(2)}
- Maintenance: $${(monthlyExpenses.maintenance || rent * 0.1).toFixed(2)}
- Vacancy Reserve: $${(monthlyExpenses.vacancy || rent * 0.05).toFixed(2)}
- Property Management: $${(monthlyExpenses.propertyManagement || rent * 0.1).toFixed(2)}
- HOA: $${(monthlyExpenses.hoa || 0).toFixed(2)}

Calculated Metrics:
- Monthly Cash Flow: $${monthlyCashFlow.toFixed(2)}
- Annual Cash Flow: $${annualCashFlow.toFixed(2)}
- Cash-on-Cash Return: ${cashOnCashReturn.toFixed(2)}%
- Cap Rate: ${capRate.toFixed(2)}%
- Gross Rent Multiplier: ${grossRentMultiplier.toFixed(2)}

Provide investment analysis in JSON:
{
  "overallRating": "excellent/good/fair/poor",
  "investmentScore": 75,
  "summary": "Brief investment summary",
  "strengths": [""],
  "risks": [""],
  "recommendations": [""],
  "fiveYearProjection": {
    "equityBuildup": 0,
    "totalCashFlow": 0,
    "appreciation": 0,
    "totalReturn": 0,
    "roiPercentage": 0
  },
  "exitStrategies": [""],
  "marketComparison": "How this compares to typical returns"
}`;

    let analysis = {};
    try {
      const aiResponse = await callOpenRouter(prompt, 'You are a real estate investment analyst. Provide comprehensive, data-driven investment analysis. Respond in valid JSON.');
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

    const prompt = `Create ideal buyer personas for this property:

Property Details:
- Type: ${property.type}
- Location: ${property.address ? `${property.address}, ` : ''}${property.city}${property.state ? `, ${property.state}` : ''}
- Price: $${property.price?.toLocaleString()}
- Bedrooms: ${property.bedrooms}
- Bathrooms: ${property.bathrooms}
- Square Feet: ${property.squareFeet?.toLocaleString()}
- Year Built: ${property.yearBuilt}
- Features: ${property.features?.join(', ') || features || 'Standard features'}
- HOA: ${property.hoaFee ? `$${property.hoaFee}/month` : 'None'}

Generate 3 ideal buyer personas in JSON:
{
  "personas": [
    {
      "name": "Persona name (e.g., 'Growing Family')",
      "demographics": {
        "ageRange": "30-45",
        "income": "$100k-150k",
        "familyStatus": "Married with kids",
        "occupation": "Professional"
      },
      "motivations": ["Why they'd buy this property"],
      "painPoints": ["Current housing challenges"],
      "searchBehavior": {
        "primaryPlatforms": ["Zillow", "Realtor.com"],
        "searchFrequency": "Daily",
        "decisionTimeline": "3-6 months"
      },
      "keySellingPoints": ["Features to emphasize for this persona"],
      "objectionHandling": ["How to address their concerns"],
      "marketingChannels": ["Best ways to reach them"],
      "matchScore": 85
    }
  ],
  "marketingRecommendations": {
    "primaryTarget": "Persona name",
    "messagingThemes": ["Key messages to use"],
    "visualContent": ["Types of photos/videos to feature"],
    "bestShowingTimes": ["When to schedule showings"]
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
            { role: 'system', content: 'You are a real estate marketing expert specializing in buyer persona development. Create detailed, actionable buyer personas. Respond in valid JSON.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 2500
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

module.exports = router;
