"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var OrganizationSchema = new mongoose_1.Schema({
    address: {
        type: String,
        required: true, // Make address required
        unique: true, // Keep it unique
        lowercase: true // Store addresses in lowercase for consistency
    },
    name: { type: String, required: true },
    description: { type: String },
    email: {
        type: String,
        unique: true,
        sparse: true, // Allow null/undefined emails
        lowercase: true // Store emails in lowercase
    },
    password: { type: String }, // Optional for wallet-based auth
}, { timestamps: true });
// Add compound index to ensure uniqueness
OrganizationSchema.index({ address: 1 }, { unique: true });
OrganizationSchema.index({ email: 1 }, { unique: true, sparse: true });
exports.default = mongoose_1.default.model('Organization', OrganizationSchema);
