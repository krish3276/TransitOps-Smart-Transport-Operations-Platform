import mongoose from 'mongoose';

const fuelLogSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' }, // Optional, if linked to trip
    date: { type: Date, default: Date.now },
    liters: { type: Number, required: true, min: 0 },
    cost: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: 'Auto-generated from Trip Completion' },
  },
  { timestamps: true }
);

const FuelLog = mongoose.model('FuelLog', fuelLogSchema);
export default FuelLog;
