// backend/src/routes/approveUser.ts
import { Request, Response } from "express"
import { Group } from "@semaphore-protocol/group"

// Example: store groups in memory (in production use DB or contract)
const eventGroups: Record<number, Group> = {}

export async function approveUser(req: Request, res: Response) {
    try {
        const { eventId, commitment, metadata } = req.body

        if (!eventId || !commitment) {
            return res.status(400).json({ error: "eventId and commitment are required" })
        }

        // If event group doesn't exist yet, create one
        if (!eventGroups[eventId]) {
            eventGroups[eventId] = new Group()
        }

        // Add user to the group
        eventGroups[eventId].addMember(commitment)

        console.log(`✅ User approved for ${eventId}`, {
            commitment,
            metadata,
        })

        return res.status(200).json({
            success: true,
            message: "User approved",
            eventId,
            commitment,
        })
    } catch (error) {
        console.error("❌ Error approving user:", error)
        return res.status(500).json({ error: "Internal server error" })
    }
}
