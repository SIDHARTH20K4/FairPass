import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import Submission from '../models/Submission';
import Event from '../models/Event';
import { SemaphoreService } from '../services/SemaphoreService';
import { 
  CreateSubmissionRequest, 
  UpdateSubmissionRequest, 
  SubmissionResponse,
  CheckInRequest
} from '../types';

const router = express.Router();

// Get all registrations for an event
router.get('/events/:eventId/registrations', async (req: Request<{ eventId: string }, {}, {}, { status?: string }>, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { status } = req.query;
    
    console.log(`🔍 Fetching registrations for event ${eventId} with status: ${status}`);
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.log(`❌ Invalid eventId format: ${eventId}`);
      res.status(400).json({ error: 'Invalid event ID format' });
      return;
    }
    
    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      console.log(`❌ Event not found: ${eventId}`);
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    
    console.log(`✅ Event found: ${event.name} (approvalNeeded: ${event.approvalNeeded})`);
    
    // Build query - convert eventId to ObjectId
    const query: any = { 
      eventId: new mongoose.Types.ObjectId(eventId) 
    };
    if (status) {
      query.status = status;
    }
    
    console.log(`🔍 Query for submissions:`, query);
    
    const submissions = await Submission.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`📋 Found ${submissions.length} submissions:`, submissions);
    
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
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const registrationData = req.body;
    
    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    
    // Check if user already registered
    const existingSubmission = await Submission.findOne({
      eventId,
      address: registrationData.address
    });
    
    if (existingSubmission) {
      res.status(400).json({ error: 'Already registered for this event' });
      return;
    }
    
    // Validate required fields
    if (!registrationData.address || !registrationData.values || !registrationData.signature) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    
    console.log('🔍 Registration data received:', {
      address: registrationData.address,
      hasQrUrl: !!registrationData.qrUrl,
      hasQrCid: !!registrationData.qrCid,
      hasJsonUrl: !!registrationData.jsonUrl,
      hasJsonCid: !!registrationData.jsonCid,
      qrUrl: registrationData.qrUrl,
      qrCid: registrationData.qrCid
    });
    
    const submission = new Submission({
      ...registrationData,
      eventId,
      status: event.approvalNeeded ? 'pending' : 'approved'
    });
    
    console.log('🔍 Submission object before save:', {
      qrUrl: submission.qrUrl,
      qrCid: submission.qrCid,
      jsonUrl: submission.jsonUrl,
      jsonCid: submission.jsonCid
    });
    
    const savedSubmission = await submission.save();
    
    console.log('🔍 Saved submission:', {
      qrUrl: savedSubmission.qrUrl,
      qrCid: savedSubmission.qrCid,
      jsonUrl: savedSubmission.jsonUrl,
      jsonCid: savedSubmission.jsonCid
    });
    
    const submissionResponse: SubmissionResponse = {
      ...savedSubmission.toObject(),
      id: savedSubmission._id.toString()
    };
    
    console.log('🔍 Response being sent to frontend:', {
      qrUrl: submissionResponse.qrUrl,
      qrCid: submissionResponse.qrCid,
      jsonUrl: submissionResponse.jsonUrl,
      jsonCid: submissionResponse.jsonCid
    });
    
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
): Promise<void> => {
  try {
    const { eventId, submissionId } = req.params;
    const { status, qrCid, qrUrl, jsonCid, jsonUrl, nftTokenId, nftContractAddress } = req.body;
    
    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    
    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }
    
    const updateData: any = { status };
    
    // Add QR and JSON data if approving
    if (status === 'approved') {
      if (qrCid) updateData.qrCid = qrCid;
      if (qrUrl) updateData.qrUrl = qrUrl;
      if (jsonCid) updateData.jsonCid = jsonCid;
      if (jsonUrl) updateData.jsonUrl = jsonUrl;
      
      // Get the submission to access the commitment
      const currentSubmission = await Submission.findById(submissionId);
      if (currentSubmission?.commitment) {
        console.log(`Adding commitment ${currentSubmission.commitment} to event group for event ${eventId}`);
        // The commitment is automatically included in the event group when we call createEventGroup
        // This happens in the SemaphoreService.createEventGroup method
      }
    }
    
    // Add NFT data (can be updated regardless of status)
    if (nftTokenId) updateData.nftTokenId = nftTokenId;
    if (nftContractAddress) updateData.nftContractAddress = nftContractAddress;
    
    const submission = await Submission.findByIdAndUpdate(
      submissionId,
      updateData,
      { new: true, runValidators: true }
    ).lean();
    
    if (!submission) {
      res.status(404).json({ error: 'Registration not found' });
      return;
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
): Promise<void> => {
  try {
    const { eventId, address } = req.params;
    
    const submission = await Submission.findOne({
      eventId,
      address
    }).lean();
    
    if (!submission) {
      res.status(404).json({ error: 'Registration not found' });
      return;
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
router.get('/events/:eventId/registrations/count', async (req: Request<{ eventId: string }>, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    
    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    
    const count = await Submission.countDocuments({ eventId });
    
    res.json({ count });
  } catch (error) {
    console.error('Error fetching registration count:', error);
    res.status(500).json({ error: 'Failed to fetch registration count' });
  }
});

// Get registration counts for multiple events
router.get('/events/registrations/counts', async (req: Request<{}, {}, {}, { ids: string }>, res: Response): Promise<void> => {
  try {
    const { ids } = req.query;
    console.log('Registration counts request - ids:', ids);
    
    if (!ids) {
      res.status(400).json({ error: 'Event IDs are required' });
      return;
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

// Check-in endpoint using ZK proofs
router.post('/events/:eventId/checkin', async (
  req: Request<{ eventId: string }, {}, CheckInRequest>, 
  res: Response
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { proof, commitment } = req.body;
    
    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    
    // Verify the ZK proof
    const verification = await SemaphoreService.verifyCheckInProof(eventId, proof, commitment);
    
    if (!verification.valid) {
      res.status(400).json({ 
        error: 'Invalid check-in proof', 
        details: verification.error 
      });
      return;
    }
    
    // Check if already checked in (using nullifier hash)
    // In a real implementation, you'd store nullifier hashes to prevent double check-in
    // const nullifierKey = `checkin:${eventId}:${proof.nullifierHash}`;
    // TODO: Implement nullifier storage to prevent double check-in
    
    res.json({ 
      success: true, 
      message: 'Check-in successful',
      nullifierHash: proof.nullifierHash
    });
  } catch (error) {
    console.error('Error processing check-in:', error);
    res.status(500).json({ error: 'Check-in failed' });
  }
});

// Get event group information for ZK proof generation
router.get('/events/:eventId/group', async (
  req: Request<{ eventId: string }>, 
  res: Response
): Promise<void> => {
  try {
    const { eventId } = req.params;
    
    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    
    // Get the event group
    const eventGroup = await SemaphoreService.createEventGroup(eventId);
    
    res.json(eventGroup);
  } catch (error) {
    console.error('Error fetching event group:', error);
    res.status(500).json({ error: 'Failed to fetch event group' });
  }
});

// Validate QR code for check-in (for organizers)
router.post('/events/:eventId/validate-qr', async (
  req: Request<{ eventId: string }, {}, { qrData: string }>, 
  res: Response
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { qrData } = req.body;
    
    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    
    // Parse QR data
    let participantData;
    try {
      participantData = JSON.parse(qrData);
    } catch {
      // If not JSON, treat as simple text
      participantData = { data: qrData };
    }
    
    // In a real implementation, you would:
    // 1. Verify the QR code contains valid participant data
    // 2. Check if the participant is approved for this event
    // 3. Verify they haven't already checked in
    // 4. Record the check-in with timestamp
    
    // For demo purposes, we'll simulate validation
    const validationResult = {
      success: true,
      message: 'Check-in validated successfully!',
      participantName: participantData['name'] || participantData['participantName'] || 'Unknown Participant',
      eventName: event.name,
      checkedInAt: new Date().toISOString(),
      nullifierHash: `nullifier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    res.json(validationResult);
  } catch (error) {
    console.error('Error validating QR code:', error);
    res.status(500).json({ error: 'QR validation failed' });
  }
});

// Get event group members (for organizers)
router.get('/events/:eventId/group/members', async (
  req: Request<{ eventId: string }>, 
  res: Response
): Promise<void> => {
  try {
    const { eventId } = req.params;
    
    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    
    // Get all approved submissions with commitments
    const approvedSubmissions = await Submission.find({
      eventId,
      status: 'approved',
      commitment: { $exists: true, $ne: null }
    }).select('commitment values.name address createdAt').lean();
    
    const members = approvedSubmissions.map(submission => ({
      commitment: submission.commitment,
      name: submission.values?.name || 'Anonymous',
      address: submission.address,
      approvedAt: submission.createdAt
    }));
    
    res.json({
      eventId,
      totalMembers: members.length,
      members
    });
  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ error: 'Failed to fetch group members' });
  }
});

export default router;
