import Warehouse from '../models/Warehouse.js';
import { LANDMARKS } from '../utils/constants.js';

export const getWarehouses = async (req, res, next) => {
  try {
    const warehouses = await Warehouse.find();
    res.json({ success: true, warehouses });
  } catch (error) {
    next(error);
  }
};

export const createWarehouse = async (req, res, next) => {
  try {
    const { name, type, location, address } = req.body;
    const warehouse = await Warehouse.create({ name, type, location, address });
    res.status(201).json({ success: true, warehouse });
  } catch (error) {
    next(error);
  }
};

export const seedHubs = async (req, res, next) => {
  try {
    const warehouseCount = await Warehouse.countDocuments();
    if (warehouseCount > 0) {
      return res.status(400).json({ success: false, message: 'Warehouses already exist' });
    }

    const createdWarehouses = [];

    // Seed source warehouses
    for (const wh of LANDMARKS.WAREHOUSES) {
      const created = await Warehouse.create({
        name: wh.name,
        type: wh.type,
        location: wh.location,
        address: wh.address
      });
      createdWarehouses.push(created);
    }

    // Seed state warehouses
    for (const sWh of LANDMARKS.STATE_WAREHOUSES) {
      const created = await Warehouse.create({
        name: sWh.name,
        type: sWh.type,
        location: sWh.location,
        address: sWh.address
      });
      createdWarehouses.push(created);
    }

    res.json({ success: true, message: 'Warehouses seeded successfully', createdWarehouses });
  } catch (error) {
    next(error);
  }
};
