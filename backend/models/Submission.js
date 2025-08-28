import mongoose from 'mongoose';

const SubmissionSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  address: {
    type: String,
    required: true
  },
  values: {
    type: Object,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  qrCid: {
    type: String
  },
  qrUrl: {
    type: String
  },
  jsonCid: {
    type: String
  },
  jsonUrl: {
    type: String
  },
  signature: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
SubmissionSchema.index({ eventId: 1, address: 1 }, { unique: true });
SubmissionSchema.index({ eventId: 1, status: 1 });
SubmissionSchema.index({ address: 1 });

export default mongoose.model('Submission', SubmissionSchema);
