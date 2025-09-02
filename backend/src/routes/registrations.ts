import express, { Request, Response } from 'express';
import Submission from '../models/Submission';
import Event from '../models/Event';
import { 
  CreateSubmissionRequest, 
  UpdateSubmissionRequest, 
  SubmissionResponse 
} from '../types';

const router = express.Router();

// Get all registrations for an event
router.get('/events/:eventId/registrations', async (req: Request<{ eventId: string }>, res: Response) => {
  try {
    const { eventId } = req.params;
    
    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const submissions = await Submission.find({ eventId })
      .sort({ createdAt: -1 })
      .lean();
    
    const submissionsWithId: SubmissionResponse[] = submissions.map(submission => ({
      ...submission,
      id: submission._id.toString()
    }));
    
    res.json(submissionsWithId);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// Create new registration
router.post('/events/:eventId/registrations', async (
  req: Request<{ eventId: string }, {}, CreateSubmissionRequest>, 
  res: Response
) => {
  try {
    const { eventId } = req.params;
    const registrationData = req.body;
    
    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Check if user already registered
    const existingSubmission = await Submission.findOne({
      eventId,
      address: registrationData.address
    });
    
    if (existingSubmission) {
      return res.status(400).json({ error: 'Already registered for this event' });
    }
    
    // Validate required fields
    if (!registrationData.address || !registrationData.values || !registrationData.signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const submission = new Submission({
      ...registrationData,
      eventId,
      status: event.approvalNeeded ? 'pending' : 'approved'
    });
    
    const savedSubmission = await submission.save();
    
    const submissionResponse: SubmissionResponse = {
      ...savedSubmission.toObject(),
      id: savedSubmission._id.toString()
    };
    
    res.status(201).json(submissionResponse);
  } catch (error) {
    console.error('Error creating registration:', error);
    res.status(500).json({ error: 'Failed to create registration' });
  }
});

// Update registration status (approve/reject)
router.patch('/events/:eventId/registrations/:submissionId', async (
  req: Request<{ eventId: string; submissionId: string }, {}, UpdateSubmissionRequest>, 
  res: Response
) => {
  try {
    const { eventId, submissionId } = req.params;
    const { status, qrCid, qrUrl, jsonCid, jsonUrl } = req.body;
    
    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const updateData: any = { status };
    
    // Add QR and JSON data if approving
    if (status === 'approved') {
      if (qrCid) updateData.qrCid = qrCid;
      if (qrUrl) updateData.qrUrl = qrUrl;
      if (jsonCid) updateData.jsonCid = jsonCid;
      if (jsonUrl) updateData.jsonUrl = jsonUrl;
    }
    
    const submission = await Submission.findByIdAndUpdate(
      submissionId,
      updateData,
      { new: true, runValidators: true }
    ).lean();
    
    if (!submission) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    const submissionResponse: SubmissionResponse = {
      ...submission,
      id: submission._id.toString()
    };
    
    res.json(submissionResponse);
  } catch (error) {
    console.error('Error updating registration:', error);
    res.status(500).json({ error: 'Failed to update registration' });
  }
});

// Get user's registration for an event
router.get('/events/:eventId/registrations/user/:address', async (
  req: Request<{ eventId: string; address: string }>, 
  res: Response
) => {
  try {
    const { eventId, address } = req.params;
    
    const submission = await Submission.findOne({
      eventId,
      address
    }).lean();
    
    if (!submission) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    const submissionResponse: SubmissionResponse = {
      ...submission,
      id: submission._id.toString()
    };
    
    res.json(submissionResponse);
  } catch (error) {
    console.error('Error fetching user registration:', error);
    res.status(500).json({ error: 'Failed to fetch registration' });
  }
});

// Get registration count for an event
router.get('/events/:eventId/registrations/count', async (req: Request<{ eventId: string }>, res: Response) => {
  try {
    const { eventId } = req.params;
    
    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const count = await Submission.countDocuments({ eventId });
    
    res.json({ count });
  } catch (error) {
    console.error('Error fetching registration count:', error);
    res.status(500).json({ error: 'Failed to fetch registration count' });
  }
});

// Get registration counts for multiple events
router.get('/events/registrations/counts', async (req: Request<{}, {}, {}, { ids: string }>, res: Response) => {
  try {
    const { ids } = req.query;
    console.log('Registration counts request - ids:', ids);
    
    if (!ids) {
      return res.status(400).json({ error: 'Event IDs are required' });
    }
    
    const eventIds = Array.isArray(ids) ? ids : [ids];
    console.log('Event IDs to count:', eventIds);
    
    // Get counts for all events
    const counts = await Submission.aggregate([
      {
        $match: { eventId: { $in: eventIds } }
      },
      {
        $group: {
          _id: '$eventId',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('Aggregation result:', counts);
    
    // Convert to object format
    const countMap: Record<string, number> = {};
    eventIds.forEach(id => {
      const found = counts.find(c => c._id === id);
      countMap[id] = found ? found.count : 0;
    });
    
    console.log('Final count map:', countMap);
    res.json(countMap);
  } catch (error) {
    console.error('Error fetching registration counts:', error);
    res.status(500).json({ error: 'Failed to fetch registration counts' });
  }
});

export default router;
