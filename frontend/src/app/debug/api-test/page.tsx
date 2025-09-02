"use client";

import { useState } from "react";

export default function APITestPage() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test: string, result: any) => {
    setTestResults(prev => [...prev, { test, result, timestamp: new Date().toISOString() }]);
  };

  const testBackendHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/health');
      const data = await response.json();
      addResult('Backend Health Check', { status: response.status, data });
    } catch (error) {
      addResult('Backend Health Check', { error: error.message });
    }
    setLoading(false);
  };

  const testEventsAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/events');
      const data = await response.json();
      addResult('Events API', { status: response.status, data, count: data.length });
    } catch (error) {
      addResult('Events API', { error: error.message });
    }
    setLoading(false);
  };

  const testRegistrationsAPI = async () => {
    setLoading(true);
    try {
      // Test with a sample event ID
      const response = await fetch('http://localhost:4000/api/events/test-event-id/registrations');
      const data = await response.json();
      addResult('Registrations API', { status: response.status, data });
    } catch (error) {
      addResult('Registrations API', { error: error.message });
    }
    setLoading(false);
  };

  const testRegistrationCountsAPI = async () => {
    setLoading(true);
    try {
      // Test with a sample event ID
      const response = await fetch('http://localhost:4000/api/events/registrations/counts?ids=test-event-id');
      const data = await response.json();
      addResult('Registration Counts API', { status: response.status, data });
    } catch (error) {
      addResult('Registration Counts API', { error: error.message });
    }
    setLoading(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">API Debug Test</h1>
      
      <div className="space-y-4 mb-8">
        <div className="flex gap-4">
          <button 
            onClick={testBackendHealth}
            disabled={loading}
            className="btn-primary"
          >
            Test Backend Health
          </button>
          <button 
            onClick={testEventsAPI}
            disabled={loading}
            className="btn-primary"
          >
            Test Events API
          </button>
          <button 
            onClick={testRegistrationsAPI}
            disabled={loading}
            className="btn-primary"
          >
            Test Registrations API
          </button>
          <button 
            onClick={testRegistrationCountsAPI}
            disabled={loading}
            className="btn-primary"
          >
            Test Registration Counts API
          </button>
          <button 
            onClick={clearResults}
            className="btn-secondary"
          >
            Clear Results
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-foreground/60">Testing API...</p>
        </div>
      )}

      <div className="space-y-4">
        {testResults.map((result, index) => (
          <div key={index} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{result.test}</h3>
              <span className="text-xs text-foreground/60">{result.timestamp}</span>
            </div>
            <pre className="bg-foreground/5 p-3 rounded text-sm overflow-x-auto">
              {JSON.stringify(result.result, null, 2)}
            </pre>
          </div>
        ))}
      </div>

      {testResults.length === 0 && (
        <div className="text-center py-8">
          <p className="text-foreground/60">No test results yet. Click a test button above.</p>
        </div>
      )}
    </main>
  );
}

