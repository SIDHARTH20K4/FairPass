"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var Submission_1 = require("../models/Submission");
var Event_1 = require("../models/Event");
var router = express_1.default.Router();
// Get all registrations for an event
router.get('/events/:eventId/registrations', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var eventId, event_1, submissions, submissionsWithId, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                eventId = req.params.eventId;
                return [4 /*yield*/, Event_1.default.findById(eventId)];
            case 1:
                event_1 = _a.sent();
                if (!event_1) {
                    return [2 /*return*/, res.status(404).json({ error: 'Event not found' })];
                }
                return [4 /*yield*/, Submission_1.default.find({ eventId: eventId })
                        .sort({ createdAt: -1 })
                        .lean()];
            case 2:
                submissions = _a.sent();
                submissionsWithId = submissions.map(function (submission) { return (__assign(__assign({}, submission), { id: submission._id.toString() })); });
                res.json(submissionsWithId);
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.error('Error fetching registrations:', error_1);
                res.status(500).json({ error: 'Failed to fetch registrations' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Create new registration
router.post('/events/:eventId/registrations', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var eventId, registrationData, event_2, existingSubmission, submission, savedSubmission, submissionResponse, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                eventId = req.params.eventId;
                registrationData = req.body;
                return [4 /*yield*/, Event_1.default.findById(eventId)];
            case 1:
                event_2 = _a.sent();
                if (!event_2) {
                    return [2 /*return*/, res.status(404).json({ error: 'Event not found' })];
                }
                return [4 /*yield*/, Submission_1.default.findOne({
                        eventId: eventId,
                        address: registrationData.address
                    })];
            case 2:
                existingSubmission = _a.sent();
                if (existingSubmission) {
                    return [2 /*return*/, res.status(400).json({ error: 'Already registered for this event' })];
                }
                // Validate required fields
                if (!registrationData.address || !registrationData.values || !registrationData.signature) {
                    return [2 /*return*/, res.status(400).json({ error: 'Missing required fields' })];
                }
                submission = new Submission_1.default(__assign(__assign({}, registrationData), { eventId: eventId, status: event_2.approvalNeeded ? 'pending' : 'approved' }));
                return [4 /*yield*/, submission.save()];
            case 3:
                savedSubmission = _a.sent();
                submissionResponse = __assign(__assign({}, savedSubmission.toObject()), { id: savedSubmission._id.toString() });
                res.status(201).json(submissionResponse);
                return [3 /*break*/, 5];
            case 4:
                error_2 = _a.sent();
                console.error('Error creating registration:', error_2);
                res.status(500).json({ error: 'Failed to create registration' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Update registration status (approve/reject)
router.patch('/events/:eventId/registrations/:submissionId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, eventId, submissionId, _b, status_1, qrCid, qrUrl, jsonCid, jsonUrl, event_3, updateData, submission, submissionResponse, error_3;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                _a = req.params, eventId = _a.eventId, submissionId = _a.submissionId;
                _b = req.body, status_1 = _b.status, qrCid = _b.qrCid, qrUrl = _b.qrUrl, jsonCid = _b.jsonCid, jsonUrl = _b.jsonUrl;
                return [4 /*yield*/, Event_1.default.findById(eventId)];
            case 1:
                event_3 = _c.sent();
                if (!event_3) {
                    return [2 /*return*/, res.status(404).json({ error: 'Event not found' })];
                }
                // Validate status
                if (!['pending', 'approved', 'rejected'].includes(status_1)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid status' })];
                }
                updateData = { status: status_1 };
                // Add QR and JSON data if approving
                if (status_1 === 'approved') {
                    if (qrCid)
                        updateData.qrCid = qrCid;
                    if (qrUrl)
                        updateData.qrUrl = qrUrl;
                    if (jsonCid)
                        updateData.jsonCid = jsonCid;
                    if (jsonUrl)
                        updateData.jsonUrl = jsonUrl;
                }
                return [4 /*yield*/, Submission_1.default.findByIdAndUpdate(submissionId, updateData, { new: true, runValidators: true }).lean()];
            case 2:
                submission = _c.sent();
                if (!submission) {
                    return [2 /*return*/, res.status(404).json({ error: 'Registration not found' })];
                }
                submissionResponse = __assign(__assign({}, submission), { id: submission._id.toString() });
                res.json(submissionResponse);
                return [3 /*break*/, 4];
            case 3:
                error_3 = _c.sent();
                console.error('Error updating registration:', error_3);
                res.status(500).json({ error: 'Failed to update registration' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Get user's registration for an event
router.get('/events/:eventId/registrations/user/:address', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, eventId, address, submission, submissionResponse, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.params, eventId = _a.eventId, address = _a.address;
                return [4 /*yield*/, Submission_1.default.findOne({
                        eventId: eventId,
                        address: address
                    }).lean()];
            case 1:
                submission = _b.sent();
                if (!submission) {
                    return [2 /*return*/, res.status(404).json({ error: 'Registration not found' })];
                }
                submissionResponse = __assign(__assign({}, submission), { id: submission._id.toString() });
                res.json(submissionResponse);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _b.sent();
                console.error('Error fetching user registration:', error_4);
                res.status(500).json({ error: 'Failed to fetch registration' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Get registration count for an event
router.get('/events/:eventId/registrations/count', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var eventId, event_4, count, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                eventId = req.params.eventId;
                return [4 /*yield*/, Event_1.default.findById(eventId)];
            case 1:
                event_4 = _a.sent();
                if (!event_4) {
                    return [2 /*return*/, res.status(404).json({ error: 'Event not found' })];
                }
                return [4 /*yield*/, Submission_1.default.countDocuments({ eventId: eventId })];
            case 2:
                count = _a.sent();
                res.json({ count: count });
                return [3 /*break*/, 4];
            case 3:
                error_5 = _a.sent();
                console.error('Error fetching registration count:', error_5);
                res.status(500).json({ error: 'Failed to fetch registration count' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Get registration counts for multiple events
router.get('/events/registrations/counts', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var ids, eventIds, counts_1, countMap_1, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                ids = req.query.ids;
                if (!ids) {
                    return [2 /*return*/, res.status(400).json({ error: 'Event IDs are required' })];
                }
                eventIds = Array.isArray(ids) ? ids : [ids];
                return [4 /*yield*/, Submission_1.default.aggregate([
                        {
                            $match: { eventId: { $in: eventIds } }
                        },
                        {
                            $group: {
                                _id: '$eventId',
                                count: { $sum: 1 }
                            }
                        }
                    ])];
            case 1:
                counts_1 = _a.sent();
                countMap_1 = {};
                eventIds.forEach(function (id) {
                    var found = counts_1.find(function (c) { return c._id === id; });
                    countMap_1[id] = found ? found.count : 0;
                });
                res.json(countMap_1);
                return [3 /*break*/, 3];
            case 2:
                error_6 = _a.sent();
                console.error('Error fetching registration counts:', error_6);
                res.status(500).json({ error: 'Failed to fetch registration counts' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
