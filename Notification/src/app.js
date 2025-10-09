require("dotenv").config();
const express = require("express");
const { connect, subscribeToQueue } = require("../src/broker/broker");
const setListners = require("./broker/listners");

const app = express();

connect().then(() => {
  setListners();
});

app.get("/", (req, res) => {
  res.send("Notification service is Up and Running");
});

module.exports = app;
