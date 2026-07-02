import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'agent', 'hub_driver', 'delivery_partner', 'admin', 'warehouse', 'godown'], default: 'customer' },
  location: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 }
  },
  address: { type: String, default: '' }
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
  if (this.isModified('email')) {
    this.email = this.email.trim().toLowerCase();
  }
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const User = mongoose.model('User', UserSchema);
export default User;
