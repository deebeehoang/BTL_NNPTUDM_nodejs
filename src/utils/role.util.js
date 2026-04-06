const jwt = require('jsonwebtoken');

const checkRole = (roles) => {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!roles.includes(decoded.role)) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }
  };
};

module.exports = {
  checkRole
}; 