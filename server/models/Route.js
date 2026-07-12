import mongoose from 'mongoose';

const stopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number], // [lng, lat]
  },
  scheduledTime: { type: String }, // "HH:MM"
  distanceFromPrev: { type: Number, default: 0 }, // km
});

const routeSchema = new mongoose.Schema(
  {
    routeNumber: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    stops: [stopSchema],
    totalDistance: { type: Number, default: 0 }, // km
    estimatedDuration: { type: Number, default: 0 }, // minutes
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    operatingDays: {
      type: [String],
      enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    },
    firstDeparture: { type: String, default: '06:00' }, // HH:MM
    lastDeparture: { type: String, default: '22:00' },
    frequency: { type: Number, default: 30 }, // minutes between trips
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

routeSchema.index({ routeNumber: 1 });
routeSchema.index({ status: 1 });

const Route = mongoose.model('Route', routeSchema);
export default Route;
