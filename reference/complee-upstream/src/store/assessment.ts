// Complee — Zustand store with localStorage persistence

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AssessmentResult,
  CompanyProfile,
  CountryCode,
  InstitutionType,
} from "@/data/requirements";

export interface UploadedDocument {
  id: string;
  name: string;
  pages?: number;
  sample?: boolean;
}

interface AssessmentState {
  profile: CompanyProfile;
  selectedServices: string[];
  uploadedDocuments: UploadedDocument[];
  samplePackSelected: boolean;
  assessmentResults: AssessmentResult | null;
  completedTasks: string[];
  currentStep: number;

  // Profile
  setCompanyName: (name: string) => void;
  setHomeCountry: (code: CountryCode) => void;
  setTargetCountry: (code: CountryCode) => void;
  setInstitutionType: (t: InstitutionType) => void;
  setProfile: (p: Partial<CompanyProfile>) => void;

  // Services
  setSelectedServices: (s: string[]) => void;
  toggleService: (s: string) => void;

  // Documents
  setUploadedDocuments: (d: UploadedDocument[]) => void;
  addUploadedDocument: (d: UploadedDocument) => void;
  removeUploadedDocument: (id: string) => void;
  setSamplePackSelected: (v: boolean) => void;

  // Results
  setAssessmentResults: (r: AssessmentResult | null) => void;

  // Roadmap progress
  completeTask: (id: string) => void;
  uncompleteTask: (id: string) => void;
  resetCompletedTasks: () => void;

  // Flow
  setCurrentStep: (n: number) => void;
  resetAssessment: () => void;
}

const DEFAULT_PROFILE: CompanyProfile = {
  companyName: "FlowPay",
  homeCountry: "FR",
  targetCountry: "GB",
  institutionType: "EMI",
};

const DEFAULT_SERVICES = [
  "Wallet accounts",
  "Card issuing",
  "Strong customer authentication",
  "Open banking AISP",
  "Fraud monitoring",
];

export const useAssessment = create<AssessmentState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      selectedServices: DEFAULT_SERVICES,
      uploadedDocuments: [],
      samplePackSelected: false,
      assessmentResults: null,
      completedTasks: [],
      currentStep: 1,

      setCompanyName: (companyName) =>
        set((s) => ({ profile: { ...s.profile, companyName } })),
      setHomeCountry: (homeCountry) =>
        set((s) => ({ profile: { ...s.profile, homeCountry } })),
      setTargetCountry: (targetCountry) =>
        set((s) => ({ profile: { ...s.profile, targetCountry } })),
      setInstitutionType: (institutionType) =>
        set((s) => ({ profile: { ...s.profile, institutionType } })),
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),

      setSelectedServices: (selectedServices) => set({ selectedServices }),
      toggleService: (svc) =>
        set((s) => ({
          selectedServices: s.selectedServices.includes(svc)
            ? s.selectedServices.filter((x) => x !== svc)
            : [...s.selectedServices, svc],
        })),

      setUploadedDocuments: (uploadedDocuments) => set({ uploadedDocuments }),
      addUploadedDocument: (d) =>
        set((s) => ({ uploadedDocuments: [...s.uploadedDocuments, d] })),
      removeUploadedDocument: (id) =>
        set((s) => ({
          uploadedDocuments: s.uploadedDocuments.filter((d) => d.id !== id),
        })),
      setSamplePackSelected: (samplePackSelected) => set({ samplePackSelected }),

      setAssessmentResults: (assessmentResults) => set({ assessmentResults }),

      completeTask: (id) =>
        set((s) =>
          s.completedTasks.includes(id)
            ? s
            : { completedTasks: [...s.completedTasks, id] },
        ),
      uncompleteTask: (id) =>
        set((s) => ({ completedTasks: s.completedTasks.filter((t) => t !== id) })),
      resetCompletedTasks: () => set({ completedTasks: [] }),

      setCurrentStep: (currentStep) => set({ currentStep }),
      resetAssessment: () =>
        set({
          profile: DEFAULT_PROFILE,
          selectedServices: DEFAULT_SERVICES,
          uploadedDocuments: [],
          samplePackSelected: false,
          assessmentResults: null,
          completedTasks: [],
          currentStep: 1,
        }),
    }),
    {
      name: "complee_assessment_v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
    },
  ),
);
