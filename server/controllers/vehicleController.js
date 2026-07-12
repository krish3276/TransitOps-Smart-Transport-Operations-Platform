import Vehicle from '../models/Vehicle.js';

// @desc    Get all vehicles (with type/status filter + reg search)
// @route   GET /api/vehicles
// @access  Private
export const getVehicles = async (req, res) => {
  const { status, type, search, page = 1, limit = 50 } = req.query;

  const filter = {};
  if (status && status !== 'All') filter.status = status;
  if (type && type !== 'All') filter.type = type;
  if (search) {
    filter.$or = [
      { registrationNumber: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Vehicle.countDocuments(filter);
  const vehicles = await Vehicle.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * Number(limit))
    .limit(Number(limit));

  res.json({ vehicles, total, page: Number(page), pages: Math.ceil(total / limit) });
};

// @desc    Get single vehicle
// @route   GET /api/vehicles/:id
// @access  Private
export const getVehicle = async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(vehicle);
};

// @desc    Create vehicle
// @route   POST /api/vehicles
// @access  Private (fleet_manager, admin)
export const createVehicle = async (req, res) => {
  const { registrationNumber, name, type, maxLoadCapacity, odometer, acquisitionCost } = req.body;

  // Business rule: registration number must be unique
  const exists = await Vehicle.findOne({ registrationNumber: registrationNumber?.toUpperCase() });
  if (exists) {
    return res.status(409).json({ error: `Registration number '${registrationNumber}' is already in use` });
  }

  const vehicle = await Vehicle.create({
    registrationNumber,
    name,
    type,
    maxLoadCapacity,
    odometer: odometer || 0,
    acquisitionCost: acquisitionCost || 0,
    status: 'Available', // always starts Available
  });

  res.status(201).json(vehicle);
};

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
// @access  Private (fleet_manager, admin)
export const updateVehicle = async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  // If changing registrationNumber, check uniqueness
  if (
    req.body.registrationNumber &&
    req.body.registrationNumber.toUpperCase() !== vehicle.registrationNumber
  ) {
    const exists = await Vehicle.findOne({
      registrationNumber: req.body.registrationNumber.toUpperCase(),
    });
    if (exists) {
      return res.status(409).json({ error: `Registration number '${req.body.registrationNumber}' is already in use` });
    }
  }

  // Business rule: cannot manually set status to 'On Trip' via edit
  // (only trip dispatch can do that)
  const allowedStatusChanges = ['Available', 'In Shop', 'Retired'];
  if (req.body.status && !allowedStatusChanges.includes(req.body.status)) {
    return res.status(400).json({ error: 'Status can only be set to Available, In Shop, or Retired via this endpoint' });
  }

  const updated = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.json(updated);
};

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private (admin only)
export const deleteVehicle = async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  // Cannot delete a vehicle that is On Trip
  if (vehicle.status === 'On Trip') {
    return res.status(400).json({ error: 'Cannot delete a vehicle that is currently On Trip' });
  }

  await vehicle.deleteOne();
  res.json({ message: 'Vehicle deleted successfully' });
};

// @desc    Get fleet KPI stats (for dashboard)
// @route   GET /api/vehicles/stats
// @access  Private
export const getVehicleStats = async (_req, res) => {
  const stats = await Vehicle.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  // Shape into a clean object
  const result = { Available: 0, 'On Trip': 0, 'In Shop': 0, Retired: 0, total: 0 };
  stats.forEach(({ _id, count }) => {
    if (_id in result) result[_id] = count;
    result.total += count;
  });

  // Fleet utilization % = On Trip / (total - Retired) * 100
  const active = result.total - result.Retired;
  result.utilizationPercent = active > 0 ? Math.round((result['On Trip'] / active) * 100) : 0;

  res.json(result);
};

// @desc    Upload vehicle document
// @route   POST /api/vehicles/:id/document
// @access  Private (Fleet Manager, Safety Officer)
export const uploadVehicleDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or invalid file type' });
  }
  
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  vehicle.documentUrl = `/uploads/${req.file.filename}`;
  await vehicle.save();
  
  res.json(vehicle);
};
