const orderModel = require("../models/order.model");
const orderSchema = require("../models/order.model");
const axios = require("axios");

async function createOrder(req, res) {
  const user = req.user;
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated"
    });
  }

  const { shippingAddress } = req.body;

  try {
    const cartResponse = await axios.get("http://localhost:3002/cart", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // console.log(
    //   "Fetched Cart---------------------------------------------------"
    // );
    // console.log(cartResponse.data);
    // console.log(cartResponse.data.cart.items);

    const products = await Promise.all(
      cartResponse.data.cart.items.map(async (item) => {
        const res = await axios.get(
          `http://localhost:3001/product/${item.productId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        return res.data.product;
      })
    );
    // console.log(
    //   "Fetched Products---------------------------------------------------"
    // );
    // console.log(products);

    let priceAmount = 0;

    const orderItems = cartResponse.data.cart.items.map((item, index) => {
      const product = products.find((p) => p._id === item.productId);

      // if not in stock then dont allow order creation
      if (product.stock < item.quantity) {
        throw new Error(`Product ${product.title} is out of stock`);
      }

      priceAmount += product.price.amount * item.quantity;
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: {
          amount: priceAmount,
          currency: product.price.currency
        }
      };
    });
    // console.log(
    //   "Total amount of cart and products details---------------------------------------------------"
    // );
    // console.log("Total cart amount: ", priceAmount);
    // console.log(orderItems);

    // creating order after all the checks
    const order = await orderModel.create({
      userId: user.id,
      items: orderItems,
      totalPrice: {
        amount: priceAmount,
        currency: "INR"
      },
      status: "PENDING",
      shippingAddress
    });
    if (!order) {
      return res.status(500).json({
        success: false,
        message: "Error while creating Order"
      });
    }

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      order
    });
  } catch (error) {
    // console.error("Error while creating and Order:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
}

async function getMyOrders(req, res) {
  const user = req.user;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const orders = await orderModel
      .find({ userId: user.id })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No orders found for this user"
      });
    }

    const totalOrders = await orderModel.countDocuments({ userId: user.id });
    const totalPages = Math.ceil(totalOrders / limit);

    return res.status(200).json({
      success: true,
      message: "User's orders fetched successfully",
      orders,
      pagination: {
        totalOrders,
        totalPages,
        currentPage: page,
        pageSize: limit
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal sever error while fetching user's orders",
      error: error.message
    });
  }
}

async function getOrderById(req, res) {
  const user = req.user;
  const orderId = req.params.id;

  try {
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "No Order found"
      });
    }

    if (String(order.userId) !== String(user.id)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You don't have access to this order"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching an order details",
      error: error.message
    });
  }
}

async function cancleOrderById(req, res) {
  const user = req.user;
  const orderId = req.params.id;

  try {
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "No Order found"
      });
    }

    if (String(order.userId) !== String(user.id)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You don't have access to this order"
      });
    }

    if (order.status !== "PENDING") {
      return res.status(403).json({
        success: false,
        message: "Order can only be cancelled if it status is PENDING"
      });
    }

    order.status = "CANCELLED";
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error while cancling order",
      error: error.message
    });
  }
}

async function updateOrderAddress(req, res) {
  const user = req.user;
  const orderId = req.params.id;
  const {street, city, state, zip, country} = req.body;

  try {
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "No Order found"
      });
    }
  
    if (String(order.userId) !== String(user.id)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You don't have access to this order"
      });
    }

    if (order.status !== "PENDING") {
      return res.status(403).json({
        success: false,
        message: "Order address can only be updated if its status is PENDING"
      });
    }

    order.shippingAddress = {
      street,
      city,
      state,
      zip,
      country
    };
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order address updated successfully",
      order
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating order address",
      error: error.message
    });
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancleOrderById,
  updateOrderAddress
};
