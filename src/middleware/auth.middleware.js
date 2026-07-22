const jwt = require('jsonwebtoken');

const LEGACY_ADMIN_ID = 'admin-id';
const NORMALIZED_ADMIN_ID = '000000000000000000000001';

exports.protect = (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const normalizedUserId = decoded.userId === LEGACY_ADMIN_ID
            ? NORMALIZED_ADMIN_ID
            : decoded.userId;

        req.user = {
            ...decoded,
            userId: normalizedUserId,
            id: decoded.id || normalizedUserId,
        };
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token invalid' });
    }
};
