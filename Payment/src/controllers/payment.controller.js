const paymentModel = require("../models/payment.model");
const axios = require("axios");
const razorpay = require("../service/razorpay.service");
const { publishToQueue } = require("../broker/broker")

async function createPayment(req, res) {
  const { orderId } = req.params;
  const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];

  try {
    const orderResponse = await axios.get(
      `http://localhost:3003/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    // console.log("Order Data: ",order.data.order.totalPrice);
    const price = orderResponse.data.order.totalPrice;

    const order = await razorpay.orders.create(price);

    const payment = await paymentModel.create({
      order: orderId,
      razorpayOrderId: order.id,
      user: req.user.id,
      price: {
        amount: order.amount,
        currency: order.currency
      }
    });
    if (!payment) {
      return res.status(500).json({
        success: false,
        message: "Error in initaiting an Payment"
      });
    }

    return res.status(201).json({
      success: true,
      message: "Payemnt initiated successfully",
      payment
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server while creating paymenet",
      error: error.message
    });
  }
}
// todo: testing of verify payment is not done and also tesing of the queu adn mail system
async function verifyPayment(req, res) {
  const { razorpayOrderId, razorpayPaymentId, signature } = req.body;
  const secret = process.env.RAZORPAY_TEST_KEY_SECRET;

  try {
    const {
      validatePaymentVerification
    } = require("../../node_modules/razorpay/dist/utils/razorpay-utils.js");

    const result = validatePaymentVerification(
      { order_id: razorpayOrderId, payment_id: razorpayPaymentId },
      signature,
      secret
    );
    if (result) {
      const payment = await paymentModel.findOne({ razorpayOrderId, status: 'PENDING' });

      payment.paymentId = razorpayPaymentId;
      payment.signature = signature;
      payment.status = "completed";

      await payment.save();

      await publishToQueue("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", { 
        email: req.user.email,
        username: req.use.username,
        orderId : payment.order,
        paymentId: payment.paymentId,
        amount: payment.price.amount / 100,
        currency: payment.price.currency
      })

      res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        payment
      });
    } else {
      res.status(400).send("Invalid signature");
    }
  } catch (error) {
    console.log(error);

    await publishToQueue("PAYMENT_NOTIFICATION.PAYMENT_FAILED", { 
      email: req.user.email, 
      paymentId: razorpayPaymentId, 
      orderId: razorpayOrderId 
    })

    res.status(500).send("Error verifying payment");
  }
}

module.exports = { createPayment, verifyPayment };
