const request = require("supertest");
const app = require("../src/app.js");
const db = require("./setups/mongoMemory");
const cartModel = require("../src/models/cart.model");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

let server;
let token;

beforeAll(async () => {
  server = await new Promise((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });
  await db.connect();
  const user = {
    id: "65f1a2b3c4d5e6f789012345",
    username: "test-user",
    email: "test@email.com",
    role: "user"
  };
  token = jwt.sign(user, process.env.JWT_SECRET);
});

afterAll(async () => {
  await db.disconnect();
  await new Promise((resolve) => {
    server.close(resolve);
  });
});

afterEach(async () => {
  await db.clear();
});

describe("GET /cart", () => {
  it("should return empty cart initially", async () => {
    await cartModel.create({
      user: "65f1a2b3c4d5e6f789012345",
      items: []
    });

    const res = await request(app)
      .get("/cart")
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cart.items).toEqual([]);
  });

  it("should return 404 if the cart not exists foo a user", async () => {
    const res = await request(app)
      .get("/cart")
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("No cart found");
  });

  it("should return 401 if user is unauthenticated", async () => {
    await cartModel.create({
      user: "65f1a2b3c4d5e6f789012345",
      items: []
    });

    const res = await request(app).get("/cart");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Unauthorized: No token provided");
  });
});

describe("POST /cart/items", () => {
  it("should return 401 if user is unauthenticated", async () => {
    const res = await request(app)
      .post("/cart/items")
      .send({ productId: "65f1a2b3c4d5e6f789012345", quantity: 2 });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Unauthorized: No token provided");
  });

  it("should add an item to the cart", async () => {
    const res = await request(app)
      .post("/cart/items")
      .send({ productId: "65f1a2b3c4d5e6f789012345", quantity: 2 })
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.cart.items.length).toBe(1);
    expect(res.body.cart.items[0].productId).toBe("65f1a2b3c4d5e6f789012345");
    expect(res.body.cart.items[0].quantity).toBe(2);
  });

  it("should fail when quantity is missing", async () => {
    const res = await request(app)
      .post("/cart/items")
      .send({
        productId: new mongoose.Types.ObjectId("65f1a2b3c4d5e6f789012345")
      })
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toBe("Quantity is required");
  });

  it("should fail when productId is missing", async () => {
    const res = await request(app)
      .post("/cart/items")
      .send({ quantity: 2 })
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toBe("Product Id is required");
  });
});

describe("PATCH /cart/items/:productId", () => {
  it("should return 401 if user is unauthenticated", async () => {
    const res = await request(app)
      .post("/cart/items")
      .send({ productId: "64a7b8c9d2e3f4567890abcd", quantity: 2 });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Unauthorized: No token provided");
  });

  it("should update quantity of an existing product", async () => {
    await cartModel.create({
      user: "65f1a2b3c4d5e6f789012345",
      items: [{ productId: "64a7b8c9d2e3f4567890abcd", quantity: 2 }]
    });

    const res = await request(app)
      .patch("/cart/items/64a7b8c9d2e3f4567890abcd")
      .send({ quantity: 5 })
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cart.items[0].quantity).toBe(5);
  });
  //todo fix this test
  // it("should remove item if quantity <= 0", async () => {
  //   await cartModel.create({
  //     user: "65f1a2b3c4d5e6f789012345",
  //     items: [{ productId: "64a7b8c9d2e3f4567890abcd", quantity: 3 }]
  //   });

  //   const res = await request(app)
  //     .patch("/cart/items/64a7b8c9d2e3f4567890abcd")
  //     .send({ quantity: -1 })
  //     .set("Cookie", [`token=${token}`]);

  //   // console.log(res.body);
    

  //   expect(res.status).toBe(200);
  //   expect(res.body.success).toBe(true);
  // });
});

describe("DELETE /cart/items/:productId", () => {
  it("should return 401 if user is unauthenticated", async () => {
    const res = await request(app).delete("/cart/items/64a7b8c9d2e3f4567890abcd")

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Unauthorized: No token provided");
  });

  it("should remove item from cart", async () => {
    await cartModel.create({
      user: "65f1a2b3c4d5e6f789012345",
      items: [{ productId: "64a7b8c9d2e3f4567890abcd", quantity: 2 }]
    });

    const res = await request(app)
      .delete("/cart/items/64a7b8c9d2e3f4567890abcd")
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cart.items.length).toBe(0);
  });

  it("should return 404 if item not found in the cart", async () => {
    await cartModel.create({
      user: "65f1a2b3c4d5e6f789012345",
      items: [{ productId: "64a7b8c9d2e3f4567890abcd", quantity: 2 }]
    });
    
    const res = await request(app)
      .delete("/cart/items/64a7b8c9d2e3f4567890dcba")
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("No cart found or item not found in cart");
  });
});

describe("DELETE /cart/items", () => {
  it("should return 401 if user is unauthenticated", async () => {
    const res = await request(app).delete("/cart/items/64a7b8c9d2e3f4567890abcd")

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Unauthorized: No token provided");
  });

  it("should clear the cart", async () => {
    await cartModel.create({
      user: "65f1a2b3c4d5e6f789012345",
      items: [{ productId: "64a7b8c9d2e3f4567890abcd", quantity: 2 }]
    });

    const res = await request(app)
      .delete("/cart/items")
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cart.items.length).toBe(0);
  });

  it("should return 404 if cart not found", async () => {
    const res = await request(app)
      .delete("/cart/items")
      .set("Cookie", [`token=${token}`]);
    
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("No cart found");
  });
});
