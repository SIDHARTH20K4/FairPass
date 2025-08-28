import express from 'express';
import Event from '../models/Event.js';

const router = express.Router();

// Get all events
router.get('/', async (req, res) => {
  try {
    const { location } = req.query;
    let query = {};
    
    if (location && location !== 'Worldwide') {
      query.location = location;
    }
    
    const events = await Event.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    const eventsWithId = events.map(event => ({
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
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({
      ...event,
      id: event._id.toString()
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create new event
router.post('/', async (req, res) => {
  try {
    const eventData = req.body;
    
    // Validate required fields
    if (!eventData.name || !eventData.bannerUrl || !eventData.hostAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const event = new Event(eventData);
    const savedEvent = await event.save();
    
    res.status(201).json({
      ...savedEvent.toObject(),
      id: savedEvent._id.toString()
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const event = await Event.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).lean();
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({
      ...event,
      id: event._id.toString()
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByIdAndDelete(id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;
