import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import { PORT } from './config/env.js';
import { initSocket } from './sockets/trackingSocket.js';
import { startLocationSimulation } from './jobs/locationUpdater.js';

// Connect Database
connectDB();

const server = http.createServer(app);

// Mount Socket server
initSocket(server);

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please stop the other process or change the PORT environment variable.`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);

  // Start movement simulator job only after the server is running successfully.
  startLocationSimulation();
});
