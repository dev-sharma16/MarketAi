const cartModel = require("../models/cart.model");

async function addItemTocart(req, res) {
  const { productId, quantity } = req.body;
  if (!productId || !quantity) {
    return res.status(400).json({
      success: false,
      message: "Product ID and quantity are required"
    });
  }

  const userId = req.user.id;

  let cart = await cartModel.findOne({ user: userId });
  if (!cart) {
    cart = new cartModel({ user: userId, items: [] });
  }

  const existingItem = cart.items.find((item) => item.productId === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({ productId, quantity });
  }

  await cart.save();

  return res.status(201).json({
    success: true,
    message: "Item added to cart successfully",
    cart
  });
}

async function getCurrentCart(req, res) {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    const cart = await cartModel.findOne({ user: userId });
    if (!cart) {
      const newCart = new cartModel({ user: userId, items: [] });
      return res.status(200).json({
        success: true,
        message: "Cart fetched successfully",
        cart: newCart,
        totals: {
          items: newCart.items.length,
          // amount: newCart.items.reduce(
          //   (sum, item) => sum + item.quantity * (item.price?.amount || 0),
          //   0
          // )
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cart fetched successfully",
      cart: cart,
      totals: {
          items: cart.items.length,
          // amount: cart.items.reduce(
          //   (sum, item) => sum + item.quantity * (item.price?.amount || 0),
          //   0
          // )
        }
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching cart",
      error: error.message
    });
  }
}

async function changeQuantity(req, res) {
  const userId = req.user.id;
  const { quantity } = req.body;
  const { productId } = req.params;
  // console.log(`userId: ${userId}, productId: ${productId}, quantity: ${quantity}`);

  if (!productId || !quantity) {
    return res.status(400).json({
      success: false,
      message: "Product ID and quantity are required"
    });
  }

  const cart = await cartModel.findOne({ user: userId });
  if (!cart) {
    return res.status(404).json({
      success: false,
      message: "No cart found"
    });
  }

  const item = cart.items.find(
    (item) => item.productId.toString() === productId
  );
  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Item not found in cart"
    });
  }

  if (quantity <= 0) {
    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId
    );
  } else {
    item.quantity = quantity;
  }
  await cart.save();

  return res.status(200).json({
    success: true,
    message: "Item quantity updated successfully",
    cart
  });
}

async function removeItemFromCart(req, res) {
  const userId = req.user.id;
  const { productId } = req.params;

  if (!productId) {
    return res.status(400).json({
      success: false,
      message: "Product ID is required"
    });
  }

  const cart = await cartModel.findOne({
    user: userId,
    "items.productId": productId
  });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: "No cart found or item not found in cart"
    });
  }

  cart.items = cart.items.filter(
    (item) => item.productId.toString() !== productId
  );
  await cart.save();

  return res.status(200).json({
    success: true,
    message: "Item removed from cart successfully",
    cart
  });
}

async function clearCart(req, res) {
  const userId = req.user.id;

  const cart = await cartModel.findOne({ user: userId });
  if (!cart) {
    return res.status(404).json({
      success: false,
      message: "No cart found"
    });
  }

  cart.items = [];
  await cart.save();

  return res.status(200).json({
    success: true,
    message: "Cart cleared successfully",
    cart
  });
}

module.exports = {
  addItemTocart,
  getCurrentCart,
  changeQuantity,
  removeItemFromCart,
  clearCart
};
