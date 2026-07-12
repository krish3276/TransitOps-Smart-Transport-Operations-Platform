import Vehicle from '../models/Vehicle.js';

// @desc    Get all vehicles (with filters & pagination)
// @route   GET /api/vehicles
// @access  Private
export const getVehicles = async (req, res) => {
  const { status, type, page = 1, limit = 20, search } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (search) filter.registrationNumber = { $regex: search, $options: 'i' };

  const total = await Vehicle.countDocuments(filter);
  const vehicles = await Vehicle.find(filter)
    .populate('assignedDriver', 'employeeId user')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ vehicles, total, page: Number(page), pages: Math.ceil(total / limit) });
};

// @desc    Get single vehicle
// @route   GET /api/vehicles/:id
// @access  Private
export const getVehicle = async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id).populate('assignedDriver');
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(vehicle);
};

// @desc    Create vehicle
// @route   POST /api/vehicles
// @access  Private (admin, dispatcher)
export const createVehicle = async (req, res) => {
  const vehicle = await Vehicle.create(req.body);
  res.status(201).json(vehicle);
};

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
// @access  Private (admin, dispatcher)
export const updateVehicle = async (req, res) => {
  const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(vehicle);
};

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private (admin only)
export const deleteVehicle = async (req, res) => {
  const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json({ message: 'Vehicle removed' });
};

// @desc    Get fleet summary stats
// @route   GET /api/vehicles/stats
// @access  Private
export const getVehicleStats = async (req, res) => {
  const stats = await Vehicle.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  res.json(stats);
};
