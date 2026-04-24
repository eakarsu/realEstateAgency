const fieldPolicies = {
  lead: {
    ADMIN: '*',
    MANAGER: '*',
    AGENT: ['id', 'firstName', 'lastName', 'email', 'phone', 'status', 'score', 'budget', 'timeline', 'propertyType', 'preferredAreas', 'notes', 'sourceId', 'agentId', 'lastContactedAt', 'createdAt', 'updatedAt', 'agent', 'source', 'tags', 'activities'],
    CLIENT: ['id', 'firstName', 'lastName', 'status', 'createdAt'],
  },
  commission: {
    ADMIN: '*',
    MANAGER: '*',
    AGENT: ['id', 'transactionId', 'type', 'rate', 'amount', 'splitPercentage', 'splitAmount', 'status', 'paidAt', 'createdAt', 'transaction', 'agent'],
    CLIENT: [],
  },
  agent: {
    ADMIN: '*',
    MANAGER: '*',
    AGENT: ['id', 'userId', 'licenseNumber', 'bio', 'specializations', 'yearsExperience', 'teamId', 'hireDate', 'createdAt', 'user', 'team', '_count'],
    CLIENT: ['id', 'bio', 'specializations', 'yearsExperience', 'user', '_count'],
  },
  property: {
    ADMIN: '*',
    MANAGER: '*',
    AGENT: '*',
    CLIENT: ['id', 'mlsNumber', 'status', 'type', 'title', 'description', 'aiDescription', 'address', 'city', 'state', 'zipCode', 'price', 'pricePerSqft', 'bedrooms', 'bathrooms', 'squareFeet', 'lotSize', 'yearBuilt', 'stories', 'garage', 'features', 'hoaFee', 'listedAt', 'photos', 'virtualTours', 'createdAt'],
  },
  transaction: {
    ADMIN: '*',
    MANAGER: '*',
    AGENT: ['id', 'propertyId', 'agentId', 'type', 'status', 'listPrice', 'salePrice', 'closingDate', 'contractDate', 'financingType', 'createdAt', 'updatedAt', 'property', 'agent', 'milestones', 'checklists', 'documents', 'tasks'],
    CLIENT: ['id', 'propertyId', 'type', 'status', 'closingDate', 'property'],
  },
};

function filterObject(obj, allowedFields) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => filterObject(item, allowedFields));

  const filtered = {};
  for (const key of allowedFields) {
    if (key in obj) {
      filtered[key] = obj[key];
    }
  }
  return filtered;
}

function filterFields(entity) {
  return (req, res, next) => {
    const policy = fieldPolicies[entity];
    if (!policy) return next();

    const role = req.user?.role || 'CLIENT';
    const allowed = policy[role];

    if (!allowed || allowed === '*') return next();
    if (allowed.length === 0) {
      // No access to this entity for this role
      return res.status(403).json({ error: 'Access denied' });
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (data && typeof data === 'object') {
        // Handle paginated responses
        const entityPlural = entity + 's';
        if (data[entityPlural] && Array.isArray(data[entityPlural])) {
          data[entityPlural] = data[entityPlural].map(item => filterObject(item, allowed));
        } else if (Array.isArray(data)) {
          data = data.map(item => filterObject(item, allowed));
        } else if (data.id) {
          data = filterObject(data, allowed);
        }
      }
      return originalJson(data);
    };

    next();
  };
}

module.exports = { filterFields, fieldPolicies };
