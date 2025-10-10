import express, { Request, Response } from 'express';
import Organization from '../models/Organization';
import Event from '../models/Event';
import { CreateOrganizationRequest } from '../types';

const router = express.Router();

// Register/Upsert organization by wallet address
router.post('/organizations', async (req: Request<{}, {}, CreateOrganizationRequest>, res: Response): Promise<void> => {
  try {
    const { address, name, description, email, signature } = req.body;
    if (!address || !name || !signature) {
      res.status(400).json({ error: 'address, name and signature are required' });
      return;
    }
    // TODO: verify signature against message (e.g., JSON of payload)
    const upsert = await Organization.findOneAndUpdate(
      { address: address.toLowerCase() },
      { name, description, email },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    res.json({ success: true, organization: upsert });
  } catch (error) {
    console.error('Error registering organization:', error);
    res.status(500).json({ error: 'Failed to register organization' });
  }
});

// Check if organization exists by wallet address
router.post('/organizations/check', async (req: Request<{}, {}, { address: string }>, res: Response): Promise<void> => {
  try {
    const { address } = req.body;
    if (!address) {
      res.status(400).json({ error: 'Address is required' });
      return;
    }
    
    const organization = await Organization.findOne({ address: address.toLowerCase() }).lean();
    if (organization) {
      res.json({ exists: true, organization });
      return;
    } else {
      res.status(404).json({ exists: false, error: 'Organization not found' });
      return;
    }
  } catch (error) {
    console.error('Error checking organization:', error);
    res.status(500).json({ error: 'Failed to check organization' });
  }
});

// Get organization by wallet address
router.get('/organizations/:address', async (req: Request<{ address: string }>, res: Response): Promise<void> => {
  try {
    const { address } = req.params;
    const org = await Organization.findOne({ address: address.toLowerCase() }).lean();
    if (!org) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(org);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Get events by organization address
router.get('/organizations/:address/events', async (req: Request<{ address: string }>, res: Response): Promise<void> => {
  try {
    const { address } = req.params;
    const events = await Event.find({ hostAddress: address.toLowerCase() })
      .sort({ createdAt: -1 })
      .lean();
    
    // Convert _id to id for frontend compatibility
    const eventsWithId = events.map(event => ({
      ...event,
      id: event._id.toString()
    }));
    
    res.json(eventsWithId);
  } catch (error) {
    console.error('Error fetching organization events:', error);
    res.status(500).json({ error: 'Failed to fetch organization events' });
  }
});

export default router;


