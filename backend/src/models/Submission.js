"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var SubmissionSchema = new mongoose_1.Schema({
    eventId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
    commitment: {
        type: String
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
exports.default = mongoose_1.default.model('Submission', SubmissionSchema);
