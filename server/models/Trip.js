import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema(
  {
    tripId: { type: String, required: true, unique: true }, // e.g. TR001
    source: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    cargoWeight: { type: Number, required: true, min: 0 },
    plannedDistance: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Dispatched', 'Completed', 'Cancelled'],
      default: 'Draft',
    },
    finalOdometer: { type: Number },
    fuelConsumed: { type: Number },
  },
  { timestamps: true }
);

tripSchema.index({ status: 1 });

const Trip = mongoose.model('Trip', tripSchema);
export default Trip;
