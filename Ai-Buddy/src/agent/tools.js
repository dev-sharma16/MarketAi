const { tool } = require("@langchain/core/tools")
const { z } = require("zod")
const axios = require("axios")

const searchProduct = tool(async ({ query, token }) => {
  const response = await axios.get(`http://localhost:3001/product?q=${query}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  return JSON.stringify(response.data);

}, {
  name: "searchProduct",
  description: "Search for products based on the query",
  schema: z.object({ // inputSchema can also be used
    query: z.string().describe("The search query for products")
  })
})

const addProductToCart = tool(async ({ productId, qty=1, token }) => {
  const response = await axios.post(`http://localhost:3002/cart/items`, {
    productId,
    quantity: qty
  }, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  return `Added product with id ${productId} (qty: ${qty}) to cart`
}, {
  name: "addProductToCart",
  description: "Add product to the shopping cart",
  schema: z.object({ // inputSchema can also be used
    productId: z.string().describe("The id of the product to add to the cart"),
    qty: z.number().describe("The quantity of the product to add to the cart").default(1)
  })
})

module.exports = { searchProduct, addProductToCart };