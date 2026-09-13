import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getExpenseCategories, ExpenseCategoryConfig } from '../expenseCategories';
import { doc, getDoc } from 'firebase/firestore';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
}));

vi.mock('../../firebase', () => ({
  db: { type: 'firestore' },
}));

describe('expenseCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getExpenseCategories', () => {
    it('should throw error if orgId is not provided', async () => {
      await expect(getExpenseCategories(null, '')).rejects.toThrow('orgId is required for getExpenseCategories');
    });

    it('should return default category if document does not exist', async () => {
      const mockDb = { type: 'firestore' } as any;
      const mockDocRef = { path: 'config/org123' };
      
      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
      } as any);

      const result = await getExpenseCategories(mockDb, 'org123');

      expect(result).toEqual([
        { id: 'autre', label: 'Autre', order: 999, active: true },
      ]);
    });

    it('should return sorted active categories', async () => {
      const mockDb = { type: 'firestore' } as any;
      const mockDocRef = { path: 'config/org123' };
      const mockData = {
        expenseCategories: [
          { id: 'taxes', label: 'Taxes', order: 20, active: true },
          { id: 'charges', label: 'Charges', order: 10, active: true },
          { id: 'inactive', label: 'Inactive', order: 5, active: false },
          { id: 'autre', label: 'Autre', order: 999, active: true },
        ],
      };

      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockData,
      } as any);

      const result = await getExpenseCategories(mockDb, 'org123');

      expect(result).toEqual([
        { id: 'charges', label: 'Charges', order: 10, active: true },
        { id: 'taxes', label: 'Taxes', order: 20, active: true },
        { id: 'autre', label: 'Autre', order: 999, active: true },
      ]);
      // 'inactive' should be filtered out
      expect(result.find(c => c.id === 'inactive')).toBeUndefined();
    });

    it('should handle categories without order field', async () => {
      const mockDb = { type: 'firestore' } as any;
      const mockDocRef = { path: 'config/org456' };
      const mockData = {
        expenseCategories: [
          { id: 'noOrder', label: 'No Order', active: true },
          { id: 'withOrder', label: 'With Order', order: 5, active: true },
        ],
      };

      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockData,
      } as any);

      const result = await getExpenseCategories(mockDb, 'org456');

      // withOrder (5) should come before noOrder (999 default)
      expect(result[0].id).toBe('withOrder');
      expect(result[1].id).toBe('noOrder');
    });

    it('should filter out null or undefined entries', async () => {
      const mockDb = { type: 'firestore' } as any;
      const mockDocRef = { path: 'config/org789' };
      const mockData = {
        expenseCategories: [
          { id: 'valid', label: 'Valid', order: 10, active: true },
          null,
          undefined,
          { id: 'valid2', label: 'Valid 2', order: 20, active: true },
        ],
      };

      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockData,
      } as any);

      const result = await getExpenseCategories(mockDb, 'org789');

      expect(result).toEqual([
        { id: 'valid', label: 'Valid', order: 10, active: true },
        { id: 'valid2', label: 'Valid 2', order: 20, active: true },
      ]);
    });
  });
});
