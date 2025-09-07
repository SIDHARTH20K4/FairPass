"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { apiGetOrganizationEvents, apiUpdateEventStatus, apiGetEventsRegistrationCounts, apiUpdateEvent } from "@/lib/api";
import MobileSidebar from "@/components/MobileSidebar";
import NotificationBell from "@/components/NotificationBell";
import QRScanner from "@/components/QRScanner";
import { useEventFactory } from "@/hooks/useWeb3";
import { EventType } from "../../../../web3/factoryConnections";
import { parseEther } from "viem";
import TransactionStatus from "@/components/TransactionStatus";

type HostEvent = {
  id: string;
  name: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  eventDescription?: string;
  organization?: string;
  organizationDescription?: string;
  approvalNeeded?: boolean;
  isPaid?: boolean;
  price?: number;
  blockchainEventAddress?: string | null;
  useBlockchain?: boolean;
};

export default function HostDashboardPage() {
  const router = useRouter();
  const { organization, isAuthenticated, loading: authLoading, signOut } = useAuth();
  
  // Web3 integration
  const { isInitialized, isConnected, address, createEvent, error: web3Error, transactionHash } = useEventFactory();
  
  const [events, setEvents] = useState<HostEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Publishing state
  const [publishingEvent, setPublishingEvent] = useState<string | null>(null);
  const [localTransactionHash, setLocalTransactionHash] = useState<string | null>(null);
  const [blockchainEventAddress, setBlockchainEventAddress] = useState<string | null>(null);
  const [publishedEventDetails, setPublishedEventDetails] = useState<{
    eventId: string;
    eventName: string;
    contractAddress: string;
    transactionHash: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [selectedEventForScanning, setSelectedEventForScanning] = useState<HostEvent | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated && organization) {
      loadEvents();
      setOrgName(organization.name || "");
      setOrgDescription(organization.description || "");
    } else if (!authLoading && !isAuthenticated) {
      router.replace('/host/signin');
    }
  }, [authLoading, isAuthenticated, organization, router]);

  // Watch for transaction hash updates
  useEffect(() => {
    console.log('🔍 Dashboard transaction hash useEffect triggered:', { transactionHash, publishingEvent, localTransactionHash });
    if (transactionHash && !localTransactionHash && publishingEvent) {
      setLocalTransactionHash(transactionHash);
      console.log('✅ Transaction hash received and set in dashboard:', transactionHash);
    }
  }, [transactionHash, publishingEvent, localTransactionHash]);

  async function loadEvents() {
    if (!organization?.address) {
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔄 Loading events for organization:', organization.address);
      const eventsData = await apiGetOrganizationEvents(organization.address);
      console.log('📋 Loaded events data:', eventsData.map(e => ({
        id: e.id,
        name: e.name,
        blockchainEventAddress: e.blockchainEventAddress,
        status: e.status
      })));
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
      
      if (eventIds.length === 0) {
        setParticipantCounts({});
        return;
      }
      
      const counts = await apiGetEventsRegistrationCounts(eventIds);
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

  async function publishEvent(event: HostEvent) {
    if (!isConnected || !isInitialized) {
      console.error('Please connect your wallet to publish events');
      return;
    }

    if (publishingEvent) {
      console.log('Already publishing an event, please wait');
      return;
    }

    try {
      setPublishingEvent(event.id);
      setLocalTransactionHash(null);
      setBlockchainEventAddress(null);

      // Determine event type based on event data
      // Note: APPROVAL type is only for free approval-based events
      // Paid events with approval are still PAID type (approval handled by frontend)
      let eventType: EventType;
      if (event.isPaid && event.price) {
        eventType = EventType.PAID;  // Paid events (with or without approval)
      } else if (event.approvalNeeded && !event.isPaid) {
        eventType = EventType.APPROVAL;  // Free approval-based events only
      } else {
        eventType = EventType.FREE;  // Free events without approval
      }

      // Convert price to wei if paid event
      const ticketPrice = event.isPaid && event.price ? parseEther(event.price.toString()).toString() : "0";

      console.log('Publishing event with params:', { 
        name: event.name, 
        eventType, 
        ticketPrice 
      });

      // Create event on blockchain
      const transactionResult = await createEvent({
        name: event.name,
        eventType,
        ticketPrice
      });

      console.log('Transaction submitted:', transactionResult);
      
      // Wait for transaction hash
      if (transactionHash) {
        setLocalTransactionHash(transactionHash);
        console.log('✅ Transaction hash received immediately:', transactionHash);
      } else {
        console.log('⏳ Transaction hash not available yet, will be set by useEffect');
      }

    } catch (error) {
      console.error('Failed to publish event:', error);
      setPublishingEvent(null);
    }
  }

  function handleTransactionSuccess(receipt: any) {
    console.log('✅ Transaction confirmed! Receipt:', receipt);
    console.log('Contract address from receipt:', receipt.contractAddress);
    
    if (receipt.contractAddress) {
      setBlockchainEventAddress(receipt.contractAddress);
      console.log('✅ Contract address set to:', receipt.contractAddress);
      
      // Store published event details for UI display
      if (publishingEvent && localTransactionHash) {
        const publishedEvent = events.find(e => e.id === publishingEvent);
        if (publishedEvent) {
          setPublishedEventDetails({
            eventId: publishingEvent,
            eventName: publishedEvent.name,
            contractAddress: receipt.contractAddress,
            transactionHash: localTransactionHash
          });
        }
      }
      
      // Update the event in the database
      if (publishingEvent) {
        updateEventWithBlockchainAddress(publishingEvent, receipt.contractAddress);
      }
    } else {
      console.warn('⚠️ No contract address found in receipt');
      setBlockchainEventAddress('confirmed');
      console.log('🔄 Set blockchainEventAddress to confirmed as fallback');
    }
    
    // Reset publishing state
    setPublishingEvent(null);
    setLocalTransactionHash(null);
    setBlockchainEventAddress(null);
  }

  function handleTransactionError(error: any) {
    console.error('❌ Deployment failed:', error);
    setPublishingEvent(null);
    setLocalTransactionHash(null);
    setBlockchainEventAddress(null);
  }

  function clearPublishedEventDetails() {
    setPublishedEventDetails(null);
  }

  function showToast(message: string) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);
  }

  async function updateEventWithBlockchainAddress(eventId: string, contractAddress: string) {
    try {
      console.log('🔄 Updating event with blockchain address:', { eventId, contractAddress });
      
      const updateData = {
        blockchainEventAddress: contractAddress,
        useBlockchain: true,
        status: 'published'
      };
      
      console.log('📤 Sending API update with data:', updateData);
      
      const updatedEvent = await apiUpdateEvent(eventId, updateData);
      
      console.log('✅ API update successful, received updated event:', updatedEvent);
      console.log('🔄 Reloading events...');
      
      // Reload events to reflect the changes
      await loadEvents();
      
      // Small delay to ensure state is updated
      setTimeout(() => {
        const updatedEvent = events.find(e => e.id === eventId);
        console.log('🔍 Event after reload (delayed check):', updatedEvent ? {
          id: updatedEvent.id,
          name: updatedEvent.name,
          blockchainEventAddress: updatedEvent.blockchainEventAddress,
          status: updatedEvent.status
        } : 'Event not found');
      }, 100);
      
      console.log('✅ Event updated with blockchain address:', contractAddress);
    } catch (error) {
      console.error('❌ Failed to update event with blockchain address:', error);
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

  function navigateToCreateEvent() {
    router.push('/host/create');
  }

  function handleLogout() {
    signOut();
    router.push('/host/signin');
  }

  // Handle QR Scanner
  const openQRScanner = (event: HostEvent) => {
    if (!event.blockchainEventAddress) {
      alert('This event needs to be published to the blockchain first before scanning tickets.');
      return;
    }
    setSelectedEventForScanning(event);
    setShowQRScanner(true);
  };

  const closeQRScanner = () => {
    setShowQRScanner(false);
    setSelectedEventForScanning(null);
  };

  const handleScanSuccess = (result: any) => {
    console.log('Scan successful:', result);
    // Handle successful scan - could show participant details, etc.
  };

  const handleScanError = (error: string) => {
    console.error('Scan error:', error);
    // Handle scan error
  };

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
    <main className="mx-auto max-w-3xl px-4 py-4 lg:py-12">
      {/* Mobile Header */}
      <div className="lg:hidden mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <p className="text-xs text-foreground/60">Manage your events</p>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Organizer Dashboard</h1>
            <p className="text-foreground/60">Manage your events and organization</p>
          </div>
          <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <NotificationBell />

          <button onClick={navigateToCreateEvent} className="btn-primary flex items-center gap-2 px-4 py-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Event</span>
          </button>
          
          <button onClick={handleLogout} className="btn-secondary border-destructive/20 text-destructive hover:bg-destructive/5 flex items-center gap-2 px-4 py-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

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
          <button onClick={navigateToCreateEvent} className="btn-primary">
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
                  <div key={e.id} className="card p-6 slide-in hover:shadow-lg transition-all duration-300" style={{ animationDelay: `${index * 100}ms` }}>
                    {/* Header Section */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-foreground truncate mb-1">{e.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-foreground/60">
                          <span>{new Date(e.updatedAt).toLocaleDateString()}</span>
                          <div className="w-1 h-1 rounded-full bg-foreground/40"></div>
                          {loadingCounts ? (
                            <span className="text-foreground/40">Loading participants...</span>
                          ) : (
                            <span>{participantCounts[e.id] || 0} participants</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-foreground/10 text-foreground/80">
                          Draft
                        </span>
                      </div>
                    </div>

                    {/* Event Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      {/* Event Type */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground/70">Event Type</h4>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span className="text-sm text-foreground">
                            {e.price && e.price > 0 ? 'Paid' : 'Free'}
                            {e.approvalNeeded ? ' + Approval' : ''}
                            {e.allowResale && !e.approvalNeeded ? ' + Resale' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Blockchain Status */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground/70">Blockchain Status</h4>
                        {e.blockchainEventAddress ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-sm text-green-600 dark:text-green-400">Contract Deployed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            <span className="text-sm text-orange-600 dark:text-orange-400">Not deployed to blockchain</span>
                          </div>
                        )}
                      </div>

                      {/* Contract Address */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground/70">Contract Address</h4>
                        {e.blockchainEventAddress ? (
                          <div className="bg-foreground/5 rounded-lg p-3 border border-foreground/10">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-foreground/70 font-medium">Address:</span>
                              <button
                                onClick={() => copyToClipboard(e.blockchainEventAddress!, 'Contract address')}
                                className="text-foreground/60 hover:text-foreground transition-colors p-1 rounded hover:bg-foreground/5"
                                title="Copy address"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                            <p className="font-mono text-xs text-foreground break-all leading-relaxed">
                              {e.blockchainEventAddress}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-foreground/5 rounded-lg p-3 border border-foreground/10">
                            <p className="text-xs text-foreground/40 italic">No contract deployed</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Event Description */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-foreground/70 mb-2">Description</h4>
                      <div className="bg-foreground/5 rounded-lg p-4 border border-foreground/10">
                        {e.eventDescription ? (
                          <p className="text-sm text-foreground/80">{e.eventDescription}</p>
                        ) : (
                          <p className="text-sm text-foreground/40 italic">No description provided</p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      {/* Publish Button */}
                      {!isConnected ? (
                        <div className="px-4 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                          <span className="text-sm text-orange-600 dark:text-orange-400">Connect wallet to publish</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => publishEvent(e)}
                          disabled={publishingEvent === e.id || !isConnected}
                          className="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {publishingEvent === e.id ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Publishing...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              Publish
                            </>
                          )}
                        </button>
                      )}

                      {/* Edit Button */}
                      <Link 
                        href={`/events/${e.id}/edit`}
                        className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Link>

                      {/* Preview Button */}
                      <Link 
                        href={`/events/${e.id}`}
                        className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Preview
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transaction Status for Publishing */}
          {publishingEvent && localTransactionHash && (
            <div className="mb-8 card p-6 fade-in">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Publishing Event</h2>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <TransactionStatus 
                  hash={localTransactionHash}
                  onSuccess={handleTransactionSuccess}
                  onError={handleTransactionError}
                />
              </div>
            </div>
          )}

          {/* Published Event Success Banner */}
          {publishedEventDetails && (
            <div className="mb-8 card p-6 fade-in bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-green-900 dark:text-green-100">
                      Event Published Successfully!
                    </h2>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your event "{publishedEventDetails.eventName}" has been deployed to the blockchain.
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearPublishedEventDetails}
                  className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Contract Address */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-green-900 dark:text-green-100">Contract Address</h3>
                    <button
                      onClick={() => copyToClipboard(publishedEventDetails.contractAddress, 'Contract address')}
                      className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <p className="font-mono text-sm text-green-800 dark:text-green-200 break-all">
                    {publishedEventDetails.contractAddress}
                  </p>
                </div>

                {/* Transaction Hash */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-green-900 dark:text-green-100">Transaction Hash</h3>
                    <button
                      onClick={() => copyToClipboard(publishedEventDetails.transactionHash, 'Transaction hash')}
                      className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <p className="font-mono text-sm text-green-800 dark:text-green-200 break-all">
                    {publishedEventDetails.transactionHash}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      window.open(`https://testnet.soniclabs.com/tx/${publishedEventDetails.transactionHash}`, '_blank');
                    }}
                    className="btn-primary text-sm px-4 py-2"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View on Explorer
                  </button>
                  <button
                    onClick={clearPublishedEventDetails}
                    className="btn-secondary text-sm px-4 py-2"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

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
                    {/* Header Section */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-foreground">{e.name}</h3>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Published
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-foreground/60">
                          <span>{new Date(e.updatedAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>
                            {loadingCounts ? 'Loading...' : `${participantCounts[e.id] || 0} participants`}
                          </span>
                          {e.approvalNeeded && (
                            <>
                              <span>•</span>
                              <span className="text-orange-600 dark:text-orange-400 font-medium">Approval Required</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Event Details Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                      {/* Event Type & Pricing */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground/80">Event Type</h4>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span className="text-sm text-foreground">
                            {e.isPaid ? `Paid (${e.price} ${e.currency})` : 'Free'}
                            {e.allowResale && ' + Resale'}
                          </span>
                        </div>
                      </div>

                      {/* Contract Status */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground/80">Blockchain Status</h4>
                        {e.blockchainEventAddress ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-sm text-green-600 dark:text-green-400">Contract Deployed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            <span className="text-sm text-orange-600 dark:text-orange-400">Not Deployed</span>
                          </div>
                        )}
                      </div>

                      {/* Contract Address */}
                      {e.blockchainEventAddress && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-foreground/80">Contract Address</h4>
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono text-foreground/70 bg-foreground/5 px-2 py-1 rounded flex-1 truncate">
                              {e.blockchainEventAddress.slice(0, 6)}...{e.blockchainEventAddress.slice(-4)}
                            </code>
                            <button
                              onClick={() => copyToClipboard(e.blockchainEventAddress!, 'Contract address')}
                              className="text-foreground/60 hover:text-foreground transition-colors p-1 rounded hover:bg-foreground/5"
                              title="Copy full address"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      <Link 
                        href={`/events/${e.id}`}
                        className="btn-primary px-3 py-2 text-sm flex items-center gap-2"
                        title="View Event"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="hidden sm:inline">View Event</span>
                      </Link>
                      
                      <Link 
                        href={`/events/${e.id}/edit`}
                        className="btn-secondary px-3 py-2 text-sm flex items-center gap-2"
                        title="Edit Event"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span className="hidden sm:inline">Edit</span>
                      </Link>
                      
                      <button 
                        onClick={() => updateEventStatus(e.id, 'draft')}
                        disabled={updatingStatus === e.id}
                        className="btn-secondary px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        title="Unpublish Event"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="hidden sm:inline">
                          {updatingStatus === e.id ? 'Unpublishing...' : 'Unpublish'}
                        </span>
                      </button>
                      
                      {e.approvalNeeded && (
                        <Link 
                          href={`/events/${e.id}/review`}
                          className="btn-primary px-3 py-2 text-sm bg-orange-600 hover:bg-orange-700 flex items-center gap-2"
                          title="Approve Participants"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="hidden sm:inline">Approve Participants</span>
                        </Link>
                      )}
                      
                      {e.blockchainEventAddress && (
                        <button
                          onClick={() => openQRScanner(e)}
                          className="btn-primary px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
                          title="QR Scanner"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="hidden sm:inline">QR Scanner</span>
                        </button>
                      )}
                    </div>
                  </div>
          ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && selectedEventForScanning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-lg w-full">
            {/* Close Button */}
            <button
              onClick={closeQRScanner}
              className="absolute -top-2 -right-2 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg z-10 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Scanner Component */}
            <QRScanner
              eventContractAddress={selectedEventForScanning.blockchainEventAddress!}
              event={{
                date: selectedEventForScanning.date,
                name: selectedEventForScanning.name
              }}
              onScanSuccess={handleScanSuccess}
              onScanError={handleScanError}
            />
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </main>
  );
}

