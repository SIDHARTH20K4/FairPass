import { useReadContract, useWriteContract } from "wagmi";
import { eventImplementationABI } from "./constants";
const contractAddress = ""; //get the last contract of the events array!

// ---------------------------
// 📖 Readable Functions
// ---------------------------

// Get event name
export function useEventName() {
  return useReadContract({
    address: contractAddress,
    abi: eventImplementationABI,
    functionName: "eventName",
  });
}

// Get event type
export function useEventType() {
  return useReadContract({
    address: contractAddress,
    abi: eventImplementationABI,
    functionName: "eventType",
  });
}

// Get ticket price
export function useTicketPrice() {
  return useReadContract({
    address: contractAddress,
    abi: eventImplementationABI,
    functionName: "ticketPrice",
  });
}

// Get event owner
export function useOwner() {
  return useReadContract({
    address: contractAddress,
    abi: eventImplementationABI,
    functionName: "owner",
  });
}

// Get NFT owner by tokenId
export function useOwnerOfNFT(tokenId: bigint) {
  return useReadContract({
    address: contractAddress,
    abi: eventImplementationABI,
    functionName: "ownerOfNFT",
    args: [tokenId],
  });
}

// Get linked ticket NFT contract address
export function useTicketNFT() {
  return useReadContract({
    address: contractAddress,
    abi: eventImplementationABI,
    functionName: "ticketNFT",
  });
}

// ---------------------------
// ✍️ Writable Functions
// ---------------------------

export function useBuyTicket() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const buyTicket = (metadataURI: string, ticketPrice: bigint) => {
    writeContract({
      address: contractAddress,
      abi: eventImplementationABI,
      functionName: "buyTicket",
      args: [metadataURI],
      value: ticketPrice, // Payable function
    });
  };

  return { buyTicket, hash, isPending, error };
}

export function useCheckIn() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const checkIn = (tokenId: bigint) => {
    writeContract({
      address: contractAddress,
      abi: eventImplementationABI,
      functionName: "checkIn",
      args: [tokenId],
    });
  };

  return { checkIn, hash, isPending, error };
}

export function useMintForUser() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const mintForUser = (user: string, metadataURI: string) => {
    writeContract({
      address: contractAddress,
      abi: eventImplementationABI,
      functionName: "mintForUser",
      args: [user, metadataURI],
    });
  };

  return { mintForUser, hash, isPending, error };
}

export function useRegisterMe() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const registerMe = () => {
    writeContract({
      address: contractAddress,
      abi: eventImplementationABI,
      functionName: "registerMe",
    });
  };

  return { registerMe, hash, isPending, error };
}

export function useTransferOwnership() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const transferOwnership = (newOwner: string) => {
    writeContract({
      address: contractAddress,
      abi: eventImplementationABI,
      functionName: "transferOwnership",
      args: [newOwner],
    });
  };

  return { transferOwnership, hash, isPending, error };
}

export function useRenounceOwnership() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const renounceOwnership = () => {
    writeContract({
      address: contractAddress,
      abi: eventImplementationABI,
      functionName: "renounceOwnership",
    });
  };

  return { renounceOwnership, hash, isPending, error };
}
