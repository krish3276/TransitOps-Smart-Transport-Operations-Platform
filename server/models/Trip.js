import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema(
  {
    tripId: { type: String, required: true, unique: true },
    route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    scheduledDeparture: { type: Date, required: true },
    scheduledArrival: { type: Date, required: true },
    actualDeparture: { type: Date },
    actualArrival: { type: Date },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'delayed'],
      default: 'scheduled',
    },
    passengersOnBoard: { type: Number, default: 0 },
    totalPassengers: { type: Number, default: 0 },
    distanceCovered: { type: Number, default: 0 }, // km
    fuelConsumed: { type: Number, default: 0 }, // litres
    delayMinutes: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    incidents: [
      {
        description: String,
        reportedAt: { type: Date, default: Date.now },
        severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
      },
    ],
  },
  { timestamps: true }
);

tripSchema.index({ status: 1 });
tripSchema.index({ scheduledDeparture: 1 });
tripSchema.index({ vehicle: 1, scheduledDeparture: -1 });

const Trip = mongoose.model('Trip', tripSchema);
export default Trip;
