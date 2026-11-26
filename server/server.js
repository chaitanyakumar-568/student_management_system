const env = require('./config/env');
const { connectDB } = require('./config/db');
const createApp = require('./app');

async function start() {
  env.validateEnv();
  await connectDB();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port} (${env.isProduction ? 'production' : 'development'})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
