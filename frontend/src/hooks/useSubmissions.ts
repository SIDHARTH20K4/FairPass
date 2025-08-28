import { useCallback, useEffect, useState } from "react";
import { 
  apiListRegistrations, 
  apiCreateRegistration, 
  apiUpdateRegistration,
  apiGetUserRegistration 
} from "@/lib/api";

export type SubmissionItem = {
  id: string;
  eventId: string;
  address: string;
  values: Record<string, string>;
  status: "pending" | "approved" | "rejected";
  qrCid?: string;
  qrUrl?: string;
  jsonCid?: string;
  jsonUrl?: string;
  signature: string;
  createdAt: number;
};

const STORAGE_KEY = "fairpass.submissions.v1";

function readStored(): SubmissionItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SubmissionItem[]) : [];
  } catch {
    return [];
  }
}

function writeStored(submissions: SubmissionItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
}

const HAS_API = !!process.env.NEXT_PUBLIC_API_URL;

export function useSubmissions(eventId?: string) {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadSubmissions = useCallback(async (id?: string) => {
    if (!id) return;
    
    try {
      setLoading(true);
      if (HAS_API) {
        const list = await apiListRegistrations(id);
        setSubmissions(list as SubmissionItem[]);
      } else {
        const stored = readStored();
        setSubmissions(stored.filter(s => s.eventId === id));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (eventId) {
      loadSubmissions(eventId);
    }
  }, [eventId, loadSubmissions]);

  const addSubmission = useCallback(async (submissionData: Omit<SubmissionItem, "id" | "createdAt">) => {
    if (!eventId) return;
    
    if (HAS_API) {
      const created = await apiCreateRegistration(eventId, submissionData);
      setSubmissions((prev) => [created as SubmissionItem, ...prev]);
      return (created as SubmissionItem).id;
    }
    
    const id = `${Date.now()}`;
    const next = [{ id, createdAt: Date.now(), ...submissionData }, ...readStored()];
    setSubmissions(next.filter(s => s.eventId === eventId));
    writeStored(next);
    return id;
  }, [eventId]);

  const updateSubmission = useCallback(async (submissionId: string, patch: Partial<SubmissionItem>) => {
    if (!eventId) return;
    
    if (HAS_API) {
      const updated = await apiUpdateRegistration(eventId, submissionId, patch);
      setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? (updated as SubmissionItem) : s)));
      return;
    }
    
    const current = readStored();
    const next = current.map((s) => (s.id === submissionId ? { ...s, ...patch } : s));
    setSubmissions(next.filter(s => s.eventId === eventId));
    writeStored(next);
  }, [eventId]);

  const getUserSubmission = useCallback(async (address: string) => {
    if (!eventId || !address) return null;
    
    if (HAS_API) {
      try {
        const submission = await apiGetUserRegistration(eventId, address);
        return submission as SubmissionItem;
      } catch (error) {
        // User not registered
        return null;
      }
    }
    
    const stored = readStored();
    return stored.find(s => s.eventId === eventId && s.address === address) || null;
  }, [eventId]);

  return {
    submissions,
    loading,
    addSubmission,
    updateSubmission,
    getUserSubmission,
    loadSubmissions
  };
}
