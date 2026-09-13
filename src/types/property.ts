import type { Timestamp } from 'firebase/firestore';

export interface Property {
  name: string;
  address: {
    line1: string;
    line2?: string;
    postalCode: string;
    city: string;
    country: string;
  };
  pebCertificateId?: string;
  createdAt: Timestamp;
  estimatedValue?: number;
}

export type PropertyInput = Omit<Property, 'createdAt'>;

export default Property;
