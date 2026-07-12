import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const updateUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    
    // Update all users to 'Fleet Manager' to avoid locking myself out
    await User.updateMany({}, { role: 'Fleet Manager' });
    console.log('Users updated successfully to Fleet Manager');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

updateUsers();
