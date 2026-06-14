import express from 'express';
import { getAgents, createAgent, updateAgentStatus, seedAgents } from '../controllers/agentController.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, getAgents);
router.post('/', verifyToken, roleMiddleware('admin'), createAgent);
router.put('/:agentId/status', verifyToken, roleMiddleware('admin', 'agent', 'hub_driver', 'delivery_partner'), updateAgentStatus);
router.post('/seed', verifyToken, roleMiddleware('admin'), seedAgents);

export default router;
