"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { apiGetOrganizationEvents, apiUpdateEventStatus, apiGetEventsRegistrationCounts, apiUpdateEvent } from "@/lib/api";
import MobileSidebar from "@/components/MobileSidebar";
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
      let eventType: EventType;
      if (event.approvalNeeded) {
        eventType = EventType.APPROVAL;
      } else if (event.isPaid && event.price) {
        eventType = EventType.PAID;
      } else {
        eventType = EventType.FREE;
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
          <button 
            onClick={loadEvents} 
            disabled={loading}
            className="btn-secondary flex items-center gap-2 px-3 py-2 min-w-[120px]"
            title="Refresh events"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span className="hidden sm:inline">Refresh</span>
          </button>
          

          <Link href="/host/qr-scanner" className="btn-secondary flex items-center gap-2 px-3 py-2 min-w-[120px]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>QR Scanner</span>
          </Link>


          <button onClick={navigateToCreateEvent} className="btn-primary flex items-center gap-2 px-3 py-2 min-w-[120px]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Event</span>
          </button>
          
          <button onClick={handleLogout} className="btn-secondary border-destructive/20 text-destructive hover:bg-destructive/5 flex items-center gap-2 px-3 py-2 min-w-[120px]">
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
        onRefresh={loadEvents}
        loading={loading}
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

      {/* Blockchain Integration Section */}
      <div className="mb-8 card p-6 fade-in">
        <h2 className="text-xl font-semibold mb-6 text-foreground">Blockchain Integration</h2>
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Smart Contract Features</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Enable blockchain features for your events to get NFT tickets, resale marketplace, and secure ownership verification.
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• NFT tickets with unique metadata</li>
                  <li>• Resale marketplace (up to 3 times)</li>
                  <li>• Platform fee: 1% on resales</li>
                  <li>• Secure ownership verification</li>
                </ul>
              </div>
            </div>
          </div>
          
          {!isConnected ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-foreground/70 mb-4">Connect your wallet to enable blockchain features</p>
              <button className="btn-primary">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium text-foreground">Wallet Connected</span>
                </div>
                <div className="text-xs text-foreground/60 font-mono bg-foreground/5 px-2 py-1 rounded">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isInitialized ? (
                    <>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-foreground">EventFactory Ready</span>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span className="font-medium text-foreground">Initializing...</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium text-green-900 dark:text-green-100">Ready to Publish Events</span>
                </div>
                <p className="text-sm text-green-800 dark:text-green-200">
                  You can now publish your draft events to deploy them as smart contracts on the blockchain.
                </p>
              </div>
            </div>
          )}
        </div>
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
                        
                        {/* Contract Address */}
                        {e.blockchainEventAddress ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs font-medium">Contract Deployed</span>
                            </div>
                            <div className="bg-foreground/5 rounded-lg p-3 border border-foreground/10">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-foreground/70 font-medium">Contract Address:</span>
                                <button
                                  onClick={() => copyToClipboard(e.blockchainEventAddress!, 'Contract address')}
                                  className="text-foreground/60 hover:text-foreground transition-colors"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                              <p className="font-mono text-xs text-foreground break-all">
                                {e.blockchainEventAddress}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span className="text-xs">Not deployed to blockchain</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-6">
                        <span className="px-3 py-1 rounded-full text-xs font-medium glass border border-foreground/10">
                          Draft
                        </span>
                        {!isConnected ? (
                          <div className="text-sm text-orange-600 dark:text-orange-400">
                            Connect wallet to publish
                          </div>
                        ) : (
                          <button 
                            onClick={() => publishEvent(e)}
                            disabled={publishingEvent === e.id || !isConnected}
                            className="btn-primary text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {publishingEvent === e.id ? 'Publishing...' : 'Publish'}
                          </button>
                        )}
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
                        
                        {/* Contract Address */}
                        {e.blockchainEventAddress ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs font-medium">Contract Deployed</span>
                            </div>
                            <div className="bg-foreground/5 rounded-lg p-3 border border-foreground/10">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-foreground/70 font-medium">Contract Address:</span>
                                <button
                                  onClick={() => copyToClipboard(e.blockchainEventAddress!, 'Contract address')}
                                  className="text-foreground/60 hover:text-foreground transition-colors"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                              <p className="font-mono text-xs text-foreground break-all">
                                {e.blockchainEventAddress}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span className="text-xs">Not deployed to blockchain</span>
                          </div>
                        )}
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

