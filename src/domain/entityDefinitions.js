export const ENTITY_DEFINITIONS = Object.freeze({
  customer: {
    collection: 'customers',
    requiredFields: ['id', 'displayName', 'recordStatus', 'sourceSystem'],
    relationships: {
      leads: { entity: 'lead', foreignKey: 'customerId', cardinality: 'one-to-many' },
      jobs: { entity: 'job', foreignKey: 'customerId', cardinality: 'one-to-many' },
    },
  },
  lead: {
    collection: 'leads',
    requiredFields: ['id', 'customerId', 'status'],
    relationships: {
      customer: { entity: 'customer', localKey: 'customerId', cardinality: 'many-to-one' },
      salesperson: { entity: 'teamMember', localKey: 'assignedSalespersonId', cardinality: 'many-to-one', optional: true },
      job: { entity: 'job', foreignKey: 'leadId', cardinality: 'one-to-zero-or-one' },
    },
  },
  job: {
    collection: 'jobs',
    requiredFields: ['id', 'customerId', 'soldDate', 'productionStage', 'paymentStatus'],
    relationships: {
      customer: { entity: 'customer', localKey: 'customerId', cardinality: 'many-to-one' },
      lead: { entity: 'lead', localKey: 'leadId', cardinality: 'many-to-one', optional: true },
      salesperson: { entity: 'teamMember', localKey: 'salespersonId', cardinality: 'many-to-one', optional: true },
      workScopes: { entity: 'workScope', foreignKey: 'jobId', cardinality: 'one-to-many' },
      changeOrders: { entity: 'changeOrder', foreignKey: 'jobId', cardinality: 'one-to-many' },
    },
  },
  workScope: {
    collection: 'workScopes',
    requiredFields: ['id', 'jobId', 'category', 'productionStage', 'dates', 'specs'],
    relationships: {
      job: { entity: 'job', localKey: 'jobId', cardinality: 'many-to-one' },
      crew: { entity: 'crew', localKey: 'crewId', cardinality: 'many-to-one', optional: true },
      measurer: { entity: 'teamMember', localKey: 'measurerId', cardinality: 'many-to-one', optional: true },
    },
  },
  changeOrder: {
    collection: 'changeOrders',
    requiredFields: ['id', 'jobId', 'status', 'description', 'amount'],
    relationships: {
      job: { entity: 'job', localKey: 'jobId', cardinality: 'many-to-one' },
      workScope: { entity: 'workScope', localKey: 'workScopeId', cardinality: 'many-to-one', optional: true },
    },
  },
  statusEvent: {
    collection: 'statusEvents',
    requiredFields: ['id', 'entityType', 'entityId', 'toStatus', 'occurredAt'],
    appendOnly: true,
  },
  activityLog: {
    collection: 'activityLogs',
    requiredFields: ['id', 'action', 'entityType', 'entityId', 'occurredAt'],
    appendOnly: true,
  },
  user: {
    collection: 'users',
    requiredFields: ['id', 'displayName', 'email', 'role', 'status'],
    relationships: {
      teamMember: { entity: 'teamMember', localKey: 'teamMemberId', cardinality: 'one-to-zero-or-one', optional: true },
    },
  },
  teamMember: {
    collection: 'teamMembers',
    requiredFields: ['id', 'displayName', 'active'],
  },
  crew: {
    collection: 'crews',
    requiredFields: ['id', 'name', 'active', 'tradeCategories'],
  },
  importRun: {
    collection: 'importRuns',
    requiredFields: ['id', 'sourceSystem', 'startedAt', 'rowCount'],
  },
});

export const getEntityDefinition = (entityType) => ENTITY_DEFINITIONS[entityType] || null;
