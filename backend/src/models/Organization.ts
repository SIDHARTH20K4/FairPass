import mongoose, { Schema } from 'mongoose';
import { IOrganization } from '../types';

const OrganizationSchema = new Schema<IOrganization>({
  address: { 
    type: String, 
    required: true,  // Make address required
    lowercase: true  // Store addresses in lowercase for consistency
  },
  name: { type: String, required: true },
  description: { type: String },
  email: { 
    type: String, 
    lowercase: true  // Store emails in lowercase
  },
  password: { type: String }, // Optional for wallet-based auth
}, { timestamps: true });

// Add indexes for better query performance and uniqueness
OrganizationSchema.index({ address: 1 }, { unique: true });
OrganizationSchema.index({ email: 1 }, { unique: true, sparse: true });

export default mongoose.model<IOrganization>('Organization', OrganizationSchema);


