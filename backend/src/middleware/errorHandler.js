"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = exports.errorHandler = void 0;
var errorHandler = function (err, req, res, next) {
    console.error('Error:', err);
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        var errors = Object.values(err.errors).map(function (e) { return e.message; });
        res.status(400).json({
            error: 'Validation Error',
            details: errors
        });
        return;
    }
    // Mongoose duplicate key error
    if (err.code === 11000) {
        res.status(400).json({
            error: 'Duplicate Error',
            message: 'This record already exists'
        });
        return;
    }
    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        res.status(400).json({
            error: 'Invalid ID',
            message: 'The provided ID is not valid'
        });
        return;
    }
    // Default error
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
};
exports.errorHandler = errorHandler;
var notFound = function (req, res) {
    res.status(404).json({
        error: 'Not Found',
        message: "Route ".concat(req.originalUrl, " not found")
    });
};
exports.notFound = notFound;
