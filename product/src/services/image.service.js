const ImageKit = require("imagekit");
const { v4 : uuidv4 } = require("uuid");

const imageKit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

async function uploadOnImagekit(file) {
  if (!file || !file.buffer) {
    throw new Error("File buffer is required for upload");
  }

  try {
    const uploaded = await imageKit.upload({
      file: file.buffer,
      fileName: uuidv4(),
      folder: "MarketAi/products"
    });

    return {
      url: uploaded.url,
      thumbnail: uploaded.thumbnailUrl,
      id: uploaded.fileId
    };
  } catch (error) {
    console.error("ImageKit upload failed:", error);
    throw new Error("Image upload failed");
  }
}

module.exports = uploadOnImagekit;
