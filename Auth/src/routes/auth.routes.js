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

router.post(
  "/user/addresses",
  validators.addressValidations,
  authMiddleware,
  authControllers.addAddress
)

router.get(
  "/user/addresses",
  authMiddleware,
  authControllers.getAddresses
)

router.delete(
  "/user/addresses/:id",
  validators.addressIdValidation,
  authMiddleware,
  authControllers.deleteUserAddress
)

module.exports = router;
