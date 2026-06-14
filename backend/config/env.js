import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 5000;
export const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hyperlocal_delivery';
export const JWT_SECRET = process.env.JWT_SECRET || 'hyperlocal_secret_key_12345';
export const JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';
export const NODE_ENV = process.env.NODE_ENV || 'development';
