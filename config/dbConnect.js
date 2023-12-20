const { default: mongoose } = require("mongoose");

const dbConnect = () => {
  try {
    const conn = mongoose.connect(process.env.MONGODB_URI);
    console.log("db connected successfully");
  } catch (error) {
    console.log("DATABASE ERROR");
  }
};

module.exports = dbConnect;
