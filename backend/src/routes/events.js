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
var Event_1 = require("../models/Event");
var router = express_1.default.Router();
// Get all events
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var location_1, query, events, eventsWithId, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                location_1 = req.query.location;
                query = { status: 'published' };
                if (location_1 && location_1 !== 'Worldwide') {
                    query.location = location_1;
                }
                return [4 /*yield*/, Event_1.default.find(query)
                        .sort({ createdAt: -1 })
                        .lean()];
            case 1:
                events = _a.sent();
                eventsWithId = events.map(function (event) { return (__assign(__assign({}, event), { id: event._id.toString() })); });
                res.json(eventsWithId);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('Error fetching events:', error_1);
                res.status(500).json({ error: 'Failed to fetch events' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Get single event by ID
router.get('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var event_1, eventResponse, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, Event_1.default.findById(req.params.id).lean()];
            case 1:
                event_1 = _a.sent();
                if (!event_1) {
                    return [2 /*return*/, res.status(404).json({ error: 'Event not found' })];
                }
                eventResponse = __assign(__assign({}, event_1), { id: event_1._id.toString() });
                res.json(eventResponse);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('Error fetching event:', error_2);
                res.status(500).json({ error: 'Failed to fetch event' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Create new event
router.post('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var eventData, event_2, savedEvent, eventResponse, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                eventData = req.body;
                // Validate required fields
                if (!eventData.name || !eventData.bannerUrl || !eventData.hostAddress) {
                    return [2 /*return*/, res.status(400).json({ error: 'Missing required fields' })];
                }
                event_2 = new Event_1.default(__assign(__assign({}, eventData), { status: eventData.status || 'draft' }));
                return [4 /*yield*/, event_2.save()];
            case 1:
                savedEvent = _a.sent();
                eventResponse = __assign(__assign({}, savedEvent.toObject()), { id: savedEvent._id.toString() });
                res.status(201).json(eventResponse);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('Error creating event:', error_3);
                res.status(500).json({ error: 'Failed to create event' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Update event
router.patch('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, updateData, event_3, eventResponse, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                updateData = req.body;
                return [4 /*yield*/, Event_1.default.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).lean()];
            case 1:
                event_3 = _a.sent();
                if (!event_3) {
                    return [2 /*return*/, res.status(404).json({ error: 'Event not found' })];
                }
                eventResponse = __assign(__assign({}, event_3), { id: event_3._id.toString() });
                res.json(eventResponse);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('Error updating event:', error_4);
                res.status(500).json({ error: 'Failed to update event' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Host: list all events including drafts
router.get('/host/:address', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var address, status_1, query, events, eventsWithId, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                address = req.params.address;
                status_1 = req.query.status;
                query = { hostAddress: address.toLowerCase() };
                if (status_1)
                    query.status = status_1;
                return [4 /*yield*/, Event_1.default.find(query).sort({ updatedAt: -1 }).lean()];
            case 1:
                events = _a.sent();
                eventsWithId = events.map(function (event) { return (__assign(__assign({}, event), { id: event._id.toString() })); });
                res.json(eventsWithId);
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                console.error('Error fetching host events:', error_5);
                res.status(500).json({ error: 'Failed to fetch host events' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Delete event
router.delete('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, event_4, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                return [4 /*yield*/, Event_1.default.findByIdAndDelete(id)];
            case 1:
                event_4 = _a.sent();
                if (!event_4) {
                    return [2 /*return*/, res.status(404).json({ error: 'Event not found' })];
                }
                res.json({ message: 'Event deleted successfully' });
                return [3 /*break*/, 3];
            case 2:
                error_6 = _a.sent();
                console.error('Error deleting event:', error_6);
                res.status(500).json({ error: 'Failed to delete event' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
