const { Redis } = require("ioredis");

// const redis = new Redis( process.env.REDIS_URL, { db: 1 } );

const redis = new Redis({
  port: process.env.REDIS_PORT,
  host: process.env.REDIS_HOST,
  password: process.env.REDIS_PASSWORD,
});

redis.on("connect", () => {
  console.log("Connected to Redis");
});

redis.on("error", (error) => {
  console.log("Redis connection error :", error);
});

module.exports = redis;
