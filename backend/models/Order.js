import mongoose from 'mongoose';

const OrderStageSchema = new mongoose.Schema({
  stageNumber: { type: Number, enum: [1, 2, 3], required: true },
  from: {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    type: { type: String, enum: ['Warehouse', 'Godown'], required: true }
  },
  to: {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    type: { type: String, enum: ['Warehouse', 'Godown', 'Customer'], required: true }
  },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  status: { 
    type: String, 
    enum: ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered'], 
    default: 'pending' 
  },
  eta: { type: Date }
});

const OrderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  godown: { type: mongoose.Schema.Types.ObjectId, ref: 'Godown' },
  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true, min: 1 }
    }
  ],
  totalPrice: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['pending', 'dispatched', 'in_transit', 'delivered', 'cancelled'], 
    default: 'pending' 
  },
  stages: [OrderStageSchema],
  currentStageIndex: { type: Number, default: 0 }
}, { timestamps: true });

const Order = mongoose.model('Order', OrderSchema);
export default Order;
