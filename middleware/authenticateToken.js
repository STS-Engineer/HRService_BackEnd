const jwt = require("jsonwebtoken");
const authenticate = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided." });
  }

  jwt.verify(token, "jwtSecret", (err, decoded) => {
    if (err) {
      console.error("Token verification failed:", err.message);
      return res.status(401).json({ message: "Failed to authenticate token." });
    }
    req.user = decoded.user;
    next();
  });
};
module.exports = { authenticate };
