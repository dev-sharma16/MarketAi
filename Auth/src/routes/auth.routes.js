const express = require("express");
const authControllers = require("../controllers/auth.controller");
const validators = require("../middlewares/validator.middleware");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post(
  "/user/register", 
  validators.registerUserValidations, 
  authControllers.registerUser
);

router.post(
  "/user/login",
  validators.loginUserValidations,
  authControllers.loginUser
)

router.get(
  "/user",
  authMiddleware,
  authControllers.getCurrentUser
)

router.post(
  "/user/logout",
  authMiddleware,
  authControllers.logoutUser
)

module.exports = router;
