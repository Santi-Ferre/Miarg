import { create } from 'zustand';

export interface DemoProfile {
  firstName: string;
  lastName: string;
  code: string;
  birthDate: string;
  address: string;
}

export type DemoView = 'generator' | 'home' | 'credential' | 'admin';

interface DemoState {
  profile: DemoProfile | null;
  view: DemoView;
  setProfile: (profile: DemoProfile | null) => void;
  setView: (view: DemoView) => void;
}

export const useAppStore = create<DemoState>((set) => ({
  profile: null,
  view: 'generator',
  setProfile: (profile) => set({ profile }),
  setView: (view) => set({ view }),
}));
