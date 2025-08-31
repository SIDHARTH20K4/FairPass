import { Request, Response, NextFunction } from 'express';
import { Document } from 'mongoose';

// Event Types
export interface IEvent extends Document {
  name: string;
  bannerUrl: string;
  bannerCid?: string;
  isPaid: boolean;
  price?: number;
  currency?: string;
  approvalNeeded: boolean;
  date: string;
  time: string;
  location: string;
  organization?: string;
  organizationDescription?: string;
  eventDescription?: string;
  lat?: number;
  lng?: number;
  hostAddress: string;
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventRequest {
  name: string;
  bannerUrl: string;
  bannerCid?: string;
  isPaid: boolean;
  price?: number;
  currency?: string;
  approvalNeeded: boolean;
  date: string;
  time: string;
  location: string;
  organization?: string;
  organizationDescription?: string;
  eventDescription?: string;
  lat?: number;
  lng?: number;
  hostAddress: string;
  status?: 'draft' | 'published';
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {}

// Submission Types
export interface ISubmission extends Document {
  eventId: string;
  address: string;
  values: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  commitment?: string;
  qrCid?: string;
  qrUrl?: string;
  jsonCid?: string;
  jsonUrl?: string;
  signature: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubmissionRequest {
  address: string;
  values: Record<string, any>;
  signature: string;
  commitment?: string;
}

export interface UpdateSubmissionRequest {
  status: 'pending' | 'approved' | 'rejected';
  qrCid?: string;
  qrUrl?: string;
  jsonCid?: string;
  jsonUrl?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: string[];
}

export interface EventResponse extends Omit<IEvent, '_id'> {
  id: string;
}

export interface SubmissionResponse extends Omit<ISubmission, '_id'> {
  id: string;
}

// Request Types
export interface AuthenticatedRequest extends Request {
  user?: {
    address: string;
  };
}

// Query Types
export interface EventQuery {
  location?: string;
}

export interface RegistrationQuery {
  eventId: string;
  address?: string;
}

// Error Types
export interface AppError extends Error {
  status?: number;
  code?: string;
}

// Express Middleware Types
export type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
export type ErrorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => void;

// Organization Types
export interface IOrganization extends Document {
  address: string; // host wallet address (lowercased) - required for wallet auth
  name: string;
  description?: string;
  email?: string;
  password?: string; // hashed password for email authentication
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationRequest {
  address: string;
  name: string;
  description?: string;
  email?: string;
  signature: string; // signed message for verification
}
