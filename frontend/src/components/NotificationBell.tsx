"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiGetEventsRegistrationCounts } from "@/lib/api";
import { API_CONFIG } from "@/config/api";

interface Notification {
  id: string;
  type: 'approval_request' | 'event_created' | 'event_published' | 'registration_update';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  eventId?: string;
  eventName?: string;
  participantCount?: number;
}

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = "" }: NotificationBellProps) {
  const { organization } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications
  useEffect(() => {
    if (organization?.address) {
      loadNotifications();
      
      // Auto-refresh notifications every 30 seconds
      const interval = setInterval(() => {
        loadNotifications();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [organization?.address]);

  async function loadNotifications() {
    if (!organization?.address) return;

    setLoading(true);
    try {
      // Get all events for this organization
      const apiUrl = API_CONFIG.BASE_URL;
      console.log(`🔍 Loading notifications for organization: ${organization.address}`);
      console.log(`🌐 API URL: ${apiUrl}`);
      
      const eventsResponse = await fetch(`${apiUrl}/organizations/${organization.address}/events`);
      console.log(`📡 Events response status:`, eventsResponse.status, eventsResponse.ok);
      
      if (!eventsResponse.ok) {
        const errorText = await eventsResponse.text();
        console.error(`❌ Failed to fetch events:`, eventsResponse.status, errorText);
        return;
      }

      const events = await eventsResponse.json();
      console.log(`📅 Fetched ${events.length} events for organization:`, events);
      const eventIds = events.map((event: any) => event.id);
      
      // Check for approval events
      const approvalEvents = events.filter((event: any) => event.approvalNeeded && event.status === 'published');
      console.log(`🔍 Found ${approvalEvents.length} published approval events:`, approvalEvents);
      
      // Debug event IDs
      console.log(`🆔 Event IDs:`, eventIds);
      approvalEvents.forEach((event: any) => {
        console.log(`🎯 Approval event ID: ${event.id} (type: ${typeof event.id})`);
        console.log(`🎯 Event _id: ${event._id} (type: ${typeof event._id})`);
        console.log(`🎯 Full event object:`, event);
      });
      
      if (eventIds.length === 0) {
        setNotifications([]);
        return;
      }

      // Get registration counts for all events
      const counts = await apiGetEventsRegistrationCounts(eventIds);
      
      // Get pending registrations for approval events
      const pendingRegistrations = [];
      for (const event of events) {
        if (event.approvalNeeded && event.status === 'published') {
          try {
            console.log(`🔍 Checking for pending registrations for event: ${event.name} (${event.id})`);
            
            // First try with status filter
            let regResponse = await fetch(`${apiUrl}/events/${event.id}/registrations?status=pending`);
            console.log(`📡 Registration response (with status filter) for ${event.name}:`, { status: regResponse.status, ok: regResponse.ok });
            
            let regs = [];
            if (regResponse.ok) {
              regs = await regResponse.json();
              console.log(`📋 Found ${regs.length} pending registrations (with filter) for ${event.name}:`, regs);
            } else {
              // If status filter fails, try without filter and filter client-side
              console.log(`⚠️ Status filter failed, trying without filter...`);
              regResponse = await fetch(`${apiUrl}/events/${event.id}/registrations`);
              console.log(`📡 Registration response (without filter) for ${event.name}:`, { status: regResponse.status, ok: regResponse.ok });
              
              if (regResponse.ok) {
                const allRegs = await regResponse.json();
                regs = allRegs.filter((reg: any) => reg.status === 'pending');
                console.log(`📋 Found ${regs.length} pending registrations (client-side filter) for ${event.name}:`, regs);
              } else {
                const errorText = await regResponse.text();
                console.error(`❌ Failed to fetch registrations for ${event.name}:`, regResponse.status, errorText);
              }
            }
            
            if (regs.length > 0) {
              pendingRegistrations.push({
                eventId: event.id,
                eventName: event.name,
                count: regs.length
              });
            }
          } catch (error) {
            console.error(`❌ Error loading registrations for event ${event.id}:`, error);
          }
        }
      }
      
      console.log(`🔔 Total pending registrations found:`, pendingRegistrations);

      // Generate notifications
      const newNotifications: Notification[] = [];

      // Event creation notifications
      events.forEach((event: any, index: number) => {
        // Ensure we have a valid event ID or use index as fallback
        const eventId = event.id || event._id || `event_${index}`;
        const createdDate = new Date(event.createdAt);
        const isRecent = Date.now() - createdDate.getTime() < 24 * 60 * 60 * 1000; // Last 24 hours
        
        if (isRecent) {
          newNotifications.push({
            id: `event_created_${eventId}_${createdDate.getTime()}`,
            type: 'event_created',
            title: 'Event Created',
            message: `"${event.name}" has been created`,
            timestamp: createdDate,
            read: false,
            eventId: eventId,
            eventName: event.name
          });
        }

        // Event publication notifications
        if (event.status === 'published' && event.blockchainEventAddress) {
          const updatedDate = new Date(event.updatedAt);
          const isRecentlyPublished = Date.now() - updatedDate.getTime() < 24 * 60 * 60 * 1000;
          
          if (isRecentlyPublished) {
            newNotifications.push({
              id: `event_published_${eventId}_${updatedDate.getTime()}`,
              type: 'event_published',
              title: 'Event Published',
              message: `"${event.name}" has been published to the blockchain`,
              timestamp: updatedDate,
              read: false,
              eventId: eventId,
              eventName: event.name
            });
          }
        }
      });

      // Approval request notifications
      pendingRegistrations.forEach((reg: any, index: number) => {
        if (reg.count > 0) {
          // Ensure we have a valid event ID or use index as fallback
          const eventId = reg.eventId || `approval_${index}`;
          const timestamp = new Date();
          newNotifications.push({
            id: `approval_request_${eventId}_${timestamp.getTime()}`,
            type: 'approval_request',
            title: 'Approval Requests',
            message: `${reg.count} pending registration${reg.count > 1 ? 's' : ''} for "${reg.eventName}"`,
            timestamp: timestamp,
            read: false,
            eventId: eventId,
            eventName: reg.eventName,
            participantCount: reg.count
          });
        }
      });

      // Sort by timestamp (newest first)
      newNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  function markAsRead(notificationId: string) {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  function markAllAsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'approval_request':
        return (
          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'event_created':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
      case 'event_published':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0 15 0v5z" />
          </svg>
        );
    }
  }

  function formatTimestamp(timestamp: Date) {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-foreground/70 hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0 15 0v5z" />
        </svg>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        
        {/* Approval Request Indicator */}
        {notifications.some(n => n.type === 'approval_request' && !n.read) && (
          <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-2 w-2 animate-ping"></span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadNotifications}
                  disabled={loading}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
                  title="Refresh notifications"
                >
                  <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center">
                  <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0 15 0v5z" />
                  </svg>
                  <p className="text-sm text-gray-500">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                        !notification.read ? 
                          (notification.type === 'approval_request' ? 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500' : 'bg-blue-50 dark:bg-blue-900/20') 
                          : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTimestamp(notification.timestamp)}
                            </p>
                          </div>
                          <p className={`text-sm mt-1 ${
                            !notification.read ? 'text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {notification.message}
                          </p>
                          
                          {/* Action Button for Approval Requests */}
                          {notification.type === 'approval_request' && notification.eventId && (
                            <div className="mt-2">
                              <a
                                href={`/events/${notification.eventId}/review`}
                                className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Review registrations
                                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}
