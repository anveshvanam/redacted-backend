const jwt = require("jsonwebtoken");

function authenticateAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.adminId;
    next();
  } catch {
    res.sendStatus(403);
  }
}

module.exports = authenticateAdmin;
