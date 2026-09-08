function errorHandler(err, req, res, next) {
  console.error('Unhandled Error:', err.stack || err.message);
  
  // TODO: Add more errors and validate
  // Handle unique constraint violations from PostgreSQL (e.g., duplicate email or class code)
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with that unique key already exists.' });
  }

  // Handle foreign key violation (e.g., non-existent user or class ID)
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record does not exist.' });
  }

  // internal server error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error'
  });
}

module.exports = errorHandler;