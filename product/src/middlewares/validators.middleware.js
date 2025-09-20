const { body, validationResult } = require("express-validator");

const respondWithValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const addProductValidations = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .withMessage("Title must be a string"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
  body("priceAmount")
    .notEmpty()
    .withMessage("Price amount is required")
    .isFloat({ gt: 0 })
    .withMessage("Price must be a positive number"),
  body("priceCurrency")
    .optional()
    .isIn(["USD", "INR"])
    .withMessage("Currency must be either USD or INR"),
  respondWithValidationErrors
];

module.exports = { addProductValidations };
