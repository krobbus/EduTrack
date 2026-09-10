function errorHandler(err, req, res, next) {
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with that unique key already exists.' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record does not exist.' });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ error: 'Internal Server Error' });
}

export default errorHandler;