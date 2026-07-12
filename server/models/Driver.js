import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema(
  {
    // Spec fields: Name, License Number, License Category, License Expiry Date,
    //              Contact Number, Safety Score, Status
    name: {
      type: String,
      required: [true, 'Driver name is required'],
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: [true, 'License number is required'],
      trim: true,
      uppercase: true,
    },
    // License Category — from mockup: LMV, HMV (Light/Heavy Motor Vehicle)
    licenseCategory: {
      type: String,
      enum: ['LMV', 'HMV', 'HPMV', 'MGV', 'TRANS'],
      required: [true, 'License category is required'],
    },
    licenseExpiry: {
      type: Date,
      required: [true, 'License expiry date is required'],
    },
    contact: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    // Safety score 0–100 (% in mockup)
    safetyScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    // Trip completion count — shown as "Trip Compl." in mockup
    tripsCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Spec status values: Available, On Trip, Off Duty, Suspended
    status: {
      type: String,
      enum: ['Available', 'On Trip', 'Off Duty', 'Suspended'],
      default: 'Available',
    },
  },
  { timestamps: true }
);

// Unique index on licenseNumber (business rule)
driverSchema.index({ licenseNumber: 1 }, { unique: true });
driverSchema.index({ status: 1 });

// Virtual: is the license currently expired?
driverSchema.virtual('isLicenseExpired').get(function () {
  return this.licenseExpiry < new Date();
});

// Virtual: is this driver assignable to a trip?
driverSchema.virtual('isAssignable').get(function () {
  return (
    this.status === 'Available' &&
    this.licenseExpiry >= new Date()
  );
});

driverSchema.set('toJSON', { virtuals: true });
driverSchema.set('toObject', { virtuals: true });

const Driver = mongoose.model('Driver', driverSchema);
export default Driver;
