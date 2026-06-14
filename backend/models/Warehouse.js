import mongoose from 'mongoose';

const WarehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['source', 'state'], required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  address: { type: String, default: '' }
}, { timestamps: true });

const Warehouse = mongoose.model('Warehouse', WarehouseSchema);
export default Warehouse;
