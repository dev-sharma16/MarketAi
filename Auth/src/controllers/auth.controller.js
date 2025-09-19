const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const redis = require("../db/redis");

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  maxAge: 24 * 60 * 60 * 1000
};

async function registerUser(req, res) {
  const {
    username,
    email,
    password,
    fullName: { firstName, lastName },
    role
  } = req.body;
  if (!username || !email || !password || !firstName || !lastName) {
    return res.status(400).json({
      success: false,
      message:
        "username, email, password, fullName these all feilds are required"
    });
  }

  const isUserExisted = await userModel.findOne({
    $or: [{ username }, { email }]
  });
  if (isUserExisted) {
    return res.status(400).json({
      success: false,
      message: "User with this email is already registered"
    });
  }

  const hashedPass = await bcrypt.hash(password, 10);
  const user = await userModel.create({
    username,
    email,
    password: hashedPass,
    fullName: { firstName, lastName },
    role: role || "user"
  });

  const userWithoutPass = await userModel
    .findById(user._id)
    .select("-password");

  const token = jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  res.cookie("token", token, cookieOptions);

  return res.status(201).json({
    success: true,
    message: "User is registered successfully",
    user: userWithoutPass
  });
}

async function loginUser(req, res) {
  const { email, username, password } = req.body;

  if ((!email && !username) || !password) {
    return res.status(400).json({
      success: false,
      message: "Either email or username, and password are required"
    });
  }

  const user = await userModel
    .findOne({ $or: [{ email }, { username }] })
    .select("+password");
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid email, username or password"
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: "Invalid email or password"
    });
  }

  const token = jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  const userWithoutPass = await userModel
    .findById(user._id)
    .select("-password");

  res.cookie("token", token, cookieOptions);

  return res.status(200).json({
    success: true,
    message: "Login successful",
    user: userWithoutPass
  });
}

async function getCurrentUser(req, res) {
  const user = req.user;
  // if(!userId){
  //   return res.status(400).json({
  //     success: false,
  //     message: "User not logined"
  //   })
  // }

  // const user = await userModel.findById(userId);
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "User not found"
    });
  }

  return res.status(200).json({
    success: true,
    message: "User fetched successfully",
    user
  });
}

async function logoutUser(req, res) {
  if (!req.user) {
    return res.status(400).json({
      success: false,
      message: "User not logined"
    });
  }

  const token = req.cookies.token;

  await redis.set(`blacklist:${token}`, "true", "EX", 24 * 60 * 60); // expire in 1 Day

  res.clearCookie("token", cookieOptions);

  return res.status(200).json({
    success: true,
    message: "User logged out successfully"
  });
}

async function addAddress(req, res) {
  try {
    const userId = req.user._id;
    const { street, city, state, zip, country } = req.body;

    if (!street || !city || !state || !zip || !country) {
      return res.status(400).json({
        success: false,
        message: "All address fields are required"
      });
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      {
        $push: {
          addresses: { street, city, state, zip, country }
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Address added successfully",
      addresses: updatedUser.addresses
    });
  } catch (error) {
    console.error("Error adding address:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
}

async function getAddresses(req, res) {
  const userId = req.user._id;

  const user = await userModel.findById(userId);

  const userAddresses = user.addresses;
  if (userAddresses.length <= 0) {
    return res.status(400).json({
      success: false,
      message: "No address found"
    });
  }

  return res.status(200).json({
    success: true,
    message: "User's Addresses fetched successfully",
    addresses: userAddresses
  });
}

async function deleteUserAddress(req, res) {
  const userId = req.user._id;

  const addressId = req.params.id;

  const user = await userModel.findByIdAndUpdate(
    userId,
    { $pull: { addresses: { _id: addressId } } },
    { new: true }
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  return res.status(200).json({
    success: true,
    message: "Address deleted successfully",
    addresses: user.addresses 
  });
}

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  addAddress,
  getAddresses,
  deleteUserAddress
};
