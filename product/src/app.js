require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const productRoutes = require("../src/routes/product.routes");

const app = express();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.json());
app.use(cookieParser());

app.use("/product", upload.array("images", 5), productRoutes);

module.exports = app;
