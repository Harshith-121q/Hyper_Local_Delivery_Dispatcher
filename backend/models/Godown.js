import mongoose from 'mongoose';

const GodownSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  address: { type: String, default: '' },
  associatedStateWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true }
}, { timestamps: true });

const Godown = mongoose.model('Godown', GodownSchema);
export default Godown;
