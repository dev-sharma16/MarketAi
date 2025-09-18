const app = require("./src/app");
const connectDb = require("./src/db/db");

connectDb();

app.listen(process.env.PORT, () => {
  console.log(`Server is running on Port ${process.env.PORT}`);
});
