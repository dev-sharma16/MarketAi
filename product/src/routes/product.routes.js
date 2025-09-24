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

router.get(
  "/",
  validators.getProductsValidations,
  productControllers.getProducts
)

router.get(
  "/:id",
  validators.getProductByIdValidations,
  productControllers.getProductById
)

router.patch(
  "/:id",
  validators.updateProductValidations,
  createAuthMiddleware(["seller"]),
  productControllers.updateProduct
)

module.exports = router;
