import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['bus', 'minibus', 'van', 'truck', 'car'],
      required: true,
    },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1990, max: new Date().getFullYear() + 1 },
    capacity: { type: Number, required: true, min: 1 },
    fuelType: {
      type: String,
      enum: ['petrol', 'diesel', 'electric', 'hybrid', 'cng'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'idle', 'maintenance', 'retired'],
      default: 'idle',
    },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    odometer: { type: Number, default: 0 }, // in km
    assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
    lastServiceDate: { type: Date },
    nextServiceDue: { type: Date },
    insuranceExpiry: { type: Date },
    permitExpiry: { type: Date },
    imageUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

vehicleSchema.index({ currentLocation: '2dsphere' });
vehicleSchema.index({ registrationNumber: 1 });
vehicleSchema.index({ status: 1 });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
export default Vehicle;
