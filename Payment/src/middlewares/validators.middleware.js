const { body, validationResult } = require("express-validator");

const respondWithValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const createOrderValidations = [
  body("shippingAddress.street")
    .notEmpty()
    .withMessage("Street is required")
    .isString()
    .withMessage("Street must be a string"),
  body("shippingAddress.city")
    .notEmpty()
    .withMessage("City is required")
    .isString()
    .withMessage("City must be a string"),
  body("shippingAddress.state")
    .notEmpty()
    .withMessage("State is required")
    .isString()
    .withMessage("State must be a string"),
  body("shippingAddress.zip")
    .notEmpty()
    .withMessage("ZIP code is required")
    .isPostalCode("any")
    .withMessage("Invalid ZIP code"),
  body("shippingAddress.country")
    .notEmpty()
    .withMessage("Country is required")
    .isString()
    .withMessage("Country must be a string"),
  respondWithValidationErrors
];

const updateAddressValidations = [
  body("shippingAddress.street")
    .notEmpty()
    .withMessage("Street is required")
    .isString()
    .withMessage("Street must be a string"),
  body("shippingAddress.city")
    .notEmpty()
    .withMessage("City is required")
    .isString()
    .withMessage("City must be a string"),
  body("shippingAddress.state")
    .notEmpty()
    .withMessage("State is required")
    .isString()
    .withMessage("State must be a string"),
  body("shippingAddress.zip")
    .notEmpty()
    .withMessage("ZIP code is required")
    .isPostalCode("any")
    .withMessage("Invalid ZIP code"),
  body("shippingAddress.country")
    .notEmpty()
    .withMessage("Country is required")
    .isString()
    .withMessage("Country must be a string"),
  respondWithValidationErrors
];

module.exports = {
  createOrderValidations,
  updateAddressValidations 
};
