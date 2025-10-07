const app = require("./src/app");
const connectDb = require("./src/db/db");
const http = require("http");

const { initSocketServer } = require("./src/sockets/socket.server");

const httpServer = http.createServer(app);

initSocketServer(httpServer);

connectDb();

httpServer.listen(process.env.PORT, () => {
  console.log("Ai-Buudy service is on PORT : " + process.env.PORT);
});