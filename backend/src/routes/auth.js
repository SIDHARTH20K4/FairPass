"use strict";
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
var bcryptjs_1 = require("bcryptjs");
var jsonwebtoken_1 = require("jsonwebtoken");
var Organization_1 = require("../models/Organization");
var router = express_1.default.Router();
var JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
// Sign in
router.post('/signin', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, address, email, password, organization, isValidPassword, token, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 7, , 8]);
                _a = req.body, address = _a.address, email = _a.email, password = _a.password;
                organization = void 0;
                if (!address) return [3 /*break*/, 2];
                // Wallet-based signin
                if (!address) {
                    return [2 /*return*/, res.status(400).json({ error: "Wallet address is required" })];
                }
                return [4 /*yield*/, Organization_1.default.findOne({
                        address: address.toLowerCase()
                    }).lean()];
            case 1:
                organization = _b.sent();
                if (!organization) {
                    return [2 /*return*/, res.status(401).json({ error: "Organization not found with this wallet address" })];
                }
                return [3 /*break*/, 6];
            case 2:
                if (!(email && password)) return [3 /*break*/, 5];
                // Email-based signin
                if (!email || !password) {
                    return [2 /*return*/, res.status(400).json({ error: "Email and password are required" })];
                }
                return [4 /*yield*/, Organization_1.default.findOne({
                        email: email.toLowerCase()
                    }).lean()];
            case 3:
                organization = _b.sent();
                if (!organization) {
                    console.log("No organization found with email: ".concat(email.toLowerCase()));
                    return [2 /*return*/, res.status(401).json({ error: "Invalid credentials" })];
                }
                console.log("Organization found: ".concat(organization.name, ", has password: ").concat(!!organization.password));
                // Verify password using bcrypt
                if (!organization.password) {
                    console.log("Organization ".concat(organization.name, " has no password set"));
                    return [2 /*return*/, res.status(401).json({ error: "This account doesn't have a password set. Please use wallet authentication instead." })];
                }
                console.log("Verifying password for organization: ".concat(organization.name));
                return [4 /*yield*/, bcryptjs_1.default.compare(password, organization.password)];
            case 4:
                isValidPassword = _b.sent();
                if (!isValidPassword) {
                    console.log("Password verification failed for organization: ".concat(organization.name));
                    return [2 /*return*/, res.status(401).json({ error: "Invalid credentials" })];
                }
                console.log("Password verification successful for organization: ".concat(organization.name));
                return [3 /*break*/, 6];
            case 5: return [2 /*return*/, res.status(400).json({ error: "Either wallet address or email/password is required" })];
            case 6:
                token = jsonwebtoken_1.default.sign({
                    organizationId: organization._id,
                    address: organization.address,
                    email: organization.email,
                    name: organization.name
                }, JWT_SECRET, { expiresIn: "24h" });
                res.json({
                    success: true,
                    token: token,
                    organization: {
                        id: organization._id,
                        address: organization.address,
                        name: organization.name,
                        email: organization.email,
                        description: organization.description
                    }
                });
                return [3 /*break*/, 8];
            case 7:
                error_1 = _b.sent();
                console.error("Sign in error:", error_1);
                res.status(500).json({ error: "Internal server error" });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
// Register
router.post('/register', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, address, name_1, email, password, description, signature, existingOrgByAddress, existingOrgByEmail, hashedPassword, saltRounds, organization, token, error_2;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 7, , 8]);
                _a = req.body, address = _a.address, name_1 = _a.name, email = _a.email, password = _a.password, description = _a.description, signature = _a.signature;
                // Validate required fields
                if (!address || !name_1) {
                    return [2 /*return*/, res.status(400).json({ error: "Wallet address and name are required" })];
                }
                return [4 /*yield*/, Organization_1.default.findOne({
                        address: address.toLowerCase()
                    })];
            case 1:
                existingOrgByAddress = _d.sent();
                if (existingOrgByAddress) {
                    return [2 /*return*/, res.status(409).json({ error: "Organization with this wallet address already exists" })];
                }
                if (!email) return [3 /*break*/, 3];
                return [4 /*yield*/, Organization_1.default.findOne({
                        email: email.toLowerCase()
                    })];
            case 2:
                existingOrgByEmail = _d.sent();
                if (existingOrgByEmail) {
                    return [2 /*return*/, res.status(409).json({ error: "Organization with this email already exists" })];
                }
                _d.label = 3;
            case 3:
                hashedPassword = void 0;
                if (!password) return [3 /*break*/, 5];
                saltRounds = 10;
                return [4 /*yield*/, bcryptjs_1.default.hash(password, saltRounds)];
            case 4:
                hashedPassword = _d.sent();
                _d.label = 5;
            case 5: return [4 /*yield*/, Organization_1.default.create({
                    address: address.toLowerCase(), // Ensure address is lowercase
                    name: name_1,
                    email: email ? email.toLowerCase() : undefined,
                    description: description,
                    password: hashedPassword
                })];
            case 6:
                organization = _d.sent();
                token = jsonwebtoken_1.default.sign({
                    organizationId: organization._id,
                    address: organization.address,
                    email: organization.email,
                    name: organization.name
                }, JWT_SECRET, { expiresIn: "24h" });
                res.json({
                    success: true,
                    token: token,
                    organization: {
                        id: organization._id,
                        address: organization.address,
                        name: organization.name,
                        email: organization.email,
                        description: organization.description
                    }
                });
                return [3 /*break*/, 8];
            case 7:
                error_2 = _d.sent();
                console.error("Registration error:", error_2);
                // Handle specific MongoDB errors
                if (error_2.code === 11000) {
                    if ((_b = error_2.keyPattern) === null || _b === void 0 ? void 0 : _b.address) {
                        return [2 /*return*/, res.status(409).json({ error: "Organization with this wallet address already exists" })];
                    }
                    if ((_c = error_2.keyPattern) === null || _c === void 0 ? void 0 : _c.email) {
                        return [2 /*return*/, res.status(409).json({ error: "Organization with this email already exists" })];
                    }
                }
                res.status(500).json({ error: "Internal server error" });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
// Get current user
router.get('/me', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authHeader, token, decoded, organization, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return [2 /*return*/, res.status(401).json({ error: "Not authenticated" })];
                }
                token = authHeader.substring(7);
                decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
                if (!decoded.organizationId) {
                    return [2 /*return*/, res.status(401).json({ error: "Invalid token" })];
                }
                return [4 /*yield*/, Organization_1.default.findById(decoded.organizationId).select('-password').lean()];
            case 1:
                organization = _a.sent();
                if (!organization) {
                    return [2 /*return*/, res.status(404).json({ error: "Organization not found" })];
                }
                res.json({
                    organization: {
                        id: organization._id,
                        address: organization.address,
                        name: organization.name,
                        email: organization.email,
                        description: organization.description
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error("Get user error:", error_3);
                res.status(500).json({ error: "Internal server error" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Test endpoint for debugging
router.get('/debug/organizations', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizations, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, Organization_1.default.find({}).select('-password').lean()];
            case 1:
                organizations = _a.sent();
                res.json({
                    count: organizations.length,
                    organizations: organizations.map(function (org) { return ({
                        id: org._id,
                        name: org.name,
                        email: org.email,
                        address: org.address,
                        hasPassword: !!org.password,
                        createdAt: org.createdAt
                    }); })
                });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('Debug endpoint error:', error_4);
                res.status(500).json({ error: "Internal server error" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
