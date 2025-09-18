const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model"); // adjust path

async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies.token ;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "User not logined"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    req.user = user;

    next();

  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(400).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
}

module.exports = authMiddleware;
