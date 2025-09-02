"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var cors_1 = require("cors");
var helmet_1 = require("helmet");
var morgan_1 = require("morgan");
var dotenv_1 = require("dotenv");
var database_1 = require("./config/database");
var errorHandler_1 = require("./middleware/errorHandler");
var events_1 = require("./routes/events");
var registrations_1 = require("./routes/registrations");
var approveUsers_1 = require("./routes/approveUsers");
var organizations_1 = require("./routes/organizations");
var auth_1 = require("./routes/auth");
// Load environment variables
dotenv_1.default.config({ path: '../config.env' });
var app = (0, express_1.default)();
var PORT = process.env["PORT"] || 4000;
// Connect to MongoDB
(0, database_1.connectDB)();
// Middleware
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('combined'));
app.use((0, cors_1.default)({
    origin: process.env["CORS_ORIGIN"] || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoint
app.get('/health', function (_req, res) {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
// API Routes
app.use('/api/events', events_1.default);
app.use('/api', registrations_1.default);
app.use('/api', approveUsers_1.default);
app.use('/api', organizations_1.default);
app.use('/api/auth', auth_1.default);
// 404 handler
app.use(errorHandler_1.notFound);
// Error handler
app.use(errorHandler_1.errorHandler);
// Start server
app.listen(PORT, function () {
    console.log("\uD83D\uDE80 FairPass Backend running on port ".concat(PORT));
    console.log("\uD83D\uDCCA Health check: http://localhost:".concat(PORT, "/health"));
    console.log("\uD83D\uDD17 API Base: http://localhost:".concat(PORT, "/api"));
});
// Graceful shutdown
process.on('SIGTERM', function () {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
process.on('SIGINT', function () {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
