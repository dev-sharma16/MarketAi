const { body, param, validationResult } = require("express-validator");

const respondWithValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const registerUserValidations = [
  body("username")
    .isString()
    .withMessage("Username must be a string")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long"),
  body("email").isEmail().withMessage("Invalid email address"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("fullName.firstName")
    .isString()
    .withMessage("First name must be a string")
    .notEmpty()
    .withMessage("First name is required"),
  body("fullName.lastName")
    .isString()
    .withMessage("Last name must be a string")
    .notEmpty()
    .withMessage("Last name is required"),
  body("role") 
    .optional()
    .isIn(['user', 'seller'])
    .withMessage("Role must be either 'user' or 'seller'"),
  respondWithValidationErrors
];

const loginUserValidations = [
  body("email")
    .optional()
    .isEmail()
    .withMessage("Invalid Email address"),
  body("username")
    .optional()
    .isString()
    .withMessage("Username must be a string"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must at least 6 characters long"),
  respondWithValidationErrors
];

const addressValidations = [
  body("street")
    .isString()
    .withMessage("Street must be a string")
    .notEmpty()
    .withMessage("Street is required"),
  body("city")
    .isString()
    .withMessage("City must be a string")
    .notEmpty()
    .withMessage("City is required"),
  body("state")
    .isString()
    .withMessage("State must be a string")
    .notEmpty()
    .withMessage("State is required"),
  body("zip")
    .isPostalCode("any")
    .withMessage("Invalid ZIP code")
    .notEmpty()
    .withMessage("ZIP code is required"),
  body("country")
    .isString()
    .withMessage("Country must be a string")
    .notEmpty()
    .withMessage("Country is required"),
  respondWithValidationErrors
];

const addressIdValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid address ID"),
  respondWithValidationErrors
];

module.exports = {
  registerUserValidations,
  loginUserValidations,
  addressValidations,
  addressIdValidation
};
