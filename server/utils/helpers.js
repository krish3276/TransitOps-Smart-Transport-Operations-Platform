import jwt from 'jsonwebtoken';

export const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

export const generateTripId = () => {
  const date = new Date();
  const prefix = 'TRIP';
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${datePart}-${rand}`;
};

export const paginate = (query, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
};
