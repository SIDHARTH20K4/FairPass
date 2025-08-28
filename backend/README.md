# FairPass Backend

A Node.js/Express backend for the FairPass event management platform with MongoDB integration.

## Features

- **Event Management**: Create, read, update, and delete events
- **Registration System**: Handle event registrations with approval workflow
- **MongoDB Integration**: Persistent data storage with Mongoose ODM
- **RESTful API**: Clean API endpoints for frontend integration
- **Error Handling**: Comprehensive error handling and validation
- **Security**: Helmet.js for security headers, CORS configuration

## Setup

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `config.env` and update with your values:
   ```env
   MONGODB_URI=mongodb://localhost:27017/fairpass
   PORT=4000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000
   ```

3. Start MongoDB (if using local instance):
```bash
# Using MongoDB Community Edition
mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Running the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:4000`

## API Endpoints

### Events

- `GET /api/events` - Get all events (with optional location filter)
- `GET /api/events/:id` - Get single event by ID
- `POST /api/events` - Create new event
- `PATCH /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Registrations

- `GET /api/events/:eventId/registrations` - Get all registrations for an event
- `POST /api/events/:eventId/registrations` - Create new registration
- `PATCH /api/events/:eventId/registrations/:submissionId` - Update registration status
- `GET /api/events/:eventId/registrations/user/:address` - Get user's registration

### Health Check

- `GET /health` - Server health status

## Data Models

### Event Schema
```javascript
{
  name: String (required),
  bannerUrl: String (required),
  bannerCid: String,
  isPaid: Boolean (required),
  price: Number,
  currency: String,
  approvalNeeded: Boolean (required),
  date: String (required),
  time: String (required),
  location: String (required),
  organization: String,
  organizationDescription: String,
  eventDescription: String,
  lat: Number,
  lng: Number,
  hostAddress: String (required),
  createdAt: Date,
  updatedAt: Date
}
```

### Submission Schema
```javascript
{
  eventId: ObjectId (required, ref: 'Event'),
  address: String (required),
  values: Object (required),
  status: String (enum: ['pending', 'approved', 'rejected']),
  qrCid: String,
  qrUrl: String,
  jsonCid: String,
  jsonUrl: String,
  signature: String (required),
  createdAt: Date,
  updatedAt: Date
}
```

## Frontend Integration

Update your frontend environment variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Development

### Project Structure
```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── middleware/
│   └── errorHandler.js      # Error handling middleware
├── models/
│   ├── Event.js            # Event model
│   └── Submission.js       # Submission model
├── routes/
│   ├── events.js           # Event routes
│   └── registrations.js    # Registration routes
├── index.js                # Main server file
├── package.json
└── config.env              # Environment variables
```

### Adding New Features

1. Create new models in `models/` directory
2. Add routes in `routes/` directory
3. Import and use routes in `index.js`
4. Update API documentation

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a production MongoDB instance (Atlas, etc.)
3. Configure proper CORS origins
4. Set up environment variables securely
5. Use PM2 or similar process manager

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**: Ensure MongoDB is running and URI is correct
2. **CORS Errors**: Check `CORS_ORIGIN` environment variable
3. **Port Already in Use**: Change `PORT` in environment variables

### Logs

The server uses Morgan for HTTP request logging. Check console output for:
- Request logs
- Error messages
- Database connection status
