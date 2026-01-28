import { XMarkIcon, SparklesIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function AIResponseModal({ isOpen, onClose, title, data, type = 'default' }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = () => {
    switch (type) {
      case 'lead-qualify':
        return (
          <div className="space-y-6">
            {/* Score Circle */}
            <div className="flex justify-center">
              <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center border-8 ${
                data.score >= 70 ? 'border-green-500 bg-green-50' :
                data.score >= 40 ? 'border-yellow-500 bg-yellow-50' :
                'border-red-500 bg-red-50'
              }`}>
                <span className={`text-4xl font-bold ${
                  data.score >= 70 ? 'text-green-600' :
                  data.score >= 40 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>{data.score}</span>
                <span className="text-sm text-gray-500">/ 100</span>
              </div>
            </div>

            {/* Recommendation */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Recommendation</h4>
              <p className="text-blue-700">{data.recommendation}</p>
            </div>

            {/* Analysis */}
            {data.analysis && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Analysis</h4>
                <p className="text-gray-600 whitespace-pre-wrap">{data.analysis}</p>
              </div>
            )}

            {/* Factors */}
            {data.factors && data.factors.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Key Factors</h4>
                <ul className="space-y-2">
                  {data.factors.map((factor, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full mt-2 ${
                        factor.impact === 'positive' ? 'bg-green-500' :
                        factor.impact === 'negative' ? 'bg-red-500' :
                        'bg-gray-400'
                      }`}></span>
                      <span className="text-gray-600">{factor.description || factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Steps */}
            {data.nextSteps && data.nextSteps.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-2">Suggested Next Steps</h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  {data.nextSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        );

      case 'property-description':
        return (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {data.description}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(data.description)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
            >
              {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          </div>
        );

      case 'market-report':
        return (
          <div className="space-y-6">
            {/* Stats Grid */}
            {data.data && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{data.data.activeListings}</p>
                  <p className="text-xs text-gray-500">Active Listings</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{data.data.recentSales}</p>
                  <p className="text-xs text-gray-500">Recent Sales</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-purple-600">${(data.data.avgSoldPrice / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-gray-500">Avg Sold Price</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-orange-600">{data.data.avgDaysOnMarket}</p>
                  <p className="text-xs text-gray-500">Avg DOM</p>
                </div>
              </div>
            )}

            {/* Analysis Text */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Market Analysis</h4>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <p className="text-gray-600 whitespace-pre-wrap">{data.analysis}</p>
              </div>
            </div>

            <button
              onClick={() => copyToClipboard(data.analysis)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
            >
              {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy analysis'}
            </button>
          </div>
        );

      case 'social-post':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-blue">{data.platform}</span>
            </div>
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-6">
              <p className="text-gray-700 whitespace-pre-wrap">{data.content}</p>
            </div>
            {data.hashtags && data.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.hashtags.map((tag, idx) => (
                  <span key={idx} className="text-blue-600 text-sm">#{tag}</span>
                ))}
              </div>
            )}
            <button
              onClick={() => copyToClipboard(data.content)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
            >
              {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          </div>
        );

      case 'property-matcher':
        return (
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">Properties matched based on lead preferences:</p>
            {data.matches && data.matches.length > 0 ? (
              <div className="space-y-3">
                {data.matches.map((match, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">{match.property?.address || match.address}</h4>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                        {match.matchScore || match.score}% Match
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm">{match.property?.city || match.city}, {match.property?.state || match.state}</p>
                    <p className="text-blue-600 font-medium">${(match.property?.price || match.price)?.toLocaleString()}</p>
                    {match.reasons && (
                      <div className="mt-2 text-sm text-gray-500">
                        <span className="font-medium">Why: </span>{match.reasons.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No matching properties found</p>
            )}
          </div>
        );

      case 'follow-up-sequence':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 rounded-lg p-4 mb-4">
              <p className="text-purple-800 font-medium">Email Sequence: {data.sequenceType || 'General'}</p>
              <p className="text-purple-600 text-sm">{data.emails?.length || 0} emails in sequence</p>
            </div>
            {data.emails && data.emails.length > 0 ? (
              <div className="space-y-4">
                {data.emails.map((email, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                        Day {email.day || idx + 1}
                      </span>
                      <span className="text-gray-500 text-sm">{email.timing || ''}</span>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">{email.subject}</h4>
                    <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {email.body}
                    </div>
                    <button
                      onClick={() => copyToClipboard(`Subject: ${email.subject}\n\n${email.body}`)}
                      className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      <ClipboardDocumentIcon className="h-3 w-3" />
                      Copy email
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No emails generated</p>
            )}
          </div>
        );

      case 'price-predictor':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-2">Estimated Market Value</p>
              <p className="text-4xl font-bold text-green-600">${data.predictedPrice?.toLocaleString() || data.estimatedPrice?.toLocaleString()}</p>
              {data.confidence && (
                <p className="text-sm text-gray-500 mt-1">Confidence: {data.confidence}%</p>
              )}
            </div>
            {data.priceRange && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-2">Price Range</p>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">${data.priceRange.low?.toLocaleString()}</span>
                  <div className="flex-1 mx-4 h-2 bg-gray-200 rounded-full">
                    <div className="h-2 bg-green-500 rounded-full" style={{ width: '50%', marginLeft: '25%' }}></div>
                  </div>
                  <span className="text-gray-700">${data.priceRange.high?.toLocaleString()}</span>
                </div>
              </div>
            )}
            {data.factors && data.factors.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Price Factors</h4>
                <ul className="space-y-2">
                  {data.factors.map((factor, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <span className={`w-2 h-2 rounded-full ${factor.impact === 'positive' ? 'bg-green-500' : factor.impact === 'negative' ? 'bg-red-500' : 'bg-gray-400'}`}></span>
                      <span className="text-gray-600">{factor.name || factor}: {factor.effect || ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.comparables && data.comparables.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Comparable Sales</h4>
                <div className="space-y-2">
                  {data.comparables.map((comp, idx) => (
                    <div key={idx} className="bg-blue-50 rounded p-3 text-sm">
                      <p className="font-medium">{comp.address}</p>
                      <p className="text-gray-600">Sold: ${comp.price?.toLocaleString()} | {comp.daysAgo} days ago</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'showing-scheduler':
        return (
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">Optimal showing times based on buyer preferences and property availability:</p>
            {data.suggestedTimes && data.suggestedTimes.length > 0 ? (
              <div className="space-y-3">
                {data.suggestedTimes.map((slot, idx) => (
                  <div key={idx} className={`rounded-lg p-4 ${idx === 0 ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900">{slot.date}</p>
                        <p className="text-gray-600">{slot.time}</p>
                      </div>
                      {idx === 0 && <span className="badge badge-green">Recommended</span>}
                    </div>
                    {slot.reason && <p className="text-sm text-gray-500 mt-2">{slot.reason}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No time slots available</p>
            )}
            {data.tips && (
              <div className="bg-yellow-50 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-yellow-800 mb-2">Showing Tips</h4>
                <p className="text-yellow-700 text-sm">{data.tips}</p>
              </div>
            )}
          </div>
        );

      case 'cma':
        const renderAnalysisContent = (analysis) => {
          if (!analysis) return null;
          if (typeof analysis === 'string') {
            return <p className="text-gray-600 whitespace-pre-wrap text-sm">{analysis}</p>;
          }
          // Handle object analysis with structured display
          return (
            <div className="space-y-3">
              {analysis.summary && (
                <p className="text-gray-700 font-medium">{analysis.summary}</p>
              )}
              {analysis.marketConditions && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Market Conditions</p>
                  <p className="text-gray-600 text-sm">{typeof analysis.marketConditions === 'string' ? analysis.marketConditions : analysis.marketConditions.description || 'Active market'}</p>
                </div>
              )}
              {analysis.priceRange && (
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Low</p>
                    <p className="font-medium text-red-600">${(analysis.priceRange.low || analysis.priceRange.min || 0).toLocaleString()}</p>
                  </div>
                  <div className="flex-1 h-2 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 rounded-full"></div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">High</p>
                    <p className="font-medium text-green-600">${(analysis.priceRange.high || analysis.priceRange.max || 0).toLocaleString()}</p>
                  </div>
                </div>
              )}
              {analysis.insights && Array.isArray(analysis.insights) && (
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {analysis.insights.map((insight, i) => (
                    <li key={i}>{typeof insight === 'string' ? insight : insight.text || insight.description}</li>
                  ))}
                </ul>
              )}
              {analysis.trends && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Market Trend:</span>
                  <span className={`badge ${analysis.trends === 'up' || analysis.trends === 'rising' ? 'badge-green' : analysis.trends === 'down' || analysis.trends === 'declining' ? 'badge-red' : 'badge-yellow'}`}>
                    {analysis.trends}
                  </span>
                </div>
              )}
              {/* Fallback for any other string properties */}
              {Object.entries(analysis).filter(([key]) => !['summary', 'marketConditions', 'priceRange', 'insights', 'trends'].includes(key)).map(([key, value]) => (
                typeof value === 'string' && (
                  <div key={key}>
                    <p className="text-sm font-medium text-gray-600 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-gray-600 text-sm">{value}</p>
                  </div>
                )
              ))}
            </div>
          );
        };

        return (
          <div className="space-y-6">
            {/* Main Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center shadow-sm">
                <p className="text-3xl font-bold text-blue-600">${(data.estimatedValue || data.suggestedPrice || data.recommendedPrice || 0).toLocaleString()}</p>
                <p className="text-xs text-blue-600/70 mt-1">Estimated Value</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center shadow-sm">
                <p className="text-3xl font-bold text-green-600">{data.comparablesCount || data.comparables?.length || 0}</p>
                <p className="text-xs text-green-600/70 mt-1">Comparables</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center shadow-sm">
                <p className="text-3xl font-bold text-purple-600">{data.confidenceLevel || data.confidence || 'High'}</p>
                <p className="text-xs text-purple-600/70 mt-1">Confidence</p>
              </div>
            </div>

            {/* Property Address */}
            {data.address && (
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Subject Property</p>
                <p className="font-semibold text-gray-800">{data.address}</p>
              </div>
            )}

            {/* Analysis Type */}
            {data.analysisType && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Analysis Type:</span>
                <span className="badge badge-blue">{data.analysisType}</span>
              </div>
            )}

            {/* Market Analysis */}
            {data.analysis && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Market Analysis
                </h4>
                {renderAnalysisContent(data.analysis)}
              </div>
            )}

            {/* Comparable Properties */}
            {data.comparables && data.comparables.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Comparable Properties
                </h4>
                <div className="space-y-3">
                  {data.comparables.map((comp, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{comp.address || `Comparable #${idx + 1}`}</p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                              </svg>
                              {comp.beds || comp.bedrooms || '-'} bed
                            </span>
                            <span>{comp.baths || comp.bathrooms || '-'} bath</span>
                            <span>{(comp.sqft || comp.squareFeet)?.toLocaleString() || '-'} sqft</span>
                          </div>
                          {comp.distance && (
                            <p className="text-xs text-gray-400 mt-1">{comp.distance} away</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">${(comp.soldPrice || comp.price || 0).toLocaleString()}</p>
                          {(comp.soldDate || comp.saleDate) && (
                            <p className="text-xs text-gray-500">Sold {comp.soldDate || comp.saleDate}</p>
                          )}
                          {comp.pricePerSqft && (
                            <p className="text-xs text-gray-400">${comp.pricePerSqft}/sqft</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Adjustments */}
            {data.adjustments && data.adjustments.length > 0 && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Price Adjustments
                </h4>
                <div className="space-y-2">
                  {data.adjustments.map((adj, idx) => {
                    const adjustmentName = adj.factor || adj.name || (typeof adj === 'string' ? adj : 'Adjustment');
                    const adjustmentAmount = adj.amount || adj.value || 0;
                    const isPositive = adjustmentAmount >= 0;
                    return (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-yellow-200 last:border-0">
                        <span className="text-gray-700">{adjustmentName}</span>
                        <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : '-'}${Math.abs(adjustmentAmount).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommendation */}
            {data.recommendation && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Recommendation
                </h4>
                {typeof data.recommendation === 'string' ? (
                  <p className="text-blue-700">{data.recommendation}</p>
                ) : (
                  <div className="space-y-2">
                    {data.recommendation.listPrice && (
                      <p className="text-blue-700">
                        <span className="font-medium">Suggested List Price:</span> ${data.recommendation.listPrice.toLocaleString()}
                      </p>
                    )}
                    {data.recommendation.strategy && (
                      <p className="text-blue-700">
                        <span className="font-medium">Strategy:</span> {data.recommendation.strategy}
                      </p>
                    )}
                    {data.recommendation.notes && (
                      <p className="text-blue-600 text-sm">{data.recommendation.notes}</p>
                    )}
                    {data.recommendation.action && (
                      <p className="text-blue-700">{data.recommendation.action}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Created Date */}
            {data.createdAt && (
              <p className="text-xs text-gray-400 text-right">
                Generated: {new Date(data.createdAt).toLocaleString()}
              </p>
            )}
          </div>
        );

      default:
        return (
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-sm text-gray-600 whitespace-pre-wrap">
              {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose}></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg p-2">
                <SparklesIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
            {renderContent()}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end">
            <button onClick={onClose} className="btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
