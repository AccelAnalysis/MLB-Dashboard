import { CHANGE_ORDER_STATUS } from './enums';

const asNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const calculateApprovedChangeOrderTotal = (changeOrders = []) => (
  (Array.isArray(changeOrders) ? changeOrders : [])
    .filter((item) => item?.status === CHANGE_ORDER_STATUS.APPROVED)
    .reduce((sum, item) => sum + asNumber(item.amount), 0)
);

export const calculateRevisedContractAmount = (job, changeOrders = []) => (
  asNumber(job?.originalContractAmount) + calculateApprovedChangeOrderTotal(changeOrders)
);

/**
 * `job.finalAmount` is the authoritative closeout value when it has been
 * intentionally entered. Otherwise the approved revised contract amount is the
 * best available operational estimate.
 */
export const calculateEffectiveFinalAmount = (job, changeOrders = []) => {
  const finalAmount = asNumber(job?.finalAmount);
  return finalAmount || calculateRevisedContractAmount(job, changeOrders);
};

export const calculateBalanceDue = (job, changeOrders = []) => Math.max(
  0,
  calculateEffectiveFinalAmount(job, changeOrders) - asNumber(job?.amountPaid),
);

export const calculateJobFinancialSnapshot = (job, changeOrders = []) => ({
  originalContractAmount: asNumber(job?.originalContractAmount),
  approvedChangeOrderTotal: calculateApprovedChangeOrderTotal(changeOrders),
  revisedContractAmount: calculateRevisedContractAmount(job, changeOrders),
  effectiveFinalAmount: calculateEffectiveFinalAmount(job, changeOrders),
  depositAmount: asNumber(job?.depositAmount),
  amountPaid: asNumber(job?.amountPaid),
  balanceDue: calculateBalanceDue(job, changeOrders),
});
