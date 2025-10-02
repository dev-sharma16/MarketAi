const request = require("supertest");
const app = require("../src/app.js");
const db = require("./setups/mongoMemory.js");
const orderModel = require("../src/models/order.model.js");
const jwt = require("jsonwebtoken");
const axios = require("axios");
jest.mock("axios");

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

describe("POST /orders", () => {
  it("should create a new order", async () => {
    // Mock the cart service response
    axios.get.mockImplementation((url) => {
      if (url === "http://localhost:3002/cart") {
        return Promise.resolve({
          data: {
            cart: {
              items: [
                {
                  productId: "65f1a2b3c4d5e6f789012345",
                  quantity: 2
                }
              ]
            }
          }
        });
      } else if (
        url === "http://localhost:3001/product/65f1a2b3c4d5e6f789012345"
      ) {
        return Promise.resolve({
          data: {
            product: {
              _id: "65f1a2b3c4d5e6f789012345",
              title: "Test Product",
              price: {
                amount: 100,
                currency: "INR"
              },
              stock: 10
            }
          }
        });
      }
    });

    const res = await request(app)
      .post("/orders")
      .set("Cookie", [`token=${token}`])
      .send({
        shippingAddress: {
          street: "test_street",
          city: "test_city",
          state: "test_state",
          zip: "123456",
          country: "TEST_COUNTRY"
        }
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Order created successfully");
    expect(res.body.order).toBeDefined();
    expect(res.body.order.items.length).toBe(1);
    expect(res.body.order.items[0].quantity).toBe(2);
    expect(res.body.order.status).toBe("PENDING");
  });

  it("should return 401 if user is unauthenticated", async () => {
    const res = await request(app)
      .post("/orders")
      .send({
        shippingAddress: {
          street: "test_street",
          city: "test_city",
          state: "test_state",
          zip: "123456",
          country: "TEST_COUNTRY"
        }
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Unauthorized: No token provided");
  });

  it("should return 400 if shipping address has missing /invalid fields", async () => {
    const res = await request(app)
      .post("/orders")
      .send({
        shippingAddress: {
          street: "test_street",
          city: "test_city",
          zip: "123456",
          country: "TEST_COUNTRY"
        }
      });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });
});

describe("GET /orders/me", () => {
  it("should return user's orders", async () => {
    const user = {
      id: "65f1a2b3c4d5e6f789012345",
      username: "test-user",
      email: "test@email.com",
      role: "user"
    };
    const token = jwt.sign(user, process.env.JWT_SECRET);
    await orderModel.create({
      userId: user.id,
      items: [
        {
          productId: "65f1a2b3c4d5e6f789012345",
          quantity: 2,
          price: {
            amount: 100,
            currency: "INR"
          }
        }
      ],
      totalPrice: {
        amount: 200,
        currency: "INR"
      },
      status: "PENDING",
      shippingAddress: {
        street: "test_street",
        city: "test_city",
        state: "test_state",
        zip: "123456",
        country: "TEST_COUNTRY"
      }
    });

    const res = await request(app)
      .get("/orders/me")
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("User's orders fetched successfully");
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(res.body.orders.length).toBe(1);
  });

  it("should return 401 if user is unauthenticated", async () => {
    const res = await request(app).get("/orders/me");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Unauthorized: No token provided");
  });

  it("should return 404 if user has no orders", async () => {
    const user = {
      id: "65f1a2b3c4d5e6f789099999",
      username: "no-order-user",
      email: "no-order-user@email.com",
      role: "user"
    };
    const token = jwt.sign(user, process.env.JWT_SECRET);

    const res = await request(app)
      .get("/orders/me")
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("No orders found for this user");
  });
});

describe("GET /orders/:id", () => {
  it("should return an order by ID", async () => {
    const user = {
      id: "65f1a2b3c4d5e6f789012345",
      username: "test-user",
      email: "test@email.com",
      role: "user"
    };
    token = jwt.sign(user, process.env.JWT_SECRET);

    const order = await orderModel.create({
      userId: user.id,
      items: [
        {
          productId: "65f1a2b3c4d5e6f789098745",
          quantity: 2,
          price: {
            amount: 100,
            currency: "INR"
          }
        }
      ],
      totalPrice: {
        amount: 200,
        currency: "INR"
      },
      status: "PENDING",
      shippingAddress: {
        street: "test_street",
        city: "test_city",
        state: "test_state",
        zip: "123456",
        country: "TEST_COUNTRY"
      }
    });

    const res = await request(app)
      .get(`/orders/${order._id}`)
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Order fetched successfully");
    expect(res.body.order).toBeDefined();
  });

  it("should return 404 if order not found", async () => {
    const user = {
      id: "65f1a2b3c4d5e6f789012345",
      username: "test-user",
      email: "test@email.com",
      role: "user"
    };
    token = jwt.sign(user, process.env.JWT_SECRET);

    const fakeOrderID = "65f1a2b3c4f5e6f789013245";

    const res = await request(app)
      .get(`/orders/${fakeOrderID}`)
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("No Order found");
    expect(res.body.order).toBeUndefined();
  });

  it("should return 403 is current user id is not match user id in order", async () => {
    const user = {
      id: "65f1a2b3c4d5e6f789012345",
      username: "test-user",
      email: "test@email.com",
      role: "user"
    };
    token = jwt.sign(user, process.env.JWT_SECRET);

    const order = await orderModel.create({
      userId: "65e1a2b3c4d5e6f789012395",
      items: [
        {
          productId: "65f1a2b3c4d5e6f789098745",
          quantity: 2,
          price: {
            amount: 100,
            currency: "INR"
          }
        }
      ],
      totalPrice: {
        amount: 200,
        currency: "INR"
      },
      status: "PENDING",
      shippingAddress: {
        street: "test_street",
        city: "test_city",
        state: "test_state",
        zip: "123456",
        country: "TEST_COUNTRY"
      }
    });

    const res = await request(app)
      .get(`/orders/${order._id}`)
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe(
      "Forbidden: You don't have access to this order"
    );
    expect(res.body.order).toBeUndefined();
  });

  it("should return 401 if user is unauthenticated", async () => {
    const fakeOrderID = "65f1a2b3c4f5e6f789013245";
    const res = await request(app).get(`/orders/${fakeOrderID}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Unauthorized: No token provided");
  });
});

describe("POST /orders/:id/cancel", () => {
  it("should change the status from PENDING to DELETE", async () => {
    const user = {
      id: "65f1a2b3c4d5e6f789012345",
      username: "test-user",
      email: "test@email.com",
      role: "user"
    };
    token = jwt.sign(user, process.env.JWT_SECRET);

    const order = await orderModel.create({
      userId: user.id,
      items: [
        {
          productId: "65f1a2b3c4d5e6f789098745",
          quantity: 2,
          price: {
            amount: 100,
            currency: "INR"
          }
        }
      ],
      totalPrice: {
        amount: 200,
        currency: "INR"
      },
      status: "PENDING",
      shippingAddress: {
        street: "test_street",
        city: "test_city",
        state: "test_state",
        zip: "123456",
        country: "TEST_COUNTRY"
      }
    });

    const res = await request(app)
      .post(`/orders/${order._id}/cancel`)
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Order cancelled successfully");
  });

  it("should return 403 if order status is not PENDING", async () => {
    const user = {
      id: "65f1a2b3c4d5e6f789012345",
      username: "test-user",
      email: "test@email.com",
      role: "user"
    };
    token = jwt.sign(user, process.env.JWT_SECRET);

    const order = await orderModel.create({
      userId: user.id,
      items: [
        {
          productId: "65f1a2b3c4d5e6f789098745",
          quantity: 2,
          price: {
            amount: 100,
            currency: "INR"
          }
        }
      ],
      totalPrice: {
        amount: 200,
        currency: "INR"
      },
      status: "SHIPPED",
      shippingAddress: {
        street: "test_street",
        city: "test_city",
        state: "test_state",
        zip: "123456",
        country: "TEST_COUNTRY"
      }
    });

    const res = await request(app)
      .post(`/orders/${order._id}/cancel`)
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe(
      "Order can only be cancelled if it status is PENDING"
    );
  });

  it("should return 404 if order not found", async () => {
    const user = {
      id: "65f1a2b3c4d5e6f789012345",
      username: "test-user",
      email: "test@email.com",
      role: "user"
    };
    token = jwt.sign(user, process.env.JWT_SECRET);

    const fakeOrderID = "65f1a2b3c4f5e6f789013245";

    const res = await request(app)
      .post(`/orders/${fakeOrderID}/cancel`)
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("No Order found");
  });

  it("should return 403 is current user id is not match user id in order", async () => {
    const user = {
      id: "65f1a2b3c4d5e6f789012345",
      username: "test-user",
      email: "test@email.com",
      role: "user"
    };
    token = jwt.sign(user, process.env.JWT_SECRET);

    const order = await orderModel.create({
      userId: "65e1a2b3c4d5e6f789012395",
      items: [
        {
          productId: "65f1a2b3c4d5e6f789098745",
          quantity: 2,
          price: {
            amount: 100,
            currency: "INR"
          }
        }
      ],
      totalPrice: {
        amount: 200,
        currency: "INR"
      },
      status: "PENDING",
      shippingAddress: {
        street: "test_street",
        city: "test_city",
        state: "test_state",
        zip: "123456",
        country: "TEST_COUNTRY"
      }
    });

    const res = await request(app)
      .post(`/orders/${order._id}/cancel`)
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe(
      "Forbidden: You don't have access to this order"
    );
  });

  it("should return 401 if user is unauthenticated", async () => {
    const fakeOrderID = "65f1a2b3c4f5e6f789013245";
    const res = await request(app).post(`/orders/${fakeOrderID}/cancel`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Unauthorized: No token provided");
  });
});

describe("PATCH /orders/:id/address", () => {
  it("should update the order address", async () => {
    const user = {
      id: "65f1a2b3c4d5e6f789012345",
      username: "test-user",
      email: "test@email.com",
      role: "user"
    };
    token = jwt.sign(user, process.env.JWT_SECRET);

    const order = await orderModel.create({
      userId: user.id,
      items: [
        {
          productId: "65f1a2b3c4d5e6f789098745",
          quantity: 2,
          price: {
            amount: 100,
            currency: "INR"
          }
        }
      ],
      totalPrice: {
        amount: 200,
        currency: "INR"
      },
      status: "PENDING",
      shippingAddress: {
        street: "test_street",
        city: "test_city",
        state: "test_state",
        zip: "123456",
        country: "TEST_COUNTRY"
      }
    });

    const updatedAddress = {
      street: "test_street_updated",
      city: "test_city_updated",
      state: "test_state_updated",
      zip: "654321",
      country: "TEST_COUNTRY_updated"
    };

    const res = await request(app)
      .patch(`/orders/${order._id}/address`)
      .set("Cookie", [`token=${token}`])
      .send(updatedAddress);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Order address updated successfully");
    expect(res.body.order).toBeDefined();
    expect(res.body.order.shippingAddress.street).toBe("test_street_updated");
  });

  it("should return 403 if order status is not PENDING", async () => {
    const user = {
      id: "65f1a2b3c4d5e6f789012345",
      username: "test-user",
      email: "test@email.com",
      role: "user"
    };
    token = jwt.sign(user, process.env.JWT_SECRET);

    const order = await orderModel.create({
      userId: user.id,
      items: [
        {
          productId: "65f1a2b3c4d5e6f789098745",
          quantity: 2,
          price: {
            amount: 100,
            currency: "INR"
          }
        }
      ],
      totalPrice: {
        amount: 200,
        currency: "INR"
      },
      status: "SHIPPED",
      shippingAddress: {
        street: "test_street",
        city: "test_city",
        state: "test_state",
        zip: "123456",
        country: "TEST_COUNTRY"
      }
    });

    const updatedAddress = {
      street: "test_street_updated",
      city: "test_city_updated",
      state: "test_state_updated",
      zip: "654321",
      country: "TEST_COUNTRY_updated"
    };

    const res = await request(app)
      .patch(`/orders/${order._id}/address`)
      .set("Cookie", [`token=${token}`])
      .send(updatedAddress);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Order address can only be updated if its status is PENDING");
  });

  it("should return 404 if order not found", async () => {
    const user = {
      id: "65f1a2b3c4d5e6f789012345",
      username: "test-user",
      email: "test@email.com",
      role: "user"
    };
    token = jwt.sign(user, process.env.JWT_SECRET);

    const fakeOrderID = "65f1a2b3c4f5e6f789013245";

    const res = await request(app)
      .post(`/orders/${fakeOrderID}/cancel`)
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("No Order found");
  });

  it("should return 403 is current user id is not match user id in order", async () => {
    const user = {
      id: "65f1a2b3c4d5e6f789012345",
      username: "test-user",
      email: "test@email.com",
      role: "user"
    };
    token = jwt.sign(user, process.env.JWT_SECRET);

    const order = await orderModel.create({
      userId: "65e1a2b3c4d5e6f789012395",
      items: [
        {
          productId: "65f1a2b3c4d5e6f789098745",
          quantity: 2,
          price: {
            amount: 100,
            currency: "INR"
          }
        }
      ],
      totalPrice: {
        amount: 200,
        currency: "INR"
      },
      status: "PENDING",
      shippingAddress: {
        street: "test_street",
        city: "test_city",
        state: "test_state",
        zip: "123456",
        country: "TEST_COUNTRY"
      }
    });

    const res = await request(app)
      .post(`/orders/${order._id}/cancel`)
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe(
      "Forbidden: You don't have access to this order"
    );
  });

  it("should return 401 if user is unauthenticated", async () => {
    const fakeOrderID = "65f1a2b3c4f5e6f789013245";
    const res = await request(app).post(`/orders/${fakeOrderID}/cancel`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Unauthorized: No token provided");
  });
});
