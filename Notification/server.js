const app = require("./src/app");

app.listen(process.env.PORT, ()=>{
  console.log(`Notification service on Port: ${process.env.PORT}`);
})
