const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      required: true
    },
    items: [
      {
        productId: {
          type: mongoose.Types.ObjectId,
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 0
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

const cartModel = mongoose.model("Cart", cartSchema);

module.exports = cartModel;