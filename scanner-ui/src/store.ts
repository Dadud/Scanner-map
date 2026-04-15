import { create } from 'zustand';
import type { Call, Talkgroup, User } from './types';

interface AppState {
  calls: Call[];
  talkgroups: Talkgroup[];
  selectedCall: Call | null;
  user: User | null;
  isAuthenticated: boolean;
  mapCenter: [number, number];
  mapZoom: number;

  setCalls: (calls: Call[]) => void;
  addCall: (call: Call) => void;
  updateCall: (call: Call) => void;
  removeCall: (id: string) => void;
  setSelectedCall: (call: Call | null) => void;
  setTalkgroups: (talkgroups: Talkgroup[]) => void;
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuth: boolean) => void;
  setMapCenter: (center: [number, number]) => void;
  setMapZoom: (zoom: number) => void;
}

export const useStore = create<AppState>((set) => ({
  calls: [],
  talkgroups: [],
  selectedCall: null,
  user: null,
  isAuthenticated: false,
  mapCenter: [39.8283, -98.5795],
  mapZoom: 5,

  setCalls: (calls) => set({ calls }),
  addCall: (call) => set((state) => ({ calls: [call, ...state.calls] })),
  updateCall: (call) =>
    set((state) => ({
      calls: state.calls.map((c) => (c.id === call.id ? call : c)),
      selectedCall: state.selectedCall?.id === call.id ? call : state.selectedCall
    })),
  removeCall: (id) =>
    set((state) => ({
      calls: state.calls.filter((c) => c.id !== id),
      selectedCall: state.selectedCall?.id === id ? null : state.selectedCall
    })),
  setSelectedCall: (call) => set({ selectedCall: call }),
  setTalkgroups: (talkgroups) => set({ talkgroups }),
  setUser: (user) => set({ user }),
  setAuthenticated: (isAuth) => set({ isAuthenticated: isAuth }),
  setMapCenter: (center) => set({ mapCenter: center }),
  setMapZoom: (zoom) => set({ mapZoom: zoom })
}));