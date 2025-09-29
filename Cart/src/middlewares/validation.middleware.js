const { body, validationResult, param } = require("express-validator");
const mongoose = require("mongoose");

function validateResult(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

const validateAddItemToCart = [
  body("productId")
    .notEmpty()
    .withMessage("Product Id is required")
    .isString()
    .withMessage("Product Id must be an String")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid Product Id"),
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ gt: 0 })
    .withMessage("Quantity must be positive integer"),
  validateResult
];

const validateUpdateCartItem = [
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 0 })
    .withMessage("Quantity must be 0 or greater"),
  validateResult
];

const validateRemoveCartItem = [
  param("productId")
    .notEmpty()
    .withMessage("Product ID is required")
    .isString()
    .withMessage("Product ID must be a string")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid Product ID"),
  validateResult
];

module.exports = {
  validateAddItemToCart,
  validateUpdateCartItem,
  validateRemoveCartItem
};
