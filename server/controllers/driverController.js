import Driver from '../models/Driver.js';

// ─── Helper ───────────────────────────────────────────────────────────────────
const isExpired = (date) => new Date(date) < new Date();

// @desc    Get all drivers (status filter + search)
// @route   GET /api/drivers
// @access  Private
export const getDrivers = async (req, res) => {
  const { status, search, page = 1, limit = 50 } = req.query;

  const filter = {};
  if (status && status !== 'All') filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { licenseNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Driver.countDocuments(filter);
  const drivers = await Driver.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * Number(limit))
    .limit(Number(limit));

  res.json({ drivers, total, page: Number(page), pages: Math.ceil(total / limit) });
};

// @desc    Get single driver
// @route   GET /api/drivers/:id
// @access  Private
export const getDriver = async (req, res) => {
  const driver = await Driver.findById(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  res.json(driver);
};

// @desc    Create driver
// @route   POST /api/drivers
// @access  Private (fleet_manager, admin)
export const createDriver = async (req, res) => {
  const { licenseNumber, licenseExpiry } = req.body;

  // Business rule: license number must be unique
  const exists = await Driver.findOne({ licenseNumber: licenseNumber?.toUpperCase() });
  if (exists) {
    return res.status(409).json({ error: `License number '${licenseNumber}' is already registered` });
  }

  // Validate: expiry date must be a valid date
  if (!licenseExpiry || isNaN(new Date(licenseExpiry).getTime())) {
    return res.status(400).json({ error: 'License expiry date is invalid' });
  }

  const driver = await Driver.create({
    ...req.body,
    status: 'Available', // always starts Available
    tripsCompleted: 0,
    safetyScore: req.body.safetyScore ?? 100,
  });

  res.status(201).json(driver);
};

// @desc    Update driver profile
// @route   PUT /api/drivers/:id
// @access  Private (fleet_manager, admin)
export const updateDriver = async (req, res) => {
  const driver = await Driver.findById(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  // Business rule: cannot manually set status to 'On Trip'
  // (only trip dispatch controls that)
  if (req.body.status === 'On Trip') {
    return res.status(400).json({
      error: "Status 'On Trip' can only be set by the trip dispatch system",
    });
  }

  // Business rule: if driver is currently On Trip, cannot change status manually
  if (driver.status === 'On Trip' && req.body.status && req.body.status !== 'On Trip') {
    return res.status(400).json({
      error: 'Cannot change status of a driver who is currently On Trip',
    });
  }

  // Validate license expiry if being updated
  if (req.body.licenseExpiry && isNaN(new Date(req.body.licenseExpiry).getTime())) {
    return res.status(400).json({ error: 'License expiry date is invalid' });
  }

  // If changing licenseNumber, check uniqueness
  if (
    req.body.licenseNumber &&
    req.body.licenseNumber.toUpperCase() !== driver.licenseNumber
  ) {
    const exists = await Driver.findOne({ licenseNumber: req.body.licenseNumber.toUpperCase() });
    if (exists) {
      return res.status(409).json({ error: `License number '${req.body.licenseNumber}' is already registered` });
    }
  }

  const updated = await Driver.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.json(updated);
};

// @desc    Delete driver
// @route   DELETE /api/drivers/:id
// @access  Private (admin)
export const deleteDriver = async (req, res) => {
  const driver = await Driver.findById(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  // Cannot delete a driver currently On Trip
  if (driver.status === 'On Trip') {
    return res.status(400).json({ error: 'Cannot delete a driver who is currently On Trip' });
  }

  await driver.deleteOne();
  res.json({ message: 'Driver deleted successfully' });
};

// @desc    Quick status toggle (Available / Off Duty / Suspended only)
// @route   PATCH /api/drivers/:id/status
// @access  Private (fleet_manager, safety_officer, admin)
export const toggleStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ['Available', 'Off Duty', 'Suspended'];

  if (!allowed.includes(status)) {
    return res.status(400).json({
      error: `Status must be one of: ${allowed.join(', ')}. 'On Trip' is controlled by trip dispatch.`,
    });
  }

  const driver = await Driver.findById(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  if (driver.status === 'On Trip') {
    return res.status(400).json({ error: 'Cannot change status of a driver who is currently On Trip' });
  }

  driver.status = status;
  await driver.save();
  res.json(driver);
};

// @desc    Driver stats for dashboard
// @route   GET /api/drivers/stats
// @access  Private
export const getDriverStats = async (_req, res) => {
  const stats = await Driver.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const result = { Available: 0, 'On Trip': 0, 'Off Duty': 0, Suspended: 0, total: 0 };
  stats.forEach(({ _id, count }) => {
    if (_id in result) result[_id] = count;
    result.total += count;
  });

  // Count expired licenses
  const expiredCount = await Driver.countDocuments({ licenseExpiry: { $lt: new Date() } });
  result.expiredLicenses = expiredCount;

  res.json(result);
};
