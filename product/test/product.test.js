const request = require("supertest");
const app = require("../src/app");
const db = require("../test/setups/mongoMemory");
const productModel = require("../src/models/product.model");

// 👇 mock image service
jest.mock("../src/services/image.service.js", () => jest.fn());

// 👇 mock auth middleware
jest.mock("../src/middlewares/auth.middleware.js", () => {
  return jest.fn(() => (req, res, next) => {
    // Mock authenticated user
    req.user = {
      id: "507f1f77bcf86cd799439011",
      email: "test@example.com",
      role: "user"
    };
    next();
  });
});

const uploadOnImagekit = require("../src/services/image.service.js");

beforeAll(async () => await db.connect());
afterEach(async () => {
  await db.clear();
  jest.clearAllMocks(); // reset mock counts
});
afterAll(async () => await db.close());

describe("POST /product", () => {
  it("should create a product successfully with image upload", async () => {
    // mock uploadOnImagekit result
    uploadOnImagekit.mockResolvedValue({
      url: "https://fake.imagekit.io/product.jpg",
      thumbnail: "https://fake.imagekit.io/product-thumb.jpg",
      id: "fake123"
    });

    const res = await request(app)
      .post("/product")
      .field("title", "Test Product")
      .field("description", "A sample product")
      .field("priceAmount", "100")
      .field("priceCurrency", "INR")
      .attach("images", Buffer.from("fake image data"), "test.jpg");

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.product).toHaveProperty("_id");
    expect(res.body.product.title).toBe("Test Product");
    expect(res.body.product.price.amount).toBe(100);

    // check if mock upload was called
    expect(uploadOnImagekit).toHaveBeenCalledTimes(1);
    expect(uploadOnImagekit).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: "test.jpg" })
    );
  });

  it("should return 400 if title is missing", async () => {
    const res = await request(app).post("/product").send({
      priceAmount: 100,
      priceCurrency: "INR"
    });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toMatch(/title is required/i);
  });

  it("should return 400 if priceAmount is missing", async () => {
    const res = await request(app).post("/product").send({
      title: "No Price Product"
    });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toMatch(/price amount is required/i);
  });

  it("should return 400 if currency is invalid", async () => {
    const res = await request(app).post("/product").send({
      title: "Invalid Currency Product",
      priceAmount: 50,
      priceCurrency: "EUR"
    });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toMatch(
      /currency must be either usd or inr/i
    );
  });
});
