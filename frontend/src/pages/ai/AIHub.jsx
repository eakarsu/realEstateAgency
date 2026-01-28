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
  LightBulbIcon
} from '@heroicons/react/24/outline';
import { aiAPI } from '../../services/api';
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
  violet: 'bg-violet-100 text-violet-600'
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
            <button
              onClick={handleNeighborhoodInsights}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Generate Insights'}
            </button>
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
            <button
              onClick={handleInvestmentAnalysis}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Analyze Investment'}
            </button>
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
            <button
              onClick={handleListingDescription}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Description'}
            </button>
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
            <button
              onClick={handleVirtualStaging}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Get Staging Recommendations'}
            </button>
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
            <button
              onClick={handleContractAnalyzer}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Analyze Contract'}
            </button>
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
            <button
              onClick={handleBuyerPersona}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Buyer Persona'}
            </button>
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
            <button
              onClick={handleSocialPost}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Social Post'}
            </button>
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
            <button
              onClick={handleEmailSequence}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Email Sequence'}
            </button>
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
            <button
              onClick={handleCMA}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Generate Market Analysis'}
            </button>
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
            <button
              onClick={handlePricePredictor}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Predicting...' : 'Predict Price'}
            </button>
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
            <button
              onClick={handleLeadQualifier}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Qualify Lead'}
            </button>
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
            <button
              onClick={handlePropertyMatcher}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Matching...' : 'Find Matching Properties'}
            </button>
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
            <button
              onClick={handleOfferAnalyzer}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Analyze Offer'}
            </button>
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
    if (selectedTool?.id === 'email-sequence' && result.emails) {
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
