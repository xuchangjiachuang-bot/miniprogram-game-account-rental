export { executeAutoSplit, getSplitStatus, type SplitResult } from './platform-split-service';

export async function processPendingSplits() {
  return {
    success: 0,
    failed: 0,
  };
}

export async function getOrderSplitRecords(orderId: string) {
  return {
    success: true,
    data: [],
    orderId,
    deprecated: true,
  };
}
