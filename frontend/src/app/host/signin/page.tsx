"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import WalletConnect from "@/components/tickets/WalletConnect";

export default function HostSigninPage() {
  const router = useRouter();
  const { signIn, signInWithWallet, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | undefined>();
  const [authMethod, setAuthMethod] = useState<'wallet' | 'email'>('wallet');
  const [showRegisterOption, setShowRegisterOption] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/host/dashboard');
    }
  }, [isAuthenticated, router]);

  // Handle wallet-based signin
  useEffect(() => {
    if (walletAddress && authMethod === 'wallet') {
      handleWalletSignin();
    }
  }, [walletAddress, authMethod]);

  // Don't render the form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  async function handleWalletSignin() {
    if (!walletAddress) return;
    
    try {
      setSubmitting(true);
      setShowRegisterOption(false);
      
      // First check if organization exists
      const checkResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/organizations/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress }),
      });
      
      if (checkResponse.ok) {
        // Organization exists, proceed with sign in
        const success = await signInWithWallet(walletAddress);
        if (success) {
          router.push("/host/dashboard");
        }
      } else {
        // Organization doesn't exist, show register option
        setShowRegisterOption(true);
      }
    } catch (error) {
      console.error('Wallet sign in error:', error);
      setShowRegisterOption(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }
    try {
      setSubmitting(true);
      const success = await signIn(email, password);
      if (success) {
        router.push("/host/dashboard");
      }
    } catch (error) {
      alert("Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-foreground/2">
      {/* Header Section */}
      <div className="bg-foreground/5 text-foreground py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Sign In</h1>
          <p className="text-xl text-foreground/80 max-w-2xl mx-auto">
            Access your organization dashboard to manage events
          </p>
        </div>
      </div>

      {/* Sign In Form */}
      <div className="mx-auto max-w-2xl px-4 pb-16">
        <div className="card p-8 fade-in">
          {/* Authentication Method Tabs */}
          <div className="flex gap-1 mb-8 p-1 glass rounded-lg">
            <button
              onClick={() => setAuthMethod('wallet')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                authMethod === 'wallet'
                  ? 'bg-foreground'
                  : 'text-foreground/60 hover:text-foreground/80'
              }`}
            >
              Wallet
            </button>
            <button
              onClick={() => setAuthMethod('email')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                authMethod === 'email'
                  ? 'bg-foreground'
                  : 'text-foreground/60 hover:text-foreground/80'
              }`}
            >
              Email & Password
            </button>
          </div>

          {authMethod === 'wallet' ? (
            /* Wallet-based Sign In */
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground mb-2">Connect Your Wallet</h2>
                <p className="text-foreground/60">
                  Sign in using your connected wallet address
                </p>
              </div>
              
              <div className="space-y-4">
                <WalletConnect 
                  onAddressChange={setWalletAddress}
                  className="w-full"
                />
                
                {walletAddress && !showRegisterOption && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Wallet connected! Signing you in...</span>
                  </div>
                )}
                
                {showRegisterOption && (
                  <div className="text-center space-y-4">
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>No organization found with this wallet address</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-foreground/60">
                        Would you like to register a new organization?
                      </p>
                      <Link 
                        href="/host/register" 
                        className="inline-block btn-primary text-sm px-6 py-2"
                      >
                        Register New Organization
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              
              {!showRegisterOption && (
                <div className="text-center text-sm text-foreground/60">
                  <p>Don't have an account with this wallet?</p>
                  <Link href="/host/register" className="text-foreground hover:underline">
                    Register a new organization
                  </Link>
                </div>
              )}
            </div>
          ) : (
            /* Email-based Sign In */
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground mb-2">Email & Password</h2>
                <p className="text-foreground/60">
                  Sign in using your email and password
                </p>
              </div>
              
              <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground" htmlFor="email">
                    Email Address
                  </label>
          <input 
            id="email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
                    className="input" 
                    placeholder="your@email.com"
            required 
          />
        </div>
                
        <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground" htmlFor="password">
                    Password
                  </label>
          <input 
            id="password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
                    className="input" 
                    placeholder="Enter your password"
            required 
          />
        </div>
                
                <div className="pt-2">
          <button 
            type="submit" 
            disabled={submitting} 
                    className="btn-primary w-full py-3"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>
              
              <div className="text-center text-sm text-foreground/60">
                <p>Don't have an account?</p>
                <Link href="/host/register" className="text-foreground hover:underline">
                  Register a new organization
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}


