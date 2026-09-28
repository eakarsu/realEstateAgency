import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  demoCredentials: () => api.get('/auth/demo-credentials'),
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updatePassword: (data) => api.put('/auth/password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data)
};

export const workflowAPI = {
  queue: () => api.get('/workflow/queue'),
  metrics: () => api.get('/workflow/metrics'),
  verifyAudit: () => api.get('/workflow/audit/verify'),
  reviewHandoff: (id, decision, reason) => api.post(`/workflow/handoffs/${id}/review`, { decision, reason }),
  reviewOutreach: (id, decision, reason) => api.post(`/workflow/outreach/${id}/review`, { decision, reason }),
  runOperations: (limit = 25) => api.post('/workflow/operations/run', { limit }),
  retryOperation: (id) => api.post(`/workflow/operations/${id}/retry`),
};

// Users
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  deactivate: (id) => api.put(`/users/${id}/deactivate`),
  activate: (id) => api.put(`/users/${id}/activate`)
};

// Leads
export const leadsAPI = {
  getAll: (params) => api.get('/leads', { params }),
  getById: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  delete: (id) => api.delete(`/leads/${id}`),
  assign: (id, agentId) => api.put(`/leads/${id}/assign`, { agentId }),
  addActivity: (id, data) => api.post(`/leads/${id}/activities`, data),
  getActivities: (id) => api.get(`/leads/${id}/activities`),
  updateTags: (id, tags) => api.put(`/leads/${id}/tags`, { tags }),
  getStats: () => api.get('/leads/stats/overview'),
  bulkDelete: (ids) => api.post('/leads/bulk-delete', { ids }),
  bulkUpdate: (ids, data) => api.post('/leads/bulk-update', { ids, data })
};

// Properties
export const propertiesAPI = {
  getAll: (params) => api.get('/properties', { params }),
  getById: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`),
  addPhotos: (id, photos) => api.post(`/properties/${id}/photos`, { photos }),
  uploadPhotos: (id, files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('photos', file));
    return api.post(`/properties/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deletePhoto: (id, photoId) => api.delete(`/properties/${id}/photos/${photoId}`),
  addVirtualTour: (id, data) => api.post(`/properties/${id}/virtual-tours`, data),
  getStats: () => api.get('/properties/stats/overview'),
  bulkDelete: (ids) => api.post('/properties/bulk-delete', { ids }),
  bulkUpdate: (ids, data) => api.post('/properties/bulk-update', { ids, data })
};

// Transactions
export const transactionsAPI = {
  getAll: (params) => api.get('/transactions', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  updateMilestone: (id, milestoneId, data) => api.put(`/transactions/${id}/milestones/${milestoneId}`, data),
  updateChecklist: (id, checklistId, data) => api.put(`/transactions/${id}/checklists/${checklistId}`, data),
  getStats: () => api.get('/transactions/stats/overview'),
  bulkDelete: (ids) => api.post('/transactions/bulk-delete', { ids }),
  bulkUpdate: (ids, data) => api.post('/transactions/bulk-update', { ids, data })
};

// Agents
export const agentsAPI = {
  getAll: (params) => api.get('/agents', { params }),
  getById: (id) => api.get(`/agents/${id}`),
  update: (id, data) => api.put(`/agents/${id}`, data),
  getPerformance: (id, params) => api.get(`/agents/${id}/performance`, { params }),
  addPerformance: (id, data) => api.post(`/agents/${id}/performance`, data),
  getTraining: (id) => api.get(`/agents/${id}/training`),
  addTraining: (id, data) => api.post(`/agents/${id}/training`, data),
  updateTraining: (id, trainingId, data) => api.put(`/agents/${id}/training/${trainingId}`, data)
};

// Teams
export const teamsAPI = {
  getAll: () => api.get('/teams'),
  getById: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  delete: (id) => api.delete(`/teams/${id}`),
  addAgent: (id, agentId, isLeadAgent) => api.post(`/teams/${id}/agents`, { agentId, isLeadAgent }),
  removeAgent: (id, agentId) => api.delete(`/teams/${id}/agents/${agentId}`),
  getPerformance: (id) => api.get(`/teams/${id}/performance`)
};

// Showings
export const showingsAPI = {
  getAll: (params) => api.get('/showings', { params }),
  getById: (id) => api.get(`/showings/${id}`),
  create: (data) => api.post('/showings', data),
  update: (id, data) => api.put(`/showings/${id}`, data),
  delete: (id) => api.delete(`/showings/${id}`),
  getToday: () => api.get('/showings/today/list'),
  getUpcoming: () => api.get('/showings/upcoming/list'),
  addFeedback: (id, data) => api.post(`/showings/${id}/feedback`, data),
  bulkDelete: (ids) => api.post('/showings/bulk-delete', { ids }),
  bulkUpdate: (ids, data) => api.post('/showings/bulk-update', { ids, data })
};

// Tasks
export const tasksAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  getOverdue: () => api.get('/tasks/overdue/list'),
  getToday: () => api.get('/tasks/today/list'),
  complete: (id) => api.post(`/tasks/${id}/complete`),
  bulkDelete: (ids) => api.post('/tasks/bulk-delete', { ids }),
  bulkUpdate: (ids, data) => api.post('/tasks/bulk-update', { ids, data })
};

// Campaigns
export const campaignsAPI = {
  getAll: (params) => api.get('/campaigns', { params }),
  getById: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`),
  addDrip: (id, data) => api.post(`/campaigns/${id}/drips`, data),
  updateDrip: (id, dripId, data) => api.put(`/campaigns/${id}/drips/${dripId}`, data),
  deleteDrip: (id, dripId) => api.delete(`/campaigns/${id}/drips/${dripId}`),
  launch: (id) => api.post(`/campaigns/${id}/launch`),
  pause: (id) => api.post(`/campaigns/${id}/pause`)
};

// Open Houses
export const openHousesAPI = {
  getAll: (params) => api.get('/open-houses', { params }),
  getById: (id) => api.get(`/open-houses/${id}`),
  create: (data) => api.post('/open-houses', data),
  update: (id, data) => api.put(`/open-houses/${id}`, data),
  delete: (id) => api.delete(`/open-houses/${id}`),
  registerAttendee: (id, data) => api.post(`/open-houses/${id}/attendees`, data),
  getByProperty: (propertyId) => api.get(`/open-houses/property/${propertyId}`)
};

// Documents
export const documentsAPI = {
  getAll: (params) => api.get('/documents', { params }),
  getById: (id) => api.get(`/documents/${id}`),
  create: (data) => api.post('/documents', data),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`),
  updateSignature: (id, status) => api.put(`/documents/${id}/signature`, { signatureStatus: status }),
  getPending: () => api.get('/documents/pending/signatures'),
  getByTransaction: (transactionId) => api.get(`/documents/transaction/${transactionId}`),
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// Commissions
export const commissionsAPI = {
  getAll: (params) => api.get('/commissions', { params }),
  getById: (id) => api.get(`/commissions/${id}`),
  create: (data) => api.post('/commissions', data),
  update: (id, data) => api.put(`/commissions/${id}`, data),
  delete: (id) => api.delete(`/commissions/${id}`),
  pay: (id) => api.post(`/commissions/${id}/pay`),
  getSummary: (agentId) => api.get(`/commissions/agent/${agentId}/summary`),
  calculate: (data) => api.post('/commissions/calculate', data)
};

// Saved Searches
export const savedSearchesAPI = {
  getAll: () => api.get('/saved-searches'),
  getById: (id) => api.get(`/saved-searches/${id}`),
  create: (data) => api.post('/saved-searches', data),
  update: (id, data) => api.put(`/saved-searches/${id}`, data),
  delete: (id) => api.delete(`/saved-searches/${id}`),
  getResults: (id, params) => api.get(`/saved-searches/${id}/results`, { params }),
  toggleAlert: (id) => api.post(`/saved-searches/${id}/toggle-alert`)
};

// Favorites
export const favoritesAPI = {
  getAll: () => api.get('/favorites'),
  add: (propertyId, notes) => api.post('/favorites', { propertyId, notes }),
  update: (id, notes) => api.put(`/favorites/${id}`, { notes }),
  remove: (id) => api.delete(`/favorites/${id}`),
  removeByProperty: (propertyId) => api.delete(`/favorites/property/${propertyId}`),
  check: (propertyId) => api.get(`/favorites/check/${propertyId}`),
  toggle: (propertyId, notes) => api.post(`/favorites/toggle/${propertyId}`, { notes })
};

// AI
export const aiAPI = {
  qualifyLead: (leadId, formData) => api.post('/ai/lead-qualifier', leadId ? { leadId } : formData),
  matchProperties: (leadId, limit, formData) => api.post('/ai/property-matcher', leadId ? { leadId, limit } : { ...formData, limit }),
  generateDescription: (data) => api.post('/ai/listing-description', data),
  marketAnalysis: (data) => api.post('/ai/market-analysis', data),
  followUpSequence: (data) => api.post('/ai/follow-up-sequence', data),
  chatbot: (sessionId, message, visitorInfo) => api.post('/ai/chatbot', { sessionId, message, visitorInfo }),
  predictPrice: (data) => api.post('/ai/price-predictor', data),
  scheduleShowing: (data) => api.post('/ai/showing-scheduler', data),
  socialPost: (data) => api.post('/ai/social-post', data),
  virtualStaging: (data) => api.post('/ai/virtual-staging', data),
  neighborhoodInsights: (data) => api.post('/ai/neighborhood-insights', data),
  contractAnalyzer: (data) => api.post('/ai/contract-analyzer', data),
  offerAnalyzer: (data) => api.post('/ai/offer-analyzer', data),
  investmentAnalyzer: (data) => api.post('/ai/investment-analyzer', data),
  openHouseSummary: (data) => api.post('/ai/open-house-summary', data),
  buyerPersona: (data) => api.post('/ai/buyer-persona', data),
  // New AI Features
  virtualTourCreator: (data) => api.post('/ai/virtual-tour-creator', data),
  rentalPriceOptimizer: (data) => api.post('/ai/rental-price-optimizer', data),
  tenantScreener: (data) => api.post('/ai/tenant-screener', data),
  mortgageCalculator: (data) => api.post('/ai/mortgage-calculator', data),
  investmentPropertyFinder: (data) => api.post('/ai/investment-property-finder', data),
  propertyAppraiser: (data) => api.post('/ai/property-appraiser', data),
  comparableAnalysis: (data) => api.post('/ai/comparable-analysis', data),
  complianceChecker: (data) => api.post('/ai/compliance-checker', data),
  predictiveLeadScoring: (data) => api.post('/ai/predictive-lead-scoring', data),
  buyerJourneyPersonalization: (data) => api.post('/ai/buyer-journey-personalization', data),
  pipelineForecast: (data) => api.post('/ai/pipeline-forecast', data)
};

// Dashboard
export const dashboardAPI = {
  getOverview: () => api.get('/dashboard/overview'),
  getActivities: (limit) => api.get('/dashboard/activities', { params: { limit } }),
  getTasks: (limit) => api.get('/dashboard/tasks', { params: { limit } }),
  getShowings: (limit) => api.get('/dashboard/showings', { params: { limit } }),
  getLeadStats: () => api.get('/dashboard/lead-stats'),
  getPerformance: (period) => api.get('/dashboard/performance', { params: { period } }),
  getPipeline: () => api.get('/dashboard/pipeline')
};

// Tags
export const tagsAPI = {
  getAll: () => api.get('/tags'),
  getById: (id) => api.get(`/tags/${id}`),
  create: (data) => api.post('/tags', data),
  update: (id, data) => api.put(`/tags/${id}`, data),
  delete: (id) => api.delete(`/tags/${id}`)
};

// Lead Sources
export const leadSourcesAPI = {
  getAll: (params) => api.get('/lead-sources', { params }),
  getById: (id) => api.get(`/lead-sources/${id}`),
  create: (data) => api.post('/lead-sources', data),
  update: (id, data) => api.put(`/lead-sources/${id}`, data),
  delete: (id) => api.delete(`/lead-sources/${id}`),
  getStats: (id) => api.get(`/lead-sources/${id}/stats`)
};

// Social Posts
export const socialPostsAPI = {
  getAll: (params) => api.get('/social-posts', { params }),
  getById: (id) => api.get(`/social-posts/${id}`),
  create: (data) => api.post('/social-posts', data),
  update: (id, data) => api.put(`/social-posts/${id}`, data),
  delete: (id) => api.delete(`/social-posts/${id}`),
  publish: (id) => api.post(`/social-posts/${id}/publish`),
  generate: (propertyId, platform) => api.post('/ai/social-post', { propertyId, platform })
};

// Flyers
export const flyersAPI = {
  getAll: (params) => api.get('/flyers', { params }),
  getById: (id) => api.get(`/flyers/${id}`),
  create: (data) => api.post('/flyers', data),
  update: (id, data) => api.put(`/flyers/${id}`, data),
  delete: (id) => api.delete(`/flyers/${id}`),
  generate: (propertyId, type) => api.post('/flyers/generate', { propertyId, type }),
  getTemplates: () => api.get('/flyers/templates/list')
};

// Market Reports
export const marketReportsAPI = {
  getAll: (params) => api.get('/market-reports', { params }),
  getById: (id) => api.get(`/market-reports/${id}`),
  generate: (area, title) => api.post('/market-reports/generate', { area, title }),
  delete: (id) => api.delete(`/market-reports/${id}`)
};

// Notifications
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearRead: () => api.delete('/notifications/clear/read')
};

// Integrations
export const integrationsAPI = {
  getAll: () => api.get('/integrations'),
  getAvailable: () => api.get('/integrations/available'),
  getById: (id) => api.get(`/integrations/${id}`),
  create: (data) => api.post('/integrations', data),
  update: (id, data) => api.put(`/integrations/${id}`, data),
  delete: (id) => api.delete(`/integrations/${id}`),
  test: (id) => api.post(`/integrations/${id}/test`),
  activate: (id) => api.post(`/integrations/${id}/activate`),
  deactivate: (id) => api.post(`/integrations/${id}/deactivate`),
  sync: (id) => api.post(`/integrations/${id}/sync`)
};

// Messages
export const messagesAPI = {
  getAll: (params) => api.get('/messages', { params }),
  getById: (id) => api.get(`/messages/${id}`),
  create: (data) => api.post('/messages', data),
  markRead: (id) => api.put(`/messages/${id}/read`),
  delete: (id) => api.delete(`/messages/${id}`)
};

export default api;
