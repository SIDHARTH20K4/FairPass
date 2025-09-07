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
NEXT_PUBLIC_API_URL=https://fairpassbackend.vercel.app/api

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

## Database Migration: Fix Duplicate Key Error

### Problem
The application was experiencing a MongoDB duplicate key error:
```
E11000 duplicate key error collection: fairpass.organizations index: address_1 dup key: { address: null }
```

This occurred because:
1. Multiple organizations were being created with `null` addresses
2. The `address` field had a unique index but wasn't required
3. MongoDB doesn't allow duplicate `null` values in unique indexed fields

### Solution Implemented

#### 1. Updated Organization Model
- Made `address` field **required** instead of optional
- Added proper validation and indexing
- Ensured addresses are stored in lowercase for consistency

#### 2. Enhanced Auth System
- Added wallet-based authentication support
- Improved validation to prevent null addresses
- Better error handling for duplicate key errors

#### 3. Frontend Updates
- Registration form now requires wallet address
- Enhanced validation and user experience
- Better error messages and guidance

### Running the Database Migration

#### Prerequisites
- Node.js installed
- MongoDB running
- Environment variables configured

#### Steps

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies (if not already done):**
   ```bash
   npm install
   ```

3. **Run the migration script:**
   ```bash
   node scripts/fix-null-addresses.js
   ```

#### What the Script Does

1. **Connects to MongoDB** using environment variables
2. **Finds organizations** with null/undefined addresses
3. **Deletes invalid records** (organizations without addresses)
4. **Verifies cleanup** and reports results
5. **Checks for duplicates** and reports any remaining issues

#### Expected Output

```
Starting database cleanup...
Found X organizations with null addresses
Deleted X organizations with null addresses
✅ Successfully cleaned up all organizations with null addresses
✅ No duplicate addresses found
Database connection closed
```

### After Migration

1. **Restart the backend server** to ensure schema changes take effect
2. **Test registration** with a valid wallet address
3. **Verify** that no more duplicate key errors occur

### Prevention

The updated system now:
- **Requires wallet addresses** for all organizations
- **Validates addresses** before database insertion
- **Provides clear error messages** for validation failures
- **Maintains data integrity** with proper constraints

### Troubleshooting

If you encounter issues:

1. **Check MongoDB connection** in environment variables
2. **Verify database permissions** for the migration script
3. **Review logs** for specific error messages
4. **Ensure backend server** is restarted after schema changes

### Support

For additional help, check:
- Backend logs for detailed error information
- MongoDB connection status
- Environment variable configuration
- Database schema validation
