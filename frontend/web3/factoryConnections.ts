import { useReadContract, useWriteContract } from "wagmi";
import { eventFactoryAddress, eventFactoryABI } from "./constants";

// --------------------
// Readable Operations
// --------------------

export function usePlatformOwner() {
  const { data: platformOwner, isLoading, error } = useReadContract({
    address: eventFactoryAddress,
    abi: eventFactoryABI,
    functionName: "platformOwner",
  });
  return { platformOwner, isLoading, error };
}

export function useEvents(index: number) {
  const { data: eventAddress, isLoading, error } = useReadContract({
    address: eventFactoryAddress,
    abi: eventFactoryABI,
    functionName: "events",
    args: [index],
  });
  return { eventAddress, isLoading, error };
}

export function useAllEvents() {
  const { data: events, isLoading, error } = useReadContract({
    address: eventFactoryAddress,
    abi: eventFactoryABI,
    functionName: "getAllEvents",
  });
  return { events, isLoading, error };
}

// --------------------
// Writable Operations
// --------------------

export const useCreateEvent = () => {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const createEvent = (
    name: string,
    eventType: number, // 0 = FREE, 1 = PAID, 2 = APPROVAL
    ticketPrice: bigint
  ) => {
    writeContract({
      address: eventFactoryAddress,
      abi: eventFactoryABI,
      functionName: "createEvent",
      args: [name, eventType, ticketPrice],
    });
  };

  return { createEvent, hash, isPending, error };
};

export const useRegisterMe = () => {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const registerMe = () => {
    writeContract({
      address: eventFactoryAddress,
      abi: eventFactoryABI,
      functionName: "registerMe",
    });
  };

  return { registerMe, hash, isPending, error };
};
