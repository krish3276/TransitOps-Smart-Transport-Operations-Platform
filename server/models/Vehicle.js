import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      uppercase: true,
      trim: true,
    },
    // Vehicle Name/Model as shown in spec & mockup (e.g. "VAN-05")
    name: {
      type: String,
      required: [true, 'Vehicle name/model is required'],
      trim: true,
    },
    type: {
      type: String,
      // Spec + mockup: Van, Truck, Mini, Bus, Car
      enum: ['Van', 'Truck', 'Mini', 'Bus', 'Car'],
      required: [true, 'Vehicle type is required'],
    },
    // Max load capacity in kg (spec: "Maximum Load Capacity")
    maxLoadCapacity: {
      type: Number,
      required: [true, 'Maximum load capacity is required'],
      min: 1,
    },
    odometer: {
      type: Number,
      default: 0,
      min: 0,
    },
    acquisitionCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Spec status values: Available, On Trip, In Shop, Retired
    status: {
      type: String,
      enum: ['Available', 'On Trip', 'In Shop', 'Retired'],
      default: 'Available',
    },
  },
  { timestamps: true }
);

// Unique index on registrationNumber (business rule: must be unique)
vehicleSchema.index({ registrationNumber: 1 }, { unique: true });
vehicleSchema.index({ status: 1 });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
export default Vehicle;
