require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const paymentRoutes = require("../src/routes/payment.routes");

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use("/payment", paymentRoutes);

module.exports = app;
