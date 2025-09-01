// src/fairpass-demo.ts
import { Identity } from "@semaphore-protocol/identity"
import { Group } from "@semaphore-protocol/group"

/// User = generates an identity (private) + commitment (public)
class FairPassUser {
    name: string
    identity: Identity
    commitment: bigint

    constructor(name: string) {
        this.name = name
        this.identity = new Identity()                // private keys
        this.commitment = this.identity.commitment    // public identifier
    }
}

/// Event = has a group of approved members
class FairPassEvent {
    name: string
    group: Group
    checkedIn: Set<string>

    constructor(name: string) {
        this.name = name
        this.group = new Group()
        this.checkedIn = new Set()
    }

    approveUser(user: FairPassUser): void {
        this.group.addMember(user.commitment)   // add their commitment
        console.log(`✅ ${user.name} approved for ${this.name}`)
    }

    checkIn(user: FairPassUser): void {
        const isMember = this.group.members.some(
            (m) => m.toString() === user.commitment.toString()
        )

        if (!isMember) {
            console.log(`❌ ${user.name} is not approved`)
        } else if (this.checkedIn.has(user.commitment.toString())) {
            console.log(`⚠️ ${user.name} already checked in`)
        } else {
            console.log(`🎫 ${user.name} checked in anonymously`)
            this.checkedIn.add(user.commitment.toString())
        }
    }
}

//// DEMO
async function demo(): Promise<void> {
    console.log("🚀 FairPass Semaphore-Only Demo")

    // Create users
    const alice = new FairPassUser("Alice")
    const bob = new FairPassUser("Bob")
    const carl = new FairPassUser("Carl")

    // Create event instance
    const event = new FairPassEvent("Web3 Conference")

    // Organizer approves users (call on instance)
    event.approveUser(alice)
    event.approveUser(bob)

    // Users check-in
    event.checkIn(alice)
    event.checkIn(bob)
    event.checkIn(carl) // not approved
    event.checkIn(alice) // trying double check-in
}

demo()