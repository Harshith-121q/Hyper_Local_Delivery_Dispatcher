import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  sku: { type: String, required: true, unique: true },
  price: { type: Number, required: true, min: 0 },
  stock: [
    {
      warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
      quantity: { type: Number, required: true, min: 0, default: 0 }
    }
  ]
}, { timestamps: true });

const Product = mongoose.model('Product', ProductSchema);
export default Product;
