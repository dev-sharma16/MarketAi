const mongoose = require("mongoose");

async function connectDb(){
  await mongoose.connect(process.env.MONGO_DB_URL)
  .then(()=>{
    console.log("Connected to Db");
  })
  .catch((err)=>{
    console.error("Erron in connecting to Db:",err);
  })
}

module.exports = connectDb;
