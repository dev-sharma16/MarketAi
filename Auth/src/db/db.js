const mongoose = require("mongoose");

async function connectDb() {
  await mongoose
    .connect(process.env.MONGO_DB_URL)
    .then(() => {
      console.log("Connected to Db");
    })
    .catch((error) => {
      console.log("Error in connecting to Db : ", error);
    });
}

module.exports = connectDb;
