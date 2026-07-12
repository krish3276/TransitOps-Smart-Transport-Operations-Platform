import mongoose from 'mongoose';

const maintenanceSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    type: {
      type: String,
      enum: ['scheduled', 'breakdown', 'accident', 'inspection', 'other'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: String, trim: true }, // garage / mechanic name
    status: {
      type: String,
      enum: ['reported', 'in_progress', 'completed', 'cancelled'],
      default: 'reported',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    odometerAtService: { type: Number },
    startDate: { type: Date, default: Date.now },
    completedDate: { type: Date },
    estimatedCost: { type: Number, default: 0 },
    actualCost: { type: Number, default: 0 },
    partsReplaced: [
      {
        name: String,
        quantity: Number,
        cost: Number,
      },
    ],
    attachments: [{ type: String }], // file URLs
  },
  { timestamps: true }
);

maintenanceSchema.index({ vehicle: 1, status: 1 });
maintenanceSchema.index({ status: 1, priority: -1 });

const Maintenance = mongoose.model('Maintenance', maintenanceSchema);
export default Maintenance;
