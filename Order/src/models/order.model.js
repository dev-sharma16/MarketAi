const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  street: String,
  city: String,
  state: String,
  zip: String,
  country: String
});

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          default: 1,
          min: 1
        },
        price: {
          amount: {
            type: Number,
            required: true
          },
          currency: {
            type: String,
            required: true,
            enum: ["USD", "INR"],
            default: "INR"
          }
        }
      }
    ],
    totalPrice: {
      amount: {
        type: Number,
        required: true
      },
      currency: {
        type: String,
        required: true,
        enum: ["USD", "INR"],
        default: "INR"
      }
    },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"],
      default: "PENDING"
    },
    shippingAddress: {
      type: addressSchema,
      required: true
    }
  },
  { timestamps: true }
);

const orderModel = mongoose.model("Order", orderSchema);

module.exports = orderModel;
