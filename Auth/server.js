const app = require("./src/app");
const connectDb = require("./src/db/db");
const { connect } = require("./src/broker/broker");

connectDb();
connect()

app.listen(process.env.PORT, () => {
  console.log(`Server is running on Port ${process.env.PORT}`);
});
