import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getExpenseConfig, updateExpenseConfig, initializeOrgConfig, OrgExpenseConfig } from '../orgConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ seconds: Date.now() / 1000 })),
}));

vi.mock('../../firebase', () => ({
  db: { type: 'firestore' },
  auth: { currentUser: { uid: 'test-user-123' } },
}));

describe('orgConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getExpenseConfig', () => {
    it('should throw error if orgId is not provided', async () => {
      await expect(getExpenseConfig(null, '')).rejects.toThrow('orgId is required for getExpenseConfig');
    });

    it('should return empty config if document does not exist', async () => {
      const mockDb = { type: 'firestore' } as any;
      const mockDocRef = { path: 'config/org123' };
      
      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
      } as any);

      const result = await getExpenseConfig(mockDb, 'org123');

      expect(result).toEqual({
        id: 'expenses',
        categories: [],
        vendors: [],
      });
      expect(doc).toHaveBeenCalledWith(mockDb, 'config', 'org123');
    });

    it('should return parsed config when document exists', async () => {
      const mockDb = { type: 'firestore' } as any;
      const mockDocRef = { path: 'config/org123' };
      const mockData = {
        expenseCategories: [
          { id: 'charges', label: 'Charges', order: 10, active: true },
          { id: 'taxes', label: 'Taxes', order: 20, active: true },
          { id: 'inactive', label: 'Inactive', order: 30, active: false },
        ],
        vendors: [
          { id: 'v1', name: 'Vendor 1', iban: 'FR123' },
          { id: 'v2', name: 'Vendor 2' },
        ],
        updatedAt: new Date('2025-01-01'),
        updatedBy: 'user-456',
      };

      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockData,
      } as any);

      const result = await getExpenseConfig(mockDb, 'org123');

      expect(result).toEqual({
        id: 'expenses',
        categories: ['charges', 'taxes'], // inactive filtered out
        vendors: mockData.vendors,
        updatedAt: mockData.updatedAt,
        updatedBy: 'user-456',
      });
    });

    it('should handle categories with fallback to label', async () => {
      const mockDb = { type: 'firestore' } as any;
      const mockDocRef = { path: 'config/org123' };
      const mockData = {
        expenseCategories: [
          { label: 'OnlyLabel', order: 10, active: true },
          { id: 'withId', label: 'With ID', order: 20, active: true },
        ],
      };

      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockData,
      } as any);

      const result = await getExpenseConfig(mockDb, 'org123');

      expect(result.categories).toEqual(['OnlyLabel', 'withId']);
    });
  });

  describe('updateExpenseConfig', () => {
    it('should throw error if orgId is not provided', async () => {
      await expect(updateExpenseConfig(null, '', {})).rejects.toThrow('orgId is required for updateExpenseConfig');
    });

    it('should update categories correctly', async () => {
      const mockDb = { type: 'firestore' } as any;
      const mockDocRef = { path: 'config/org123' };
      
      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(setDoc).mockResolvedValue(undefined as any);

      const payload: Partial<OrgExpenseConfig> = {
        categories: ['cat1', 'cat2', 'cat3'],
      };

      await updateExpenseConfig(mockDb, 'org123', payload, 'custom-user-id');

      expect(doc).toHaveBeenCalledWith(mockDb, 'config', 'org123');
      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          expenseCategories: [
            { id: 'cat1', label: 'cat1', order: 10, active: true },
            { id: 'cat2', label: 'cat2', order: 20, active: true },
            { id: 'cat3', label: 'cat3', order: 30, active: true },
          ],
          updatedBy: 'custom-user-id',
        }),
        { merge: true }
      );
    });

    it('should update vendors correctly', async () => {
      const mockDb = { type: 'firestore' } as any;
      const mockDocRef = { path: 'config/org123' };
      
      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(setDoc).mockResolvedValue(undefined as any);

      const payload: Partial<OrgExpenseConfig> = {
        vendors: [
          { id: 'v1', name: 'Vendor One', iban: 'FR111' },
          { id: 'v2', name: 'Vendor Two' },
        ],
      };

      await updateExpenseConfig(mockDb, 'org123', payload);

      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          vendors: payload.vendors,
          updatedBy: 'test-user-123', // from mocked auth.currentUser
        }),
        { merge: true }
      );
    });

    it('should update both categories and vendors', async () => {
      const mockDb = { type: 'firestore' } as any;
      const mockDocRef = { path: 'config/org456' };
      
      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(setDoc).mockResolvedValue(undefined as any);

      const payload: Partial<OrgExpenseConfig> = {
        categories: ['newCat1', 'newCat2'],
        vendors: [{ id: 'newV1', name: 'New Vendor' }],
      };

      await updateExpenseConfig(mockDb, 'org456', payload);

      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          expenseCategories: [
            { id: 'newCat1', label: 'newCat1', order: 10, active: true },
            { id: 'newCat2', label: 'newCat2', order: 20, active: true },
          ],
          vendors: payload.vendors,
        }),
        { merge: true }
      );
    });
  });

  describe('initializeOrgConfig', () => {
    it('should throw error if orgId is not provided', async () => {
      await expect(initializeOrgConfig(null, '')).rejects.toThrow('orgId is required for initializeOrgConfig');
    });

    it('should copy expenseCategories and vendors from config/global to config/{orgId}', async () => {
      const mockDb = { type: 'firestore' } as any;
      const mockGlobalRef = { path: 'config/global' };
      const mockOrgRef = { path: 'config/org123' };
      
      vi.mocked(doc)
        .mockReturnValueOnce(mockGlobalRef as any) // First call for global config
        .mockReturnValueOnce(mockOrgRef as any);   // Second call for org config
      
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          expenseCategories: [
            { id: 'cat1', label: 'Category 1', order: 10, active: true },
            { id: 'cat2', label: 'Category 2', order: 20, active: true },
          ],
          vendors: [
            { id: 'v1', name: 'Vendor 1', iban: 'FR123' },
          ],
          someOtherField: 'should not be copied',
        }),
      } as any);

      vi.mocked(setDoc).mockResolvedValue(undefined);

      await initializeOrgConfig(mockDb, 'org123', 'user@example.com');

      expect(doc).toHaveBeenCalledWith(mockDb, 'config', 'global');
      expect(doc).toHaveBeenCalledWith(mockDb, 'config', 'org123');
      expect(setDoc).toHaveBeenCalledWith(
        mockOrgRef,
        expect.objectContaining({
          expenseCategories: [
            { id: 'cat1', label: 'Category 1', order: 10, active: true },
            { id: 'cat2', label: 'Category 2', order: 20, active: true },
          ],
          vendors: [
            { id: 'v1', name: 'Vendor 1', iban: 'FR123' },
          ],
          createdBy: 'user@example.com',
          updatedBy: 'user@example.com',
        })
      );
    });

    it('should create default empty config if global does not exist', async () => {
      const mockDb = { type: 'firestore' } as any;
      const mockGlobalRef = { path: 'config/global' };
      const mockOrgRef = { path: 'config/org456' };
      
      vi.mocked(doc)
        .mockReturnValueOnce(mockGlobalRef as any)
        .mockReturnValueOnce(mockOrgRef as any);
      
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
      } as any);

      vi.mocked(setDoc).mockResolvedValue(undefined);

      await initializeOrgConfig(mockDb, 'org456', 'admin@example.com');

      expect(setDoc).toHaveBeenCalledWith(
        mockOrgRef,
        expect.objectContaining({
          expenseCategories: [],
          vendors: [],
          createdBy: 'admin@example.com',
          updatedBy: 'admin@example.com',
        })
      );
    });

    it('should add createdAt, createdBy, updatedAt, updatedBy metadata', async () => {
      const mockDb = { type: 'firestore' } as any;
      const mockGlobalRef = { path: 'config/global' };
      const mockOrgRef = { path: 'config/org789' };
      
      vi.mocked(doc)
        .mockReturnValueOnce(mockGlobalRef as any)
        .mockReturnValueOnce(mockOrgRef as any);
      
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          expenseCategories: [],
          vendors: [],
        }),
      } as any);

      vi.mocked(setDoc).mockResolvedValue(undefined);

      await initializeOrgConfig(mockDb, 'org789', 'creator@example.com');

      expect(setDoc).toHaveBeenCalledWith(
        mockOrgRef,
        expect.objectContaining({
          createdAt: expect.anything(),
          createdBy: 'creator@example.com',
          updatedAt: expect.anything(),
          updatedBy: 'creator@example.com',
        })
      );
    });

    it('should use "system" as default createdBy if not provided', async () => {
      const mockDb = { type: 'firestore' } as any;
      const mockGlobalRef = { path: 'config/global' };
      const mockOrgRef = { path: 'config/org999' };
      
      vi.mocked(doc)
        .mockReturnValueOnce(mockGlobalRef as any)
        .mockReturnValueOnce(mockOrgRef as any);
      
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
      } as any);

      vi.mocked(setDoc).mockResolvedValue(undefined);

      await initializeOrgConfig(mockDb, 'org999');

      expect(setDoc).toHaveBeenCalledWith(
        mockOrgRef,
        expect.objectContaining({
          createdBy: 'system',
          updatedBy: 'system',
        })
      );
    });

    it('should handle Firestore errors gracefully without throwing', async () => {
      const mockDb = { type: 'firestore' } as any;
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      vi.mocked(doc).mockReturnValue({ path: 'config/global' } as any);
      vi.mocked(getDoc).mockRejectedValue(new Error('Firestore connection error'));

      // Should not throw
      await expect(initializeOrgConfig(mockDb, 'org-error', 'user@test.com')).resolves.not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Erreur lors de l\'initialisation de la config pour org org-error'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
