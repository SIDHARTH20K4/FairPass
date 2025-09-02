import { Identity } from "@semaphore-protocol/identity";
import QRCode from "qrcode";

export interface UserQRData {
    user: Identity;         // The private Semaphore identity
    commitment: string;     // Public commitment (can be shared)
    qrData: string;         // Encoded QR string
}

/**
 * Create a new user identity + commitment + QR code for an event
 * @param eventId - Event ID from backend or blockchain
 * @returns UserQRData
 */

export function createUserQR(eventId: string): UserQRData {
    const user = new Identity();

    // Generate public commitment (can be safely shared)
    const commitment = user.commitment.toString();
    console.log("✅ User commitment generated:", commitment);

    // Encode eventId + commitment into QR string
    const qrData = JSON.stringify({ eventId, commitment });

    // Generate QR code in terminal for demo purposes
    QRCode.toString(qrData, { type: "terminal" }, (err, url) => {
        if (err) console.error(err);
        console.log("\n🎫 QR Code (scan for check-in):\n", url);
    });

    // Generate QR code as data URL for frontend usage
    QRCode.toDataURL(qrData, { width: 300 }, (err, dataUrl) => {
        if (err) console.error(err);
        else console.log("✅ QR code generated as data URL");
    });

    // Return user, commitment, and qrData for frontend usage
    return { user, commitment, qrData };
}