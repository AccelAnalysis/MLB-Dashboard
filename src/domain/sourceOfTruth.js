import { DATA_SOURCE } from './enums';

/**
 * Field ownership decisions for the production model.
 *
 * These rules are intentionally explicit so a future API/import layer cannot
 * overwrite dashboard-owned management truth with incomplete upstream values.
 */
export const FIELD_OWNERSHIP = Object.freeze({
  'customer.displayName': { authority: DATA_SOURCE.JOBNIMBUS, fallback: DATA_SOURCE.DASHBOARD },
  'customer.phone': { authority: DATA_SOURCE.JOBNIMBUS, fallback: DATA_SOURCE.DASHBOARD },
  'customer.email': { authority: DATA_SOURCE.JOBNIMBUS, fallback: DATA_SOURCE.DASHBOARD },
  'customer.address': { authority: DATA_SOURCE.JOBNIMBUS, fallback: DATA_SOURCE.DASHBOARD },
  'job.externalIds.jobnimbus': { authority: DATA_SOURCE.JOBNIMBUS, fallback: DATA_SOURCE.DASHBOARD },
  'job.originalContractAmount': { authority: DATA_SOURCE.JOBNIMBUS, fallback: DATA_SOURCE.SPREADSHEET },
  'job.salespersonId': { authority: DATA_SOURCE.JOBNIMBUS, fallback: DATA_SOURCE.DASHBOARD },
  'job.leadId': { authority: DATA_SOURCE.JOBNIMBUS, fallback: DATA_SOURCE.DASHBOARD },
  'lead.source': { authority: DATA_SOURCE.JOBNIMBUS, fallback: DATA_SOURCE.SPREADSHEET },
  'job.finalAmount': { authority: DATA_SOURCE.DASHBOARD, fallback: DATA_SOURCE.SPREADSHEET },
  'job.paymentStatus': { authority: DATA_SOURCE.DASHBOARD, fallback: DATA_SOURCE.ACCOUNTING },
  'job.amountPaid': { authority: DATA_SOURCE.ACCOUNTING, fallback: DATA_SOURCE.DASHBOARD },
  'job.fundedAt': { authority: DATA_SOURCE.DASHBOARD, fallback: DATA_SOURCE.ACCOUNTING },
  'job.cancelledAt': { authority: DATA_SOURCE.DASHBOARD, fallback: DATA_SOURCE.JOBNIMBUS },
  'job.cancellationReason': { authority: DATA_SOURCE.DASHBOARD, fallback: DATA_SOURCE.JOBNIMBUS },
  'workScope.productionStage': { authority: DATA_SOURCE.DASHBOARD, fallback: DATA_SOURCE.JOBNIMBUS },
  'workScope.dates': { authority: DATA_SOURCE.DASHBOARD, fallback: DATA_SOURCE.JOBNIMBUS },
  'workScope.specs': { authority: DATA_SOURCE.DASHBOARD, fallback: DATA_SOURCE.JOBNIMBUS },
  'workScope.crewId': { authority: DATA_SOURCE.DASHBOARD, fallback: DATA_SOURCE.JOBNIMBUS },
  'changeOrder.*': { authority: DATA_SOURCE.DASHBOARD, fallback: DATA_SOURCE.SPREADSHEET },
  'statusEvent.*': { authority: DATA_SOURCE.DASHBOARD, fallback: null },
  'activityLog.*': { authority: DATA_SOURCE.DASHBOARD, fallback: null },
  'calculated.*': { authority: DATA_SOURCE.CALCULATED, fallback: null },
});

export const getFieldOwnership = (fieldPath) => {
  if (FIELD_OWNERSHIP[fieldPath]) return FIELD_OWNERSHIP[fieldPath];

  const wildcardKey = Object.keys(FIELD_OWNERSHIP).find((key) => (
    key.endsWith('.*') && fieldPath.startsWith(key.slice(0, -1))
  ));

  return wildcardKey ? FIELD_OWNERSHIP[wildcardKey] : {
    authority: DATA_SOURCE.DASHBOARD,
    fallback: null,
  };
};

export const canSourceOverwriteField = (fieldPath, incomingSource, currentSource) => {
  const ownership = getFieldOwnership(fieldPath);
  if (incomingSource === ownership.authority) return true;
  if (currentSource === ownership.authority) return false;
  return incomingSource === ownership.fallback;
};
