import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Agent from '../models/Agent.js';
import Warehouse from '../models/Warehouse.js';
import Godown from '../models/Godown.js';
import Tracking from '../models/Tracking.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { dispatchOrder } from '../services/dispatcherService.js';
import { emitToUserRoom, emitToOrderRoom } from '../sockets/trackingSocket.js';
import { calculateDistance, calculateETA } from '../utils/distanceCalculator.js';

export const createOrder = async (req, res, next) => {
  try {
    const { products } = req.body;
    if (!products || products.length === 0) {
      return res.status(400).json({ success: false, message: 'No products in order' });
    }

    let totalPrice = 0;
    const orderProducts = [];
    for (const item of products) {
      const prod = await Product.findById(item.productId);
      if (!prod) {
        return res.status(444).json({ success: false, message: `Product ${item.productId} not found` });
      }
      totalPrice += prod.price * item.quantity;
      orderProducts.push({
        productId: prod._id,
        quantity: item.quantity
      });
    }

    const firstProductItem = orderProducts[0];
    const productObj = await Product.findById(firstProductItem.productId);
    const sourceWarehouses = await Warehouse.find({ type: 'source' });
    
    let bestSourceWarehouse = null;
    let minSourceDistance = Infinity;

    const customerLocation = req.user.location && req.user.location.lat !== 0 
      ? req.user.location 
      : { lat: 12.9300, lng: 77.6200 };

    for (const warehouse of sourceWarehouses) {
      const stockItem = productObj.stock.find(
        s => s.warehouseId.toString() === warehouse._id.toString()
      );
      if (stockItem && stockItem.quantity >= firstProductItem.quantity) {
        const dist = calculateDistance(warehouse.location, customerLocation);
        if (dist < minSourceDistance) {
          minSourceDistance = dist;
          bestSourceWarehouse = warehouse;
        }
      }
    }

    if (!bestSourceWarehouse && sourceWarehouses.length > 0) {
      bestSourceWarehouse = sourceWarehouses[0];
    }

    if (bestSourceWarehouse) {
      const stockItem = productObj.stock.find(
        s => s.warehouseId.toString() === bestSourceWarehouse._id.toString()
      );
      if (stockItem) {
        stockItem.quantity = Math.max(0, stockItem.quantity - firstProductItem.quantity);
        await productObj.save();
      }
    }

    const order = new Order({
      customer: req.user._id,
      products: orderProducts,
      totalPrice,
      status: 'pending',
      warehouse: bestSourceWarehouse ? bestSourceWarehouse._id : null
    });
    await order.save();

    // 1. Notify Warehouse of new booking
    if (bestSourceWarehouse) {
      const warehouseEmail = bestSourceWarehouse.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@logistics.com';
      const warehouseUser = await User.findOne({ email: warehouseEmail });
      if (warehouseUser) {
        await Notification.create({
          recipient: warehouseUser._id,
          orderId: order._id,
          type: 'order_placed',
          title: 'New Booking at Warehouse',
          message: `A customer has booked product(s) from your warehouse. Order ID: #${order._id.toString().substring(18)}.`
        });
        emitToUserRoom(warehouseUser._id.toString(), 'new-notification', {
          title: 'New Booking at Warehouse',
          message: `A customer has booked product(s). Order ID: #${order._id.toString().substring(18)}.`
        });
      }
    }

    // 2. Notify Hub Drivers and Delivery Partners of new unassigned order
    const agents = await User.find({ role: { $in: ['hub_driver', 'delivery_partner'] } });
    for (const agent of agents) {
      await Notification.create({
        recipient: agent._id,
        orderId: order._id,
        type: 'order_placed',
        title: 'New Order Available',
        message: `New order #${order._id.toString().substring(18)} is pending at ${bestSourceWarehouse ? bestSourceWarehouse.name : 'Warehouse'}.`
      });
      emitToUserRoom(agent._id.toString(), 'new-notification', {
        title: 'New Order Available',
        message: `New order #${order._id.toString().substring(18)} is pending.`
      });
    }

    res.status(201).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

export const getCustomerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('products.productId')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

export const getAgentOrders = async (req, res, next) => {
  try {
    const agent = await Agent.findOne({ email: req.user.email });
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent profile not found for this user' });
    }

    const orders = await Order.find({
      'stages.agentId': agent._id
    }).populate('products.productId').sort({ updatedAt: -1 });

    res.json({ success: true, orders, agentId: agent._id });
  } catch (error) {
    next(error);
  }
};

export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'name email')
      .populate('products.productId')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

export const getOrderDetails = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email location address')
      .populate('products.productId')
      .populate('stages.agentId')
      .populate('warehouse')
      .populate('godown');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    let activeTracking = null;
    const stage = order.stages[order.currentStageIndex];
    if (stage) {
      activeTracking = await Tracking.findOne({ orderId: order._id, stageNumber: stage.stageNumber });
    }

    res.json({ success: true, order, tracking: activeTracking });
  } catch (error) {
    next(error);
  }
};

export const seedProducts = async (req, res, next) => {
  try {
    const count = await Product.countDocuments();
    if (count > 0) {
      return res.status(400).json({ success: false, message: 'Products already exist' });
    }

    const warehouses = await Warehouse.find({ type: 'source' });
    if (warehouses.length === 0) {
      return res.status(400).json({ success: false, message: 'Please seed warehouses before seeding products' });
    }

    const productsData = [
      { name: 'iPhone 15 Pro Max', description: 'Titanium design with A17 Pro Chip', sku: 'IPHONE15PM', price: 1399 },
      { name: 'MacBook Pro M3', description: 'Liquid Retina XDR Display, 16GB RAM', sku: 'MACBOOKM3', price: 1999 },
      { name: 'iPad Air 5', description: 'Apple M1 Chip, Liquid Retina Display', sku: 'IPADAIR5', price: 599 },
      { name: 'AirPods Pro 2', description: 'Active Noise Cancellation and Transparency', sku: 'AIRPODSPRO2', price: 249 }
    ];

    const created = [];
    for (const item of productsData) {
      const stock = warehouses.map(wh => ({
        warehouseId: wh._id,
        quantity: 50
      }));

      const prod = await Product.create({ ...item, stock });
      created.push(prod);
    }

    res.json({ success: true, message: 'Products seeded successfully', created });
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find();
    res.json({ success: true, products });
  } catch (error) {
    next(error);
  }
};

const notifyAgentsOfNewOrder = async (order) => {
  try {
    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email address location')
      .populate('stages.agentId');
    
    if (!populatedOrder || !populatedOrder.customer) return;

    const customerName = populatedOrder.customer.name;
    const lat = populatedOrder.customer.location?.lat;
    const lng = populatedOrder.customer.location?.lng;
    const customerLocationStr = lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'N/A';
    const customerAddress = populatedOrder.customer.address || `GPS coordinates: ${customerLocationStr}`;

    console.log(`[Debug Notifications] Order #${populatedOrder._id} customer: ${customerName}. Stages details:`);
    populatedOrder.stages.forEach(s => {
      console.log(`  - Stage ${s.stageNumber}: agentId = ${s.agentId ? s.agentId._id : 'null'}, email = ${s.agentId ? s.agentId.email : 'null'}`);
    });

    for (const stage of populatedOrder.stages) {
      if (stage.agentId) {
        const agentUser = await User.findOne({ email: stage.agentId.email });
        if (agentUser) {
          let stageDescription = '';
          if (stage.stageNumber === 1) {
            stageDescription = `haul from ${stage.from.name} to ${stage.to.name}`;
          } else if (stage.stageNumber === 2) {
            stageDescription = `transfer from ${stage.from.name} to ${stage.to.name}`;
          } else if (stage.stageNumber === 3) {
            stageDescription = `deliver last-mile to customer doorstep`;
          }

          await Notification.create({
            recipient: agentUser._id,
            orderId: order._id,
            type: 'order_placed',
            title: 'New Order Dispatched',
            message: `New order #${order._id.toString().substring(18)} placed by customer "${customerName}" (Address: ${customerAddress}). You are assigned to Stage ${stage.stageNumber} (${stageDescription}).`
          });

          emitToUserRoom(agentUser._id.toString(), 'new-notification', {
            title: 'New Order Dispatched',
            message: `New order #${order._id.toString().substring(18)} placed by customer "${customerName}" (Address: ${customerAddress}).`
          });
        }
      }
    }
  } catch (err) {
    console.error('Error in notifyAgentsOfNewOrder:', err);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this order' });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a delivered order' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Order is already cancelled' });
    }

    order.status = 'cancelled';

    // Release agents
    for (const stage of order.stages) {
      if (stage.agentId) {
        const agent = await Agent.findById(stage.agentId);
        if (agent) {
          agent.assignedOrders = agent.assignedOrders.filter(id => id.toString() !== order._id.toString());
          agent.currentOrdersCount = Math.max(0, agent.currentOrdersCount - 1);
          agent.availability = agent.currentOrdersCount === 0 ? 'available' : 'busy';
          await agent.save();

          // Create notification for driver
          const agentUser = await User.findOne({ email: agent.email });
          if (agentUser) {
            await Notification.create({
              recipient: agentUser._id,
              orderId: order._id,
              type: 'customer_delivery_update',
              title: 'Order Cancelled by Customer',
              message: `Order #${order._id.toString().substring(18)} has been cancelled by the customer. The stage assignment is released.`
            });
            emitToUserRoom(agentUser._id.toString(), 'new-notification', {
              title: 'Order Cancelled by Customer',
              message: `Order #${order._id.toString().substring(18)} has been cancelled.`
            });
          }
        }
      }
    }

    await order.save();

    // Remove tracking session
    await Tracking.deleteMany({ orderId: order._id });

    // Emit live status update to customer page
    emitToOrderRoom(order._id, 'order-status-change', {
      orderId: order._id,
      status: 'cancelled',
      currentStageIndex: order.currentStageIndex
    });

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

export const getWarehouseOrders = async (req, res, next) => {
  try {
    const warehouses = await Warehouse.find();
    const warehouse = warehouses.find(wh => {
      const email = wh.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@logistics.com';
      return email === req.user.email;
    });

    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Warehouse profile not found for this user' });
    }

    const orders = await Order.find({ warehouse: warehouse._id })
      .populate('products.productId')
      .populate('customer', 'name email location address')
      .sort({ createdAt: -1 });

    res.json({ success: true, orders, warehouse });
  } catch (err) {
    next(err);
  }
};

export const getGodownOrders = async (req, res, next) => {
  try {
    const godowns = await Godown.find();
    const godown = godowns.find(gd => {
      const email = gd.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@logistics.com';
      return email === req.user.email;
    });

    if (!godown) {
      return res.status(404).json({ success: false, message: 'Godown profile not found for this user' });
    }

    const orders = await Order.find({ godown: godown._id })
      .populate('products.productId')
      .populate('customer', 'name email location address')
      .sort({ createdAt: -1 });

    res.json({ success: true, orders, godown });
  } catch (err) {
    next(err);
  }
};

export const getAvailableHubOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ status: 'pending' })
      .populate('warehouse')
      .populate('products.productId')
      .populate('customer', 'name location address');
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
};

export const getAvailablePartnerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      'stages.1.status': 'pending',
      'stages.1.agentId': null
    })
      .populate('warehouse')
      .populate('godown')
      .populate('products.productId')
      .populate('customer', 'name location address');
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
};

export const assignHubDriverOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { godownId } = req.body;

    if (!godownId) {
      return res.status(400).json({ success: false, message: 'Destination godown is required' });
    }

    const order = await Order.findById(id).populate('products.productId');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Order is already assigned or dispatched' });
    }

    const godownObj = await Godown.findById(godownId);
    if (!godownObj) {
      return res.status(404).json({ success: false, message: 'Target Godown not found' });
    }

    const agent = await Agent.findOne({ email: req.user.email });
    if (!agent || agent.role !== 'hub_driver') {
      return res.status(403).json({ success: false, message: 'Only Hub Drivers can assign themselves to Warehouse-to-Godown stages' });
    }

    const warehouseObj = await Warehouse.findById(order.warehouse);
    if (!warehouseObj) {
      return res.status(404).json({ success: false, message: 'Source warehouse for this order is not found' });
    }

    const stage1From = {
      name: warehouseObj.name,
      lat: warehouseObj.location.lat,
      lng: warehouseObj.location.lng,
      type: 'Warehouse'
    };
    const stage1To = {
      name: godownObj.name,
      lat: godownObj.location.lat,
      lng: godownObj.location.lng,
      type: 'Godown'
    };

    const stage2From = stage1To;
    const stage2To = {
      name: 'Customer Location',
      lat: 12.9300,
      lng: 77.6200,
      type: 'Customer'
    };
    const customerUser = await User.findById(order.customer);
    if (customerUser && customerUser.location && customerUser.location.lat !== 0) {
      stage2To.lat = customerUser.location.lat;
      stage2To.lng = customerUser.location.lng;
    }

    const dist1 = calculateDistance(stage1From, stage1To);
    const dist2 = calculateDistance(stage2From, stage2To);

    const eta1 = calculateETA(dist1, 1);
    const eta2 = calculateETA(dist2, 2);

    const stages = [
      {
        stageNumber: 1,
        from: stage1From,
        to: stage1To,
        agentId: agent._id,
        status: 'assigned',
        eta: eta1
      },
      {
        stageNumber: 2,
        from: stage2From,
        to: stage2To,
        agentId: null,
        status: 'pending',
        eta: eta2
      }
    ];

    order.stages = stages;
    order.godown = godownObj._id;
    order.status = 'dispatched';
    order.currentStageIndex = 0;

    await order.save();

    agent.assignedOrders.push(order._id);
    agent.currentOrdersCount += 1;
    agent.availability = 'busy';
    await agent.save();

    const godownEmail = godownObj.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@logistics.com';
    const godownUser = await User.findOne({ email: godownEmail });
    if (godownUser) {
      await Notification.create({
        recipient: godownUser._id,
        orderId: order._id,
        type: 'next_stage_ready',
        title: 'Incoming Dispatch Approved',
        message: `Hub driver ${agent.name} has selected your godown for delivery of order #${order._id.toString().substring(18)}.`
      });
      emitToUserRoom(godownUser._id.toString(), 'new-notification', {
        title: 'Incoming Dispatch Approved',
        message: `Hub driver ${agent.name} has selected your godown. Order ID: #${order._id.toString().substring(18)}.`
      });
    }

    if (customerUser) {
      await Notification.create({
        recipient: customerUser._id,
        orderId: order._id,
        type: 'customer_delivery_update',
        title: 'Order Dispatched to Godown',
        message: `Your order #${order._id.toString().substring(18)} has been picked up by Hub Driver ${agent.name} and is en-route to ${godownObj.name}.`
      });
      emitToUserRoom(customerUser._id.toString(), 'new-notification', {
        title: 'Order Dispatched to Godown',
        message: `Your order has been picked up by Hub Driver ${agent.name} and is en-route to ${godownObj.name}.`
      });
    }

    // Notify delivery partners that a new last-mile delivery will be available once the cargo reaches the godown.
    const deliveryPartners = await User.find({ role: 'delivery_partner' });
    for (const partner of deliveryPartners) {
      await Notification.create({
        recipient: partner._id,
        orderId: order._id,
        type: 'next_stage_ready',
        title: 'Delivery Route Created',
        message: `Order #${order._id.toString().substring(18)} has been routed to ${godownObj.name}. The doorstep delivery will be available for claim once cargo arrives.`
      });
      emitToUserRoom(partner._id.toString(), 'new-notification', {
        title: 'Delivery Route Created',
        message: `Order #${order._id.toString().substring(18)} is en-route to ${godownObj.name} and will be available for claim soon.`
      });
    }

    emitToOrderRoom(order._id, 'order-status-change', {
      orderId: order._id,
      status: order.status,
      currentStageIndex: 0
    });

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

export const claimDeliveryPartnerOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).populate('products.productId');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const stage2 = order.stages[1];
    if (!stage2 || stage2.status !== 'pending' || stage2.agentId) {
      return res.status(400).json({ success: false, message: 'Order is not ready for shipping or has already been claimed' });
    }

    const agent = await Agent.findOne({ email: req.user.email });
    if (!agent || agent.role !== 'delivery_partner') {
      return res.status(403).json({ success: false, message: 'Only Delivery Partners can claim doorstep deliveries' });
    }

    stage2.agentId = agent._id;
    stage2.status = 'assigned';
    
    await order.save();

    agent.assignedOrders.push(order._id);
    agent.currentOrdersCount += 1;
    agent.availability = 'busy';
    await agent.save();

    const customerUser = await User.findById(order.customer);
    if (customerUser) {
      await Notification.create({
        recipient: customerUser._id,
        orderId: order._id,
        type: 'customer_delivery_update',
        title: 'Delivery Out for Customer',
        message: `Delivery partner ${agent.name} has claimed your order #${order._id.toString().substring(18)}. The delivery is out for the customer.`
      });
      emitToUserRoom(customerUser._id.toString(), 'new-notification', {
        title: 'Delivery Out for Customer',
        message: `Delivery partner ${agent.name} has claimed your order and the delivery is out for the customer.`
      });
    }

    emitToOrderRoom(order._id, 'order-status-change', {
      orderId: order._id,
      status: order.status,
      currentStageIndex: 1
    });

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

export const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to remove this order' });
    }

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

    await Order.findByIdAndDelete(req.params.id);
    await Tracking.deleteMany({ orderId: req.params.id });

    res.json({ success: true, message: 'Order removed successfully' });
  } catch (error) {
    next(error);
  }
};
