import { create } from 'zustand';

interface UserState {
  userId: string | null;
  macaronBalance: number;
  setUserId: (id: string | null) => void;
  setMacaronBalance: (n: number) => void;
}

export const useUserStore = create<UserState>((set) => ({
  userId: null,
  macaronBalance: 0,
  setUserId: (userId) => set({ userId }),
  setMacaronBalance: (macaronBalance) => set({ macaronBalance }),
}));
