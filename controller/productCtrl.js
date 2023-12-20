const Product = require("../models/productModel");
const asyncHandler = require("express-async-handler");

const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, quantity, category } = req.body;
  const product = await Product.create({
    name,
    description,
    price,
    quantity,
    category,
  });
  res.status(201).json(product);
});

module.exports = { createProduct };
