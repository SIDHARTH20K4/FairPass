import { useReadContract, useWriteContract } from "wagmi";
import { eventFactoryAddress, eventFactoryABI } from "./constants";

// EventType enum values matching the smart contract
export enum EventType {
  FREE = 0,
  PAID = 1,
  APPROVAL = 2
}

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
    eventType: EventType, // EventType enum (0 = FREE, 1 = PAID, 2 = APPROVAL)
    ticketPrice: bigint
  ) => {
    // Validate parameters before calling
    if (!name || name.trim() === '') {
      throw new Error('Event name cannot be empty');
    }
    
    if (ticketPrice < BigInt(0)) {
      throw new Error('Ticket price cannot be negative');
    }

    console.log('Creating event with parameters:', {
      name,
      eventType,
      ticketPrice: ticketPrice.toString(),
      eventTypeType: typeof eventType,
      ticketPriceType: typeof ticketPrice
    });

    console.log('🔍 Calling writeContract with:', {
      address: eventFactoryAddress,
      functionName: "createEvent",
      args: [name, eventType, ticketPrice],
      isPending,
      hash
    });

    writeContract({
      address: eventFactoryAddress,
      abi: eventFactoryABI,
      functionName: "createEvent",
      args: [name, eventType, ticketPrice],
    });

    console.log('🔍 writeContract called, current state:', { isPending, hash });
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
