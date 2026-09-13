// Type definitions for Loan
export interface Loan {
  id: string;
  orgId: string;
  propertyId?: string;
  label: string;
  lenderName: string;
  amount: number;
  interestRate: number;
  startDate: Date;
  endDate: Date;
  repaymentFrequency: 'monthly' | 'quarterly';
  repaymentMethod: 'annuity' | 'linear';
  status: 'active' | 'closed';
  createdAt?: Date;
}

export type LoanInput = Omit<Loan, 'id' | 'createdAt' | 'orgId'>;

export default Loan;
