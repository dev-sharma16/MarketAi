const express = require("express");
const orderController = require("../controllers/order.controller");
const createAuthMiddleware = require("../middlewares/auth.middleware")
const validation = require("../middlewares/validators.middleware")

const router = express.Router();

router.post(
  "/",
  validation.createOrderValidations,
  createAuthMiddleware(["user"]), 
  orderController.createOrder
);

router.get(
  "/me",
  createAuthMiddleware(["user"]),
  orderController.getMyOrders
)

router.get(
  "/:id",
  createAuthMiddleware(["user", "admin"]),
  orderController.getOrderById
)

router.post(
  "/:id/cancel",
  createAuthMiddleware(["user", "admin"]),
  orderController.cancleOrderById
) 

router.patch(
  "/:id/address",
  // validation.updateAddressValidations,
  createAuthMiddleware(["user"]),
  orderController.updateOrderAddress
)

module.exports = router;
