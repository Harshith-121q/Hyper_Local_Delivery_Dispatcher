import Warehouse from '../models/Warehouse.js';
import Godown from '../models/Godown.js';
import Agent from '../models/Agent.js';
import Product from '../models/Product.js';
import { calculateDistance, calculateETA } from '../utils/distanceCalculator.js';

export const dispatchOrder = async (order, customerLocation) => {
  // 1. Find the nearest Godown to the customer's location
  const godowns = await Godown.find().populate('associatedStateWarehouse');
  if (godowns.length === 0) {
    throw new Error('No godowns available in the system');
  }

  let nearestGodown = null;
  let minGodownDistance = Infinity;
  for (const godown of godowns) {
    const dist = calculateDistance(customerLocation, godown.location);
    if (dist < minGodownDistance) {
      minGodownDistance = dist;
      nearestGodown = godown;
    }
  }

  if (!nearestGodown) {
    throw new Error('Could not determine nearest godown');
  }

  const destinationStateWarehouse = nearestGodown.associatedStateWarehouse;
  if (!destinationStateWarehouse) {
    throw new Error('Nearest godown has no associated state warehouse');
  }

  // 2. Select Source Warehouse with stock
  // Look at the first ordered product for selection
  if (!order.products || order.products.length === 0) {
    throw new Error('Order does not contain any products');
  }

  const firstProductItem = order.products[0];
  const product = await Product.findById(firstProductItem.productId);
  if (!product) {
    throw new Error('Product not found');
  }

  const sourceWarehouses = await Warehouse.find({ type: 'source' });
  if (sourceWarehouses.length === 0) {
    throw new Error('No source warehouses available');
  }

  // Pick the Source Warehouse containing stock closest to the target state warehouse
  let bestSourceWarehouse = null;
  let minSourceDistance = Infinity;

  for (const warehouse of sourceWarehouses) {
    const stockItem = product.stock.find(
      s => s.warehouseId.toString() === warehouse._id.toString()
    );
    if (stockItem && stockItem.quantity >= firstProductItem.quantity) {
      const dist = calculateDistance(warehouse.location, destinationStateWarehouse.location);
      if (dist < minSourceDistance) {
        minSourceDistance = dist;
        bestSourceWarehouse = warehouse;
      }
    }
  }

  // Fallback: If stock is low, find any source warehouse closest to state warehouse
  if (!bestSourceWarehouse) {
    let minFallbackDist = Infinity;
    for (const warehouse of sourceWarehouses) {
      const dist = calculateDistance(warehouse.location, destinationStateWarehouse.location);
      if (dist < minFallbackDist) {
        minFallbackDist = dist;
        bestSourceWarehouse = warehouse;
      }
    }
  }

  if (!bestSourceWarehouse) {
    throw new Error('No source warehouse could be selected');
  }

  // Deduct stock from the selected Source Warehouse
  const stockItem = product.stock.find(
    s => s.warehouseId.toString() === bestSourceWarehouse._id.toString()
  );
  if (stockItem) {
    stockItem.quantity = Math.max(0, stockItem.quantity - firstProductItem.quantity);
    await product.save();
  }

  // 3. Define the three stages
  const stage1From = {
    name: bestSourceWarehouse.name,
    lat: bestSourceWarehouse.location.lat,
    lng: bestSourceWarehouse.location.lng,
    type: 'Warehouse'
  };
  const stage1To = {
    name: destinationStateWarehouse.name,
    lat: destinationStateWarehouse.location.lat,
    lng: destinationStateWarehouse.location.lng,
    type: 'Warehouse'
  };

  const stage2From = stage1To;
  const stage2To = {
    name: nearestGodown.name,
    lat: nearestGodown.location.lat,
    lng: nearestGodown.location.lng,
    type: 'Godown'
  };

  const stage3From = stage2To;
  const stage3To = {
    name: 'Customer Location',
    lat: customerLocation.lat,
    lng: customerLocation.lng,
    type: 'Customer'
  };

  // 4. Assign delivery agents with load balancing
  const agent1 = await selectBestAgent(['hub_driver', 'inter_state'], stage1From);
  const agent2 = await selectBestAgent(['hub_driver', 'intra_state'], stage2From);
  const agent3 = await selectBestAgent(['delivery_partner', 'last_mile'], stage3From);

  const dist1 = calculateDistance(stage1From, stage1To);
  const dist2 = calculateDistance(stage2From, stage2To);
  const dist3 = calculateDistance(stage3From, stage3To);

  const eta1 = calculateETA(dist1, 1);
  const eta2 = calculateETA(dist2, 2);
  const eta3 = calculateETA(dist3, 3);

  const stages = [
    {
      stageNumber: 1,
      from: stage1From,
      to: stage1To,
      agentId: agent1 ? agent1._id : null,
      status: agent1 ? 'assigned' : 'pending',
      eta: eta1
    },
    {
      stageNumber: 2,
      from: stage2From,
      to: stage2To,
      agentId: agent2 ? agent2._id : null,
      status: agent2 ? 'assigned' : 'pending',
      eta: eta2
    },
    {
      stageNumber: 3,
      from: stage3From,
      to: stage3To,
      agentId: agent3 ? agent3._id : null,
      status: agent3 ? 'assigned' : 'pending',
      eta: eta3
    }
  ];

  // Save agent references and update state
  if (agent1) {
    agent1.assignedOrders.push(order._id);
    agent1.currentOrdersCount += 1;
    agent1.availability = 'busy';
    await agent1.save();
  }
  if (agent2) {
    agent2.assignedOrders.push(order._id);
    agent2.currentOrdersCount += 1;
    agent2.availability = 'busy';
    await agent2.save();
  }
  if (agent3) {
    agent3.assignedOrders.push(order._id);
    agent3.currentOrdersCount += 1;
    agent3.availability = 'busy';
    await agent3.save();
  }

  order.stages = stages;
  order.status = 'dispatched';
  order.currentStageIndex = 0;
  return await order.save();
};

const selectBestAgent = async (roles, startLocation) => {
  const agents = await Agent.find({ role: { $in: roles }, availability: { $ne: 'offline' } });
  if (agents.length === 0) return null;

  let bestAgent = null;
  let minScore = Infinity;

  for (const agent of agents) {
    const dist = calculateDistance(agent.currentLocation, startLocation);
    // Score based on distance proximity and active load to balance job allocations
    const score = dist * 0.4 + (agent.currentOrdersCount || 0) * 10;
    if (score < minScore) {
      minScore = score;
      bestAgent = agent;
    }
  }

  return bestAgent;
};
