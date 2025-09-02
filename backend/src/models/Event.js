"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var EventSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    bannerUrl: {
        type: String,
        required: true
    },
    bannerCid: {
        type: String
    },
    isPaid: {
        type: Boolean,
        required: true,
        default: false
    },
    price: {
        type: Number,
        min: 0
    },
    currency: {
        type: String,
        default: 'USD'
    },
    approvalNeeded: {
        type: Boolean,
        required: true,
        default: true
    },
    date: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    organization: {
        type: String,
        trim: true
    },
    organizationDescription: {
        type: String
    },
    eventDescription: {
        type: String
    },
    lat: {
        type: Number
    },
    lng: {
        type: Number
    },
    hostAddress: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft'
    }
}, {
    timestamps: true
});
// Index for better query performance
EventSchema.index({ location: 1, date: 1 });
EventSchema.index({ hostAddress: 1 });
exports.default = mongoose_1.default.model('Event', EventSchema);
