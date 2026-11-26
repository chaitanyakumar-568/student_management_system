const mongoose = require('mongoose');

async function connectDB(uri = process.env.MONGODB_URI) {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    // Do not print the URI (it may contain credentials)
    console.error(`MongoDB connection failed: ${err.message}`);
    throw err;
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
