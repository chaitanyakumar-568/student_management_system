const AppError = require('../utils/AppError');

function notFound(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// Centralized error handler. Never leaks stack traces or internals to the client.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.isOperational ? err.message : 'Something went wrong on the server.';
  let errors = err.errors;

  // Mongoose schema validation
  if (err.name === 'ValidationError' && err.errors && !err.isOperational) {
    statusCode = 400;
    message = 'Validation failed';
    errors = {};
    for (const [field, e] of Object.entries(err.errors)) errors[field] = e.message;
  }
  // Mongoose bad ObjectId cast
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }
  // Duplicate key (unique index)
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    if (field === 'rollNumber') {
      message = 'A student with this roll number already exists';
      errors = { rollNumber: message };
    } else {
      message = `Duplicate value for ${field}`;
      errors = { [field]: message };
    }
  }
  // Malformed JSON body
  else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON in request body';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body too large';
  }
  // Mongo connectivity problems
  else if (['MongoNetworkError', 'MongoServerSelectionError', 'MongooseServerSelectionError'].includes(err.name)) {
    statusCode = 503;
    message = 'Database is unavailable. Please try again shortly.';
  }

  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}]`, err);
  }

  const body = { success: false, message };
  if (errors && Object.keys(errors).length) body.errors = errors;
  res.status(statusCode).json(body);
}

module.exports = { notFound, errorHandler };
