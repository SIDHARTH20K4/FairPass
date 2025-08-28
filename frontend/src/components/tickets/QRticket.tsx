import { createUserQR } from "../../Services/Semaphore";

export async function handleRegister(): Promise<void> {
    const eventId: Number = 1234  // Example event ID
    const { commitment } = createUserQR(eventId)

    // Send data to backend
    await fetch("/api/approveUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            eventId,
            commitment,
        }),
    })
}
