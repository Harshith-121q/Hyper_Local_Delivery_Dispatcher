import express from 'express';
import { 
  createOrder, 
  getCustomerOrders, 
  getAgentOrders, 
  getAllOrders, 
  getOrderDetails, 
  seedProducts, 
  getProducts,
  getWarehouseOrders,
  getGodownOrders,
  getAvailableHubOrders,
  getAvailablePartnerOrders,
  assignHubDriverOrder,
  claimDeliveryPartnerOrder,
  deleteOrder
} from '../controllers/orderController.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post('/', verifyToken, roleMiddleware('customer'), createOrder);
router.get('/products', verifyToken, getProducts);
router.get('/customer', verifyToken, roleMiddleware('customer'), getCustomerOrders);
router.get('/agent', verifyToken, roleMiddleware('agent', 'hub_driver', 'delivery_partner'), getAgentOrders);
router.get('/warehouse', verifyToken, roleMiddleware('warehouse'), getWarehouseOrders);
router.get('/godown', verifyToken, roleMiddleware('godown'), getGodownOrders);
router.get('/available/hub', verifyToken, roleMiddleware('hub_driver'), getAvailableHubOrders);
router.get('/available/partner', verifyToken, roleMiddleware('delivery_partner'), getAvailablePartnerOrders);
router.post('/:id/assign-hub', verifyToken, roleMiddleware('hub_driver'), assignHubDriverOrder);
router.post('/:id/claim-partner', verifyToken, roleMiddleware('delivery_partner'), claimDeliveryPartnerOrder);
router.delete('/:id', verifyToken, roleMiddleware('customer'), deleteOrder);
router.get('/all', verifyToken, roleMiddleware('admin'), getAllOrders);
router.get('/:id', verifyToken, getOrderDetails);
router.post('/seed-products', verifyToken, roleMiddleware('admin'), seedProducts);

export default router;
