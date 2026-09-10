import app from './src/app.js';
import { testConnection, closePool } from './src/config/db.js';

const PORT = process.env.PORT || 3000;

testConnection()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received, shutting down gracefully...`);
      server.close(async () => {
        await closePool();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
  });