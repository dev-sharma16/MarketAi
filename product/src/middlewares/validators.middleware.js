const { body, validationResult, query, param } = require("express-validator");

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

const getProductsValidations = [
  query("minprice")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("minprice must be a positive number"),
  query("maxprice")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("maxprice must be a positive number"),
  query("skip")
    .optional()
    .isInt({ min: 0 })
    .withMessage("skip must be a non-negative integer"),
  query("limit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("limit must be a positive integer"),
  respondWithValidationErrors
];

const getProductByIdValidations = [
  param("id").isMongoId().withMessage("Invalid product ID"),
  respondWithValidationErrors
];

const updateProductValidations = [
  param("id").isMongoId().withMessage("Invalid product ID"),
  body("title")
    .optional()
    .isString()
    .withMessage("Title must be a string"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
  body("price")
    .optional()
    .isObject()
    .withMessage("Price must be an object with { amount, currency }"),
  body("price.amount")
    .optional()
    .isNumeric()
    .withMessage("Price amount must be a number"),
  body("price.currency")
    .optional()
    .isString()
    .withMessage("Price currency must be a string")
];

const deleteProductValidations = [
  param("id").isMongoId().withMessage("Invalid product ID"),
  respondWithValidationErrors
]



module.exports = {
  addProductValidations,
  getProductsValidations,
  getProductByIdValidations,
  updateProductValidations,
  deleteProductValidations,

};
