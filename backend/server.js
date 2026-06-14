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

// Start movement simulator job
startLocationSimulation();

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
