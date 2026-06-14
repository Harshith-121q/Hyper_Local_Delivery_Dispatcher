import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  type: { 
    type: String, 
    enum: ['order_placed', 'stage_delivered', 'next_stage_ready', 'customer_delivery_update'], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;
