import { create } from "zustand";
import { ScreenElement, ChatMessage, AIEditCommand } from "@/types";

interface BuilderState {
  // ─── Project ───────────────────────────────
  projectId: string | null;
  screenId: string | null;
  screenName: string;

  // ─── Elements ──────────────────────────────
  elements: ScreenElement[];
  selectedId: string | null;

  // ─── History (undo/redo) ───────────────────
  history: Array<{ elements: ScreenElement[]; label?: string; timestamp: number }>;
  historyIndex: number;

  // ─── Chat ──────────────────────────────────
  chatMessages: ChatMessage[];
  isChatLoading: boolean;

  // ─── UI State ──────────────────────────────
  zoom: number;
  showLibrary: boolean;
  showProperties: boolean;
  viewportMode: "desktop" | "tablet" | "mobile";
  isSaving: boolean;
  lastSaved: string | null;

  // ─── Welcome / Generate Screen ────────────
  pendingWelcomePrompt: string | null;

  // ─── Actions ───────────────────────────────
  setProject: (projectId: string, screenId: string, screenName: string) => void;
  setElements: (elements: ScreenElement[], pushHistory?: boolean, label?: string) => void;
  setSelectedId: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  addChatMessage: (msg: Omit<ChatMessage, "id" | "createdAt">) => string;
  updateChatMessage: (id: string, updates: Partial<Pick<ChatMessage, "content" | "metadata">>) => void;
  setChatLoading: (loading: boolean) => void;
  setZoom: (zoom: number) => void;
  setShowLibrary: (show: boolean) => void;
  setShowProperties: (show: boolean) => void;
  setViewportMode: (mode: "desktop" | "tablet" | "mobile") => void;
  setSaving: (saving: boolean, timestamp?: string) => void;
  setPendingWelcomePrompt: (prompt: string | null) => void;
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  projectId: null,
  screenId: null,
  screenName: "Untitled Screen",

  elements: [],
  selectedId: null,

  history: [{ elements: [], timestamp: Date.now() }],
  historyIndex: 0,

  chatMessages: [
    {
      id: "welcome",
      role: "assistant",
      content: `Hi! I'm your screen builder assistant. I can help you build and edit this page.\n\nTry:\n• Click any section to select it, then describe what to change\n• "Add a pricing section"\n• "Change the hero title to ..."\n• "Make the button green"\n• "Remove this section"`,
      createdAt: new Date().toISOString(),
    },
  ],
  isChatLoading: false,

  zoom: 100,
  showLibrary: false,
  showProperties: true,
  viewportMode: "desktop",
  isSaving: false,
  lastSaved: null,
  pendingWelcomePrompt: null,

  setProject: (projectId, screenId, screenName) =>
    set({ projectId, screenId, screenName }),

  setElements: (elements, pushHistory = true, label?) => {
    const { history, historyIndex } = get();
    if (pushHistory) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({ elements, label, timestamp: Date.now() });
      // Keep max 50 history entries
      if (newHistory.length > 50) newHistory.shift();
      set({
        elements,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
    } else {
      set({ elements });
    }
  },

  setSelectedId: (id) => set({ selectedId: id }),

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({
        historyIndex: newIndex,
        elements: history[newIndex].elements,
      });
    }
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({
        historyIndex: newIndex,
        elements: history[newIndex].elements,
      });
    }
  },

  addChatMessage: (msg) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      chatMessages: [...state.chatMessages, newMsg],
    }));
    return newMsg.id;
  },

  updateChatMessage: (id, updates) => {
    set((state) => ({
      chatMessages: state.chatMessages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    }));
  },

  setChatLoading: (loading) => set({ isChatLoading: loading }),
  setZoom: (zoom) => set({ zoom }),
  setShowLibrary: (show) => set({ showLibrary: show }),
  setShowProperties: (show) => set({ showProperties: show }),
  setViewportMode: (mode) => set({ viewportMode: mode }),
  setSaving: (saving, timestamp) =>
    set({ isSaving: saving, lastSaved: timestamp || get().lastSaved }),
  setPendingWelcomePrompt: (prompt) => set({ pendingWelcomePrompt: prompt }),
}));
