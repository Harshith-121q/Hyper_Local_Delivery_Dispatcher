import mongoose from 'mongoose';

const AgentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
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

AgentSchema.pre('save', function(next) {
  if (this.isModified('email')) {
    this.email = this.email?.trim?.().toLowerCase();
  }
  next();
});

AgentSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const Agent = mongoose.model('Agent', AgentSchema);
export default Agent;
