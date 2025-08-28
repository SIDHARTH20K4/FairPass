const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export type ApiEvent = any;
export type ApiSubmission = any;

async function apiFetch(path: string, init?: RequestInit) {
  if (!BASE_URL) throw new Error("API URL not configured");
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

// Event endpoints
export async function apiListEvents(location?: string): Promise<ApiEvent[]> {
  const params = location && location !== 'Worldwide' ? `?location=${encodeURIComponent(location)}` : '';
  return apiFetch(`/events${params}`);
}

export async function apiGetEvent(id: string): Promise<ApiEvent> {
  return apiFetch(`/events/${id}`);
}

export async function apiCreateEvent(eventData: any): Promise<ApiEvent> {
  return apiFetch(`/events`, { method: "POST", body: JSON.stringify(eventData) });
}

export async function apiUpdateEvent(id: string, patch: any): Promise<ApiEvent> {
  return apiFetch(`/events/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

// Registration endpoints
export async function apiListRegistrations(eventId: string): Promise<ApiSubmission[]> {
  return apiFetch(`/events/${eventId}/registrations`);
}

export async function apiCreateRegistration(eventId: string, registrationData: any): Promise<ApiSubmission> {
  return apiFetch(`/events/${eventId}/registrations`, { 
    method: "POST", 
    body: JSON.stringify(registrationData) 
  });
}

export async function apiUpdateRegistration(
  eventId: string, 
  submissionId: string, 
  patch: any
): Promise<ApiSubmission> {
  return apiFetch(`/events/${eventId}/registrations/${submissionId}`, { 
    method: "PATCH", 
    body: JSON.stringify(patch) 
  });
}

export async function apiGetUserRegistration(eventId: string, address: string): Promise<ApiSubmission> {
  return apiFetch(`/events/${eventId}/registrations/user/${address}`);
}
