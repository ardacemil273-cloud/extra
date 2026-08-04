import { create } from 'zustand';
import { Room, ChatMessage } from '@/types';

interface RoomState {
  currentRoom: Room | null;
  chatMessages: ChatMessage[];
  isConnected: boolean;

  setRoom: (room: Room | null) => void;
  updateRoom: (room: Partial<Room>) => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  setConnected: (v: boolean) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  currentRoom: null,
  chatMessages: [],
  isConnected: false,

  setRoom: (room) => set({ currentRoom: room }),
  updateRoom: (partial) => set((s) => ({ currentRoom: s.currentRoom ? { ...s.currentRoom, ...partial } : null })),
  addChatMessage: (msg) =>
    set((s) => ({
      chatMessages: [...s.chatMessages.slice(-99), msg],
    })),
  clearChat: () => set({ chatMessages: [] }),
  setConnected: (v) => set({ isConnected: v }),
  reset: () => set({ currentRoom: null, chatMessages: [], isConnected: false }),
}));
