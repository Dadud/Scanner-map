import { create } from 'zustand';

interface Call {
  id: string;
  talkgroupId: string;
  timestamp: string;
  transcription: string | null;
  audioUrl: string | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  category: string | null;
  talkgroup?: any;
}

interface State {
  calls: Call[];
  selectedCall: Call | null;
  setCalls: (calls: Call[]) => void;
  addCall: (call: Call) => void;
  updateCall: (call: Call) => void;
  removeCall: (id: string) => void;
  setSelectedCall: (call: Call | null) => void;
}

export const useStore = create<State>((set) => ({
  calls: [],
  selectedCall: null,
  setCalls: (calls) => set({ calls }),
  addCall: (call) => set((state) => ({ calls: [call, ...state.calls] })),
  updateCall: (call) => set((state) => ({
    calls: state.calls.map((c) => c.id === call.id ? call : c),
    selectedCall: state.selectedCall?.id === call.id ? call : state.selectedCall
  })),
  removeCall: (id) => set((state) => ({
    calls: state.calls.filter((c) => c.id !== id),
    selectedCall: state.selectedCall?.id === id ? null : state.selectedCall
  })),
  setSelectedCall: (call) => set({ selectedCall: call }),
}));