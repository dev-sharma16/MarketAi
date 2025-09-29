require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cartRoutes = require("../src/routes/cart.routes");

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/cart", cartRoutes);

module.exports = app;
