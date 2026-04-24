import { useState, useRef, useEffect } from 'react';
import {
  SparklesIcon,
  HomeIcon,
  MapPinIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CalculatorIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  ChartBarIcon,
  LightBulbIcon,
  VideoCameraIcon,
  BanknotesIcon,
  UserIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  ScaleIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';
import { aiAPI, propertiesAPI, openHousesAPI } from '../../services/api';
import toast from 'react-hot-toast';

const aiTools = [
  {
    id: 'lead-qualifier',
    name: 'Lead Qualifier',
    description: 'AI-powered lead scoring and prioritization',
    icon: UserGroupIcon,
    color: 'blue',
    category: 'leads'
  },
  {
    id: 'property-matcher',
    name: 'Property Matcher',
    description: 'Match buyers with ideal properties',
    icon: HomeIcon,
    color: 'green',
    category: 'leads'
  },
  {
    id: 'listing-description',
    name: 'Listing Description',
    description: 'Generate compelling property descriptions',
    icon: DocumentTextIcon,
    color: 'purple',
    category: 'marketing'
  },
  {
    id: 'market-analysis',
    name: 'Market Analysis (CMA)',
    description: 'Comparative market analysis with AI insights',
    icon: ChartBarIcon,
    color: 'indigo',
    category: 'analysis'
  },
  {
    id: 'price-predictor',
    name: 'Price Predictor',
    description: 'AI-powered property valuation',
    icon: CurrencyDollarIcon,
    color: 'yellow',
    category: 'analysis'
  },
  {
    id: 'follow-up-sequence',
    name: 'Email Sequence Generator',
    description: 'Create personalized follow-up campaigns',
    icon: ChatBubbleLeftRightIcon,
    color: 'pink',
    category: 'marketing'
  },
  {
    id: 'social-post',
    name: 'Social Post Generator',
    description: 'Create engaging social media content',
    icon: SparklesIcon,
    color: 'cyan',
    category: 'marketing'
  },
  {
    id: 'virtual-staging',
    name: 'Virtual Staging',
    description: 'AI staging recommendations for empty rooms',
    icon: PhotoIcon,
    color: 'orange',
    category: 'marketing'
  },
  {
    id: 'neighborhood-insights',
    name: 'Neighborhood Insights',
    description: 'Comprehensive area analysis',
    icon: MapPinIcon,
    color: 'teal',
    category: 'analysis'
  },
  {
    id: 'contract-analyzer',
    name: 'Contract Analyzer',
    description: 'Review and summarize contracts',
    icon: DocumentTextIcon,
    color: 'red',
    category: 'transactions'
  },
  {
    id: 'offer-analyzer',
    name: 'Offer Analyzer',
    description: 'Compare and analyze multiple offers',
    icon: ClipboardDocumentListIcon,
    color: 'emerald',
    category: 'transactions'
  },
  {
    id: 'investment-analyzer',
    name: 'Investment Analyzer',
    description: 'Rental property ROI calculator',
    icon: CalculatorIcon,
    color: 'amber',
    category: 'analysis'
  },
  {
    id: 'buyer-persona',
    name: 'Buyer Persona Generator',
    description: 'Create ideal buyer profiles',
    icon: LightBulbIcon,
    color: 'violet',
    category: 'marketing'
  },
  {
    id: 'virtual-tour-creator',
    name: 'Virtual Tour Creator',
    description: 'AI-powered virtual tour scripts and planning',
    icon: VideoCameraIcon,
    color: 'rose',
    category: 'marketing'
  },
  {
    id: 'rental-price-optimizer',
    name: 'Rental Price Optimizer',
    description: 'Optimize rental pricing with AI analysis',
    icon: BanknotesIcon,
    color: 'lime',
    category: 'analysis'
  },
  {
    id: 'tenant-screener',
    name: 'Tenant Screener',
    description: 'AI-powered tenant application screening',
    icon: UserIcon,
    color: 'sky',
    category: 'leads'
  },
  {
    id: 'mortgage-calculator',
    name: 'Mortgage Calculator Pro',
    description: 'Advanced mortgage analysis with AI advice',
    icon: BuildingOfficeIcon,
    color: 'fuchsia',
    category: 'analysis'
  },
  {
    id: 'investment-property-finder',
    name: 'Investment Property Finder',
    description: 'Find and analyze investment opportunities',
    icon: MagnifyingGlassIcon,
    color: 'slate',
    category: 'analysis'
  },
  {
    id: 'property-appraiser',
    name: 'AI Real Estate Appraiser',
    description: 'Professional property appraisal with AI-powered valuation',
    icon: ScaleIcon,
    color: 'stone',
    category: 'analysis'
  },
  {
    id: 'showing-scheduler',
    name: 'Showing Scheduler',
    description: 'Find available showing time slots for properties',
    icon: CalendarDaysIcon,
    color: 'zinc',
    category: 'leads'
  },
  {
    id: 'open-house-summary',
    name: 'Open House Summary',
    description: 'AI-generated open house performance report',
    icon: ClipboardDocumentCheckIcon,
    color: 'neutral',
    category: 'marketing'
  }
];

const categories = [
  { id: 'all', name: 'All Tools' },
  { id: 'leads', name: 'Lead Management' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'analysis', name: 'Analysis' },
  { id: 'transactions', name: 'Transactions' }
];

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  pink: 'bg-pink-100 text-pink-600',
  cyan: 'bg-cyan-100 text-cyan-600',
  orange: 'bg-orange-100 text-orange-600',
  teal: 'bg-teal-100 text-teal-600',
  red: 'bg-red-100 text-red-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  amber: 'bg-amber-100 text-amber-600',
  violet: 'bg-violet-100 text-violet-600',
  rose: 'bg-rose-100 text-rose-600',
  lime: 'bg-lime-100 text-lime-600',
  sky: 'bg-sky-100 text-sky-600',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-600',
  slate: 'bg-slate-100 text-slate-600',
  stone: 'bg-stone-100 text-stone-600',
  zinc: 'bg-zinc-100 text-zinc-600',
  neutral: 'bg-neutral-100 text-neutral-600'
};

export default function AIHub() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTool, setSelectedTool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const toolPanelRef = useRef(null);

  // Scroll to tool panel when a tool is selected
  useEffect(() => {
    if (selectedTool && toolPanelRef.current) {
      setTimeout(() => {
        toolPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedTool]);

  // Load properties and open houses when those tools are selected
  useEffect(() => {
    if (selectedTool?.id === 'showing-scheduler' && properties.length === 0) {
      propertiesAPI.getAll({ limit: 100 }).then(res => setProperties(res.data.properties || res.data || [])).catch(() => {});
    }
    if (selectedTool?.id === 'open-house-summary' && openHouses.length === 0) {
      openHousesAPI.getAll({ limit: 100 }).then(res => setOpenHouses(res.data.openHouses || res.data || [])).catch(() => {});
    }
  }, [selectedTool]);

  // Tool-specific form states
  const [neighborhoodForm, setNeighborhoodForm] = useState({ city: '', state: '', zipCode: '' });
  const [investmentForm, setInvestmentForm] = useState({
    purchasePrice: 300000,
    downPayment: 20,
    interestRate: 7,
    loanTerm: 30,
    estimatedRent: 2000
  });
  const [listingForm, setListingForm] = useState({
    address: '',
    propertyType: 'Single Family',
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1800,
    yearBuilt: 2000,
    features: '',
    price: 450000
  });
  const [virtualStagingForm, setVirtualStagingForm] = useState({
    roomType: 'Living Room',
    currentState: 'Empty',
    style: 'Modern',
    budget: 'Medium'
  });
  const [contractForm, setContractForm] = useState({
    contractText: '',
    contractType: 'Purchase Agreement'
  });
  const [buyerPersonaForm, setBuyerPersonaForm] = useState({
    propertyType: 'Single Family',
    priceRange: '$400,000 - $600,000',
    location: '',
    bedrooms: 3,
    features: ''
  });
  const [socialPostForm, setSocialPostForm] = useState({
    propertyAddress: '',
    propertyType: 'Single Family',
    price: 500000,
    highlights: '',
    platform: 'Instagram'
  });
  const [emailSequenceForm, setEmailSequenceForm] = useState({
    leadName: '',
    leadType: 'Buyer',
    interests: '',
    timeline: '3-6 months'
  });
  const [cmaForm, setCmaForm] = useState({
    address: '',
    propertyType: 'Single Family',
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1800
  });
  const [pricePredictorForm, setPricePredictorForm] = useState({
    address: '',
    propertyType: 'Single Family',
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1800,
    yearBuilt: 2000,
    condition: 'Good'
  });
  const [leadQualifierForm, setLeadQualifierForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    budget: 500000,
    timeline: '3-6 months',
    propertyType: 'Single Family',
    preferredAreas: ''
  });
  const [propertyMatcherForm, setPropertyMatcherForm] = useState({
    buyerName: '',
    budget: 500000,
    propertyType: 'Single Family',
    bedrooms: 3,
    bathrooms: 2,
    preferredAreas: '',
    mustHaves: ''
  });
  const [offerAnalyzerForm, setOfferAnalyzerForm] = useState({
    propertyAddress: '',
    listPrice: 500000,
    offers: [
      { buyerName: '', price: 0, downPayment: 20, financingType: 'Conventional', contingencies: '', isPreApproved: true }
    ]
  });
  const [virtualTourForm, setVirtualTourForm] = useState({
    address: '',
    propertyType: 'Single Family',
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1800,
    features: '',
    highlights: ''
  });
  const [rentalPriceForm, setRentalPriceForm] = useState({
    address: '',
    city: '',
    state: '',
    propertyType: 'Apartment',
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 1000,
    amenities: '',
    condition: 'Good',
    furnished: false,
    petPolicy: 'No Pets',
    parkingSpaces: 1,
    currentRent: ''
  });
  const [tenantScreenerForm, setTenantScreenerForm] = useState({
    applicantName: '',
    email: '',
    phone: '',
    currentEmployer: '',
    jobTitle: '',
    annualIncome: 60000,
    employmentLength: '',
    currentAddress: '',
    currentRent: 1500,
    landlordName: '',
    tenancyLength: '',
    creditScore: 700,
    hasBankruptcy: false,
    hasEviction: false,
    hasPets: false,
    petDetails: '',
    numberOfOccupants: 1,
    monthlyRent: 2000
  });
  const [mortgageForm, setMortgageForm] = useState({
    homePrice: 500000,
    downPayment: 100000,
    downPaymentPercent: 20,
    interestRate: 7,
    loanTerm: 30,
    loanType: 'Conventional',
    propertyTax: 6250,
    homeInsurance: 2500,
    hoaFees: 0,
    annualIncome: 150000,
    monthlyDebts: 500,
    creditScore: 750
  });
  const [investmentFinderForm, setInvestmentFinderForm] = useState({
    investmentBudget: 500000,
    targetCashFlow: 500,
    targetCapRate: 6,
    targetCashOnCash: 8,
    preferredPropertyTypes: ['Single Family'],
    preferredLocations: '',
    investmentStrategy: 'Buy and Hold',
    riskTolerance: 'Moderate',
    downPaymentPercent: 20
  });

  const [showingSchedulerForm, setShowingSchedulerForm] = useState({
    propertyId: '',
    preferredTimes: ['10:00', '14:00', '16:00']
  });
  const [openHouseSummaryForm, setOpenHouseSummaryForm] = useState({
    openHouseId: ''
  });
  const [properties, setProperties] = useState([]);
  const [openHouses, setOpenHouses] = useState([]);

  const [appraiserForm, setAppraiserForm] = useState({
    address: '',
    city: '',
    state: '',
    zipCode: '',
    propertyType: 'Single Family',
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1800,
    lotSize: 7500,
    yearBuilt: 2000,
    condition: 'Good',
    recentUpgrades: '',
    garage: '2-Car Attached',
    basement: 'None',
    pool: false,
    stories: 1,
    appraisalPurpose: 'Sale'
  });

  const loadSampleData = (toolId) => {
    switch (toolId) {
      case 'neighborhood-insights':
        setNeighborhoodForm({ city: 'Austin', state: 'TX', zipCode: '78701' });
        break;
      case 'investment-analyzer':
        setInvestmentForm({ purchasePrice: 425000, downPayment: 25, interestRate: 6.5, loanTerm: 30, estimatedRent: 2800 });
        break;
      case 'listing-description':
        setListingForm({ address: '742 Evergreen Terrace, Austin, TX 78704', propertyType: 'Single Family', bedrooms: 4, bathrooms: 3, sqft: 2400, yearBuilt: 2018, features: 'Gourmet kitchen with quartz counters, hardwood floors, covered patio, smart home system, 2-car garage', price: 625000 });
        break;
      case 'virtual-staging':
        setVirtualStagingForm({ roomType: 'Living Room', currentState: 'Empty', style: 'Modern', budget: 'Medium' });
        break;
      case 'contract-analyzer':
        setContractForm({ contractText: 'RESIDENTIAL PURCHASE AGREEMENT\n\nThis Purchase Agreement is entered into as of March 15, 2026, between Seller: Robert and Maria Johnson ("Seller") and Buyer: David and Sarah Thompson ("Buyer").\n\n1. PROPERTY: The property located at 456 Oak Lane, Austin, TX 78704, including all fixtures and improvements.\n\n2. PURCHASE PRICE: $575,000 (Five Hundred Seventy-Five Thousand Dollars)\n   - Earnest Money Deposit: $15,000 due within 3 business days\n   - Down Payment: 20% ($115,000)\n   - Financing: Conventional mortgage for remaining $460,000\n\n3. CLOSING DATE: On or before April 30, 2026\n\n4. CONTINGENCIES:\n   a) Financing: Buyer must obtain loan commitment within 21 days\n   b) Inspection: 10-day inspection period from acceptance\n   c) Appraisal: Property must appraise at or above purchase price\n\n5. SELLER DISCLOSURES: Seller warrants roof was replaced in 2022. HVAC system serviced annually. No known material defects.\n\n6. CLOSING COSTS: Buyer pays standard closing costs. Seller pays for title insurance and transfer taxes.\n\n7. POSSESSION: Delivered at closing unless otherwise agreed.', contractType: 'Purchase Agreement' });
        break;
      case 'buyer-persona':
        setBuyerPersonaForm({ propertyType: 'Single Family', priceRange: '$500,000 - $750,000', location: 'Austin, TX', bedrooms: 4, features: 'Pool, updated kitchen, good school district, home office' });
        break;
      case 'social-post':
        setSocialPostForm({ propertyAddress: '1250 Lakefront Dr, Austin, TX 78746', propertyType: 'Luxury Home', price: 1250000, highlights: 'Stunning lake views, infinity pool, chef kitchen, wine cellar, 4-car garage', platform: 'Instagram' });
        break;
      case 'follow-up-sequence':
        setEmailSequenceForm({ leadName: 'Michael Chen', leadType: 'Buyer', interests: '4-bedroom homes near good schools, modern kitchen, large backyard, $500k-700k range', timeline: '1-3 months' });
        break;
      case 'market-analysis':
        setCmaForm({ address: '890 Congress Ave, Austin, TX 78701', propertyType: 'Condo', bedrooms: 2, bathrooms: 2, sqft: 1200 });
        break;
      case 'price-predictor':
        setPricePredictorForm({ address: '321 Barton Springs Rd, Austin, TX 78704', propertyType: 'Single Family', bedrooms: 3, bathrooms: 2, sqft: 1950, yearBuilt: 2005, condition: 'Good' });
        break;
      case 'lead-qualifier':
        setLeadQualifierForm({ firstName: 'Jennifer', lastName: 'Martinez', email: 'jennifer.martinez@email.com', phone: '(512) 555-0147', budget: 650000, timeline: '1-3 months', propertyType: 'Single Family', preferredAreas: 'South Austin, Zilker, Barton Hills' });
        break;
      case 'property-matcher':
        setPropertyMatcherForm({ buyerName: 'James Wilson', budget: 550000, propertyType: 'Single Family', bedrooms: 3, bathrooms: 2, preferredAreas: 'East Austin, Mueller, Holly', mustHaves: 'Updated kitchen, garage, fenced yard' });
        break;
      case 'offer-analyzer':
        setOfferAnalyzerForm({ propertyAddress: '567 Rainey St, Austin, TX 78701', listPrice: 489000, offers: [{ buyerName: 'Alex Rivera', price: 495000, downPayment: 25, financingType: 'Conventional', contingencies: 'Inspection, appraisal', isPreApproved: true }] });
        break;
      case 'virtual-tour-creator':
        setVirtualTourForm({ address: '2100 Westlake Dr, Austin, TX 78746', propertyType: 'Luxury Home', bedrooms: 5, bathrooms: 4, squareFeet: 3800, features: 'Floor-to-ceiling windows, chef kitchen, media room', highlights: 'Panoramic hill country views, resort-style pool, outdoor kitchen, wine cellar' });
        break;
      case 'rental-price-optimizer':
        setRentalPriceForm({ address: '450 East 6th St', city: 'Austin', state: 'TX', propertyType: 'Apartment', bedrooms: 2, bathrooms: 2, squareFeet: 1100, amenities: 'Pool, gym, rooftop deck, in-unit laundry, covered parking', condition: 'Excellent', furnished: false, petPolicy: 'No Pets', parkingSpaces: 1, currentRent: 2200 });
        break;
      case 'tenant-screener':
        setTenantScreenerForm({ applicantName: 'Sarah Johnson', email: 'sarah.j@email.com', phone: '(512) 555-0298', currentEmployer: 'Dell Technologies', jobTitle: 'Senior Software Engineer', annualIncome: 125000, employmentLength: '3 years', currentAddress: '789 Lamar Blvd, Austin, TX', currentRent: 1800, landlordName: 'Sunset Property Management', tenancyLength: '2 years', creditScore: 760, hasBankruptcy: false, hasEviction: false, hasPets: true, petDetails: '1 small dog, 15 lbs', numberOfOccupants: 2, monthlyRent: 2500 });
        break;
      case 'mortgage-calculator':
        setMortgageForm({ homePrice: 550000, downPayment: 110000, downPaymentPercent: 20, interestRate: 6.75, loanTerm: 30, loanType: 'Conventional', propertyTax: 8250, homeInsurance: 3200, hoaFees: 150, annualIncome: 180000, monthlyDebts: 800, creditScore: 740 });
        break;
      case 'investment-property-finder':
        setInvestmentFinderForm({ investmentBudget: 400000, targetCashFlow: 600, targetCapRate: 7, targetCashOnCash: 10, preferredPropertyTypes: ['Single Family'], preferredLocations: 'Austin, Round Rock, Cedar Park', investmentStrategy: 'Buy and Hold', riskTolerance: 'Moderate', downPaymentPercent: 25 });
        break;
      case 'property-appraiser':
        setAppraiserForm({ address: '1420 Barton Creek Blvd', city: 'Austin', state: 'TX', zipCode: '78735', propertyType: 'Single Family', bedrooms: 4, bathrooms: 3, squareFeet: 2800, lotSize: 10500, yearBuilt: 2015, condition: 'Excellent', recentUpgrades: 'Kitchen remodel 2024, new roof 2023, smart home system, hardwood floors throughout', garage: '2-Car Attached', basement: 'None', pool: true, stories: 2, appraisalPurpose: 'Sale' });
        break;
    }
    toast.success('Sample data loaded!');
  };

  const filteredTools = selectedCategory === 'all'
    ? aiTools
    : aiTools.filter(tool => tool.category === selectedCategory);

  const handleToolClick = (tool) => {
    setSelectedTool(tool);
    setResult(null);
  };

  const handleNeighborhoodInsights = async () => {
    if (!neighborhoodForm.city || !neighborhoodForm.state) {
      toast.error('Please enter city and state');
      return;
    }
    setLoading(true);
    try {
      const response = await aiAPI.neighborhoodInsights(neighborhoodForm);
      setResult(response.data);
      toast.success('Neighborhood insights generated!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };

  const handleInvestmentAnalysis = async () => {
    setLoading(true);
    try {
      const response = await aiAPI.investmentAnalyzer(investmentForm);
      setResult(response.data);
      toast.success('Investment analysis complete!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to analyze investment');
    } finally {
      setLoading(false);
    }
  };

  const handleListingDescription = async () => {
    if (!listingForm.address) {
      toast.error('Please enter property address');
      return;
    }
    setLoading(true);
    try {
      const response = await aiAPI.generateDescription(listingForm);
      setResult(response.data);
      toast.success('Listing description generated!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate description');
    } finally {
      setLoading(false);
    }
  };

  const handleVirtualStaging = async () => {
    setLoading(true);
    try {
      const response = await aiAPI.virtualStaging(virtualStagingForm);
      setResult(response.data);
      toast.success('Staging recommendations generated!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate staging');
    } finally {
      setLoading(false);
    }
  };

  const handleContractAnalyzer = async () => {
    if (!contractForm.contractText) {
      toast.error('Please paste contract text');
      return;
    }
    setLoading(true);
    try {
      const response = await aiAPI.contractAnalyzer(contractForm);
      setResult(response.data);
      toast.success('Contract analyzed!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to analyze contract');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyerPersona = async () => {
    if (!buyerPersonaForm.location) {
      toast.error('Please enter location');
      return;
    }
    setLoading(true);
    try {
      const response = await aiAPI.buyerPersona(buyerPersonaForm);
      setResult(response.data);
      toast.success('Buyer persona generated!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate persona');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialPost = async () => {
    if (!socialPostForm.propertyAddress) {
      toast.error('Please enter property address');
      return;
    }
    setLoading(true);
    try {
      const response = await aiAPI.socialPost(socialPostForm);
      setResult(response.data);
      toast.success('Social post generated!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate post');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSequence = async () => {
    if (!emailSequenceForm.leadName) {
      toast.error('Please enter lead name');
      return;
    }
    setLoading(true);
    try {
      const response = await aiAPI.followUpSequence(emailSequenceForm);
      setResult(response.data);
      toast.success('Email sequence generated!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate sequence');
    } finally {
      setLoading(false);
    }
  };

  const handleCMA = async () => {
    if (!cmaForm.address) {
      toast.error('Please enter property address');
      return;
    }
    setLoading(true);
    try {
      const response = await aiAPI.marketAnalysis(cmaForm);
      setResult(response.data);
      toast.success('Market analysis complete!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to analyze market');
    } finally {
      setLoading(false);
    }
  };

  const handlePricePredictor = async () => {
    if (!pricePredictorForm.address) {
      toast.error('Please enter property address');
      return;
    }
    setLoading(true);
    try {
      const response = await aiAPI.predictPrice(pricePredictorForm);
      setResult(response.data);
      toast.success('Price prediction complete!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to predict price');
    } finally {
      setLoading(false);
    }
  };

  const handleLeadQualifier = async () => {
    if (!leadQualifierForm.firstName || !leadQualifierForm.lastName) {
      toast.error('Please enter lead name');
      return;
    }
    setLoading(true);
    try {
      const response = await aiAPI.qualifyLead(null, leadQualifierForm);
      setResult(response.data);
      toast.success('Lead qualified successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to qualify lead');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyMatcher = async () => {
    if (!propertyMatcherForm.buyerName) {
      toast.error('Please enter buyer name');
      return;
    }
    setLoading(true);
    try {
      const response = await aiAPI.matchProperties(null, 5, propertyMatcherForm);
      setResult(response.data);
      toast.success('Properties matched successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to match properties');
    } finally {
      setLoading(false);
    }
  };

  const handleOfferAnalyzer = async () => {
    if (!offerAnalyzerForm.propertyAddress) {
      toast.error('Please enter property address');
      return;
    }
    setLoading(true);
    try {
      const response = await aiAPI.offerAnalyzer(offerAnalyzerForm);
      setResult(response.data);
      toast.success('Offers analyzed successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to analyze offers');
    } finally {
      setLoading(false);
    }
  };

  const handleVirtualTourCreator = async () => {
    if (!virtualTourForm.address) {
      toast.error('Please enter property address');
      return;
    }
    setLoading(true);
    try {
      const response = await aiAPI.virtualTourCreator(virtualTourForm);
      setResult(response.data);
      toast.success('Virtual tour plan created!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create tour plan');
    } finally {
      setLoading(false);
    }
  };

  const handleRentalPriceOptimizer = async () => {
    if (!rentalPriceForm.address) {
      toast.error('Please enter property address');
      return;
    }
    setLoading(true);
    try {
      const response = await aiAPI.rentalPriceOptimizer(rentalPriceForm);
      setResult(response.data);
      toast.success('Rental price optimized!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to optimize rental price');
    } finally {
      setLoading(false);
    }
  };

  const handleTenantScreener = async () => {
    if (!tenantScreenerForm.applicantName) {
      toast.error('Please enter applicant name');
      return;
    }
    setLoading(true);
    try {
      const response = await aiAPI.tenantScreener(tenantScreenerForm);
      setResult(response.data);
      toast.success('Tenant screening complete!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to screen tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleMortgageCalculator = async () => {
    setLoading(true);
    try {
      const response = await aiAPI.mortgageCalculator(mortgageForm);
      setResult(response.data);
      toast.success('Mortgage analysis complete!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to calculate mortgage');
    } finally {
      setLoading(false);
    }
  };

  const handleInvestmentPropertyFinder = async () => {
    setLoading(true);
    try {
      const response = await aiAPI.investmentPropertyFinder(investmentFinderForm);
      setResult(response.data);
      toast.success('Investment properties found!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to find properties');
    } finally {
      setLoading(false);
    }
  };

  const handleShowingScheduler = async () => {
    if (!showingSchedulerForm.propertyId) {
      toast.error('Please select a property');
      return;
    }
    setLoading(true);
    try {
      const response = await aiAPI.scheduleShowing(showingSchedulerForm);
      setResult(response.data);
      toast.success('Available slots found!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to find available slots');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenHouseSummary = async () => {
    if (!openHouseSummaryForm.openHouseId) {
      toast.error('Please select an open house');
      return;
    }
    setLoading(true);
    try {
      const response = await aiAPI.openHouseSummary(openHouseSummaryForm);
      setResult(response.data);
      toast.success('Open house summary generated!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyAppraiser = async () => {
    if (!appraiserForm.address || !appraiserForm.city || !appraiserForm.state) {
      toast.error('Please enter address, city, and state');
      return;
    }
    setLoading(true);
    try {
      const response = await aiAPI.propertyAppraiser(appraiserForm);
      setResult(response.data);
      toast.success('Property appraisal complete!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate appraisal');
    } finally {
      setLoading(false);
    }
  };

  const renderToolForm = () => {
    if (!selectedTool) return null;

    switch (selectedTool.id) {
      case 'neighborhood-insights':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={neighborhoodForm.city}
                  onChange={(e) => setNeighborhoodForm({...neighborhoodForm, city: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="San Francisco"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={neighborhoodForm.state}
                  onChange={(e) => setNeighborhoodForm({...neighborhoodForm, state: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="CA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                <input
                  type="text"
                  value={neighborhoodForm.zipCode}
                  onChange={(e) => setNeighborhoodForm({...neighborhoodForm, zipCode: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="94102"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleNeighborhoodInsights}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Generate Insights'}
              </button>
              <button
                onClick={() => loadSampleData('neighborhood-insights')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      case 'investment-analyzer':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
                <input
                  type="number"
                  value={investmentForm.purchasePrice}
                  onChange={(e) => setInvestmentForm({...investmentForm, purchasePrice: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Down Payment %</label>
                <input
                  type="number"
                  value={investmentForm.downPayment}
                  onChange={(e) => setInvestmentForm({...investmentForm, downPayment: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate %</label>
                <input
                  type="number"
                  step="0.1"
                  value={investmentForm.interestRate}
                  onChange={(e) => setInvestmentForm({...investmentForm, interestRate: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan Term (years)</label>
                <input
                  type="number"
                  value={investmentForm.loanTerm}
                  onChange={(e) => setInvestmentForm({...investmentForm, loanTerm: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent</label>
                <input
                  type="number"
                  value={investmentForm.estimatedRent}
                  onChange={(e) => setInvestmentForm({...investmentForm, estimatedRent: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleInvestmentAnalysis}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Analyze Investment'}
              </button>
              <button
                onClick={() => loadSampleData('investment-analyzer')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      case 'listing-description':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
                <input
                  type="text"
                  value={listingForm.address}
                  onChange={(e) => setListingForm({...listingForm, address: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main St, San Francisco, CA 94102"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                <select
                  value={listingForm.propertyType}
                  onChange={(e) => setListingForm({...listingForm, propertyType: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Single Family</option>
                  <option>Condo</option>
                  <option>Townhouse</option>
                  <option>Multi-Family</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <input
                  type="number"
                  value={listingForm.price}
                  onChange={(e) => setListingForm({...listingForm, price: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input
                  type="number"
                  value={listingForm.bedrooms}
                  onChange={(e) => setListingForm({...listingForm, bedrooms: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input
                  type="number"
                  value={listingForm.bathrooms}
                  onChange={(e) => setListingForm({...listingForm, bathrooms: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sq Ft</label>
                <input
                  type="number"
                  value={listingForm.sqft}
                  onChange={(e) => setListingForm({...listingForm, sqft: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year Built</label>
                <input
                  type="number"
                  value={listingForm.yearBuilt}
                  onChange={(e) => setListingForm({...listingForm, yearBuilt: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Features</label>
                <textarea
                  value={listingForm.features}
                  onChange={(e) => setListingForm({...listingForm, features: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Updated kitchen, hardwood floors, large backyard..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleListingDescription}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Description'}
              </button>
              <button
                onClick={() => loadSampleData('listing-description')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      case 'virtual-staging':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                <select
                  value={virtualStagingForm.roomType}
                  onChange={(e) => setVirtualStagingForm({...virtualStagingForm, roomType: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Living Room</option>
                  <option>Bedroom</option>
                  <option>Kitchen</option>
                  <option>Dining Room</option>
                  <option>Home Office</option>
                  <option>Bathroom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current State</label>
                <select
                  value={virtualStagingForm.currentState}
                  onChange={(e) => setVirtualStagingForm({...virtualStagingForm, currentState: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Empty</option>
                  <option>Partially Furnished</option>
                  <option>Cluttered</option>
                  <option>Outdated</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
                <select
                  value={virtualStagingForm.style}
                  onChange={(e) => setVirtualStagingForm({...virtualStagingForm, style: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Modern</option>
                  <option>Traditional</option>
                  <option>Minimalist</option>
                  <option>Farmhouse</option>
                  <option>Coastal</option>
                  <option>Industrial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                <select
                  value={virtualStagingForm.budget}
                  onChange={(e) => setVirtualStagingForm({...virtualStagingForm, budget: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Luxury</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleVirtualStaging}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Get Staging Recommendations'}
              </button>
              <button
                onClick={() => loadSampleData('virtual-staging')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      case 'contract-analyzer':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
              <select
                value={contractForm.contractType}
                onChange={(e) => setContractForm({...contractForm, contractType: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option>Purchase Agreement</option>
                <option>Lease Agreement</option>
                <option>Listing Agreement</option>
                <option>Buyer Representation</option>
                <option>Addendum</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract Text</label>
              <textarea
                value={contractForm.contractText}
                onChange={(e) => setContractForm({...contractForm, contractText: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={8}
                placeholder="Paste the contract text here for AI analysis..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleContractAnalyzer}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Analyze Contract'}
              </button>
              <button
                onClick={() => loadSampleData('contract-analyzer')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      case 'buyer-persona':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                <select
                  value={buyerPersonaForm.propertyType}
                  onChange={(e) => setBuyerPersonaForm({...buyerPersonaForm, propertyType: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Single Family</option>
                  <option>Condo</option>
                  <option>Townhouse</option>
                  <option>Luxury Home</option>
                  <option>Investment Property</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
                <select
                  value={buyerPersonaForm.priceRange}
                  onChange={(e) => setBuyerPersonaForm({...buyerPersonaForm, priceRange: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Under $300,000</option>
                  <option>$300,000 - $500,000</option>
                  <option>$500,000 - $750,000</option>
                  <option>$750,000 - $1,000,000</option>
                  <option>$1,000,000+</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={buyerPersonaForm.location}
                  onChange={(e) => setBuyerPersonaForm({...buyerPersonaForm, location: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="San Francisco, CA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input
                  type="number"
                  value={buyerPersonaForm.bedrooms}
                  onChange={(e) => setBuyerPersonaForm({...buyerPersonaForm, bedrooms: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Features</label>
                <input
                  type="text"
                  value={buyerPersonaForm.features}
                  onChange={(e) => setBuyerPersonaForm({...buyerPersonaForm, features: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Pool, garage, modern kitchen..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBuyerPersona}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Buyer Persona'}
              </button>
              <button
                onClick={() => loadSampleData('buyer-persona')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      case 'social-post':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
                <input
                  type="text"
                  value={socialPostForm.propertyAddress}
                  onChange={(e) => setSocialPostForm({...socialPostForm, propertyAddress: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main St, San Francisco, CA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                <select
                  value={socialPostForm.propertyType}
                  onChange={(e) => setSocialPostForm({...socialPostForm, propertyType: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Single Family</option>
                  <option>Condo</option>
                  <option>Townhouse</option>
                  <option>Luxury Home</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <input
                  type="number"
                  value={socialPostForm.price}
                  onChange={(e) => setSocialPostForm({...socialPostForm, price: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <select
                  value={socialPostForm.platform}
                  onChange={(e) => setSocialPostForm({...socialPostForm, platform: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Instagram</option>
                  <option>Facebook</option>
                  <option>LinkedIn</option>
                  <option>Twitter</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Highlights</label>
                <input
                  type="text"
                  value={socialPostForm.highlights}
                  onChange={(e) => setSocialPostForm({...socialPostForm, highlights: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ocean views, renovated kitchen..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSocialPost}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Social Post'}
              </button>
              <button
                onClick={() => loadSampleData('social-post')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      case 'follow-up-sequence':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Name</label>
                <input
                  type="text"
                  value={emailSequenceForm.leadName}
                  onChange={(e) => setEmailSequenceForm({...emailSequenceForm, leadName: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Type</label>
                <select
                  value={emailSequenceForm.leadType}
                  onChange={(e) => setEmailSequenceForm({...emailSequenceForm, leadType: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Buyer</option>
                  <option>Seller</option>
                  <option>Investor</option>
                  <option>Renter</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
                <select
                  value={emailSequenceForm.timeline}
                  onChange={(e) => setEmailSequenceForm({...emailSequenceForm, timeline: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Immediate</option>
                  <option>1-3 months</option>
                  <option>3-6 months</option>
                  <option>6-12 months</option>
                  <option>Just browsing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interests</label>
                <input
                  type="text"
                  value={emailSequenceForm.interests}
                  onChange={(e) => setEmailSequenceForm({...emailSequenceForm, interests: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="3-bed homes, good schools..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEmailSequence}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Email Sequence'}
              </button>
              <button
                onClick={() => loadSampleData('follow-up-sequence')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      case 'market-analysis':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
                <input
                  type="text"
                  value={cmaForm.address}
                  onChange={(e) => setCmaForm({...cmaForm, address: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main St, San Francisco, CA 94102"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                <select
                  value={cmaForm.propertyType}
                  onChange={(e) => setCmaForm({...cmaForm, propertyType: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Single Family</option>
                  <option>Condo</option>
                  <option>Townhouse</option>
                  <option>Multi-Family</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sq Ft</label>
                <input
                  type="number"
                  value={cmaForm.sqft}
                  onChange={(e) => setCmaForm({...cmaForm, sqft: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input
                  type="number"
                  value={cmaForm.bedrooms}
                  onChange={(e) => setCmaForm({...cmaForm, bedrooms: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input
                  type="number"
                  value={cmaForm.bathrooms}
                  onChange={(e) => setCmaForm({...cmaForm, bathrooms: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCMA}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Generate Market Analysis'}
              </button>
              <button
                onClick={() => loadSampleData('market-analysis')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      case 'price-predictor':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
                <input
                  type="text"
                  value={pricePredictorForm.address}
                  onChange={(e) => setPricePredictorForm({...pricePredictorForm, address: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main St, San Francisco, CA 94102"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                <select
                  value={pricePredictorForm.propertyType}
                  onChange={(e) => setPricePredictorForm({...pricePredictorForm, propertyType: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Single Family</option>
                  <option>Condo</option>
                  <option>Townhouse</option>
                  <option>Multi-Family</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  value={pricePredictorForm.condition}
                  onChange={(e) => setPricePredictorForm({...pricePredictorForm, condition: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Excellent</option>
                  <option>Good</option>
                  <option>Fair</option>
                  <option>Needs Work</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input
                  type="number"
                  value={pricePredictorForm.bedrooms}
                  onChange={(e) => setPricePredictorForm({...pricePredictorForm, bedrooms: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input
                  type="number"
                  value={pricePredictorForm.bathrooms}
                  onChange={(e) => setPricePredictorForm({...pricePredictorForm, bathrooms: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sq Ft</label>
                <input
                  type="number"
                  value={pricePredictorForm.sqft}
                  onChange={(e) => setPricePredictorForm({...pricePredictorForm, sqft: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year Built</label>
                <input
                  type="number"
                  value={pricePredictorForm.yearBuilt}
                  onChange={(e) => setPricePredictorForm({...pricePredictorForm, yearBuilt: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePricePredictor}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Predicting...' : 'Predict Price'}
              </button>
              <button
                onClick={() => loadSampleData('price-predictor')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      case 'lead-qualifier':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={leadQualifierForm.firstName}
                  onChange={(e) => setLeadQualifierForm({...leadQualifierForm, firstName: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={leadQualifierForm.lastName}
                  onChange={(e) => setLeadQualifierForm({...leadQualifierForm, lastName: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={leadQualifierForm.email}
                  onChange={(e) => setLeadQualifierForm({...leadQualifierForm, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={leadQualifierForm.phone}
                  onChange={(e) => setLeadQualifierForm({...leadQualifierForm, phone: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                <input
                  type="number"
                  value={leadQualifierForm.budget}
                  onChange={(e) => setLeadQualifierForm({...leadQualifierForm, budget: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
                <select
                  value={leadQualifierForm.timeline}
                  onChange={(e) => setLeadQualifierForm({...leadQualifierForm, timeline: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Immediate</option>
                  <option>1-3 months</option>
                  <option>3-6 months</option>
                  <option>6-12 months</option>
                  <option>Just browsing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                <select
                  value={leadQualifierForm.propertyType}
                  onChange={(e) => setLeadQualifierForm({...leadQualifierForm, propertyType: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Single Family</option>
                  <option>Condo</option>
                  <option>Townhouse</option>
                  <option>Multi-Family</option>
                  <option>Land</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Areas</label>
                <input
                  type="text"
                  value={leadQualifierForm.preferredAreas}
                  onChange={(e) => setLeadQualifierForm({...leadQualifierForm, preferredAreas: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Downtown, Suburbs, etc."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleLeadQualifier}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Qualify Lead'}
              </button>
              <button
                onClick={() => loadSampleData('lead-qualifier')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      case 'property-matcher':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Name</label>
                <input
                  type="text"
                  value={propertyMatcherForm.buyerName}
                  onChange={(e) => setPropertyMatcherForm({...propertyMatcherForm, buyerName: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                <input
                  type="number"
                  value={propertyMatcherForm.budget}
                  onChange={(e) => setPropertyMatcherForm({...propertyMatcherForm, budget: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                <select
                  value={propertyMatcherForm.propertyType}
                  onChange={(e) => setPropertyMatcherForm({...propertyMatcherForm, propertyType: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option>Single Family</option>
                  <option>Condo</option>
                  <option>Townhouse</option>
                  <option>Multi-Family</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input
                  type="number"
                  value={propertyMatcherForm.bedrooms}
                  onChange={(e) => setPropertyMatcherForm({...propertyMatcherForm, bedrooms: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input
                  type="number"
                  value={propertyMatcherForm.bathrooms}
                  onChange={(e) => setPropertyMatcherForm({...propertyMatcherForm, bathrooms: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Areas</label>
                <input
                  type="text"
                  value={propertyMatcherForm.preferredAreas}
                  onChange={(e) => setPropertyMatcherForm({...propertyMatcherForm, preferredAreas: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Downtown, Beach, etc."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Must-Have Features</label>
                <input
                  type="text"
                  value={propertyMatcherForm.mustHaves}
                  onChange={(e) => setPropertyMatcherForm({...propertyMatcherForm, mustHaves: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Pool, garage, updated kitchen..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePropertyMatcher}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Matching...' : 'Find Matching Properties'}
              </button>
              <button
                onClick={() => loadSampleData('property-matcher')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      case 'offer-analyzer':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
                <input
                  type="text"
                  value={offerAnalyzerForm.propertyAddress}
                  onChange={(e) => setOfferAnalyzerForm({...offerAnalyzerForm, propertyAddress: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="123 Main St, San Francisco, CA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">List Price</label>
                <input
                  type="number"
                  value={offerAnalyzerForm.listPrice}
                  onChange={(e) => setOfferAnalyzerForm({...offerAnalyzerForm, listPrice: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">Offer Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Name</label>
                  <input
                    type="text"
                    value={offerAnalyzerForm.offers[0].buyerName}
                    onChange={(e) => setOfferAnalyzerForm({
                      ...offerAnalyzerForm,
                      offers: [{...offerAnalyzerForm.offers[0], buyerName: e.target.value}]
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Offer Price</label>
                  <input
                    type="number"
                    value={offerAnalyzerForm.offers[0].price}
                    onChange={(e) => setOfferAnalyzerForm({
                      ...offerAnalyzerForm,
                      offers: [{...offerAnalyzerForm.offers[0], price: Number(e.target.value)}]
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Down Payment %</label>
                  <input
                    type="number"
                    value={offerAnalyzerForm.offers[0].downPayment}
                    onChange={(e) => setOfferAnalyzerForm({
                      ...offerAnalyzerForm,
                      offers: [{...offerAnalyzerForm.offers[0], downPayment: Number(e.target.value)}]
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Financing Type</label>
                  <select
                    value={offerAnalyzerForm.offers[0].financingType}
                    onChange={(e) => setOfferAnalyzerForm({
                      ...offerAnalyzerForm,
                      offers: [{...offerAnalyzerForm.offers[0], financingType: e.target.value}]
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option>Conventional</option>
                    <option>FHA</option>
                    <option>VA</option>
                    <option>Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contingencies</label>
                  <input
                    type="text"
                    value={offerAnalyzerForm.offers[0].contingencies}
                    onChange={(e) => setOfferAnalyzerForm({
                      ...offerAnalyzerForm,
                      offers: [{...offerAnalyzerForm.offers[0], contingencies: e.target.value}]
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Inspection, financing"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={offerAnalyzerForm.offers[0].isPreApproved}
                      onChange={(e) => setOfferAnalyzerForm({
                        ...offerAnalyzerForm,
                        offers: [{...offerAnalyzerForm.offers[0], isPreApproved: e.target.checked}]
                      })}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">Pre-Approved</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleOfferAnalyzer}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Analyze Offer'}
              </button>
              <button
                onClick={() => loadSampleData('offer-analyzer')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      case 'virtual-tour-creator':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
                <input
                  type="text"
                  value={virtualTourForm.address}
                  onChange={(e) => setVirtualTourForm({...virtualTourForm, address: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500"
                  placeholder="123 Main St, San Francisco, CA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                <select
                  value={virtualTourForm.propertyType}
                  onChange={(e) => setVirtualTourForm({...virtualTourForm, propertyType: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500"
                >
                  <option>Single Family</option>
                  <option>Condo</option>
                  <option>Townhouse</option>
                  <option>Luxury Home</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input
                  type="number"
                  value={virtualTourForm.bedrooms}
                  onChange={(e) => setVirtualTourForm({...virtualTourForm, bedrooms: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input
                  type="number"
                  value={virtualTourForm.bathrooms}
                  onChange={(e) => setVirtualTourForm({...virtualTourForm, bathrooms: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
                <input
                  type="number"
                  value={virtualTourForm.squareFeet}
                  onChange={(e) => setVirtualTourForm({...virtualTourForm, squareFeet: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Highlights</label>
                <textarea
                  value={virtualTourForm.highlights}
                  onChange={(e) => setVirtualTourForm({...virtualTourForm, highlights: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500"
                  rows={2}
                  placeholder="Gourmet kitchen, pool, mountain views..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleVirtualTourCreator}
                disabled={loading}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Tour Plan'}
              </button>
              <button
                onClick={() => loadSampleData('virtual-tour-creator')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      case 'rental-price-optimizer':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
                <input
                  type="text"
                  value={rentalPriceForm.address}
                  onChange={(e) => setRentalPriceForm({...rentalPriceForm, address: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-lime-500"
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={rentalPriceForm.city}
                  onChange={(e) => setRentalPriceForm({...rentalPriceForm, city: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-lime-500"
                  placeholder="Austin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                <select
                  value={rentalPriceForm.propertyType}
                  onChange={(e) => setRentalPriceForm({...rentalPriceForm, propertyType: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-lime-500"
                >
                  <option>Apartment</option>
                  <option>House</option>
                  <option>Condo</option>
                  <option>Townhouse</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input
                  type="number"
                  value={rentalPriceForm.bedrooms}
                  onChange={(e) => setRentalPriceForm({...rentalPriceForm, bedrooms: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-lime-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input
                  type="number"
                  value={rentalPriceForm.bathrooms}
                  onChange={(e) => setRentalPriceForm({...rentalPriceForm, bathrooms: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-lime-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
                <input
                  type="number"
                  value={rentalPriceForm.squareFeet}
                  onChange={(e) => setRentalPriceForm({...rentalPriceForm, squareFeet: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-lime-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  value={rentalPriceForm.condition}
                  onChange={(e) => setRentalPriceForm({...rentalPriceForm, condition: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-lime-500"
                >
                  <option>Excellent</option>
                  <option>Good</option>
                  <option>Fair</option>
                  <option>Needs Work</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Rent (if any)</label>
                <input
                  type="number"
                  value={rentalPriceForm.currentRent}
                  onChange={(e) => setRentalPriceForm({...rentalPriceForm, currentRent: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-lime-500"
                  placeholder="0"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Amenities</label>
                <input
                  type="text"
                  value={rentalPriceForm.amenities}
                  onChange={(e) => setRentalPriceForm({...rentalPriceForm, amenities: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-lime-500"
                  placeholder="Pool, gym, parking, in-unit laundry..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRentalPriceOptimizer}
                disabled={loading}
                className="px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700 disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Optimize Rental Price'}
              </button>
              <button
                onClick={() => loadSampleData('rental-price-optimizer')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      case 'tenant-screener':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Applicant Name</label>
                <input
                  type="text"
                  value={tenantScreenerForm.applicantName}
                  onChange={(e) => setTenantScreenerForm({...tenantScreenerForm, applicantName: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={tenantScreenerForm.email}
                  onChange={(e) => setTenantScreenerForm({...tenantScreenerForm, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500"
                  placeholder="john@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={tenantScreenerForm.phone}
                  onChange={(e) => setTenantScreenerForm({...tenantScreenerForm, phone: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Employer</label>
                <input
                  type="text"
                  value={tenantScreenerForm.currentEmployer}
                  onChange={(e) => setTenantScreenerForm({...tenantScreenerForm, currentEmployer: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500"
                  placeholder="ABC Company"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <input
                  type="text"
                  value={tenantScreenerForm.jobTitle}
                  onChange={(e) => setTenantScreenerForm({...tenantScreenerForm, jobTitle: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500"
                  placeholder="Software Engineer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Annual Income</label>
                <input
                  type="number"
                  value={tenantScreenerForm.annualIncome}
                  onChange={(e) => setTenantScreenerForm({...tenantScreenerForm, annualIncome: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credit Score</label>
                <input
                  type="number"
                  value={tenantScreenerForm.creditScore}
                  onChange={(e) => setTenantScreenerForm({...tenantScreenerForm, creditScore: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500"
                  min="300" max="850"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent</label>
                <input
                  type="number"
                  value={tenantScreenerForm.monthlyRent}
                  onChange={(e) => setTenantScreenerForm({...tenantScreenerForm, monthlyRent: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1"># Occupants</label>
                <input
                  type="number"
                  value={tenantScreenerForm.numberOfOccupants}
                  onChange={(e) => setTenantScreenerForm({...tenantScreenerForm, numberOfOccupants: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500"
                  min="1"
                />
              </div>
              <div className="flex items-center gap-4 md:col-span-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tenantScreenerForm.hasBankruptcy}
                    onChange={(e) => setTenantScreenerForm({...tenantScreenerForm, hasBankruptcy: e.target.checked})}
                    className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-700">Bankruptcy History</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tenantScreenerForm.hasEviction}
                    onChange={(e) => setTenantScreenerForm({...tenantScreenerForm, hasEviction: e.target.checked})}
                    className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-700">Eviction History</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tenantScreenerForm.hasPets}
                    onChange={(e) => setTenantScreenerForm({...tenantScreenerForm, hasPets: e.target.checked})}
                    className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-700">Has Pets</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleTenantScreener}
                disabled={loading}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
              >
                {loading ? 'Screening...' : 'Screen Tenant'}
              </button>
              <button
                onClick={() => loadSampleData('tenant-screener')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      case 'mortgage-calculator':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Home Price</label>
                <input
                  type="number"
                  value={mortgageForm.homePrice}
                  onChange={(e) => setMortgageForm({...mortgageForm, homePrice: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Down Payment $</label>
                <input
                  type="number"
                  value={mortgageForm.downPayment}
                  onChange={(e) => setMortgageForm({...mortgageForm, downPayment: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate %</label>
                <input
                  type="number"
                  step="0.125"
                  value={mortgageForm.interestRate}
                  onChange={(e) => setMortgageForm({...mortgageForm, interestRate: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan Term (years)</label>
                <select
                  value={mortgageForm.loanTerm}
                  onChange={(e) => setMortgageForm({...mortgageForm, loanTerm: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fuchsia-500"
                >
                  <option value={30}>30 years</option>
                  <option value={20}>20 years</option>
                  <option value={15}>15 years</option>
                  <option value={10}>10 years</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan Type</label>
                <select
                  value={mortgageForm.loanType}
                  onChange={(e) => setMortgageForm({...mortgageForm, loanType: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fuchsia-500"
                >
                  <option>Conventional</option>
                  <option>FHA</option>
                  <option>VA</option>
                  <option>USDA</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Annual Property Tax</label>
                <input
                  type="number"
                  value={mortgageForm.propertyTax}
                  onChange={(e) => setMortgageForm({...mortgageForm, propertyTax: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Annual Insurance</label>
                <input
                  type="number"
                  value={mortgageForm.homeInsurance}
                  onChange={(e) => setMortgageForm({...mortgageForm, homeInsurance: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly HOA</label>
                <input
                  type="number"
                  value={mortgageForm.hoaFees}
                  onChange={(e) => setMortgageForm({...mortgageForm, hoaFees: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Annual Income</label>
                <input
                  type="number"
                  value={mortgageForm.annualIncome}
                  onChange={(e) => setMortgageForm({...mortgageForm, annualIncome: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Debts</label>
                <input
                  type="number"
                  value={mortgageForm.monthlyDebts}
                  onChange={(e) => setMortgageForm({...mortgageForm, monthlyDebts: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credit Score</label>
                <input
                  type="number"
                  value={mortgageForm.creditScore}
                  onChange={(e) => setMortgageForm({...mortgageForm, creditScore: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fuchsia-500"
                  min="300" max="850"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleMortgageCalculator}
                disabled={loading}
                className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 disabled:opacity-50"
              >
                {loading ? 'Calculating...' : 'Calculate Mortgage'}
              </button>
              <button
                onClick={() => loadSampleData('mortgage-calculator')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      case 'investment-property-finder':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Investment Budget</label>
                <input
                  type="number"
                  value={investmentFinderForm.investmentBudget}
                  onChange={(e) => setInvestmentFinderForm({...investmentFinderForm, investmentBudget: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Cash Flow/mo</label>
                <input
                  type="number"
                  value={investmentFinderForm.targetCashFlow}
                  onChange={(e) => setInvestmentFinderForm({...investmentFinderForm, targetCashFlow: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Cap Rate %</label>
                <input
                  type="number"
                  step="0.5"
                  value={investmentFinderForm.targetCapRate}
                  onChange={(e) => setInvestmentFinderForm({...investmentFinderForm, targetCapRate: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target CoC Return %</label>
                <input
                  type="number"
                  step="0.5"
                  value={investmentFinderForm.targetCashOnCash}
                  onChange={(e) => setInvestmentFinderForm({...investmentFinderForm, targetCashOnCash: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Down Payment %</label>
                <input
                  type="number"
                  value={investmentFinderForm.downPaymentPercent}
                  onChange={(e) => setInvestmentFinderForm({...investmentFinderForm, downPaymentPercent: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Strategy</label>
                <select
                  value={investmentFinderForm.investmentStrategy}
                  onChange={(e) => setInvestmentFinderForm({...investmentFinderForm, investmentStrategy: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500"
                >
                  <option>Buy and Hold</option>
                  <option>Fix and Flip</option>
                  <option>BRRRR</option>
                  <option>House Hacking</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Risk Tolerance</label>
                <select
                  value={investmentFinderForm.riskTolerance}
                  onChange={(e) => setInvestmentFinderForm({...investmentFinderForm, riskTolerance: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500"
                >
                  <option>Conservative</option>
                  <option>Moderate</option>
                  <option>Aggressive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Locations</label>
                <input
                  type="text"
                  value={investmentFinderForm.preferredLocations}
                  onChange={(e) => setInvestmentFinderForm({...investmentFinderForm, preferredLocations: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500"
                  placeholder="Austin, Cedar Park..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleInvestmentPropertyFinder}
                disabled={loading}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Find Investment Properties'}
              </button>
              <button
                onClick={() => loadSampleData('investment-property-finder')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      case 'showing-scheduler':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Property</label>
                <select
                  value={showingSchedulerForm.propertyId}
                  onChange={(e) => setShowingSchedulerForm({...showingSchedulerForm, propertyId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-500"
                >
                  <option value="">-- Select a property --</option>
                  {(Array.isArray(properties) ? properties : []).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.address}, {p.city} — ${p.price?.toLocaleString()}
                    </option>
                  ))}
                </select>
                {properties.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No properties found. Add properties first.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Times</label>
                <div className="flex flex-wrap gap-2">
                  {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(time => (
                    <label key={time} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={showingSchedulerForm.preferredTimes.includes(time)}
                        onChange={(e) => {
                          const times = e.target.checked
                            ? [...showingSchedulerForm.preferredTimes, time]
                            : showingSchedulerForm.preferredTimes.filter(t => t !== time);
                          setShowingSchedulerForm({...showingSchedulerForm, preferredTimes: times});
                        }}
                        className="rounded border-gray-300 text-zinc-600 focus:ring-zinc-500"
                      />
                      <span className="text-sm text-gray-700">{time}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleShowingScheduler}
                disabled={loading}
                className="px-4 py-2 bg-zinc-600 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50"
              >
                {loading ? 'Finding Slots...' : 'Find Available Slots'}
              </button>
            </div>
          </div>
        );

      case 'open-house-summary':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Open House</label>
                <select
                  value={openHouseSummaryForm.openHouseId}
                  onChange={(e) => setOpenHouseSummaryForm({...openHouseSummaryForm, openHouseId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-neutral-500"
                >
                  <option value="">-- Select an open house --</option>
                  {(Array.isArray(openHouses) ? openHouses : []).map(oh => (
                    <option key={oh.id} value={oh.id}>
                      {oh.property?.address || 'Unknown'}, {oh.property?.city || ''} — {oh.date ? new Date(oh.date).toLocaleDateString() : 'No date'} ({oh.startTime} - {oh.endTime})
                    </option>
                  ))}
                </select>
                {openHouses.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No open houses found. Create an open house event first.</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleOpenHouseSummary}
                disabled={loading}
                className="px-4 py-2 bg-neutral-600 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Summary'}
              </button>
            </div>
          </div>
        );

      case 'property-appraiser':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
                <input
                  type="text"
                  value={appraiserForm.address}
                  onChange={(e) => setAppraiserForm({...appraiserForm, address: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-stone-500"
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={appraiserForm.city}
                  onChange={(e) => setAppraiserForm({...appraiserForm, city: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-stone-500"
                  placeholder="Austin"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={appraiserForm.state}
                    onChange={(e) => setAppraiserForm({...appraiserForm, state: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-stone-500"
                    placeholder="TX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                  <input
                    type="text"
                    value={appraiserForm.zipCode}
                    onChange={(e) => setAppraiserForm({...appraiserForm, zipCode: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-stone-500"
                    placeholder="78701"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                <select
                  value={appraiserForm.propertyType}
                  onChange={(e) => setAppraiserForm({...appraiserForm, propertyType: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-stone-500"
                >
                  <option>Single Family</option>
                  <option>Condo</option>
                  <option>Townhouse</option>
                  <option>Multi-Family</option>
                  <option>Luxury Home</option>
                  <option>Land</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input
                  type="number"
                  value={appraiserForm.bedrooms}
                  onChange={(e) => setAppraiserForm({...appraiserForm, bedrooms: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-stone-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input
                  type="number"
                  step="0.5"
                  value={appraiserForm.bathrooms}
                  onChange={(e) => setAppraiserForm({...appraiserForm, bathrooms: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-stone-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
                <input
                  type="number"
                  value={appraiserForm.squareFeet}
                  onChange={(e) => setAppraiserForm({...appraiserForm, squareFeet: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-stone-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lot Size (sq ft)</label>
                <input
                  type="number"
                  value={appraiserForm.lotSize}
                  onChange={(e) => setAppraiserForm({...appraiserForm, lotSize: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-stone-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year Built</label>
                <input
                  type="number"
                  value={appraiserForm.yearBuilt}
                  onChange={(e) => setAppraiserForm({...appraiserForm, yearBuilt: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-stone-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stories</label>
                <select
                  value={appraiserForm.stories}
                  onChange={(e) => setAppraiserForm({...appraiserForm, stories: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-stone-500"
                >
                  <option value={1}>1 Story</option>
                  <option value={1.5}>1.5 Stories</option>
                  <option value={2}>2 Stories</option>
                  <option value={3}>3 Stories</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  value={appraiserForm.condition}
                  onChange={(e) => setAppraiserForm({...appraiserForm, condition: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-stone-500"
                >
                  <option>Excellent</option>
                  <option>Good</option>
                  <option>Average</option>
                  <option>Fair</option>
                  <option>Poor</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Garage</label>
                <select
                  value={appraiserForm.garage}
                  onChange={(e) => setAppraiserForm({...appraiserForm, garage: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-stone-500"
                >
                  <option>None</option>
                  <option>1-Car Attached</option>
                  <option>2-Car Attached</option>
                  <option>3-Car Attached</option>
                  <option>1-Car Detached</option>
                  <option>2-Car Detached</option>
                  <option>Carport</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Basement</label>
                <select
                  value={appraiserForm.basement}
                  onChange={(e) => setAppraiserForm({...appraiserForm, basement: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-stone-500"
                >
                  <option>None</option>
                  <option>Finished</option>
                  <option>Unfinished</option>
                  <option>Partial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Appraisal Purpose</label>
                <select
                  value={appraiserForm.appraisalPurpose}
                  onChange={(e) => setAppraiserForm({...appraiserForm, appraisalPurpose: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-stone-500"
                >
                  <option>Sale</option>
                  <option>Refinance</option>
                  <option>Estate/Probate</option>
                  <option>Divorce Settlement</option>
                  <option>Tax Appeal</option>
                  <option>Insurance</option>
                  <option>Pre-Listing</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={appraiserForm.pool}
                    onChange={(e) => setAppraiserForm({...appraiserForm, pool: e.target.checked})}
                    className="rounded border-gray-300 text-stone-600 focus:ring-stone-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Has Pool</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recent Upgrades & Renovations</label>
              <textarea
                value={appraiserForm.recentUpgrades}
                onChange={(e) => setAppraiserForm({...appraiserForm, recentUpgrades: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-stone-500"
                rows={2}
                placeholder="Kitchen remodel 2024, new roof, hardwood floors..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePropertyAppraiser}
                disabled={loading}
                className="px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 disabled:opacity-50"
              >
                {loading ? 'Appraising...' : 'Generate Appraisal'}
              </button>
              <button
                onClick={() => loadSampleData('property-appraiser')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <p>Select a tool above to get started.</p>
          </div>
        );
    }
  };

  const renderResult = () => {
    if (!result) return null;

    if (selectedTool?.id === 'neighborhood-insights' && result.insights) {
      const insights = result.insights;
      return (
        <div className="mt-6 space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Overall Score</h3>
              <span className="text-3xl font-bold text-blue-600">{insights.overallScore}/100</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ScoreCard title="Safety" score={insights.safety?.score} />
            <ScoreCard title="Schools" score={insights.schools?.score} />
            <ScoreCard title="Walkability" score={insights.walkability?.score} />
            <ScoreCard title="Transportation" score={insights.transportation?.score} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Pros</h4>
              <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                {insights.prosAndCons?.pros?.map((pro, i) => (
                  <li key={i}>{pro}</li>
                ))}
              </ul>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Cons</h4>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {insights.prosAndCons?.cons?.map((con, i) => (
                  <li key={i}>{con}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Ideal For</h4>
            <div className="flex flex-wrap gap-2">
              {insights.idealFor?.map((item, i) => (
                <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{item}</span>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (selectedTool?.id === 'investment-analyzer' && result.metrics) {
      return (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Cash-on-Cash Return"
              value={`${result.metrics.cashOnCashReturn?.toFixed(2)}%`}
              color={result.metrics.cashOnCashReturn > 8 ? 'green' : 'yellow'}
            />
            <MetricCard
              title="Cap Rate"
              value={`${result.metrics.capRate?.toFixed(2)}%`}
              color={result.metrics.capRate > 6 ? 'green' : 'yellow'}
            />
            <MetricCard
              title="Monthly Cash Flow"
              value={`$${result.monthlyBreakdown?.cashFlow?.toFixed(0)}`}
              color={result.monthlyBreakdown?.cashFlow > 0 ? 'green' : 'red'}
            />
            <MetricCard
              title="Annual Cash Flow"
              value={`$${result.metrics.annualCashFlow?.toFixed(0)}`}
              color={result.metrics.annualCashFlow > 0 ? 'green' : 'red'}
            />
          </div>

          {result.analysis && (
            <div className={`p-4 rounded-lg ${
              result.analysis.overallRating === 'excellent' ? 'bg-green-50' :
              result.analysis.overallRating === 'good' ? 'bg-blue-50' :
              result.analysis.overallRating === 'fair' ? 'bg-yellow-50' : 'bg-red-50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">AI Assessment</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  result.analysis.overallRating === 'excellent' ? 'bg-green-200 text-green-800' :
                  result.analysis.overallRating === 'good' ? 'bg-blue-200 text-blue-800' :
                  result.analysis.overallRating === 'fair' ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'
                }`}>
                  {result.analysis.overallRating?.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-700">{result.analysis.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Strengths</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {result.analysis?.strengths?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Risks</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {result.analysis?.risks?.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </div>
        </div>
      );
    }

    // Lead Qualifier Results
    if (selectedTool?.id === 'lead-qualifier' && result) {
      const scoreColor = result.score >= 70 ? 'green' : result.score >= 50 ? 'yellow' : result.score >= 30 ? 'orange' : 'red';
      return (
        <div className="mt-6 space-y-4">
          <div className={`bg-gradient-to-r ${
            scoreColor === 'green' ? 'from-green-50 to-emerald-50' :
            scoreColor === 'yellow' ? 'from-yellow-50 to-amber-50' :
            scoreColor === 'orange' ? 'from-orange-50 to-amber-50' : 'from-red-50 to-rose-50'
          } p-6 rounded-xl`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{result.leadName}</h3>
                <p className={`text-sm font-medium ${
                  scoreColor === 'green' ? 'text-green-600' :
                  scoreColor === 'yellow' ? 'text-yellow-600' :
                  scoreColor === 'orange' ? 'text-orange-600' : 'text-red-600'
                }`}>{result.recommendation}</p>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-bold ${
                  scoreColor === 'green' ? 'text-green-600' :
                  scoreColor === 'yellow' ? 'text-yellow-600' :
                  scoreColor === 'orange' ? 'text-orange-600' : 'text-red-600'
                }`}>{result.score}</div>
                <div className="text-sm text-gray-500">Lead Score</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <div className="text-sm text-gray-500">Budget</div>
              <div className="font-semibold">{result.breakdown?.budget || 'Unknown'}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-sm text-gray-500">Timeline</div>
              <div className="font-semibold">{result.breakdown?.timeline || 'Unknown'}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-sm text-gray-500">Property Type</div>
              <div className="font-semibold">{result.breakdown?.propertyType || 'Any'}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-sm text-gray-500">Activities</div>
              <div className="font-semibold">{result.breakdown?.activityCount || 0} interactions</div>
            </div>
          </div>

          {result.reasoning && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">AI Analysis</h4>
              <p className="text-blue-700 text-sm">{result.reasoning}</p>
            </div>
          )}

          {result.nextSteps && result.nextSteps.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-3">Recommended Next Steps</h4>
              <div className="space-y-2">
                {result.nextSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">{i + 1}</span>
                    <span className="text-gray-700">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Property Matcher Results
    if (selectedTool?.id === 'property-matcher' && result) {
      return (
        <div className="mt-6 space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Matches for {result.buyerName}</h3>
                <p className="text-sm text-gray-600">
                  Budget: ${result.criteria?.budget?.toLocaleString()} |
                  Type: {result.criteria?.propertyType} |
                  {result.criteria?.bedrooms} bed / {result.criteria?.bathrooms} bath
                </p>
              </div>
              <div className="text-2xl font-bold text-green-600">{result.matches?.length || 0} Matches</div>
            </div>
          </div>

          {result.reasoning && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-700 text-sm">{result.reasoning}</p>
            </div>
          )}

          <div className="space-y-3">
            {result.matches?.map((property, i) => (
              <div key={property.id || i} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-gray-800">{property.address}</span>
                      {property.matchScore && (
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          property.matchScore >= 80 ? 'bg-green-100 text-green-700' :
                          property.matchScore >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {property.matchScore}% Match
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm">{property.city}, {property.state}</p>
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      <span>{property.bedrooms} bed</span>
                      <span>{property.bathrooms} bath</span>
                      <span>{property.squareFeet?.toLocaleString()} sqft</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-600">${property.price?.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{property.type?.replace('_', ' ')}</div>
                  </div>
                </div>
              </div>
            ))}
            {(!result.matches || result.matches.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No matching properties found. Try adjusting the criteria.
              </div>
            )}
          </div>
        </div>
      );
    }

    // Offer Analyzer Results
    if (selectedTool?.id === 'offer-analyzer' && result) {
      return (
        <div className="mt-6 space-y-4">
          {result.recommendation && (
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Recommendation</h3>
              <p className="text-gray-700">{result.recommendation.reasoning}</p>
              {result.recommendation.negotiationStrategy && (
                <div className="mt-3 p-3 bg-white/50 rounded-lg">
                  <h4 className="font-medium text-sm text-gray-600">Negotiation Strategy</h4>
                  <p className="text-gray-700 text-sm">{result.recommendation.negotiationStrategy}</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            {result.offers?.map((offer, i) => (
              <div key={i} className={`border rounded-lg p-4 ${
                result.recommendation?.bestOffer === i + 1 ? 'border-green-500 bg-green-50' : 'bg-white'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Offer {offer.offerNumber || i + 1}</span>
                      {result.recommendation?.bestOffer === i + 1 && (
                        <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">Best Offer</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Risk: {offer.riskLevel}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-800">{offer.score}/100</div>
                    <div className="text-sm text-gray-500">{offer.likelihoodToClose}% likely to close</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <h5 className="text-sm font-medium text-green-700 mb-1">Strengths</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {offer.strengths?.map((s, j) => <li key={j}>• {s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-red-700 mb-1">Weaknesses</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {offer.weaknesses?.map((w, j) => <li key={j}>• {w}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Listing Description Results
    if (selectedTool?.id === 'listing-description' && result.description) {
      return (
        <div className="mt-6 space-y-4">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Generated Listing Description</h3>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{result.description}</p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(result.description)}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
            >
              Copy to Clipboard
            </button>
          </div>
        </div>
      );
    }

    // Virtual Staging Results
    if (selectedTool?.id === 'virtual-staging' && result.stagingPlan) {
      const plan = result.stagingPlan;
      return (
        <div className="mt-6 space-y-4">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-800">
              {result.style} {result.roomType?.replace('_', ' ')} Staging Plan
            </h3>
            <p className="text-sm text-gray-600">Budget: {result.budget} | State: {result.currentState}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">Recommended Furniture</h4>
              <ul className="space-y-1">
                {plan.furniture?.map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">Decor Items</h4>
              <ul className="space-y-1">
                {plan.decor?.map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-2">Color Palette</h4>
            <div className="flex gap-2 flex-wrap">
              {plan.colorPalette?.map((color, i) => (
                <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-sm">{color}</span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Arrangement</h4>
              <p className="text-sm text-blue-700">{plan.arrangement}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Lighting Tips</h4>
              <p className="text-sm text-yellow-700">{plan.lightingTips}</p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">Expected Impact</h4>
            <p className="text-sm text-green-700">{plan.estimatedImpact}</p>
            {plan.estimatedCost && (
              <p className="text-sm text-green-600 mt-2">Estimated Cost: {plan.estimatedCost}</p>
            )}
          </div>
        </div>
      );
    }

    // Social Post Results
    if (selectedTool?.id === 'social-post' && result.content) {
      return (
        <div className="mt-6 space-y-4">
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                {result.platform}
              </span>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-gray-700 whitespace-pre-wrap">{result.content}</p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(result.content)}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
            >
              Copy to Clipboard
            </button>
          </div>
        </div>
      );
    }

    // Email Sequence Results
    if (selectedTool?.id === 'follow-up-sequence' && result.emails) {
      return (
        <div className="mt-6 space-y-4">
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-800">Email Sequence Generated</h3>
            <p className="text-sm text-gray-600">{result.emails?.length || 0} emails in sequence</p>
          </div>

          <div className="space-y-4">
            {result.emails?.map((email, i) => (
              <div key={i} className="bg-white border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                  <span className="font-medium">Day {email.day}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Copy
                  </button>
                </div>
                <div className="p-4">
                  <h4 className="font-medium text-gray-800 mb-2">{email.subject}</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{email.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Market Analysis (CMA) Results
    if (selectedTool?.id === 'market-analysis' && result) {
      // Handle both direct result and nested result structure
      const analysisData = result.analysis || result;
      const estimatedValue = result.estimatedValue || analysisData?.estimatedValue;
      const comparables = result.comparables || analysisData?.comparables || [];
      const analysisText = typeof analysisData === 'string' ? analysisData :
                          typeof analysisData?.analysis === 'string' ? analysisData.analysis :
                          analysisData?.summary || '';

      return (
        <div className="mt-6 space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-800">Market Analysis Results</h3>
            {result.address && <p className="text-sm text-gray-600">{result.address}</p>}
          </div>

          {estimatedValue && (
            <div className="bg-white border rounded-lg p-6 text-center">
              <div className="text-sm text-gray-500">Estimated Value</div>
              <div className="text-3xl font-bold text-blue-600">${Number(estimatedValue)?.toLocaleString()}</div>
              {(result.valueRange || analysisData?.confidenceLevel) && (
                <div className="text-sm text-gray-500 mt-1">
                  {result.valueRange ?
                    `Range: $${result.valueRange.low?.toLocaleString()} - $${result.valueRange.high?.toLocaleString()}` :
                    `Confidence: ${analysisData.confidenceLevel}`
                  }
                </div>
              )}
            </div>
          )}

          {analysisText && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">AI Analysis</h4>
              <p className="text-blue-700 text-sm whitespace-pre-wrap">{analysisText}</p>
            </div>
          )}

          {comparables && comparables.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Comparable Properties</h4>
              {comparables.map((comp, i) => (
                <div key={i} className="bg-white border rounded-lg p-4">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">{comp.address}</div>
                      <div className="text-sm text-gray-500">
                        {comp.bedrooms} bed | {comp.bathrooms} bath | {comp.squareFeet?.toLocaleString()} sqft
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">${comp.price?.toLocaleString()}</div>
                      {comp.pricePerSqFt && (
                        <div className="text-xs text-gray-500">${comp.pricePerSqFt}/sqft</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.adjustments && result.adjustments.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Adjustments Applied</h4>
              <div className="space-y-1">
                {result.adjustments.map((adj, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{adj.factor || adj.name}</span>
                    <span className={adj.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                      {adj.amount > 0 ? '+' : ''}${adj.amount?.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Price Predictor Results
    if (selectedTool?.id === 'price-predictor' && result) {
      const predictedPrice = result.estimatedPrice || result.predictedPrice || 0;
      const lowPrice = result.estimatedPriceLow || result.priceRange?.low || Math.round(predictedPrice * 0.95);
      const highPrice = result.estimatedPriceHigh || result.priceRange?.high || Math.round(predictedPrice * 1.05);
      const confidence = result.confidence || 50;

      return (
        <div className="mt-6 space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl text-center">
            <div className="text-sm text-gray-500 mb-1">Predicted Price</div>
            <div className="text-4xl font-bold text-green-600">
              ${predictedPrice > 0 ? predictedPrice.toLocaleString() : 'Unable to estimate'}
            </div>
            {confidence > 0 && (
              <div className="text-sm text-gray-500 mt-2">Confidence: {confidence}%</div>
            )}
            {predictedPrice > 0 && (
              <div className="text-sm text-gray-500">
                Range: ${lowPrice.toLocaleString()} - ${highPrice.toLocaleString()}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {result.comparablesUsed !== undefined && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-600">Comparables Used</div>
                <div className="font-semibold text-blue-800">{result.comparablesUsed} properties</div>
              </div>
            )}
            {result.condition && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-sm text-purple-600">Condition Impact</div>
                <div className="font-semibold text-purple-800">
                  {result.condition} ({result.conditionImpact})
                </div>
              </div>
            )}
          </div>

          {result.reasoning && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Analysis</h4>
              <p className="text-gray-700 text-sm">{result.reasoning}</p>
            </div>
          )}

          {result.factors && result.factors.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium mb-3">Price Factors</h4>
              <div className="space-y-2">
                {result.factors.map((factor, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{factor.name}</span>
                    <span className={`text-sm font-medium ${factor.impact > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {factor.impact > 0 ? '+' : ''}{factor.impact}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {predictedPrice === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-700 text-sm">
                Unable to predict price. This may be due to insufficient comparable sales data in the area.
                Try adjusting the property details or location.
              </p>
            </div>
          )}
        </div>
      );
    }

    // Contract Analyzer Results
    if (selectedTool?.id === 'contract-analyzer' && result) {
      return (
        <div className="mt-6 space-y-4">
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-800">Contract Analysis</h3>
          </div>

          {result.summary && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium mb-2">Summary</h4>
              <p className="text-gray-700 text-sm">{result.summary}</p>
            </div>
          )}

          {result.keyTerms && result.keyTerms.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Key Terms</h4>
              <ul className="space-y-1">
                {result.keyTerms.map((term, i) => (
                  <li key={i} className="text-sm text-blue-700">• {term}</li>
                ))}
              </ul>
            </div>
          )}

          {result.risks && result.risks.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">Potential Risks</h4>
              <ul className="space-y-1">
                {result.risks.map((risk, i) => (
                  <li key={i} className="text-sm text-red-700">• {risk}</li>
                ))}
              </ul>
            </div>
          )}

          {result.recommendations && result.recommendations.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">Recommendations</h4>
              <ul className="space-y-1">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-green-700">• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    // Buyer Persona Results
    if (selectedTool?.id === 'buyer-persona' && result.personas) {
      return (
        <div className="mt-6 space-y-4">
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 p-4 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-800">Buyer Personas</h3>
          </div>

          <div className="space-y-4">
            {result.personas.map((persona, i) => (
              <div key={i} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-lg">{persona.name}</h4>
                  {persona.matchScore && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      {persona.matchScore}% Match
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-xs text-gray-500">Age</div>
                    <div className="font-medium text-sm">{persona.demographics?.ageRange}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-xs text-gray-500">Income</div>
                    <div className="font-medium text-sm">{persona.demographics?.income}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-xs text-gray-500">Family</div>
                    <div className="font-medium text-sm">{persona.demographics?.familyStatus}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-xs text-gray-500">Occupation</div>
                    <div className="font-medium text-sm">{persona.demographics?.occupation}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Motivations</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {persona.motivations?.map((m, j) => <li key={j}>• {m}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Key Selling Points</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {persona.keySellingPoints?.map((p, j) => <li key={j}>• {p}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {result.marketingRecommendations && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-medium text-purple-800 mb-2">Marketing Recommendations</h4>
              <p className="text-sm text-purple-700 mb-2">
                <strong>Primary Target:</strong> {result.marketingRecommendations.primaryTarget}
              </p>
              <div className="flex flex-wrap gap-2">
                {result.marketingRecommendations.messagingThemes?.map((theme, i) => (
                  <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">{theme}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Virtual Tour Creator Results
    if (selectedTool?.id === 'virtual-tour-creator' && result.tourPlan) {
      const plan = result.tourPlan;
      return (
        <div className="mt-6 space-y-4">
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-4 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-800">Virtual Tour Plan</h3>
            <p className="text-sm text-gray-600">Duration: {plan.estimatedDuration}</p>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-3">Tour Script</h4>
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <h5 className="text-sm font-medium text-blue-800">Introduction</h5>
                <p className="text-sm text-blue-700 mt-1">{plan.tourScript?.introduction}</p>
              </div>
              {plan.tourScript?.rooms?.map((room, i) => (
                <div key={i} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-800">{room.name}</h5>
                    <span className="text-xs text-gray-500">{room.duration}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{room.script}</p>
                  <div className="flex flex-wrap gap-1">
                    {room.highlightFeatures?.map((f, j) => (
                      <span key={j} className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700 rounded">{f}</span>
                    ))}
                  </div>
                </div>
              ))}
              <div className="bg-green-50 p-3 rounded-lg">
                <h5 className="text-sm font-medium text-green-800">Conclusion</h5>
                <p className="text-sm text-green-700 mt-1">{plan.tourScript?.conclusion}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">Production Tips</h4>
              <ul className="text-sm space-y-1">
                {plan.productionTips?.lighting?.map((tip, i) => (
                  <li key={i} className="text-gray-600">• {tip}</li>
                ))}
              </ul>
              <p className="text-sm text-gray-600 mt-2"><strong>Best Time:</strong> {plan.productionTips?.timing}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">Music</h4>
              <p className="text-sm text-gray-600"><strong>Genre:</strong> {plan.musicRecommendations?.genre}</p>
              <p className="text-sm text-gray-600"><strong>Mood:</strong> {plan.musicRecommendations?.mood}</p>
            </div>
          </div>
        </div>
      );
    }

    // Rental Price Optimizer Results
    if (selectedTool?.id === 'rental-price-optimizer' && result.analysis) {
      const analysis = result.analysis;
      return (
        <div className="mt-6 space-y-4">
          <div className="bg-gradient-to-r from-lime-50 to-green-50 p-6 rounded-xl text-center">
            <div className="text-sm text-gray-500 mb-1">Recommended Rent</div>
            <div className="text-4xl font-bold text-lime-600">
              ${analysis.recommendedRent?.monthly?.toLocaleString()}/mo
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Range: ${analysis.recommendedRent?.lowRange?.toLocaleString()} - ${analysis.recommendedRent?.highRange?.toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Market Position</div>
              <div className="font-semibold text-gray-800 capitalize">{analysis.marketAnalysis?.marketPosition}</div>
            </div>
            <div className="bg-white border rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Demand Level</div>
              <div className="font-semibold text-gray-800 capitalize">{analysis.marketAnalysis?.demandLevel}</div>
            </div>
            <div className="bg-white border rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">$/sq ft</div>
              <div className="font-semibold text-gray-800">${analysis.recommendedRent?.perSqft}</div>
            </div>
            <div className="bg-white border rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Avg Days on Market</div>
              <div className="font-semibold text-gray-800">{analysis.marketAnalysis?.avgDaysOnMarket}</div>
            </div>
          </div>

          {analysis.valueAddOpportunities?.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-3">Value-Add Opportunities</h4>
              <div className="space-y-2">
                {analysis.valueAddOpportunities.map((opp, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm text-gray-700">{opp.improvement}</span>
                    <div className="text-right text-sm">
                      <span className="text-gray-500">{opp.cost}</span>
                      <span className="text-green-600 ml-2">+{opp.rentIncrease}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Tenant Screener Results
    if (selectedTool?.id === 'tenant-screener' && result.screening) {
      const screening = result.screening;
      const scoreColor = screening.overallScore >= 70 ? 'green' : screening.overallScore >= 50 ? 'yellow' : 'red';
      return (
        <div className="mt-6 space-y-4">
          <div className={`bg-gradient-to-r ${
            scoreColor === 'green' ? 'from-green-50 to-emerald-50' :
            scoreColor === 'yellow' ? 'from-yellow-50 to-amber-50' : 'from-red-50 to-rose-50'
          } p-6 rounded-xl`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{result.applicant?.name}</h3>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${
                  screening.recommendation === 'approve' ? 'bg-green-200 text-green-800' :
                  screening.recommendation === 'conditional' ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'
                }`}>
                  {screening.recommendation?.toUpperCase()}
                </span>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-bold ${
                  scoreColor === 'green' ? 'text-green-600' :
                  scoreColor === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                }`}>{screening.overallScore}</div>
                <div className="text-sm text-gray-500">Score</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-3">
              <div className="text-xs text-gray-500">Income</div>
              <div className="font-semibold">{screening.analysis?.income?.score || 'N/A'}/100</div>
            </div>
            <div className="bg-white border rounded-lg p-3">
              <div className="text-xs text-gray-500">Employment</div>
              <div className="font-semibold">{screening.analysis?.employment?.score || 'N/A'}/100</div>
            </div>
            <div className="bg-white border rounded-lg p-3">
              <div className="text-xs text-gray-500">Rental History</div>
              <div className="font-semibold">{screening.analysis?.rental_history?.score || 'N/A'}/100</div>
            </div>
            <div className="bg-white border rounded-lg p-3">
              <div className="text-xs text-gray-500">Credit</div>
              <div className="font-semibold">{screening.analysis?.credit?.score || 'N/A'}/100</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {screening.greenFlags?.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Positive Indicators</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  {screening.greenFlags.map((flag, i) => <li key={i}>• {flag}</li>)}
                </ul>
              </div>
            )}
            {screening.redFlags?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Concerns</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {screening.redFlags.map((flag, i) => <li key={i}>• {flag}</li>)}
                </ul>
              </div>
            )}
          </div>

          {screening.suggestedSecurityDeposit && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Suggested Security Deposit</h4>
              <p className="text-2xl font-bold text-blue-600">${screening.suggestedSecurityDeposit.amount?.toLocaleString()}</p>
              <p className="text-sm text-blue-700 mt-1">{screening.suggestedSecurityDeposit.reasoning}</p>
            </div>
          )}

          {result.disclaimer && (
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-xs text-gray-600">{result.disclaimer}</p>
            </div>
          )}
        </div>
      );
    }

    // Mortgage Calculator Results
    if (selectedTool?.id === 'mortgage-calculator' && result.monthlyPayment) {
      return (
        <div className="mt-6 space-y-4">
          <div className="bg-gradient-to-r from-fuchsia-50 to-purple-50 p-6 rounded-xl text-center">
            <div className="text-sm text-gray-500 mb-1">Total Monthly Payment</div>
            <div className="text-4xl font-bold text-fuchsia-600">
              ${result.monthlyPayment?.total?.toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white border rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Principal & Interest</div>
              <div className="font-semibold">${result.monthlyPayment?.principalAndInterest?.toLocaleString()}</div>
            </div>
            <div className="bg-white border rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Property Tax</div>
              <div className="font-semibold">${result.monthlyPayment?.propertyTax?.toLocaleString()}</div>
            </div>
            <div className="bg-white border rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Insurance</div>
              <div className="font-semibold">${result.monthlyPayment?.homeInsurance?.toLocaleString()}</div>
            </div>
            <div className="bg-white border rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">PMI</div>
              <div className="font-semibold">${result.monthlyPayment?.pmi?.toLocaleString()}</div>
            </div>
            <div className="bg-white border rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">HOA</div>
              <div className="font-semibold">${result.monthlyPayment?.hoaFees?.toLocaleString()}</div>
            </div>
          </div>

          {result.analysis?.affordabilityAssessment && (
            <div className={`p-4 rounded-lg ${
              result.analysis.affordabilityAssessment.status === 'affordable' ? 'bg-green-50 border-green-200' :
              result.analysis.affordabilityAssessment.status === 'stretch' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
            } border`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Affordability Assessment</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  result.analysis.affordabilityAssessment.status === 'affordable' ? 'bg-green-200 text-green-800' :
                  result.analysis.affordabilityAssessment.status === 'stretch' ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'
                }`}>
                  {result.analysis.affordabilityAssessment.status?.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-700">{result.analysis.affordabilityAssessment.reasoning}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium mb-3">Loan Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Loan Amount</span>
                  <span className="font-medium">${result.loanDetails?.loanAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Interest</span>
                  <span className="font-medium">${result.loanSummary?.totalInterest?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Cost</span>
                  <span className="font-medium">${result.loanSummary?.totalCost?.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium mb-3">DTI Ratios</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Front-End DTI</span>
                  <span className={`font-medium ${result.analysis?.dtiAnalysis?.frontEndRatio > 28 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {result.analysis?.dtiAnalysis?.frontEndRatio}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Back-End DTI</span>
                  <span className={`font-medium ${result.analysis?.dtiAnalysis?.backEndRatio > 36 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {result.analysis?.dtiAnalysis?.backEndRatio}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {result.analysis?.savingsStrategies?.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-3">Savings Strategies</h4>
              <div className="space-y-2">
                {result.analysis.savingsStrategies.map((strategy, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-blue-700">{strategy.strategy}</span>
                    <span className="text-sm font-medium text-green-600">{strategy.potentialSavings}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Investment Property Finder Results
    if (selectedTool?.id === 'investment-property-finder' && result.topProperties) {
      return (
        <div className="mt-6 space-y-4">
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Investment Properties</h3>
                <p className="text-sm text-gray-600">
                  Budget: ${result.criteria?.investmentBudget?.toLocaleString()} | Strategy: {result.criteria?.investmentStrategy}
                </p>
              </div>
              <div className="text-2xl font-bold text-slate-600">{result.propertiesFound} Found</div>
            </div>
          </div>

          {result.recommendations?.marketAssessment && (
            <div className={`p-4 rounded-lg ${
              result.recommendations.marketAssessment.overallOpportunity === 'excellent' ? 'bg-green-50' :
              result.recommendations.marketAssessment.overallOpportunity === 'good' ? 'bg-blue-50' : 'bg-yellow-50'
            }`}>
              <h4 className="font-medium mb-2">Market Assessment</h4>
              <p className="text-sm text-gray-700">{result.recommendations.marketAssessment.marketConditions}</p>
            </div>
          )}

          <div className="space-y-3">
            {result.topProperties?.map((property, i) => (
              <div key={property.id || i} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{property.address}</h4>
                    <p className="text-sm text-gray-500">{property.city}, {property.state}</p>
                    <div className="flex gap-3 mt-2 text-sm text-gray-600">
                      <span>{property.bedrooms} bed</span>
                      <span>{property.bathrooms} bath</span>
                      <span>{property.squareFeet?.toLocaleString()} sqft</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-800">${property.price?.toLocaleString()}</div>
                  </div>
                </div>
                {property.metrics && (
                  <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t">
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Cash Flow</div>
                      <div className={`font-semibold text-sm ${property.metrics.monthlyCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${property.metrics.monthlyCashFlow}/mo
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Cap Rate</div>
                      <div className="font-semibold text-sm">{property.metrics.capRate}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">CoC Return</div>
                      <div className="font-semibold text-sm">{property.metrics.cashOnCash}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Est. Rent</div>
                      <div className="font-semibold text-sm">${property.metrics.estimatedRent}/mo</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {(!result.topProperties || result.topProperties.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No properties match your investment criteria. Try adjusting your targets.
              </div>
            )}
          </div>

          {result.recommendations?.investmentTips?.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Investment Tips</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {result.recommendations.investmentTips.map((tip, i) => (
                  <li key={i}>• {tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    if (selectedTool?.id === 'showing-scheduler' && result.availableSlots) {
      return (
        <div className="mt-6 space-y-4">
          <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg text-zinc-800">Available Showing Slots</h3>
              <span className="text-sm text-zinc-600">{result.availableSlots.length} slots found · {result.existingShowingsCount} existing showings</span>
            </div>
          </div>
          {result.availableSlots.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {result.availableSlots.map((slot, i) => (
                <div key={i} className="p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
                      <CalendarDaysIcon className="w-5 h-5 text-zinc-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                      <p className="text-sm text-gray-500">{slot.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No available slots found for the next 7 days. Try different preferred times.
            </div>
          )}
        </div>
      );
    }

    if (selectedTool?.id === 'open-house-summary' && result.summary) {
      const summary = result.summary;
      return (
        <div className="mt-6 space-y-4">
          <div className="bg-gradient-to-r from-neutral-50 to-green-50 p-4 rounded-lg border border-neutral-200">
            <h3 className="font-semibold text-lg text-neutral-800 mb-1">
              {result.property?.address}, {result.property?.city}
            </h3>
            <p className="text-sm text-neutral-600">
              {result.eventDetails?.date ? new Date(result.eventDetails.date).toLocaleDateString() : ''} · {result.eventDetails?.time} · Agent: {result.eventDetails?.agent}
            </p>
            {result.property?.price && (
              <p className="text-sm text-neutral-600">List Price: ${result.property.price.toLocaleString()}</p>
            )}
          </div>

          {summary.executiveSummary && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium mb-2">Executive Summary</h4>
              <p className="text-sm text-gray-700">{summary.executiveSummary}</p>
            </div>
          )}

          {summary.attendance && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard title="Total Attendees" value={summary.attendance.total} color="green" />
              <MetricCard title="Hot Leads" value={summary.attendance.hotLeads} color="red" />
              <MetricCard title="Warm Leads" value={summary.attendance.warmLeads} color="yellow" />
              <MetricCard title="Cold Leads" value={summary.attendance.coldLeads} color="green" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.commonFeedback?.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Common Feedback</h4>
                <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                  {summary.commonFeedback.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
            {summary.objections?.length > 0 && (
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">Objections & Concerns</h4>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {summary.objections.map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              </div>
            )}
          </div>

          {summary.pricingFeedback && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-1">Pricing Feedback</h4>
              <p className="text-sm text-yellow-700">{summary.pricingFeedback}</p>
            </div>
          )}

          {summary.hotLeadsSummary?.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-medium text-orange-800 mb-2">Hot Leads</h4>
              <ul className="text-sm text-orange-700 space-y-1">
                {summary.hotLeadsSummary.map((lead, i) => <li key={i}>• {lead}</li>)}
              </ul>
            </div>
          )}

          {summary.recommendations && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {summary.recommendations.immediate?.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">Immediate Actions</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {summary.recommendations.immediate.map((r, i) => <li key={i}>• {r}</li>)}
                  </ul>
                </div>
              )}
              {summary.recommendations.followUp?.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Follow-Up Strategy</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {summary.recommendations.followUp.map((r, i) => <li key={i}>• {r}</li>)}
                  </ul>
                </div>
              )}
              {summary.recommendations.propertyImprovements?.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Property Improvements</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    {summary.recommendations.propertyImprovements.map((r, i) => <li key={i}>• {r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {summary.nextSteps?.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h4 className="font-medium text-indigo-800 mb-2">Next Steps</h4>
              <ol className="text-sm text-indigo-700 space-y-1 list-decimal list-inside">
                {summary.nextSteps.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
            </div>
          )}
        </div>
      );
    }

    if (selectedTool?.id === 'property-appraiser' && result.appraisal) {
      const appraisal = result.appraisal;
      return (
        <div className="mt-6 space-y-4">
          <div className="bg-gradient-to-r from-stone-50 to-amber-50 p-6 rounded-lg border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg text-stone-800">Estimated Market Value</h3>
              <span className="text-3xl font-bold text-stone-700">${appraisal.estimatedValue?.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-stone-600">
              <span>Range: ${appraisal.valueLow?.toLocaleString()} — ${appraisal.valueHigh?.toLocaleString()}</span>
              <span>|</span>
              <span>Confidence: {appraisal.confidenceLevel}</span>
            </div>
            <div className="mt-2 text-sm text-stone-600">
              Price per sq ft: ${appraisal.pricePerSqFt?.toFixed(0)}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ScoreCard title="Location" score={appraisal.scores?.location} />
            <ScoreCard title="Condition" score={appraisal.scores?.condition} />
            <ScoreCard title="Improvements" score={appraisal.scores?.improvements} />
            <ScoreCard title="Market Appeal" score={appraisal.scores?.marketAppeal} />
          </div>

          {appraisal.comparables?.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium mb-3">Comparable Sales</h4>
              <div className="space-y-3">
                {appraisal.comparables.map((comp, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <p className="font-medium">{comp.address}</p>
                      <p className="text-gray-500">{comp.bedrooms}bd / {comp.bathrooms}ba · {comp.squareFeet?.toLocaleString()} sq ft · {comp.yearBuilt}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-stone-700">${comp.salePrice?.toLocaleString()}</p>
                      <p className="text-gray-500">${comp.pricePerSqFt?.toFixed(0)}/sq ft · {comp.adjustedDifference}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {appraisal.adjustments?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">Value Adjustments</h4>
              <div className="space-y-1 text-sm">
                {appraisal.adjustments.map((adj, i) => (
                  <div key={i} className="flex justify-between text-amber-700">
                    <span>{adj.factor}</span>
                    <span className={adj.amount >= 0 ? 'text-green-700' : 'text-red-700'}>
                      {adj.amount >= 0 ? '+' : ''}{typeof adj.amount === 'number' ? `$${adj.amount.toLocaleString()}` : adj.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appraisal.strengths?.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Value Strengths</h4>
                <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                  {appraisal.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {appraisal.concerns?.length > 0 && (
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">Value Concerns</h4>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {appraisal.concerns.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
          </div>

          {appraisal.recommendations && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Appraiser Recommendations</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {(Array.isArray(appraisal.recommendations) ? appraisal.recommendations : [appraisal.recommendations]).map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    // Default fallback - formatted JSON for any other results
    return (
      <div className="mt-6 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-3">Results</h4>
        <pre className="text-sm overflow-auto bg-white p-4 rounded border">{JSON.stringify(result, null, 2)}</pre>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <SparklesIcon className="w-7 h-7 text-purple-600" />
            AI Hub
          </h1>
          <p className="text-gray-600 mt-1">Powerful AI tools to supercharge your real estate business</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTools.map(tool => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool)}
              className={`p-4 bg-white rounded-xl border-2 transition-all text-left hover:shadow-lg ${
                selectedTool?.id === tool.id ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg ${colorClasses[tool.color]} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900">{tool.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{tool.description}</p>
            </button>
          );
        })}
      </div>

      {/* Selected Tool Panel */}
      {selectedTool && (
        <div ref={toolPanelRef} className="bg-white rounded-xl border p-6 scroll-mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${colorClasses[selectedTool.color]} flex items-center justify-center`}>
                <selectedTool.icon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{selectedTool.name}</h2>
                <p className="text-sm text-gray-500">{selectedTool.description}</p>
              </div>
            </div>
            <button
              onClick={() => { setSelectedTool(null); setResult(null); }}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ×
            </button>
          </div>

          {renderToolForm()}
          {renderResult()}
        </div>
      )}
    </div>
  );
}

function ScoreCard({ title, score }) {
  const getColor = (s) => {
    if (s >= 80) return 'text-green-600 bg-green-50';
    if (s >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className={`p-3 rounded-lg ${getColor(score)}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold">{score || 'N/A'}</p>
    </div>
  );
}

function MetricCard({ title, value, color }) {
  const colorClasses = {
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red: 'bg-red-50 text-red-700'
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
