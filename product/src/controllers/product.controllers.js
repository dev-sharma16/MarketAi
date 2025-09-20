const productModel = require("../models/product.model");
const uploadOnImagekit = require("../services/image.service");

async function addProduct(req, res) {
  try {
    const { title, description, priceAmount, priceCurrency = "INR" } = req.body;
    if (!title || !priceAmount) {
      return res.status(400).json({
        message: "Title and Price are required"
      });
    }

    const seller = req.user.id;

    const price = {
      amount: Number(priceAmount),
      currency: priceCurrency
    };

    const images = [];
    // const files = Array.isArray(req.files) ? req.files : req.files?.images || [];
    // for (const file of files) {
    //   const uploaded = await uploadOnImagekit(file);
    //   images.push(uploaded);
    // }
    const uploadPromises = req.files.map((file) => uploadOnImagekit(file));
    const uploadedImages = await Promise.all(uploadPromises);
    uploadedImages.forEach((uploaded) => {
      images.push({
        url: uploaded.url,
        thumbnail: uploaded.thumbnail,
        id: uploaded.id
      });
    });

    const createdProduct = await productModel.create({
      title,
      description,
      price,
      seller,
      images
    });
    if (!createdProduct) {
      return res.status(500).json({
        success: false,
        message: "Error in creating Product"
      });
    }

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: createdProduct
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong while adding product"
    });
  }
}

module.exports = { addProduct };
