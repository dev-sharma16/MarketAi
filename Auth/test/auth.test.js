const request = require("supertest");
const app = require("../src/app");
const db = require("./setups/mongoMemory");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

beforeAll(async () => await db.connect());
afterEach(async () => await db.clear());
afterAll(async () => await db.close());

// Test for register api
describe("POST /auth/user/register", () => {
  // registering the user
  it("should register a new user and return cookie + token", async () => {
    const res = await request(app)
      .post("/auth/user/register")
      .send({
        username: "john_doe",
        email: "john@example.com",
        password: "secret123",
        fullName: {
          firstName: "John",
          lastName: "Doe"
        }
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toHaveProperty("_id");
    expect(res.body.user).not.toHaveProperty("password");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  //checking for duplicate email
  it("should not allow duplicate email registration", async () => {
    // first registring
    await request(app)
      .post("/auth/user/register")
      .send({
        username: "john_doe",
        email: "john@example.com",
        password: "secret123",
        fullName: {
          firstName: "John",
          lastName: "Doe"
        }
      });
    // then trying to registering with same email
    const res = await request(app)
      .post("/auth/user/register")
      .send({
        username: "jane_doe",
        email: "john@example.com", // duplicate
        password: "secret456",
        fullName: {
          firstName: "John",
          lastName: "Doe"
        }
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already registered/i);
  });
  // this is modifed according to the validaters
  it("should return 400 if required fields are missing", async () => {
    const res = await request(app).post("/auth/user/register").send({
      email: "no_username@example.com",
      password: "123456"
    });

    expect(res.body.errors).toBeDefined();
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors[0].msg).toMatch(/username/i);
  });
});

// Test for login api
describe("POST /auth/user/login", () => {
  it("should login with email", async () => {
    // registring first
    await request(app)
      .post("/auth/user/register")
      .send({
        username: "john_doe",
        email: "john@example.com",
        password: "secret123",
        fullName: { firstName: "John", lastName: "Doe" }
      });
    // then try to login with email
    const res = await request(app).post("/auth/user/login").send({
      email: "john@example.com",
      password: "secret123"
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toHaveProperty("_id");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("should login with username", async () => {
    // registring first
    await request(app)
      .post("/auth/user/register")
      .send({
        username: "jane_doe",
        email: "jane@example.com",
        password: "secret123",
        fullName: { firstName: "Jane", lastName: "Doe" }
      });
    // then try to login with username
    const res = await request(app).post("/auth/user/login").send({
      username: "jane_doe",
      password: "secret123"
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toHaveProperty("_id");
  });

  it("should return 400 if neither email nor username is provided", async () => {
    // trying with missing fields
    const res = await request(app).post("/auth/user/login").send({
      password: "secret123"
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(
      /either email or username, and password are required/i
    );
  });

  it("should return 400 for wrong password", async () => {
    // trying with wrong password
    await request(app)
      .post("/auth/user/register")
      .send({
        username: "wrong_pw",
        email: "wrongpw@example.com",
        password: "secret123",
        fullName: { firstName: "Wrong", lastName: "Pw" }
      });

    const res = await request(app).post("/auth/user/login").send({
      email: "wrongpw@example.com",
      password: "badpassword"
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it("should return 400 for unregistered email/username", async () => {
    // checking if user is not registered
    const res = await request(app).post("/auth/user/login").send({
      email: "nobody@example.com",
      password: "secret123"
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid email, username or password/i);
  });
});

// Test for geting current user details
describe("GET /auth/user", () => {
  let cookie;
  let testUser;

  beforeAll(async () => {
    // Register
    await request(app)
      .post("/auth/user/register")
      .send({
        username: "john_doe",
        email: "current@example.com",
        password: "secret123",
        fullName: { firstName: "John", lastName: "Doe" }
      });

    // Login
    const loginRes = await request(app).post("/auth/user/login").send({
      email: "current@example.com",
      password: "secret123"
    });

    cookie = loginRes.headers["set-cookie"]; // store cookie from login
    testUser = loginRes.body.user;
  });

  it("should return current logged-in user when valid token is provided", async () => {
    const res = await request(app).get("/auth/user").set("Cookie", cookie); // send cookie

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user._id).toBe(testUser._id);
    expect(res.body.user.email).toBe("current@example.com");
  });

  it("should return 400 if no token is provided", async () => {
    const res = await request(app).get("/auth/user");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not logined/i);
  });

  it("should return 400 if token is invalid", async () => {
    const fakeToken = jwt.sign(
      { id: new mongoose.Types.ObjectId() },
      "wrongsecret"
    );

    const res = await request(app)
      .get("/auth/user")
      .set("Cookie", `token=${fakeToken}`); // mimic invalid cookie

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// Test for logout api
// Mock redis client
jest.mock("../src/db/redis.js", () => {
  return {
    set: jest.fn().mockResolvedValue("OK") // fake redis.set
  };
});

const redis = require("../src/db/redis");

describe("POST /auth/user/logout", () => {
  let cookie;
  let testUser;

  beforeAll(async () => {
    // Register
    await request(app)
      .post("/auth/user/register")
      .send({
        username: "logout_user",
        email: "logout@example.com",
        password: "secret123",
        fullName: { firstName: "Log", lastName: "Out" }
      });

    // Login and grab cookie
    const loginRes = await request(app).post("/auth/user/login").send({
      email: "logout@example.com",
      password: "secret123"
    });

    cookie = loginRes.headers["set-cookie"];
    testUser = loginRes.body.user;
  });

  it("should logout a logged-in user, blacklist token, and clear cookie", async () => {
    const res = await request(app)
      .post("/auth/user/logout")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/User logged out successfully/i);
    expect(res.headers["set-cookie"]).toBeDefined();

    // cookie should be cleared
    const clearedCookie = res.headers["set-cookie"][0];
    expect(clearedCookie).toMatch(/token=;/);

    // redis.set should be called
    expect(redis.set).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining("blacklist:"),
      "true",
      "EX",
      24 * 60 * 60
    );
  });

  it("should return 400 if no cookie/token is provided", async () => {
    const res = await request(app).post("/auth/user/logout");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not logined/i);
  });
});

// Test for adding address api
describe("POST /auth/user/addresses", () => {
  let cookie;
  let testUser;

  beforeAll(async () => {
    // Register user
    await request(app)
      .post("/auth/user/register")
      .send({
        username: "address_user",
        email: "address@example.com",
        password: "secret123",
        fullName: { firstName: "Add", lastName: "Ress" }
      });

    // Login
    const loginRes = await request(app).post("/auth/user/login").send({
      email: "address@example.com",
      password: "secret123"
    });

    cookie = loginRes.headers["set-cookie"];
    testUser = loginRes.body.user;
  });

  it("should add a new address successfully", async () => {
    const res = await request(app)
      .post("/auth/user/addresses")
      .set("Cookie", cookie)
      .send({
        street: "123 Main St",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "USA"
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/address added successfully/i);
    expect(Array.isArray(res.body.addresses)).toBe(true);
    expect(res.body.addresses[0]).toMatchObject({
      street: "123 Main St",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "USA"
    });
  });

  it("should return 400 if required fields are missing", async () => {
    const res = await request(app)
      .post("/auth/user/addresses")
      .set("Cookie", cookie)
      .send({
        city: "New York",
        state: "NY",
        country: "USA"
      }); // missing street and zip

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors[0].msg).toMatch(/street/i);
  });

  it("should return 400 if no token is provided", async () => {
    const res = await request(app).post("/auth/user/addresses").send({
      street: "123 Main St",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "USA"
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not logined/i);
  });

  it("should return 404 if user does not exist", async () => {
    // make a fake cookie with a non-existing user id
    const fakeToken = jwt.sign(
      { id: new mongoose.Types.ObjectId() },
      process.env.JWT_SECRET || "testsecret"
    );

    const res = await request(app)
      .post("/auth/user/addresses")
      .set("Cookie", `token=${fakeToken}`)
      .send({
        street: "404 Road",
        city: "Ghost Town",
        state: "NA",
        zip: "00000",
        country: "Nowhere"
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/user not found/i);
  });
});

// Test for fetching all addresses of a user
describe("GET /auth/user/addresses", () => {
  let cookie;

  beforeEach(async () => {
    // Register a user
    await request(app).post("/auth/user/register").send({
      username: "fetch_user",
      email: "fetch@example.com",
      password: "secret123",
      fullName: { firstName: "Fetch", lastName: "User" }
    });

    // Login and grab cookie
    const loginRes = await request(app).post("/auth/user/login").send({
      email: "fetch@example.com",
      password: "secret123",
    });

    cookie = loginRes.headers["set-cookie"];
  });

  it("should return 400 if no addresses are found", async () => {
    const res = await request(app)
      .get("/auth/user/addresses")
      .set("Cookie", cookie);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/no address found/i);
  });

  it("should fetch all addresses of the logged-in user", async () => {
    // Add an address first
    await request(app)
      .post("/auth/user/addresses")
      .set("Cookie", cookie)
      .send({
        street: "123 Main St",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "USA"
      });

    const res = await request(app)
      .get("/auth/user/addresses")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.addresses).toBeDefined();
    expect(Array.isArray(res.body.addresses)).toBe(true);
    expect(res.body.addresses[0]).toMatchObject({
      street: "123 Main St",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "USA"
    });
  });

  it("should return 400 if no token is provided", async () => {
    const res = await request(app).get("/auth/user/addresses");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not logined/i);
  });
});

// Test for deleting a particular address of a user
describe("DELETE /auth/user/addresses/:id", () => {
  let cookie;
  let addressId;

  beforeEach(async () => {
    // Register user
    await request(app).post("/auth/user/register").send({
      username: "delete_user",
      email: "delete@example.com",
      password: "secret123",
      fullName: { firstName: "Delete", lastName: "User" }
    });

    // Login
    const loginRes = await request(app).post("/auth/user/login").send({
      email: "delete@example.com",
      password: "secret123",
    });
    cookie = loginRes.headers["set-cookie"];

    // Add address
    const addRes = await request(app)
      .post("/auth/user/addresses")
      .set("Cookie", cookie)
      .send({
        street: "456 Elm St",
        city: "Los Angeles",
        state: "CA",
        zip: "90001",
        country: "USA"
      });

    // Grab the new addressId from response
    addressId = addRes.body.addresses[0]._id;
  });

  it("should delete the address successfully", async () => {
    const res = await request(app)
      .delete(`/auth/user/addresses/${addressId}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/deleted successfully/i);
    expect(Array.isArray(res.body.addresses)).toBe(true);
    expect(res.body.addresses.length).toBe(0);
  });

  it("should return 401 if user does not exist", async () => {
    // Drop all users (simulate deleted user)
    await mongoose.connection.db.dropCollection("users");

    const res = await request(app)
      .delete(`/auth/user/addresses/${addressId}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/user not found/i);
  });

  it("should return 400 if no token is provided", async () => {
    const res = await request(app).delete(`/auth/user/addresses/${addressId}`);

    expect(res.status).toBe(400); // your auth middleware likely sends 400 "not logined"
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not logined/i);
  });

  it("should return 400 if address id is invalid", async () => {
    const res = await request(app)
      .delete(`/auth/user/addresses/12345`)
      .set("Cookie", cookie);

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].msg).toMatch(/invalid address id/i);
  });
});