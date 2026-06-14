import mongoose from 'mongoose';

const AgentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  currentLocation: {
    lat: { type: Number, required: true, default: 0 },
    lng: { type: Number, required: true, default: 0 }
  },
  availability: { type: String, enum: ['available', 'busy', 'offline'], default: 'available' },
  role: { type: String, enum: ['inter_state', 'intra_state', 'last_mile', 'hub_driver', 'delivery_partner'], required: true },
  assignedOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  currentOrdersCount: { type: Number, default: 0 }
}, { timestamps: true });

const Agent = mongoose.model('Agent', AgentSchema);
export default Agent;
