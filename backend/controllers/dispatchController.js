import Order from '../models/Order.js';
import Agent from '../models/Agent.js';
import { initializeTracking } from '../services/trackingService.js';
import { emitToOrderRoom } from '../sockets/trackingSocket.js';

export const updateStageStatus = async (req, res, next) => {
  try {
    const { orderId, stageNumber, status } = req.body;

    if (!['picked_up', 'in_transit'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status request. Use picked_up or in_transit.' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const stage = order.stages.find(s => s.stageNumber === stageNumber);
    if (!stage) {
      return res.status(404).json({ success: false, message: 'Stage not found in order' });
    }

    // Identify agent by session email
    const agent = await Agent.findOne({ email: req.user.email });
    if (!agent || stage.agentId.toString() !== agent._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized: You are not the assigned agent for this stage' });
    }

    stage.status = status;

    if (status === 'in_transit') {
      order.status = 'in_transit';
      // Setup tracking path coordinates and start coordinates simulation
      await initializeTracking(order._id, stageNumber, stage.from, stage.to);
    }

    await order.save();

    emitToOrderRoom(order._id, 'order-status-change', {
      orderId: order._id,
      status: order.status,
      currentStageIndex: order.currentStageIndex,
      stageNumber,
      stageStatus: status
    });

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};
