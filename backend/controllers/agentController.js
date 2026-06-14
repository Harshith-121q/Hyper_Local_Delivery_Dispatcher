import Agent from '../models/Agent.js';
import Warehouse from '../models/Warehouse.js';
import Godown from '../models/Godown.js';
import User from '../models/User.js';

export const getAgents = async (req, res, next) => {
  try {
    const agents = await Agent.find();
    res.json({ success: true, agents });
  } catch (error) {
    next(error);
  }
};

export const createAgent = async (req, res, next) => {
  try {
    const { name, email, phone, role, currentLocation } = req.body;
    const agent = await Agent.create({
      name,
      email,
      phone,
      role,
      currentLocation: currentLocation || { lat: 12.9716, lng: 77.5946 }
    });
    res.status(201).json({ success: true, agent });
  } catch (error) {
    next(error);
  }
};

export const updateAgentStatus = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { availability } = req.body;
    const agent = await Agent.findByIdAndUpdate(agentId, { availability }, { new: true });
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }
    res.json({ success: true, agent });
  } catch (error) {
    next(error);
  }
};

export const seedAgents = async (req, res, next) => {
  try {
    const agentCount = await Agent.countDocuments();
    if (agentCount > 0) {
      return res.status(400).json({ success: false, message: 'Agents already exist' });
    }

    const warehouses = await Warehouse.find();
    const godowns = await Godown.find();

    const createdAgents = [];
    const add = async (name, email, role, loc) => {
      const created = await Agent.create({
        name,
        email,
        phone: '9876543210',
        role,
        currentLocation: loc,
        availability: 'available'
      });
      createdAgents.push(created);

      // Create corresponding user account
      const userRole = role === 'last_mile' ? 'delivery_partner' : 'hub_driver';
      await User.create({
        name,
        email,
        password: 'password123',
        role: userRole,
        location: loc,
        address: `${name} Base Hub`
      });
    };

    // Seed inter_state agents (placed near Source Warehouses)
    let idx = 1;
    for (const wh of warehouses) {
      if (wh.type === 'source') {
        await add(`InterState Driver ${idx}`, `interstate${idx}@logistics.com`, 'inter_state', wh.location);
        idx++;
      }
    }

    // Seed intra_state agents (placed near State Warehouses)
    idx = 1;
    for (const wh of warehouses) {
      if (wh.type === 'state') {
        await add(`IntraState Driver ${idx}`, `intrastate${idx}@logistics.com`, 'intra_state', wh.location);
        idx++;
      }
    }

    // Seed last_mile agents (placed near Godowns)
    idx = 1;
    for (const gd of godowns) {
      await add(`LastMile Biker ${idx}`, `lastmile${idx}@logistics.com`, 'last_mile', gd.location);
      idx++;
    }

    res.json({ success: true, message: 'Agents seeded successfully', createdAgents });
  } catch (error) {
    next(error);
  }
};
