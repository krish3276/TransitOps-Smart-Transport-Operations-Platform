import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, unique: true, trim: true },
    licenseExpiry: { type: Date, required: true },
    licenseClass: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E'],
      required: true,
    },
    phone: { type: String, required: true, trim: true },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    dateOfBirth: { type: Date },
    joiningDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['available', 'on_duty', 'off_duty', 'on_leave', 'suspended'],
      default: 'available',
    },
    assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    totalTrips: { type: Number, default: 0 },
    rating: { type: Number, default: 5.0, min: 1, max: 5 },
    emergencyContact: {
      name: String,
      relation: String,
      phone: String,
    },
  },
  { timestamps: true }
);

driverSchema.index({ status: 1 });
driverSchema.index({ employeeId: 1 });

const Driver = mongoose.model('Driver', driverSchema);
export default Driver;
