import { useReadContract, useWriteContract } from "wagmi";
import { eventImplementationABI } from "./constants";

// ---------------------------
// 📖 Readable Functions
// ---------------------------

// Get event name
export function useEventName(contractAddress: string) {
  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: eventImplementationABI,
    functionName: "eventName",
    query: {
      enabled: !!contractAddress,
    },
  });
}

// Get event type
export function useEventType(contractAddress: string) {
  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: eventImplementationABI,
    functionName: "eventType",
    query: {
      enabled: !!contractAddress,
    },
  });
}

// Get ticket price
export function useTicketPrice(contractAddress: string) {
  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: eventImplementationABI,
    functionName: "ticketPrice",
    query: {
      enabled: !!contractAddress,
    },
  });
}

// Get event owner
export function useOwner(contractAddress: string) {
  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: eventImplementationABI,
    functionName: "owner",
    query: {
      enabled: !!contractAddress,
    },
  });
}

// Get NFT owner by tokenId
export function useOwnerOfNFT(contractAddress: string, tokenId: bigint) {
  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: eventImplementationABI,
    functionName: "ownerOfNFT",
    args: [tokenId],
    query: {
      enabled: !!contractAddress,
    },
  });
}

// Get linked ticket NFT contract address
export function useTicketNFT(contractAddress: string) {
  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: eventImplementationABI,
    functionName: "ticketNFT",
    query: {
      enabled: !!contractAddress,
    },
  });
}

// ---------------------------
// ✍️ Writable Functions
// ---------------------------

export function useBuyTicket(contractAddress: string) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const buyTicket = (metadataURI: string, ticketPrice: bigint) => {
    if (!contractAddress) {
      console.error("Contract address is required for buyTicket");
      return;
    }
    
    writeContract({
      address: contractAddress as `0x${string}`,
      abi: eventImplementationABI,
      functionName: "buyTicket",
      args: [metadataURI],
      value: ticketPrice, // Payable function
    });
  };

  return { buyTicket, hash, isPending, error };
}

export function useCheckIn(contractAddress: string) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const checkIn = (tokenId: bigint) => {
    if (!contractAddress) {
      console.error("Contract address is required for checkIn");
      return;
    }
    
    writeContract({
      address: contractAddress as `0x${string}`,
      abi: eventImplementationABI,
      functionName: "checkIn",
      args: [tokenId],
    });
  };

  return { checkIn, hash, isPending, error };
}

export function useMintForUser(contractAddress: string) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const mintForUser = (user: string, metadataURI: string) => {
    if (!contractAddress) {
      console.error("Contract address is required for mintForUser");
      return;
    }
    
    writeContract({
      address: contractAddress as `0x${string}`,
      abi: eventImplementationABI,
      functionName: "mintForUser",
      args: [user, metadataURI],
    });
  };

  return { mintForUser, hash, isPending, error };
}

export function useRegisterMe(contractAddress: string) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const registerMe = () => {
    if (!contractAddress) {
      console.error("Contract address is required for registerMe");
      return;
    }
    
    writeContract({
      address: contractAddress as `0x${string}`,
      abi: eventImplementationABI,
      functionName: "registerMe",
    });
  };

  return { registerMe, hash, isPending, error };
}

export function useTransferOwnership(contractAddress: string) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const transferOwnership = (newOwner: string) => {
    if (!contractAddress) {
      console.error("Contract address is required for transferOwnership");
      return;
    }
    
    writeContract({
      address: contractAddress as `0x${string}`,
      abi: eventImplementationABI,
      functionName: "transferOwnership",
      args: [newOwner],
    });
  };

  return { transferOwnership, hash, isPending, error };
}

export function useRenounceOwnership(contractAddress: string) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const renounceOwnership = () => {
    if (!contractAddress) {
      console.error("Contract address is required for renounceOwnership");
      return;
    }
    
    writeContract({
      address: contractAddress as `0x${string}`,
      abi: eventImplementationABI,
      functionName: "renounceOwnership",
    });
  };

  return { renounceOwnership, hash, isPending, error };
}

// ---------------------------
// 🏭 Hook Factory
// ---------------------------

// Create a complete set of hooks for a specific event contract
export function createEventHooks(contractAddress: string) {
  if (!contractAddress) {
    console.warn("createEventHooks: Contract address is required");
    return null;
  }

  return {
    // Read hooks
    useEventName: () => useEventName(contractAddress),
    useEventType: () => useEventType(contractAddress),
    useTicketPrice: () => useTicketPrice(contractAddress),
    useOwner: () => useOwner(contractAddress),
    useOwnerOfNFT: (tokenId: bigint) => useOwnerOfNFT(contractAddress, tokenId),
    useTicketNFT: () => useTicketNFT(contractAddress),
    
    // Write hooks
    useBuyTicket: () => useBuyTicket(contractAddress),
    useCheckIn: () => useCheckIn(contractAddress),
    useMintForUser: () => useMintForUser(contractAddress),
    useRegisterMe: () => useRegisterMe(contractAddress),
    useTransferOwnership: () => useTransferOwnership(contractAddress),
    useRenounceOwnership: () => useRenounceOwnership(contractAddress),
  };
}

// ---------------------------
// 🔧 Utility Functions
// ---------------------------

// Validate contract address format
export function isValidContractAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Get contract address from event data
export function getContractAddressFromEvent(event: any): string | null {
  if (event?.blockchainEventAddress) {
    return event.blockchainEventAddress;
  }
  if (event?.contractAddress) {
    return event.contractAddress;
  }
  return null;
}

// Safe hook wrapper that validates contract address
export function useSafeEventHook<T>(
  hook: (contractAddress: string) => T,
  contractAddress: string | null | undefined
): T | null {
  if (!contractAddress || !isValidContractAddress(contractAddress)) {
    return null;
  }
  return hook(contractAddress);
}
