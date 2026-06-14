import mongoose from 'mongoose';
import { MONGO_URI } from './env.js';
import Agent from '../models/Agent.js';
import User from '../models/User.js';
import Warehouse from '../models/Warehouse.js';
import Godown from '../models/Godown.js';

const syncAgentUsers = async () => {
  try {
    const agents = await Agent.find();
    console.log(`[Sync Agent Users] Found ${agents.length} seeded agents in database.`);
    for (const agent of agents) {
      const userExists = await User.findOne({ email: agent.email });
      if (!userExists) {
        const userRole = agent.role === 'last_mile' ? 'delivery_partner' : 'hub_driver';
        await User.create({
          name: agent.name,
          email: agent.email,
          password: 'password123',
          role: userRole,
          location: agent.currentLocation,
          address: `${agent.name} Base Hub`
        });
        console.log(`[Sync Agent Users] Created User account for agent: ${agent.email} (Role: ${userRole})`);
      }
    }
  } catch (err) {
    console.error('[Sync Agent Users] Error during sync:', err);
  }
};

const syncWarehouseGodownUsers = async () => {
  try {
    const warehouses = await Warehouse.find();
    console.log(`[Sync Warehouse Users] Found ${warehouses.length} warehouses in database.`);
    for (const wh of warehouses) {
      const email = wh.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@logistics.com';
      const userExists = await User.findOne({ email });
      if (!userExists) {
        await User.create({
          name: wh.name,
          email,
          password: 'password123',
          role: 'warehouse',
          location: wh.location,
          address: wh.address || `${wh.name} Headquarters`
        });
        console.log(`[Sync Warehouse Users] Created User account for warehouse: ${wh.name} (${email})`);
      }
    }

    const godowns = await Godown.find();
    console.log(`[Sync Godown Users] Found ${godowns.length} godowns in database.`);
    for (const gd of godowns) {
      const email = gd.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@logistics.com';
      const userExists = await User.findOne({ email });
      if (!userExists) {
        await User.create({
          name: gd.name,
          email,
          password: 'password123',
          role: 'godown',
          location: gd.location,
          address: gd.address || `${gd.name} Hub`
        });
        console.log(`[Sync Godown Users] Created User account for godown: ${gd.name} (${email})`);
      }
    }
  } catch (err) {
    console.error('[Sync Warehouse/Godown Users] Error during sync:', err);
  }
};

const syncAdminUser = async () => {
  try {
    const User = mongoose.model('User');
    const adminExists = await User.findOne({ email: 'admin@logistics.com' });
    if (!adminExists) {
      await User.create({
        name: 'System Admin',
        email: 'admin@logistics.com',
        password: 'password123',
        role: 'admin',
        location: { lat: 12.9716, lng: 77.5946 },
        address: 'Logistics Command Center'
      });
      console.log('[Sync Admin User] Created admin@logistics.com / password123');
    }
  } catch (err) {
    console.error('[Sync Admin User] Error syncing admin:', err);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Sync admin
    await syncAdminUser();
    // Sync missing agent logins
    await syncAgentUsers();
    // Sync missing warehouse and godown logins
    await syncWarehouseGodownUsers();
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
