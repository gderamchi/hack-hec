"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type { AnalysisResult } from "@/lib/types";
import {
  DEFAULT_COMPLEE_PROFILE,
  DEFAULT_SELECTED_REGULATIONS,
  DEFAULT_SELECTED_SERVICES,
  SAMPLE_DOCUMENTS,
  documentsForAnalysis,
  toAgentProfilePayload,
  toCompanyProfile,
  type AgentSeedStatus,
  type CompleeCountryCode,
  type CompleeDocument,
  type CompleeProfile
} from "@/lib/complee-frontend";
import type { InstitutionType } from "@/lib/types";

const STORAGE_KEY = "complee_assessment_next_v1";

type AssessmentState = {
  profile: CompleeProfile;
  selectedServices: string[];
  selectedRegulations: string[];
  uploadedDocuments: CompleeDocument[];
  samplePackSelected: boolean;
  result: AnalysisResult | null;
  analysisError: string;
  isAnalyzing: boolean;
  agentSeedStatus: AgentSeedStatus;
};

type AssessmentContextValue = AssessmentState & {
  setCompanyName: (companyName: string) => void;
  setHomeCountry: (country: CompleeCountryCode) => void;
  setTargetCountry: (country: CompleeCountryCode) => void;
  setInstitutionType: (institutionType: InstitutionType) => void;
  toggleService: (service: string) => void;
  toggleRegulation: (regulation: string) => void;
  addUploadedDocuments: (documents: CompleeDocument[]) => void;
  removeUploadedDocument: (id: string) => void;
  loadSamplePack: () => void;
  clearSamplePack: () => void;
  setAnalysisError: (message: string) => void;
  runAnalysis: () => Promise<AnalysisResult>;
  seedLiveAgent: () => Promise<void>;
  resetAssessment: () => void;
};

const DEFAULT_STATE: AssessmentState = {
  profile: DEFAULT_COMPLEE_PROFILE,
  selectedServices: DEFAULT_SELECTED_SERVICES,
  selectedRegulations: DEFAULT_SELECTED_REGULATIONS,
  uploadedDocuments: [],
  samplePackSelected: false,
  result: null,
  analysisError: "",
  isAnalyzing: false,
  agentSeedStatus: {
    state: "idle",
    message: ""
  }
};

const AssessmentContext = createContext<AssessmentContextValue | null>(null);

export function AssessmentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AssessmentState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  const inFlightAnalysisRef = useRef<Promise<AnalysisResult> | null>(null);

  stateRef.current = state;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AssessmentState>;
        setState({
          ...DEFAULT_STATE,
          ...parsed,
          profile: {
            ...DEFAULT_COMPLEE_PROFILE,
            ...parsed.profile
          },
          agentSeedStatus: DEFAULT_STATE.agentSeedStatus,
          isAnalyzing: false
        });
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          profile: state.profile,
          selectedServices: state.selectedServices,
          selectedRegulations: state.selectedRegulations,
          uploadedDocuments: state.uploadedDocuments,
          samplePackSelected: state.samplePackSelected,
          result: state.result,
          analysisError: state.analysisError
        })
      );
    } catch {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            profile: state.profile,
            selectedServices: state.selectedServices,
            selectedRegulations: state.selectedRegulations,
            uploadedDocuments: state.uploadedDocuments.map((document) => ({
              ...document,
              content: document.sample ? document.content : ""
            })),
            samplePackSelected: state.samplePackSelected,
            result: state.result,
            analysisError:
              "Local storage is full. Uploaded document text will stay in memory for this tab."
          })
        );
      } catch {
        // Keep the live in-memory state usable even if persistence is unavailable.
      }
    }
  }, [hydrated, state]);

  const patchState = useCallback((patch: Partial<AssessmentState>) => {
    setState((current) => ({ ...current, ...patch }));
  }, []);

  const updateProfile = useCallback((patch: Partial<CompleeProfile>) => {
    setState((current) => ({
      ...current,
      profile: {
        ...current.profile,
        ...patch
      },
      analysisError: "",
      agentSeedStatus: DEFAULT_STATE.agentSeedStatus
    }));
  }, []);

  const runAnalysis = useCallback(async () => {
    if (inFlightAnalysisRef.current) {
      return inFlightAnalysisRef.current;
    }

    const currentState = stateRef.current;
    const companyProfile = toCompanyProfile(
      currentState.profile,
      currentState.selectedServices
    );
    const documents = documentsForAnalysis(currentState.uploadedDocuments);

    if (!companyProfile.companyName) {
      throw new Error("Enter the company name before running the assessment.");
    }

    if (currentState.profile.homeCountry === currentState.profile.targetCountry) {
      throw new Error("Choose a different target country to run an expansion assessment.");
    }

    if (companyProfile.services.length === 0) {
      throw new Error("Select at least one service to assess.");
    }

    if (documents.length === 0) {
      throw new Error("Upload documents or use the FlowPay sample pack to continue.");
    }

    patchState({ isAnalyzing: true, analysisError: "" });

    const analysisPromise = (async () => {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyProfile, documents })
      });
      const payload = (await response.json().catch(() => null)) as
        | (AnalysisResult & {
            error?: string;
            missingRequiredDocuments?: Array<{ title: string }>;
          })
        | null;

      if (!response.ok || !payload || payload.error) {
        const missing = payload?.missingRequiredDocuments
          ?.map((document) => document.title)
          .join(", ");
        throw new Error(
          missing
            ? `${payload?.error ?? "Missing required documents"}: ${missing}`
            : payload?.error ?? "Analysis failed. Check the server logs."
        );
      }

      setState((current) => ({
        ...current,
        result: payload,
        analysisError: "",
        isAnalyzing: false,
        agentSeedStatus: DEFAULT_STATE.agentSeedStatus
      }));
      return payload;
    })();

    inFlightAnalysisRef.current = analysisPromise;

    try {
      return await analysisPromise;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analysis failed.";
      setState((current) => ({
        ...current,
        analysisError: message,
        isAnalyzing: false
      }));
      throw error;
    } finally {
      inFlightAnalysisRef.current = null;
    }
  }, [patchState]);

  const seedLiveAgent = useCallback(async () => {
    const currentState = stateRef.current;

    if (!currentState.profile.companyName.trim()) {
      patchState({
        agentSeedStatus: {
          state: "error",
          message: "Add a company name before seeding the Live Agent."
        }
      });
      return;
    }

    patchState({
      agentSeedStatus: {
        state: "saving",
        message: "Saving this workspace profile to the Live Agent..."
      }
    });

    try {
      const response = await fetch("/api/agent/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          toAgentProfilePayload(
            currentState.profile,
            currentState.selectedServices,
            currentState.selectedRegulations
          )
        )
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Live Agent profile save failed.");
      }

      patchState({
        agentSeedStatus: {
          state: "saved",
          message:
            "Live Agent profile updated. Open Live Agent to monitor DORA, PSD3/PSR and target-market changes."
        }
      });
    } catch (error) {
      patchState({
        agentSeedStatus: {
          state: "error",
          message:
            error instanceof Error
              ? error.message
              : "Live Agent profile save failed."
        }
      });
    }
  }, [patchState]);

  const setAnalysisErrorValue = useCallback(
    (message: string) => patchState({ analysisError: message }),
    [patchState]
  );

  const resetAssessmentValue = useCallback(() => {
    setState(DEFAULT_STATE);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo<AssessmentContextValue>(
    () => ({
      ...state,
      setCompanyName: (companyName) => updateProfile({ companyName }),
      setHomeCountry: (homeCountry) => updateProfile({ homeCountry }),
      setTargetCountry: (targetCountry) => updateProfile({ targetCountry }),
      setInstitutionType: (institutionType) => updateProfile({ institutionType }),
      toggleService: (service) =>
        setState((current) => ({
          ...current,
          selectedServices: current.selectedServices.includes(service)
            ? current.selectedServices.filter((item) => item !== service)
            : [...current.selectedServices, service],
          analysisError: ""
        })),
      toggleRegulation: (regulation) =>
        setState((current) => ({
          ...current,
          selectedRegulations: current.selectedRegulations.includes(regulation)
            ? current.selectedRegulations.filter((item) => item !== regulation)
            : [...current.selectedRegulations, regulation],
          analysisError: ""
        })),
      addUploadedDocuments: (documents) =>
        setState((current) => ({
          ...current,
          uploadedDocuments: [...current.uploadedDocuments, ...documents],
          samplePackSelected:
            current.samplePackSelected || documents.some((document) => document.sample),
          analysisError: ""
        })),
      removeUploadedDocument: (id) =>
        setState((current) => ({
          ...current,
          uploadedDocuments: current.uploadedDocuments.filter(
            (document) => document.id !== id
          ),
          samplePackSelected: current.uploadedDocuments
            .filter((document) => document.id !== id)
            .some((document) => document.sample)
        })),
      loadSamplePack: () =>
        setState((current) => ({
          ...current,
          uploadedDocuments: [
            ...current.uploadedDocuments.filter((document) => !document.sample),
            ...SAMPLE_DOCUMENTS
          ],
          samplePackSelected: true,
          analysisError: ""
        })),
      clearSamplePack: () =>
        setState((current) => ({
          ...current,
          uploadedDocuments: current.uploadedDocuments.filter(
            (document) => !document.sample
          ),
          samplePackSelected: false
        })),
      setAnalysisError: setAnalysisErrorValue,
      runAnalysis,
      seedLiveAgent,
      resetAssessment: resetAssessmentValue
    }),
    [
      resetAssessmentValue,
      runAnalysis,
      seedLiveAgent,
      setAnalysisErrorValue,
      state,
      updateProfile
    ]
  );

  return (
    <AssessmentContext.Provider value={value}>
      {children}
    </AssessmentContext.Provider>
  );
}

export function useAssessment() {
  const context = useContext(AssessmentContext);
  if (!context) {
    throw new Error("useAssessment must be used inside AssessmentProvider");
  }
  return context;
}
