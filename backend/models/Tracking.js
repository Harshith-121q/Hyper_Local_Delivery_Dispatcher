import mongoose from 'mongoose';

const TrackingSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  stageNumber: { type: Number, enum: [1, 2, 3], required: true },
  pathCoordinates: [
    {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    }
  ],
  currentCoordinateIndex: { type: Number, default: 0 },
  currentLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  logs: [
    {
      timestamp: { type: Date, default: Date.now },
      event: { type: String, required: true },
      details: { type: String, default: '' }
    }
  ]
}, { timestamps: true });

const Tracking = mongoose.model('Tracking', TrackingSchema);
export default Tracking;
