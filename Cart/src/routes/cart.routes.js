const express = require("express");
const cartControllers = require("../controllers/cart.controller");
const createAuthMiddleware = require("../middlewares/auth.middleware");
const validators = require("../middlewares/validation.middleware");

const router = express.Router();

router.post(
  "/items",
  validators.validateAddItemToCart,
  createAuthMiddleware(["user"]),
  cartControllers.addItemTocart
)

router.get(
  "/", 
  createAuthMiddleware(["user"]), 
  cartControllers.getCurrentCart
);

router.patch(
  "/items/:productId",
  validators.validateUpdateCartItem,
  createAuthMiddleware(["user"]),
  cartControllers.changeQuantity
)

router.delete(
  "/items",
  createAuthMiddleware(["user"]),
  cartControllers.clearCart
)

router.delete(
  "/items/:productId",
  validators.validateRemoveCartItem,
  createAuthMiddleware(["user"]),
  cartControllers.removeItemFromCart
);

module.exports = router;
