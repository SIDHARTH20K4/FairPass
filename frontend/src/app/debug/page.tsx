"use client";

import { useState, useEffect } from "react";

export default function DebugPage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchOrganizations() {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:4000/api/auth/debug/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch organizations');
      }
    } catch (err) {
      setError('Network error: ' + err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return (
    <main className="min-h-screen bg-foreground/2 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Debug Page</h1>
        
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Database Organizations</h2>
          
          <button 
            onClick={fetchOrganizations}
            disabled={loading}
            className="btn-primary mb-4"
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
          
          {error && (
            <div className="text-red-500 mb-4 p-3 bg-red-50 rounded">
              {error}
            </div>
          )}
          
          {organizations.length === 0 ? (
            <p className="text-foreground/60">No organizations found in database</p>
          ) : (
            <div className="space-y-4">
              <p className="text-foreground/70">
                Found {organizations.length} organization(s) in database
              </p>
              
              {organizations.map((org, index) => (
                <div key={org.id} className="p-4 glass rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-foreground/80">Name:</span>
                      <span className="ml-2 text-foreground">{org.name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-foreground/80">Email:</span>
                      <span className="ml-2 text-foreground">{org.email || 'None'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-foreground/80">Address:</span>
                      <span className="ml-2 font-mono text-foreground">
                        {org.address ? `${org.address.slice(0, 6)}...${org.address.slice(-4)}` : 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-foreground/80">Has Password:</span>
                      <span className={`ml-2 ${org.hasPassword ? 'text-green-600' : 'text-red-600'}`}>
                        {org.hasPassword ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium text-foreground/80">Created:</span>
                      <span className="ml-2 text-foreground">
                        {new Date(org.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Troubleshooting Tips</h2>
          
          <div className="space-y-3 text-sm text-foreground/70">
            <div className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>If you see "No organizations found", the database might be empty or there's a connection issue.</span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>If an organization has "Has Password: No", you can only sign in with wallet authentication.</span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Check the backend console for detailed authentication logs when attempting to sign in.</span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Make sure your backend server is running on port 4000.</span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>If you're testing with a new account, try registering first with both wallet and email/password.</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
