const mongoose = require('mongoose');
const Order = require('../models/order.model');
require('../models/user.model');

const paginationFromQuery = (query) => {
  const page = Number.parseInt(query.page, 10) || 1;
  const limit = Number.parseInt(query.limit, 10) || 20;
  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)),
  };
};

const listOrders = async (filter, req, res, next) => {
  try {
    const { page, limit } = paginationFromQuery(req.query);
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'name email')
        .lean(),
      Order.countDocuments(filter),
    ]);

    return res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.listCurrentUserOrders = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
    return res.status(401).json({ message: 'Authenticated user is required' });
  }

  return listOrders({ userId: req.user.userId }, req, res, next);
};

exports.listAllOrders = (_req, res, next) =>
  listOrders({}, _req, res, next);
