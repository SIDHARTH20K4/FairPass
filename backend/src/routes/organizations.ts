import express, { Request, Response } from 'express';
import Organization from '../models/Organization';
import { CreateOrganizationRequest } from '../types';

const router = express.Router();

// Register/Upsert organization by wallet address
router.post('/organizations', async (req: Request<{}, {}, CreateOrganizationRequest>, res: Response) => {
  try {
    const { address, name, description, email, signature } = req.body;
    if (!address || !name || !signature) {
      return res.status(400).json({ error: 'address, name and signature are required' });
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

// Get organization by wallet address
router.get('/organizations/:address', async (req: Request<{ address: string }>, res: Response) => {
  try {
    const { address } = req.params;
    const org = await Organization.findOne({ address: address.toLowerCase() }).lean();
    if (!org) return res.status(404).json({ error: 'Not found' });
    res.json(org);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

export default router;


