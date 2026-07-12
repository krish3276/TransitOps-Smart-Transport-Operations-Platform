import mongoose from 'mongoose';

const maintenanceLogSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    description: { type: String, required: true, trim: true }, // "SERVICE TYPE" in mockup
    cost: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ['Active', 'Closed'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

maintenanceLogSchema.index({ vehicle: 1, status: 1 });

const MaintenanceLog = mongoose.model('MaintenanceLog', maintenanceLogSchema);
export default MaintenanceLog;
