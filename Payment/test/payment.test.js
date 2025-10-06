const request = require("supertest");
const app = require("../src/app.js");
const db = require("./setups/mongoMemory.js");
const jwt = require("jsonwebtoken");
const axios = require("axios");
jest.mock("axios");
jest.mock("../src/service/razorpay.service", () => ({
  orders: {
    create: jest.fn().mockResolvedValue({
      id: "order_123",
      amount: 2000,
      currency: "INR"
    })
  }
}));

let server;
let token;

beforeAll(async () => {
  process.env.JWT_SECRET = "test_secret_key";
  process.env.RAZORPAY_TEST_KEY_ID = "test_key_id";
  process.env.RAZORPAY_TEST_KEY_SECRET = "test_key_secret";
  
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

describe("POST /payment/create/:orderId", () => {
  it("should create a new payment", async () => {
    const orderId = "65f1a2b3c4d5e6f789012345";
    
    // Mock the order service response
    axios.get.mockImplementation((url) => {
      if (url === `http://localhost:3003/orders/${orderId}`) {
        return Promise.resolve({
          data: {
            order: {
              totalPrice: {
                amount: 2000,
                currency: "INR"
              }
            }
          }
        });
      }
    });

    const res = await request(app)
      .post(`/payment/create/${orderId}`)
      .set("Cookie", [`token=${token}`])
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Payemnt initiated successfully");
    expect(res.body.payment).toBeDefined();
    expect(res.body.payment.status).toBe("PENDING");
  });

  // it("should return 401 if user is unauthenticated", async () => {
  //   const res = await request(app)
  //     .post("/orders")
  //     .send({
  //       shippingAddress: {
  //         street: "test_street",
  //         city: "test_city",
  //         state: "test_state",
  //         zip: "123456",
  //         country: "TEST_COUNTRY"
  //       }
  //     });

  //   expect(res.status).toBe(401);
  //   expect(res.body.success).toBe(false);
  //   expect(res.body.message).toBe("Unauthorized: No token provided");
  // });

  // it("should return 400 if shipping address has missing /invalid fields", async () => {
  //   const res = await request(app)
  //     .post("/orders")
  //     .send({
  //       shippingAddress: {
  //         street: "test_street",
  //         city: "test_city",
  //         zip: "123456",
  //         country: "TEST_COUNTRY"
  //       }
  //     });

  //   expect(res.status).toBe(400);
  //   expect(Array.isArray(res.body.errors)).toBe(true);
  //   expect(res.body.errors.length).toBeGreaterThan(0);
  // });
});

