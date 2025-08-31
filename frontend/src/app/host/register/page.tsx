"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import WalletConnect from "@/components/tickets/WalletConnect";

export default function HostRegisterOrgPage() {
  const router = useRouter();
  const { signUp, isAuthenticated } = useAuth();
  const [walletAddress, setWalletAddress] = useState<string | undefined>();
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/host/dashboard');
    }
  }, [isAuthenticated, router]);

  // Don't render the form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate required fields
    if (!walletAddress || !orgName) {
      alert("Please connect your wallet and enter organization name");
      return;
    }
    
    // Validate email and password if provided
    if (orgEmail && (!password || !confirmPassword)) {
      alert("Password and confirmation are required when email is provided");
      return;
    }
    
    if (password && password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    
    try {
      setSubmitting(true);
      const success = await signUp(walletAddress, orgName, orgEmail, password, orgDescription);
      if (success) {
        router.push("/host/dashboard");
      }
    } catch (e: any) {
      alert(e?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-foreground/2">
      {/* Header Section */}
      <div className="bg-foreground/5 text-foreground py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Register Organization</h1>
          <p className="text-xl text-foreground/80 max-w-2xl mx-auto">
            Connect your wallet and create your organization account to start hosting events
          </p>
        </div>
      </div>

      {/* Registration Form */}
      <div className="mx-auto max-w-2xl px-4 pb-16">
        <div className="card p-8 fade-in">
          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-lg font-medium text-foreground">
                Connect Wallet *
              </label>
              <WalletConnect 
                onAddressChange={setWalletAddress}
                className="w-full"
              />
              {walletAddress && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Wallet connected successfully!</span>
                </div>
              )}
              <p className="text-sm text-foreground/60">
                Your wallet address will be your organization's unique identifier
              </p>
            </div>
            
            <div className="space-y-3">
              <label className="block text-lg font-medium text-foreground" htmlFor="orgName">
                Organization Name *
              </label>
              <input 
                id="orgName" 
                type="text" 
                value={orgName} 
                onChange={(e) => setOrgName(e.target.value)} 
                className="input" 
                placeholder="Enter your organization name"
                required 
              />
            </div>
            
            <div className="space-y-3">
              <label className="block text-lg font-medium text-foreground" htmlFor="orgDescription">
                Description
              </label>
              <textarea 
                id="orgDescription" 
                value={orgDescription} 
                onChange={(e) => setOrgDescription(e.target.value)} 
                rows={3} 
                className="input resize-none"
                placeholder="Tell people about your organization"
              />
            </div>
            
            <div className="space-y-3">
              <label className="block text-lg font-medium text-foreground" htmlFor="orgEmail">
                Email Address (Optional)
              </label>
              <input 
                id="orgEmail" 
                type="email" 
                value={orgEmail} 
                onChange={(e) => setOrgEmail(e.target.value)} 
                className="input" 
                placeholder="your@email.com"
              />
              <p className="text-sm text-foreground/60">
                Optional: Add email for additional authentication
              </p>
            </div>
            
            {orgEmail && (
              <>
                <div className="space-y-3">
                  <label className="block text-lg font-medium text-foreground" htmlFor="password">
                    Password
                  </label>
                  <input 
                    id="password" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="input" 
                    placeholder="Enter password"
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="block text-lg font-medium text-foreground" htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <input 
                    id="confirmPassword" 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    className="input" 
                    placeholder="Confirm password"
                  />
                </div>
              </>
            )}
            
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={submitting || !walletAddress} 
                className="btn-primary w-full text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating Organization...' : 'Create Organization'}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <Link href="/host/signin" className="text-foreground/70 hover:text-foreground transition-colors">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}


