import { create } from 'zustand';

interface DashboardState {
  // User state
  user: any | null;
  setUser: (user: any) => void;
  clearUser: () => void;

  // Dashboard data
  stats: any;
  setStats: (stats: any) => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;

  // Active tab
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Notifications
  notifications: any[];
  addNotification: (notification: any) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),

  stats: null,
  setStats: (stats) => set({ stats }),

  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  error: null,
  setError: (error) => set({ error }),

  activeTab: 'overview',
  setActiveTab: (activeTab) => set({ activeTab }),

  notifications: [],
  addNotification: (notification) => set((state) => ({
    notifications: [...state.notifications, { ...notification, id: Date.now().toString() }]
  })),
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id)
  })),
  clearNotifications: () => set({ notifications: [] }),
}));
