"use client";

import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';

interface TransactionStatusProps {
  hash: string;
  onSuccess?: (receipt: any) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export default function TransactionStatus({ 
  hash, 
  onSuccess, 
  onError, 
  className = "" 
}: TransactionStatusProps) {
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'failed'>('pending');
  const [receipt, setReceipt] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!hash || !publicClient) return;

    const checkTransaction = async () => {
      try {
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash: hash as `0x${string}`,
          timeout: 300000 // 5 minutes
        });

        if (receipt.status === 'success') {
          setStatus('confirmed');
          setReceipt(receipt);
          if (onSuccess) {
            onSuccess(receipt);
          }
        } else {
          setStatus('failed');
          setError('Transaction failed');
          if (onError) {
            onError(new Error('Transaction failed'));
          }
        }
      } catch (err) {
        setStatus('failed');
        const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
        setError(errorMessage);
        if (onError) {
          onError(err instanceof Error ? err : new Error(errorMessage));
        }
      }
    };

    checkTransaction();
  }, [hash, publicClient, onSuccess, onError]);

  if (status === 'pending') {
    return (
      <div className={`flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div>
          <p className="text-sm font-medium text-blue-900">Transaction Pending</p>
          <p className="text-xs text-blue-700 font-mono">
            {hash.slice(0, 10)}...{hash.slice(-8)}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'confirmed') {
    return (
      <div className={`flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg ${className}`}>
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <div>
          <p className="text-sm font-medium text-green-900">Transaction Confirmed</p>
          <p className="text-xs text-green-700">
            Block: {receipt?.blockNumber?.toString()}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className={`flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        <div>
          <p className="text-sm font-medium text-red-900">Transaction Failed</p>
          <p className="text-xs text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return null;
}

