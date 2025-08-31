// backend/src/routes/approveUsers.ts
import express, { Request, Response } from "express"
import { Group } from "@semaphore-protocol/group"

// NOTE: In-memory storage for demo. Replace with DB or contract in production.
const eventGroups: Record<string, Group> = {}

const router = express.Router()

// POST /api/approveUsers
router.post("/approveUsers", async (req: Request, res: Response) => {
    try {
        const { eventId, commitment, metadata } = req.body as { eventId?: string | number; commitment?: string; metadata?: unknown }

        if (!eventId || !commitment) {
            return res.status(400).json({ error: "eventId and commitment are required" })
        }

        const key = String(eventId)

        if (!eventGroups[key]) {
            eventGroups[key] = new Group()
        }

        eventGroups[key].addMember(commitment)

        console.log(`✅ User approved for ${key}`, { commitment, metadata })

        return res.status(200).json({
            success: true,
            message: "User approved",
            eventId: key,
            commitment,
        })
    } catch (error) {
        console.error("❌ Error approving user:", error)
        return res.status(500).json({ error: "Internal server error" })
    }
})

export default router
