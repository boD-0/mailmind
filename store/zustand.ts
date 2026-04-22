import { create } from 'zustand';
import { Agent, Project, Message } from '@/types';

interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  setActiveProject: (id: string) => void;
  addProject: (project: Project) => void;
  agents: Agent[];
  updateAgentStatus: (id: string, status: Agent['status'], lastAction?: string) => void;
  updateAgentProgress: (id: string, progress: number) => void;
  messages: Message[];
  addMessage: (msg: Message) => void;
  clearMessages: () => void;
  layoutMode: 'research' | 'writing' | 'review';
  setLayoutMode: (mode: 'research' | 'writing' | 'review') => void;
  language: 'en' | 'ro';
  toggleLanguage: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  projects: [],
  activeProjectId: null,
  setActiveProject: (id) => set({ activeProjectId: id }),
  addProject: (p) => set((s) => ({ projects: [...s.projects, p] })),

  agents: [
    { id: 'orchestrator', name: 'Orchestrator', role: 'orchestrator', status: 'idle' },
    { id: 'research',     name: 'Research',     role: 'research',     status: 'idle' },
    { id: 'copywriter',   name: 'Copywriter',   role: 'copywriter',   status: 'idle' },
    { id: 'strategist',   name: 'Strategist',   role: 'strategist',   status: 'idle' },
    { id: 'factchecker',  name: 'Fact-Checker', role: 'factchecker',  status: 'idle' },
  ],
  updateAgentStatus: (id, status, lastAction) =>
    set((s) => ({ agents: s.agents.map((a) => a.id === id ? { ...a, status, lastAction } : a) })),
  updateAgentProgress: (id, progress) =>
    set((s) => ({ agents: s.agents.map((a) => a.id === id ? { ...a, progress } : a) })),

  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  clearMessages: () => set({ messages: [] }),

  layoutMode: 'research',
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  language: 'en',
  toggleLanguage: () => set((s) => ({ language: s.language === 'en' ? 'ro' : 'en' })),
}));