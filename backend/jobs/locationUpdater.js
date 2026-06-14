import Tracking from '../models/Tracking.js';
import Order from '../models/Order.js';
import Agent from '../models/Agent.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { emitToOrderRoom, emitToUserRoom } from '../sockets/trackingSocket.js';

export const startLocationSimulation = () => {
  console.log('Location simulator background job started.');
  setInterval(async () => {
    try {
      // Find all active tracking sessions
      const activeTrackings = await Tracking.find();

      for (const tracking of activeTrackings) {
        const order = await Order.findById(tracking.orderId);
        if (!order) continue;

        const currentStage = order.stages.find(s => s.stageNumber === tracking.stageNumber);
        if (!currentStage) continue;

        // Only simulate movements for stages currently set to 'in_transit'
        if (currentStage.status !== 'in_transit') continue;

        const path = tracking.pathCoordinates;
        let nextIndex = tracking.currentCoordinateIndex + 1;

        if (nextIndex < path.length) {
          // Increment movement
          const nextLocation = path[nextIndex];
          tracking.currentCoordinateIndex = nextIndex;
          tracking.currentLocation = { lat: nextLocation.lat, lng: nextLocation.lng };
          await tracking.save();

          // Reflect live position back to Agent profile
          if (currentStage.agentId) {
            await Agent.findByIdAndUpdate(currentStage.agentId, {
              currentLocation: { lat: nextLocation.lat, lng: nextLocation.lng }
            });
          }

          // Broadcast location delta
          emitToOrderRoom(order._id, 'agent-location-update', {
            orderId: order._id,
            stageNumber: tracking.stageNumber,
            currentLocation: nextLocation,
            index: nextIndex,
            total: path.length
          });
        } else {
          // Agent arrived at the destination of this stage
          currentStage.status = 'delivered';
          tracking.logs.push({
            event: 'Stage Delivered',
            details: `Agent reached stage destination: ${currentStage.to.name}`
          });
          await tracking.save();

          const nextStageIndex = order.currentStageIndex + 1;

          // Trigger stage delivered notifications
          await createStageDeliveredNotifications(order, currentStage, nextStageIndex);

          if (nextStageIndex >= order.stages.length) {
            // Entire multi-stage path complete!
            order.status = 'delivered';
            order.currentStageIndex = nextStageIndex;
            await order.save();

            // Set all agents back to available and decrease load
            for (const stage of order.stages) {
              if (stage.agentId) {
                const agent = await Agent.findById(stage.agentId);
                if (agent) {
                  agent.assignedOrders = agent.assignedOrders.filter(id => id.toString() !== order._id.toString());
                  agent.currentOrdersCount = Math.max(0, agent.currentOrdersCount - 1);
                  agent.availability = agent.currentOrdersCount === 0 ? 'available' : 'busy';
                  await agent.save();
                }
              }
            }

            emitToOrderRoom(order._id, 'order-status-change', {
              orderId: order._id,
              status: 'delivered',
              currentStageIndex: nextStageIndex
            });
          } else {
            // Auto-advance order stage index
            order.currentStageIndex = nextStageIndex;
            await order.save();

            emitToOrderRoom(order._id, 'order-status-change', {
              orderId: order._id,
              status: 'in_transit',
              currentStageIndex: nextStageIndex
            });
          }

          // Stage complete; delete this tracking tracker
          await Tracking.findByIdAndDelete(tracking._id);
        }
      }
    } catch (error) {
      console.error('Error during location simulation tick:', error);
    }
  }, 4000);
};

const createStageDeliveredNotifications = async (order, stage, nextStageIndex) => {
  try {
    const destName = stage.to.name;
    const orderIdStr = order._id.toString();
    const shortOrderId = orderIdStr.substring(18);

    // 1. Notify the delivering agent
    if (stage.agentId) {
      const deliveringAgent = await Agent.findById(stage.agentId);
      if (deliveringAgent) {
        const deliveringAgentUser = await User.findOne({ email: deliveringAgent.email });
        if (deliveringAgentUser) {
          await Notification.create({
            recipient: deliveringAgentUser._id,
            orderId: order._id,
            type: 'stage_delivered',
            title: 'Stage Completed',
            message: `You have successfully delivered Stage ${stage.stageNumber} shipment to ${destName} for order #${shortOrderId}.`
          });
          emitToUserRoom(deliveringAgentUser._id.toString(), 'new-notification', {
            title: 'Stage Completed',
            message: `Stage ${stage.stageNumber} delivered to ${destName} for order #${shortOrderId}.`
          });
        }
      }
    }

    // 2. Notify the next stage (if Stage 1 finished)
    if (stage.stageNumber === 1 && nextStageIndex < order.stages.length) {
      // Stage 1 completed (Warehouse -> Godown). Cargo is now at Godown.
      // Notify the godown user
      const godownEmail = destName.toLowerCase().replace(/[^a-z0-9]/g, '') + '@logistics.com';
      const godownUser = await User.findOne({ email: godownEmail });
      if (godownUser) {
        await Notification.create({
          recipient: godownUser._id,
          orderId: order._id,
          type: 'next_stage_ready',
          title: 'Cargo Arrived at Godown',
          message: `Order #${shortOrderId} cargo has been delivered to your godown by Hub Driver. It is ready for doorstep delivery.`
        });
        emitToUserRoom(godownUser._id.toString(), 'new-notification', {
          title: 'Cargo Arrived at Godown',
          message: `Order #${shortOrderId} cargo has arrived at your godown.`
        });
      }

      // Notify delivery partners that doorstep delivery is claimable
      const partners = await User.find({ role: 'delivery_partner' });
      for (const p of partners) {
        await Notification.create({
          recipient: p._id,
          orderId: order._id,
          type: 'next_stage_ready',
          title: 'New Doorstep Delivery Claimable',
          message: `Cargo for order #${shortOrderId} has arrived at ${destName} and is ready for doorstep delivery.`
        });
        emitToUserRoom(p._id.toString(), 'new-notification', {
          title: 'New Doorstep Delivery Claimable',
          message: `Order #${shortOrderId} doorstep delivery is claimable.`
        });
      }
    }

    // 3. Notify Customer and Godown upon final delivery (Stage 2 completed)
    if (nextStageIndex >= order.stages.length) {
      // Find product name(s)
      const populatedOrder = await Order.findById(order._id).populate('products.productId');
      const productNames = populatedOrder.products.map(p => p.productId ? p.productId.name : 'Product').join(', ');
      const successMessage = `delivery of ${productNames} successfully completed`;

      // Customer
      if (order.customer) {
        const customerUser = await User.findById(order.customer);
        if (customerUser) {
          await Notification.create({
            recipient: customerUser._id,
            orderId: order._id,
            type: 'customer_delivery_update',
            title: 'Delivery Successful',
            message: successMessage
          });
          emitToUserRoom(customerUser._id.toString(), 'new-notification', {
            title: 'Delivery Successful',
            message: successMessage
          });
        }
      }

      // Godown
      const firstStage = order.stages[0];
      if (firstStage && firstStage.to) {
        const godownEmail = firstStage.to.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@logistics.com';
        const godownUser = await User.findOne({ email: godownEmail });
        if (godownUser) {
          await Notification.create({
            recipient: godownUser._id,
            orderId: order._id,
            type: 'customer_delivery_update',
            title: 'Delivery Successful',
            message: successMessage
          });
          emitToUserRoom(godownUser._id.toString(), 'new-notification', {
            title: 'Delivery Successful',
            message: successMessage
          });
        }
      }
    } else {
      // General customer update for intermediate stages
      if (order.customer && stage.stageNumber === 1) {
        const customerUser = await User.findById(order.customer);
        if (customerUser) {
          await Notification.create({
            recipient: customerUser._id,
            orderId: order._id,
            type: 'customer_delivery_update',
            title: 'Delivery Update',
            message: `Your package has arrived at ${destName} for order #${shortOrderId}.`
          });
          emitToUserRoom(customerUser._id.toString(), 'new-notification', {
            title: 'Delivery Update',
            message: `Your package has arrived at ${destName} for order #${shortOrderId}.`
          });
        }
      }
    }
  } catch (err) {
    console.error('Error generating stage notifications:', err);
  }
};
