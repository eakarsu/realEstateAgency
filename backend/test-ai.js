// AI Feature Test Script
// Run: node test-ai.js

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001/api';
let authToken = '';

async function login() {
  console.log('\n=== Logging in ===');
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@realestate.com',
      password: 'admin123'
    })
  });
  const data = await res.json();
  if (data.token) {
    authToken = data.token;
    console.log('✓ Login successful');
    return true;
  }
  console.log('✗ Login failed:', data);
  return false;
}

async function testAI(endpoint, body, name) {
  console.log(`\n=== Testing: ${name} ===`);
  try {
    const res = await fetch(`${BASE_URL}/ai/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      console.log('✓ Success!');
      console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
      return true;
    } else {
      console.log('✗ Failed:', data);
      return false;
    }
  } catch (error) {
    console.log('✗ Error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('========================================');
  console.log('   AI FEATURES TEST SUITE');
  console.log('========================================');

  // Login first
  if (!await login()) {
    console.log('\nCannot proceed without login. Make sure backend is running.');
    process.exit(1);
  }

  const results = [];

  // 1. Neighborhood Insights
  results.push(await testAI('neighborhood-insights', {
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102'
  }, 'Neighborhood Insights'));

  // 2. Investment Analyzer
  results.push(await testAI('investment-analyzer', {
    purchasePrice: 500000,
    downPayment: 20,
    interestRate: 7,
    loanTerm: 30,
    estimatedRent: 2500
  }, 'Investment Analyzer'));

  // 3. Listing Description
  results.push(await testAI('listing-description', {
    address: '123 Main St, San Francisco, CA',
    propertyType: 'Single Family',
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1800,
    yearBuilt: 2010,
    price: 750000,
    features: 'Updated kitchen, hardwood floors, large backyard'
  }, 'Listing Description'));

  // 4. Virtual Staging
  results.push(await testAI('virtual-staging', {
    roomType: 'Living Room',
    style: 'Modern',
    currentState: 'Empty',
    budget: 'Medium'
  }, 'Virtual Staging'));

  // 5. Social Post
  results.push(await testAI('social-post', {
    propertyAddress: '456 Oak Ave, Los Angeles, CA',
    propertyType: 'Condo',
    price: 650000,
    highlights: 'Ocean views, renovated kitchen, rooftop access',
    platform: 'Instagram'
  }, 'Social Post Generator'));

  // 6. Email Sequence
  results.push(await testAI('follow-up-sequence', {
    leadName: 'John Smith',
    leadType: 'Buyer',
    interests: '3-bed homes, good schools, quiet neighborhood',
    timeline: '3-6 months'
  }, 'Email Sequence Generator'));

  // 7. Market Analysis
  results.push(await testAI('market-analysis', {
    address: '789 Pine St',
    city: 'Seattle',
    state: 'WA',
    propertyType: 'Single Family',
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2200
  }, 'Market Analysis (CMA)'));

  // 8. Price Predictor
  results.push(await testAI('price-predictor', {
    address: '101 Cedar Rd, Portland, OR',
    city: 'Portland',
    state: 'OR',
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1600,
    yearBuilt: 1995,
    type: 'SINGLE_FAMILY'
  }, 'Price Predictor'));

  // 9. Contract Analyzer
  results.push(await testAI('contract-analyzer', {
    contractType: 'Purchase Agreement',
    contractText: `REAL ESTATE PURCHASE AGREEMENT

Buyer: John Smith
Seller: Jane Doe
Property: 123 Main Street, San Francisco, CA 94102
Purchase Price: $850,000
Earnest Money: $25,000
Closing Date: January 15, 2025

Contingencies:
1. Financing contingency - 21 days
2. Inspection contingency - 14 days
3. Appraisal contingency

This agreement is binding upon execution by both parties.`
  }, 'Contract Analyzer'));

  // 10. Buyer Persona
  results.push(await testAI('buyer-persona', {
    propertyType: 'Condo',
    priceRange: '$400,000 - $600,000',
    location: 'Austin, TX',
    bedrooms: 2,
    features: 'Pool, gym, downtown location'
  }, 'Buyer Persona Generator'));

  // Summary
  console.log('\n========================================');
  console.log('   TEST RESULTS SUMMARY');
  console.log('========================================');
  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`Total: ${results.length}`);

  if (failed > 0) {
    console.log('\nSome tests failed. Check OpenRouter API key or backend logs.');
  } else {
    console.log('\nAll tests passed! AI features are working.');
  }
}

runTests().catch(console.error);
