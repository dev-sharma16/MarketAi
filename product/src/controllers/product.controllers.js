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

async function getProducts(req, res) {
  const { q, minprice, maxprice, skip=0, limit=20 } = req.query 

  const filter = {};

  if(q){
    filter.$text = { $search: q }
  }
  if(minprice){
    filter['price.amount'] = { ...filter['price.amount'], $gte: Number(minprice) }
  }
  if(maxprice){
    filter['price.amount'] = { ...filter['price.amount'], $lte: Number(maxprice) }
  }

  const products = await productModel.find(filter).skip(Number(skip)).limit(Math.min(Number(limit), 20));

  return res.status(200).json({
    success: true,
    message: "Products fetched successfully",
    products
  })
}

async function getProductById(req, res) {
  const productId = req.params.id;

  const product = await productModel.findById(productId);
  if(!product){
    return res.status(404).json({
      success: false,
      message: "Product not found"
    })
  }

  return res.status(200).json({
    success: true,
    message: "Product fetched successfully",
    product
  })
}
//todo: handle case of not same seller and if try to update then display 'you can t update you are not the owner' 
async function updateProduct(req, res) {
  try {
    const userId = req.user.id;
    const productId = req.params.id;

    const product = await productModel.findOne({
      _id: productId,
      seller: userId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Update allowed fields
    if (req.body.title) product.title = req.body.title;
    if (req.body.description) product.description = req.body.description;
    if (req.body.price) {
      if (req.body.price.amount) product.price.amount = Number(req.body.price.amount);
      if (req.body.price.currency) product.price.currency = req.body.price.currency;
    }

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product
    });
  } catch (error) {
    console.log("Error in updating Product: ", error);
    return res.status(500).json({
      success: false,
      message: "While updating product something went wrong"
    });
  }
}
// todo : and functionality to delete phots from cloud also when the product is deleted
//todo : and then test this delete route
async function deleteProduct(req, res) {
  const productId = req.params.id; 
  
  try {
    const deletedProduct = await productModel.findByIdAndDelete(productId);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Product is deleted successfully"
    })
  } catch (error) {
    console.log("Error while deleting product : ",error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting product"
    })
  }
}

async function fetchSellerProducts(req, res) {
  try {
    const sellerId = req.user?.id;

    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No token provided",
      });
    }

    const products = await productModel.find({ seller: sellerId });

    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Products not found from the seller",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Seller's product fetched successfully",
      data: products,
    });
  } catch (error) {
    console.error("Error fetching seller products:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

module.exports = { 
  addProduct, 
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  fetchSellerProducts
};
