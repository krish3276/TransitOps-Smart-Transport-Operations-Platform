import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vehicle from './models/Vehicle.js';
import Driver from './models/Driver.js';
import Trip from './models/Trip.js';
import FuelLog from './models/FuelLog.js';
import MaintenanceLog from './models/MaintenanceLog.js';
import Expense from './models/Expense.js';
import User from './models/User.js';

dotenv.config();

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for Seeding');

    // Clear all
    await Vehicle.deleteMany();
    await Driver.deleteMany();
    await Trip.deleteMany();
    await FuelLog.deleteMany();
    await MaintenanceLog.deleteMany();
    await Expense.deleteMany();
    await User.deleteMany();

    console.log('Collections cleared');

    // 0. Users
    await User.create([
      { name: 'Test Manager', email: 'manager@test.com', password: 'test1234', role: 'Fleet Manager' },
      { name: 'Test Driver', email: 'driver@test.com', password: 'test1234', role: 'Driver' },
      { name: 'Test Safety', email: 'safety@test.com', password: 'test1234', role: 'Safety Officer' },
      { name: 'Test Finance', email: 'finance@test.com', password: 'test1234', role: 'Financial Analyst' },
      { name: 'Admin', email: 'admin@transitops.com', password: 'admin1234', role: 'Fleet Manager' }, // Keep old admin just in case
    ]);
    console.log('Users seeded');

    // 1. Vehicles
    const vehicles = await Vehicle.insertMany([
      { registrationNumber: 'MH-01-AB-1234', name: 'TRUCK-01', type: 'Truck', maxLoadCapacity: 15000, odometer: 45000, acquisitionCost: 2500000, revenue: 0, status: 'Available' },
      { registrationNumber: 'GJ-02-XY-9999', name: 'TRUCK-02', type: 'Truck', maxLoadCapacity: 12000, odometer: 32000, acquisitionCost: 2000000, revenue: 0, status: 'On Trip' },
      { registrationNumber: 'DL-04-CD-5678', name: 'VAN-01', type: 'Van', maxLoadCapacity: 3500, odometer: 80000, acquisitionCost: 800000, revenue: 0, status: 'In Shop' },
      { registrationNumber: 'KA-05-PQ-1111', name: 'VAN-02', type: 'Van', maxLoadCapacity: 3500, odometer: 15000, acquisitionCost: 850000, revenue: 0, status: 'Available' },
      { registrationNumber: 'TN-01-RS-2222', name: 'MINI-01', type: 'Mini', maxLoadCapacity: 1500, odometer: 5000, acquisitionCost: 500000, revenue: 0, status: 'Available' },
    ]);

    // 2. Drivers
    const drivers = await Driver.insertMany([
      { name: 'Ramesh Kumar', licenseNumber: 'DL-RK-12345', licenseCategory: 'HMV', licenseExpiry: new Date('2028-12-31'), contact: '9876543210', safetyScore: 92, status: 'Available', tripsCompleted: 15 },
      { name: 'Suresh Patel', licenseNumber: 'DL-SP-98765', licenseCategory: 'TRANS', licenseExpiry: new Date('2027-06-30'), contact: '9123456780', safetyScore: 85, status: 'On Trip', tripsCompleted: 8 },
      { name: 'Amit Singh', licenseNumber: 'DL-AS-55555', licenseCategory: 'LMV', licenseExpiry: new Date('2029-01-01'), contact: '9988776655', safetyScore: 98, status: 'Available', tripsCompleted: 42 },
      { name: 'Vikram Das', licenseNumber: 'DL-VD-22222', licenseCategory: 'HMV', licenseExpiry: new Date('2025-10-15'), contact: '9876501234', safetyScore: 65, status: 'Suspended', tripsCompleted: 2 },
    ]);

    // 3. Maintenance Logs (For VAN-01 currently In Shop)
    await MaintenanceLog.create({
      vehicle: vehicles[2]._id,
      description: 'Engine Overhaul & Oil Change',
      cost: 45000,
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      status: 'Active'
    });

    // Add some closed maintenance for others to have costs
    await MaintenanceLog.create({
      vehicle: vehicles[0]._id,
      description: 'Brake Pad Replacement',
      cost: 12000,
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      status: 'Closed'
    });

    // 4. Trips
    // 8 Trips: 5 Completed, 1 Cancelled, 1 Dispatched, 1 Draft
    
    // Draft (No vehicle/driver assignment strictly enforced to be on-trip, just in DB as draft)
    await Trip.create({
      tripId: 'TR001',
      source: 'Mumbai Depot',
      destination: 'Pune Hub',
      vehicle: vehicles[3]._id, // VAN-02
      driver: drivers[0]._id,   // Ramesh
      cargoWeight: 2000,
      plannedDistance: 150,
      status: 'Draft'
    });

    // Dispatched
    await Trip.create({
      tripId: 'TR002',
      source: 'Ahmedabad Hub',
      destination: 'Surat Depot',
      vehicle: vehicles[1]._id, // TRUCK-02 (matches On Trip)
      driver: drivers[1]._id,   // Suresh (matches On Trip)
      cargoWeight: 10000,
      plannedDistance: 270,
      status: 'Dispatched'
    });

    // Cancelled
    await Trip.create({
      tripId: 'TR003',
      source: 'Bangalore Depot',
      destination: 'Mysore Hub',
      vehicle: vehicles[4]._id, // MINI-01
      driver: drivers[2]._id,   // Amit
      cargoWeight: 1000,
      plannedDistance: 145,
      status: 'Cancelled'
    });

    // Completed Trips
    const completedTrips = [
      { v: 0, d: 0, dist: 800, fuel: 160, cost: 15000, rev: 35000 },
      { v: 0, d: 2, dist: 400, fuel: 80, cost: 7500, rev: 18000 },
      { v: 3, d: 2, dist: 120, fuel: 12, cost: 1200, rev: 4000 },
      { v: 4, d: 2, dist: 50, fuel: 4, cost: 400, rev: 1500 },
      { v: 3, d: 0, dist: 250, fuel: 25, cost: 2400, rev: 7000 },
    ];

    let tId = 4;
    for (const ct of completedTrips) {
      const trip = await Trip.create({
        tripId: `TR00${tId++}`,
        source: 'City A',
        destination: 'City B',
        vehicle: vehicles[ct.v]._id,
        driver: drivers[ct.d]._id,
        cargoWeight: 1000,
        plannedDistance: ct.dist,
        status: 'Completed',
        finalOdometer: vehicles[ct.v].odometer + ct.dist,
        fuelConsumed: ct.fuel,
        fuelCost: ct.cost,
        tripRevenue: ct.rev,
      });

      // Update vehicle odometer
      await Vehicle.findByIdAndUpdate(vehicles[ct.v]._id, { $inc: { odometer: ct.dist } });

      // Create FuelLog
      await FuelLog.create({
        vehicle: vehicles[ct.v]._id,
        trip: trip._id,
        liters: ct.fuel,
        cost: ct.cost,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random past month
        notes: `Auto-generated from Trip ${trip.tripId} completion`
      });

      // Add a random Toll expense
      if (Math.random() > 0.5) {
        await Expense.create({
          vehicle: vehicles[ct.v]._id,
          trip: trip._id,
          type: 'Toll',
          amount: Math.floor(Math.random() * 1500) + 300,
          date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
      }
    }

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDB();
