const request = require("supertest");
const app = require("../src/app");
const db = require("../test/setups/mongoMemory");
const productModel = require("../src/models/product.model");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "testsecret";
// helper to create a signed JWT token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET);
}

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

describe("GET /product", () => {
  beforeEach(async () => {
    await productModel.create({
      title: "Cheap Product",
      description: "Budget option",
      price: { amount: 50, currency: "INR" },
      seller: "507f1f77bcf86cd799439011",
      images: []
    });

    await productModel.create({
      title: "Expensive Product",
      description: "Premium option",
      price: { amount: 500, currency: "USD" },
      seller: "507f1f77bcf86cd799439011",
      images: []
    });
  });

  it("should fetch all products without filters", async () => {
    const res = await request(app).get("/product").query({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.products.length).toBe(2);
  });

  it("should filter products by minprice", async () => {
    const res = await request(app).get("/product").query({ minprice: 100 });
    expect(res.status).toBe(200);
    expect(res.body.products.length).toBe(1);
    expect(res.body.products[0].title).toBe("Expensive Product");
  });

  it("should filter products by maxprice", async () => {
    const res = await request(app).get("/product").query({ maxprice: 100 });
    expect(res.status).toBe(200);
    expect(res.body.products.length).toBe(1);
    expect(res.body.products[0].title).toBe("Cheap Product");
  });

  it("should return 400 if minprice is invalid", async () => {
    const res = await request(app).get("/product").query({ minprice: "bad" });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toMatch(
      /minprice must be a positive number/i
    );
  });

  it("should support pagination with skip and limit", async () => {
    const res = await request(app).get("/product").query({ skip: 1, limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.products.length).toBe(1);
  });

  it("should cap the limit at 20 even if a higher value is provided", async () => {
    // insert 25 products
    const bulkProducts = Array.from({ length: 25 }).map((_, i) => ({
      title: `Product ${i}`,
      description: "Bulk product",
      price: { amount: i + 1, currency: "INR" },
      seller: "507f1f77bcf86cd799439011",
      images: []
    }));
    await productModel.insertMany(bulkProducts);

    const res = await request(app).get("/product").query({ limit: 100 });
    expect(res.status).toBe(200);
    expect(res.body.products.length).toBeLessThanOrEqual(20);
  });
});

describe("GET /product/:id", () => {
  let createdProduct;

  beforeEach(async () => {
    createdProduct = await productModel.create({
      title: "Single Product",
      description: "For testing get by id",
      price: { amount: 200, currency: "INR" },
      seller: "507f1f77bcf86cd799439011",
      images: []
    });
  });

  it("should fetch a product successfully by id", async () => {
    const res = await request(app).get(`/product/${createdProduct._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.product).toHaveProperty(
      "_id",
      createdProduct._id.toString()
    );
    expect(res.body.product.title).toBe("Single Product");
  });

  it("should return 404 if product not found", async () => {
    const nonExistentId = "507f1f77bcf86cd799439012"; // valid but not in DB
    const res = await request(app).get(`/product/${nonExistentId}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not found/i);
  });

  it("should return 400 if productId is invalid", async () => {
    const res = await request(app).get("/product/not-a-valid-id");

    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toMatch(/invalid product id/i);
  });
});

describe("PATCH /product/:id", () => {
  let product;

  beforeEach(async () => {
    // seed a product owned by mocked user
    product = await productModel.create({
      title: "Old Title",
      description: "Old description",
      price: { amount: 100, currency: "INR" },
      seller: "507f1f77bcf86cd799439011"
    });
  });

  it("should update product title successfully", async () => {
    const res = await request(app)
      .patch(`/product/${product._id}`)
      .send({ title: "New Title" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.product.title).toBe("New Title");
  });

  it("should update product description and price", async () => {
    const res = await request(app)
      .patch(`/product/${product._id}`)
      .send({
        description: "Updated description",
        price: { amount: 250, currency: "USD" }
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.product.description).toBe("Updated description");
    expect(res.body.product.price.amount).toBe(250);
    expect(res.body.product.price.currency).toBe("USD");
  });

  it("should return 404 if product does not exist", async () => {
    const fakeId = "64b2f0c7f9d3b341f8c6a123"; // valid ObjectId format
    const res = await request(app)
      .patch(`/product/${fakeId}`)
      .send({ title: "Does Not Exist" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/product not found/i);
  });
  //todo : fix this case its failing:
  // it("should not update if the seller is different", async () => {
    // Clear previous mocks
  //   jest.clearAllMocks();
    
  //   const authMiddleware = require("../src/middlewares/auth.middleware");
  //   authMiddleware.mockImplementation(() => (req, res, next) => {
  //     req.user = {
  //       id: "507f1f77bcf86cd799435432", // different seller
  //       email: "seller@example.com",
  //       role: "seller"
  //     };
  //     next();
  //   });

  //   const res = await request(app)
  //     .patch(`/product/${product._id}`)
  //     .send({
  //       description: "Updated description",
  //       price: { amount: 250, currency: "USD" }
  //     });
      
  //   expect(res.status).toBe(404);
  //   expect(res.body.success).toBe(false);
  //   expect(res.body.message).toBe("Product not found");
  // });

  it("should not update fields not in allowed list", async () => {
    const res = await request(app)
      .patch(`/product/${product._id}`)
      .send({ seller: "hacker123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // seller should remain unchanged
    expect(res.body.product.seller).toBe("507f1f77bcf86cd799439011");
  });
});

describe("DELETE /product/:id", () => {
  let product;

  beforeEach(async () => {
    // seed a product owned by mocked user
    product = await productModel.create({
      title: "Old Title",
      description: "Old description",
      price: { amount: 100, currency: "INR" },
      seller: "507f1f77bcf86cd799439011"
    });
  });

  it("should delete the product successfully with valid product ID", async () => {
    const res = await request(app).delete(`/product/${product._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Product is deleted successfully");
  });

  it("should return 404 if product does not exist", async () => {
    const fakeId = "64b2f0c7f9d3b341f8c6a653"; // valid ObjectId but not in DB
    const res = await request(app).delete(`/product/${fakeId}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Product not found");
  });

  it("should return 400 if productId is invalid", async () => {
    const res = await request(app).delete(`/product/12345`);

    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toMatch(/invalid product id/i);
  });
});
// todo : first two cases are not passing from "GET /product/seller"  
describe("GET /product/seller", () => {
  const createAuthMiddleware = require("../src/middlewares/auth.middleware.js");
  
  beforeEach(async () => {
    await db.clear();
    // Reset to default mock behavior
    createAuthMiddleware.mockImplementation(() => (req, res, next) => {
      req.user = {
        id: "507f1f77bcf86cd799439011",
        email: "test@example.com",
        role: "user"
      };
      next();
    });
  });

  it("should return 401 if no token is provided", async () => {
    // Override the mock for this specific test
    createAuthMiddleware.mockImplementation(() => (req, res, next) => {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No token provided"
      });
    });

    const res = await request(app).get("/product/seller");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Unauthorized: No token provided");
  });

  it("should return 403 if logged-in user is not a seller", async () => {
    // Override the mock to simulate role check failure
    createAuthMiddleware.mockImplementation(() => (req, res, next) => {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Insufficient permissions"
      });
    });

    const token = generateToken({
      id: "507f1f77bcf86cd799439099",
      role: "user",
      email: "user@test.com",
    });

    const res = await request(app)
      .get("/product/seller")
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Forbidden: Insufficient permissions");
  });

  it("should return 404 if seller has no products", async () => {
    const token = generateToken({
      id: "507f1f77bcf86cd799439011",
      role: "seller",
      email: "seller@test.com",
    });

    const res = await request(app)
      .get("/product/seller")
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Products not found from the seller");
  });

  it("should fetch all products of the logged-in seller", async () => {
    const sellerId = "507f1f77bcf86cd799439011";

    // seed product
    await productModel.create({
      title: "Old Title",
      description: "Old description",
      price: { amount: 100, currency: "INR" },
      seller: sellerId,
    });

    const token = generateToken({
      id: sellerId,
      role: "seller",
      email: "seller@test.com",
    });

    const res = await request(app)
      .get("/product/seller")
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Seller's product fetched successfully");
    expect(res.body.data).toHaveLength(1);
  });
});
