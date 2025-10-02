require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const orderRoutes = require("./routes/order.route");


const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/orders", orderRoutes);

module.exports = app;
