import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ApiConfigState = {
  apiKey: string;
  baseUrl: string;
  model: string;
  setApiKey: (v: string) => void;
  setBaseUrl: (v: string) => void;
  setModel: (v: string) => void;
  reset: () => void;
};

const DEFAULT_BASE_URL = 'https://aihubmix.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

export const useApiConfigStore = create<ApiConfigState>()(
  persist(
    (set) => ({
      apiKey: '',
      baseUrl: DEFAULT_BASE_URL,
      model: DEFAULT_MODEL,
      setApiKey: (v) => set({ apiKey: v.trim() }),
      setBaseUrl: (v) => set({ baseUrl: v.trim() || DEFAULT_BASE_URL }),
      setModel: (v) => set({ model: v.trim() || DEFAULT_MODEL }),
      reset: () => set({ apiKey: '', baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL }),
    }),
    { name: 'resume:api-config', version: 1 }
  )
);

export function hasApiKey(): boolean {
  return Boolean(useApiConfigStore.getState().apiKey);
}
