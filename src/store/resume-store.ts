import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Resume, TemplateKind, IntakeAnswers } from '@/lib/schema/resume';

type ResumeState = {
  id: string;
  template: TemplateKind;
  data: Resume | null;
  sourceInput: { scenario: string; answers: IntakeAnswers | null };
  createdAt: number;
  updatedAt: number;

  setResume: (resume: Resume) => void;
  patchResume: (patch: Partial<Resume>) => void;
  setTemplate: (template: TemplateKind) => void;
  setSourceInput: (scenario: string, answers: IntakeAnswers | null) => void;
  newDraft: () => void;
};

const emptyState = () => ({
  id: nanoid(),
  template: 'dense' as TemplateKind,
  data: null as Resume | null,
  sourceInput: { scenario: '', answers: null as IntakeAnswers | null },
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const useResumeStore = create<ResumeState>()(
  persist(
    (set) => ({
      ...emptyState(),
      setResume: (resume) =>
        set({ data: resume, updatedAt: Date.now() }),
      patchResume: (patch) =>
        set((state) => ({
          data: state.data ? { ...state.data, ...patch } : null,
          updatedAt: Date.now(),
        })),
      setTemplate: (template) =>
        set({ template, updatedAt: Date.now() }),
      setSourceInput: (scenario, answers) =>
        set({ sourceInput: { scenario, answers }, updatedAt: Date.now() }),
      newDraft: () => set(emptyState()),
    }),
    {
      name: 'resume:current',
      version: 1,
    }
  )
);
