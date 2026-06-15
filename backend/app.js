import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorMiddleware.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import warehouseRoutes from './routes/warehouseRoutes.js';
import godownRoutes from './routes/godownRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import dispatchRoutes from './routes/dispatchRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();

// Middleware
app.use(cors({
  origin: "https://hyper-local-delivery-dispatcher-theta.vercel.app",
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/godowns', godownRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is healthy', timestamp: new Date() });
});

// Default route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Error middleware (ALWAYS last)
app.use(errorHandler);

export default app;