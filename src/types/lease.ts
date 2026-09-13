export interface Lease {
  id: string;
  label?: string | null;
  rentAmount?: number | null;
  privateCharges?: number | null;
  commonCharges?: number | null;
  depositAmount?: number | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  status?: string | null;
  propertyId?: string | null;
  orgId?: string | null;
  // allow extra fields
  [key: string]: any;
}
