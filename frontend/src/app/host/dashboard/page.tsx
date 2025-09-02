"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { apiGetOrganizationEvents, apiUpdateEventStatus, apiGetEventsRegistrationCounts } from "@/lib/api";

type HostEvent = {
  id: string;
  name: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  eventDescription?: string;
  organization?: string;
  organizationDescription?: string;
  approvalNeeded?: boolean; // Added for approval status
};

export default function HostDashboardPage() {
  const router = useRouter();
  const { organization, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const [events, setEvents] = useState<HostEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);

  useEffect(() => {
    if (!authLoading && isAuthenticated && organization) {
      loadEvents();
      setOrgName(organization.name || "");
      setOrgDescription(organization.description || "");
    } else if (!authLoading && !isAuthenticated) {
      router.replace('/host/signin');
    }
  }, [authLoading, isAuthenticated, organization, router]);

  async function loadEvents() {
    if (!organization?.address) {
      return;
    }
    
    try {
      setLoading(true);
      const eventsData = await apiGetOrganizationEvents(organization.address);
      setEvents(eventsData);
      
      // Fetch participant counts for all events
      if (eventsData.length > 0) {
        await loadParticipantCounts(eventsData.map(e => e.id));
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      alert('Failed to load events');
      } finally {
        setLoading(false);
      }
    }

  async function loadParticipantCounts(eventIds: string[]) {
    try {
      setLoadingCounts(true);
      console.log('Loading participant counts for events:', eventIds);
      const counts = await apiGetEventsRegistrationCounts(eventIds);
      console.log('Received participant counts:', counts);
      setParticipantCounts(counts);
    } catch (error) {
      console.error('Failed to fetch participant counts:', error);
      // Set default counts to 0 if API fails
      const defaultCounts: Record<string, number> = {};
      eventIds.forEach(id => defaultCounts[id] = 0);
      setParticipantCounts(defaultCounts);
    } finally {
      setLoadingCounts(false);
    }
  }

  async function updateEventStatus(eventId: string, newStatus: 'draft' | 'published') {
    try {
      setUpdatingStatus(eventId);
      await apiUpdateEventStatus(eventId, newStatus);
      // Reload events to get updated data
      await loadEvents();
    } catch (error) {
      console.error('Failed to update event status:', error);
      alert('Failed to update event status');
    } finally {
      setUpdatingStatus(null);
    }
  }

  async function updateOrganization() {
    if (!organization?.id) return;
    
    try {
      const response = await fetch('/api/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: organization.id,
          name: orgName,
          description: orgDescription
        })
      });
      
      if (response.ok) {
        setEditingOrg(false);
        // Reload organization data
        window.location.reload();
      } else {
        alert('Failed to update organization');
      }
    } catch (error) {
      console.error('Failed to update organization:', error);
      alert('Failed to update organization');
    }
  }

  function createEvent() {
    router.push('/host/create');
  }

  function handleLogout() {
    signOut();
    router.push('/host/signin');
  }

  if (authLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm">Loading...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to signin
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Organizer Dashboard</h1>
          <p className="text-foreground/60">Manage your events and organization</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadEvents} 
            disabled={loading}
            className="btn-secondary"
            title="Refresh events"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
          <Link href="/host/qr-scanner" className="btn-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            QR Scanner
          </Link>
          <Link href="/host/qr-demo" className="btn-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            QR Demo
          </Link>
          <button onClick={createEvent} className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Event
          </button>
          <button onClick={handleLogout} className="btn-secondary border-destructive/20 text-destructive hover:bg-destructive/5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Organization Information Section */}
      <div className="mb-8 card p-6 fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Organization Details</h2>
          {!editingOrg && (
            <button 
              onClick={() => setEditingOrg(true)}
              className="btn-secondary"
            >
              Edit
            </button>
          )}
        </div>
        

        
        {editingOrg ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground/80">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="input"
                placeholder="Enter organization name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground/80">Description</label>
              <textarea
                value={orgDescription}
                onChange={(e) => setOrgDescription(e.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="Enter organization description"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={updateOrganization}
                className="btn-primary"
              >
                Save Changes
              </button>
              <button 
                onClick={() => {
                  setEditingOrg(false);
                  setOrgName(organization?.name || "");
                  setOrgDescription(organization?.description || "");
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-lg font-medium text-foreground">{organization?.name}</p>
              {organization?.description && (
                <p className="text-foreground/70 leading-relaxed">{organization.description}</p>
              )}
            </div>
            
            {/* Wallet Address Display */}
            {organization?.address && (
              <div className="pt-2 border-t border-foreground/10">
                <div className="flex items-center gap-2 text-sm text-foreground/60">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="font-medium">Wallet Address:</span>
                  <span className="font-mono bg-foreground/5 px-2 py-1 rounded">
                    {organization.address.slice(0, 6)}...{organization.address.slice(-4)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Events Summary Section */}
      {events.length > 0 && (
        <div className="mb-8 card p-6 fade-in">
          <h2 className="text-xl font-semibold mb-6 text-foreground">Events Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 glass rounded-xl">
              <div className="text-3xl font-bold text-foreground mb-2">{events.length}</div>
              <div className="text-sm text-foreground/70 font-medium">Total Events</div>
            </div>
            <div className="text-center p-4 glass rounded-xl">
              <div className="text-3xl font-bold text-foreground mb-2">
                {events.filter(e => e.status === 'published').length}
              </div>
              <div className="text-sm text-foreground/70 font-medium">Published Events</div>
            </div>
            <div className="text-center p-4 glass rounded-xl">
              <div className="text-3xl font-bold text-foreground mb-2">
                {loadingCounts ? (
                  <span className="text-sm">Loading...</span>
                ) : (
                  Object.values(participantCounts).reduce((sum, count) => sum + count, 0)
                )}
              </div>
              <div className="text-sm text-foreground/70 font-medium">Total Participants</div>
            </div>
      </div>
          
          {/* Approval Events Summary */}
          {events.filter(e => e.approvalNeeded && e.status === 'published').length > 0 && (
            <div className="mt-6 p-4 glass rounded-xl border border-warning/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <div className="text-lg font-semibold text-foreground">
                      {events.filter(e => e.approvalNeeded && e.status === 'published').length} Events Require Approval
                    </div>
                    <div className="text-sm text-foreground/70">
                      Review and approve participant registrations
                    </div>
                  </div>
                </div>
                <Link 
                  href={`/events/${events.find(e => e.approvalNeeded && e.status === 'published')?.id}/review`}
                  className="btn-primary text-sm px-4 py-2"
                >
                  Review Now
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/60">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 card fade-in">
          <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No events yet</h3>
          <p className="text-foreground/60 mb-6">Create your first event to get started</p>
          <button onClick={createEvent} className="btn-primary">
            Create your first event
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Draft Events Section */}
          <div className="fade-in">
            <h2 className="text-xl font-semibold mb-6 text-foreground flex items-center gap-3">
              <div className="w-2 h-2 bg-foreground/40 rounded-full"></div>
              Draft Events
            </h2>
            {events.filter(e => e.status === 'draft').length === 0 ? (
              <div className="text-center py-8 card">
                <p className="text-foreground/60">No draft events</p>
              </div>
            ) : (
              <div className="space-y-4">
                {events.filter(e => e.status === 'draft').map((e, index) => (
                  <div key={e.id} className="card p-6 slide-in" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="text-lg font-semibold text-foreground">{e.name}</div>
                        <div className="text-sm text-foreground/60">{new Date(e.updatedAt).toLocaleString()}</div>
                        {/* Approval Status Indicator */}
                        {e.approvalNeeded && (
                          <div className="flex items-center gap-2 text-sm text-warning">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span>Approval Required</span>
                          </div>
                        )}
                        {/* Participant Count */}
                        <div className="flex items-center gap-2 text-sm text-foreground/70">
                          <div className="w-2 h-2 rounded-full bg-foreground/40"></div>
                          {loadingCounts ? (
                            <span className="text-foreground/40">Loading participants...</span>
                          ) : (
                            <span>{participantCounts[e.id] || 0} participants</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-6">
                        <span className="px-3 py-1 rounded-full text-xs font-medium glass border border-foreground/10">
                          Draft
                        </span>
                        <button 
                          onClick={() => updateEventStatus(e.id, 'published')}
                          disabled={updatingStatus === e.id}
                          className="btn-primary text-sm px-4 py-2"
                        >
                          {updatingStatus === e.id ? 'Publishing...' : 'Publish'}
                        </button>
                      </div>
                    </div>
                    
                    {/* Event Preview */}
                    <div className="mb-4 p-4 glass rounded-lg">
                      {e.eventDescription ? (
                        <div className="line-clamp-2 text-foreground/80">{e.eventDescription}</div>
                      ) : (
                        <div className="text-foreground/40 italic">No description</div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Link 
                        className="btn-secondary text-sm px-4 py-2" 
                        href={`/events/${e.id}/edit`}
                      >
                        Edit Content
                      </Link>
                      <Link 
                        className="btn-secondary text-sm px-4 py-2" 
                        href={`/events/${e.id}`}
                      >
                        Preview
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Published Events Section */}
          <div className="fade-in">
            <h2 className="text-xl font-semibold mb-6 text-foreground flex items-center gap-3">
              <div className="w-2 h-2 bg-foreground/40 rounded-full"></div>
              Published Events
            </h2>
            {events.filter(e => e.status === 'published').length === 0 ? (
              <div className="text-center py-8 card">
                <p className="text-foreground/60">No published events</p>
        </div>
      ) : (
              <div className="space-y-4">
                {events.filter(e => e.status === 'published').map((e, index) => (
                  <div key={e.id} className="card p-6 slide-in" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="text-lg font-semibold text-foreground">{e.name}</div>
                        <div className="text-sm text-foreground/60">{new Date(e.updatedAt).toLocaleString()}</div>
                        {/* Participant Count */}
                        <div className="flex items-center gap-2 text-sm text-foreground/70">
                          <div className="w-2 h-2 rounded-full bg-foreground/40"></div>
                          {loadingCounts ? (
                            <span className="text-foreground/40">Loading participants...</span>
                          ) : (
                            <span>{participantCounts[e.id] || 0} participants</span>
                          )}
                        </div>
              </div>
                      <div className="flex items-center gap-3 ml-6">
                        <span className="px-3 py-1 rounded-full text-xs font-medium glass border border-foreground/10">
                          Published
                        </span>
                        <button 
                          onClick={() => updateEventStatus(e.id, 'draft')}
                          disabled={updatingStatus === e.id}
                          className="btn-secondary text-sm px-4 py-2"
                        >
                          {updatingStatus === e.id ? 'Unpublishing...' : 'Unpublish'}
                        </button>
                        <Link className="btn-secondary text-sm px-4 py-2" href={`/events/${e.id}/edit`}>Edit</Link>
                        <Link className="btn-primary text-sm px-4 py-2" href={`/events/${e.id}`}>View</Link>
                        {/* Approve Participants Button - Only for approval-based events */}
                        {e.approvalNeeded && (
                          <Link 
                            className="btn-primary text-sm px-4 py-2 bg-success hover:bg-success/80" 
                            href={`/events/${e.id}/review`}
                          >
                            Approve Participants
                          </Link>
                        )}
                      </div>
                    </div>
              </div>
          ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

