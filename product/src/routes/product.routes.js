const express = require("express");
const productControllers = require("../controllers/product.controllers");
const createAuthMiddleware = require("../middlewares/auth.middleware");
const validators = require("../middlewares/validators.middleware")

const router = express.Router();

router.post(
  "/",
  validators.addProductValidations,
  createAuthMiddleware(["admin", "seller"]),
  productControllers.addProduct
);

module.exports = router;
