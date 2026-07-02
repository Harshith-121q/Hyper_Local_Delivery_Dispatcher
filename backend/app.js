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
const allowedOrigins = [
  'https://hyper-local-delivery-dispatcher-theta.vercel.app',
  'https://hyper-local-delivery-dispatcher-ppc4.onrender.com'
];

const corsOptionsDelegate = (req, callback) => {
  const origin = req.header('Origin');
  if (process.env.NODE_ENV === 'development') {
    // In development, echo the request origin to allow localhost dev servers
    callback(null, { origin: true, credentials: true, optionsSuccessStatus: 200 });
    return;
  }

  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, { origin: true, credentials: true, optionsSuccessStatus: 200 });
  } else {
    callback(new Error(`CORS policy: Origin ${origin} is not allowed.`));
  }
};

app.use(cors(corsOptionsDelegate));
app.options('*', cors(corsOptionsDelegate));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route
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