import { create } from 'zustand';
import { apiClient } from '../lib/axios';

export interface FeatureModule {
  key: string;
  label: string;
  group: string;
  roles: Record<string, boolean>;
}

export type FeatureMatrix = Record<string, Record<string, boolean>>;

interface FeatureState {
  modules: FeatureModule[];
  configurableRoles: string[];
  featureAccess: FeatureMatrix;
  loaded: boolean;
  loading: boolean;
  fetchFeatureAccess: () => Promise<void>;
  updateFeatureAccess: (matrix: FeatureMatrix) => Promise<void>;
  /** Is a given module visible for a given role? Defaults to true (allow-by-default). */
  isEnabled: (role: string | undefined, moduleKey: string) => boolean;
}

export const useFeatureStore = create<FeatureState>((set, get) => ({
  modules: [],
  configurableRoles: [],
  featureAccess: {},
  loaded: false,
  loading: false,

  fetchFeatureAccess: async () => {
    set({ loading: true });
    try {
      const res = await apiClient.get('/organization/feature-access');
      const data = res.data?.data || {};
      set({
        modules: data.modules || [],
        configurableRoles: data.configurable_roles || [],
        featureAccess: data.feature_access || {},
        loaded: true,
        loading: false,
      });
    } catch {
      // On failure, leave allow-by-default so nothing is wrongly hidden.
      set({ loaded: true, loading: false });
    }
  },

  updateFeatureAccess: async (matrix: FeatureMatrix) => {
    const res = await apiClient.put('/organization/feature-access', { feature_access: matrix });
    const data = res.data?.data || {};
    set({
      modules: data.modules || get().modules,
      configurableRoles: data.configurable_roles || get().configurableRoles,
      featureAccess: data.feature_access || matrix,
    });
  },

  isEnabled: (role, moduleKey) => {
    if (!role) return true;
    // Admin / super_admin always see everything.
    if (role === 'admin' || role === 'super_admin') return true;
    const { featureAccess } = get();
    const roleMap = featureAccess[role];
    if (!roleMap || !(moduleKey in roleMap)) return true; // allow-by-default
    return !!roleMap[moduleKey];
  },
}));
