import express, { Request, Response } from 'express';
import Event from '../models/Event';
import { CreateEventRequest, UpdateEventRequest, EventQuery, EventResponse } from '../types';

const router = express.Router();

// Get all events
router.get('/', async (req: Request<{}, {}, {}, EventQuery>, res: Response): Promise<void> => {
  try {
    const { location } = req.query;
    let query: any = { status: 'published' };
    
    if (location && location !== 'Worldwide') {
      query.location = location;
    }
    
    const events = await Event.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    const eventsWithId: EventResponse[] = events.map(event => ({
      ...event,
      id: event._id.toString()
    }));
    
    res.json(eventsWithId);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get single event by ID
router.get('/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id).lean();
    
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    
    const eventResponse: EventResponse = {
      ...event,
      id: event._id.toString()
    };
    
    res.json(eventResponse);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create new event
router.post('/', async (req: Request<{}, {}, CreateEventRequest>, res: Response): Promise<void> => {
  try {
    const eventData = req.body;
    
    // Validate required fields
    if (!eventData.name || !eventData.bannerUrl || !eventData.hostAddress) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    
    const event = new Event({ ...eventData, status: eventData.status || 'draft' });
    const savedEvent = await event.save();
    
    const eventResponse = {
      id: (savedEvent._id as any).toString(),
      name: savedEvent.name,
      bannerUrl: savedEvent.bannerUrl,
      bannerCid: savedEvent.bannerCid,
      isPaid: savedEvent.isPaid,
      price: savedEvent.price,
      currency: savedEvent.currency,
      approvalNeeded: savedEvent.approvalNeeded,
      allowResale: savedEvent.allowResale,
      date: savedEvent.date,
      time: savedEvent.time,
      location: savedEvent.location,
      organization: savedEvent.organization,
      organizationDescription: savedEvent.organizationDescription,
      eventDescription: savedEvent.eventDescription,
      lat: savedEvent.lat,
      lng: savedEvent.lng,
      hostAddress: savedEvent.hostAddress,
      status: savedEvent.status,
      blockchainEventAddress: savedEvent.blockchainEventAddress,
      useBlockchain: savedEvent.useBlockchain,
      createdAt: savedEvent.createdAt,
      updatedAt: savedEvent.updatedAt
    } as EventResponse;
    
    res.status(201).json(eventResponse);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.patch('/:id', async (req: Request<{ id: string }, {}, UpdateEventRequest & { status?: 'draft' | 'published' }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const event = await Event.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).lean();
    
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    
    const eventResponse: EventResponse = {
      ...event,
      id: event._id.toString()
    };
    
    res.json(eventResponse);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Host: list all events including drafts
router.get('/host/:address', async (req: Request<{ address: string }, {}, {}, { status?: string }>, res: Response): Promise<void> => {
  try {
    const { address } = req.params;
    const { status } = req.query;
    const query: any = { hostAddress: address.toLowerCase() };
    if (status) query.status = status;
    const events = await Event.find(query).sort({ updatedAt: -1 }).lean();
    const eventsWithId: EventResponse[] = events.map(event => ({ ...event, id: event._id.toString() }));
    res.json(eventsWithId);
  } catch (error) {
    console.error('Error fetching host events:', error);
    res.status(500).json({ error: 'Failed to fetch host events' });
  }
});

// Delete event
router.delete('/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const event = await Event.findByIdAndDelete(id);
    
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;