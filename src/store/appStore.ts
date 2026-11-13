import { create } from 'zustand';
import type { Brand, SocialAccount } from '../types';

interface AppState {
  authenticated: boolean;
  setupRequired: boolean;
  loading: boolean;
  brands: Brand[];
  currentBrandId: string | null;
  accounts: SocialAccount[];
  sidebarOpen: boolean;

  setAuth: (auth: boolean, setup: boolean) => void;
  setLoading: (v: boolean) => void;
  setBrands: (brands: Brand[]) => void;
  setCurrentBrandId: (id: string | null) => void;
  setAccounts: (accounts: SocialAccount[]) => void;
  setSidebarOpen: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  authenticated: false,
  setupRequired: false,
  loading: true,
  brands: [],
  currentBrandId: null,
  accounts: [],
  sidebarOpen: true,

  setAuth: (authenticated, setupRequired) => set({ authenticated, setupRequired }),
  setLoading: (loading) => set({ loading }),
  setBrands: (brands) => set({ brands }),
  setCurrentBrandId: (currentBrandId) => set({ currentBrandId }),
  setAccounts: (accounts) => set({ accounts }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
