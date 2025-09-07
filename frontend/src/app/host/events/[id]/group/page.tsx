"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface EventGroupMember {
  id: string;
  name: string;
  address: string;
  commitment: string;
  approvedAt: string;
}

export default function EventGroupPage() {
  const { id } = useParams();
  const [members, setMembers] = useState<EventGroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroupMembers();
  }, [id]);

  async function loadGroupMembers() {
    try {
      setLoading(true);
      const response = await fetch(`https://fairpassbackend.vercel.app/api
/events/${id}/group/members`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch group members: ${response.status}`);
      }
      
      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error('Error loading group members:', error);
      setError(error instanceof Error ? error.message : 'Failed to load group members');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/70">Loading group members...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="text-center">
          <p className="text-destructive mb-4">Error: {error}</p>
          <button 
            onClick={loadGroupMembers}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/events/${id}/review`} className="text-sm hover:underline">← Back to review</Link>
        <h1 className="text-2xl font-semibold tracking-tight">Group Management</h1>
      </div>

      {/* Group Members */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Approved Members</h2>
          <span className="text-sm text-foreground/70">{members.length} members</span>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-foreground/70">No approved members yet.</p>
            <p className="text-sm text-foreground/50 mt-2">Members will appear here after they register and get approved.</p>
          </div>
        ) : (
                     <div className="space-y-3">
             {members.map((member, index) => (
               <div key={member.id || `member-${index}`} className="flex items-center justify-between p-3 border border-foreground/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-foreground/70 font-mono">{member.address.slice(0, 6)}...{member.address.slice(-4)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-foreground/70">Approved</p>
                  <p className="text-xs text-foreground/50">{new Date(member.approvedAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
