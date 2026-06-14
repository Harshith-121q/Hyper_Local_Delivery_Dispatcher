import Godown from '../models/Godown.js';
import Warehouse from '../models/Warehouse.js';
import { LANDMARKS } from '../utils/constants.js';

export const getGodowns = async (req, res, next) => {
  try {
    const godowns = await Godown.find().populate('associatedStateWarehouse');
    res.json({ success: true, godowns });
  } catch (error) {
    next(error);
  }
};

export const createGodown = async (req, res, next) => {
  try {
    const { name, location, address, associatedStateWarehouse } = req.body;
    const godown = await Godown.create({
      name,
      location,
      address,
      associatedStateWarehouse
    });
    res.status(201).json({ success: true, godown });
  } catch (error) {
    next(error);
  }
};

export const seedGodowns = async (req, res, next) => {
  try {
    const godownCount = await Godown.countDocuments();
    if (godownCount > 0) {
      return res.status(400).json({ success: false, message: 'Godowns already exist' });
    }

    const createdGodowns = [];

    for (const gd of LANDMARKS.GODOWNS) {
      const stateWh = await Warehouse.findOne({ name: gd.associatedStateWarehouseName });
      if (!stateWh) continue;

      const created = await Godown.create({
        name: gd.name,
        location: gd.location,
        address: gd.address,
        associatedStateWarehouse: stateWh._id
      });
      createdGodowns.push(created);
    }

    res.json({ success: true, message: 'Godowns seeded successfully', createdGodowns });
  } catch (error) {
    next(error);
  }
};
