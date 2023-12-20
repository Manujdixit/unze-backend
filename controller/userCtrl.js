const generateToken = require("../config/jwtToken");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongodbId");
const { generateRefreshToken } = require("../config/refreshToken");
const jwt = require("jsonwebtoken");

const createUser = asyncHandler(async (req, res) => {
  const email = req.body.email;
  const findUser = await User.findOne({ email });
  if (findUser) {
    //user already exists
    return res.status(400).json({
      status: "fail",
      message: "User already exists",
    });
  } else {
    //new user registering
    const newUser = await User.create(req.body);
    res.status(201).json({
      status: "success",
      newUser,
    });
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  //check if user exists or not
  const findUser = await User.findOne({ email });
  if (findUser && (await findUser.isPasswordMatched(password))) {
    const refreshToken = await generateRefreshToken(findUser?._id);
    const updateUser = await User.findByIdAndUpdate(
      findUser.id,
      { refreshToken: refreshToken },
      { new: true }
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
      // sameSite: "none",
      // secure: true,
    });

    res.status(200).json({
      _id: findUser._id,
      firstname: findUser.firstname,
      lastname: findUser.lastname,
      email: findUser.email,
      token: generateToken(findUser?._id),
    });
  } else {
    res.status(401).json({
      status: "fail",
      message: "Invalid email or password",
    });
  }
});

//handle refresh token

const handleRefreshToken = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie?.refreshToken) throw new Error("No Refresh Token in Cookies");
  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({ refreshToken });
  if (!user) throw new Error(" No Refresh token present in db or not matched");
  jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
    if (err || user.id !== decoded.id) {
      throw new Error("There is something wrong with refresh token");
    }
    const accessToken = generateToken(user?._id);
    res.json({ accessToken });
  });
});

//logout a user

const logout = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  // console.log("cookies", cookie);
  if (!cookie?.refreshToken) throw new Error("No Refresh Token in Cookies");
  const refreshToken = cookie.refreshToken;
  // console.log("Refresh token:", refreshToken);
  const user = await User.findOne({ refreshToken });
  if (!user) {
    // console.log("User not found for refreshToken:", refreshToken);
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
    });
    return res.sendStatus(204);
  }
  try {
    await User.findOneAndUpdate(
      { refreshToken },
      { $set: { refreshToken: "" } }
    );
  } catch (err) {
    // console.log("Error in logout:", err);
    return res.status(500).json({
      message: "Error in logout",
    });
  }
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
  });
  console.log("Logout successful");
  res.sendStatus(204);
});

//update a user

const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.user;
  validateMongoDbId(id);
  try {
    const updateUser = await User.findByIdAndUpdate(
      id,
      {
        firstname: req?.body?.firstname,
        lastname: req?.body?.lastname,
        email: req?.body?.email,
      },
      { new: true }
    );
    res.json(updateUser);
  } catch (error) {
    throw new Error(error);
  }
});

//get all users
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    throw new Error(error);
  }
});

//get a single user
const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // validateMongoDbId(id);
  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        status: "fail",
        message: "User not found",
      });
      return;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
});

//block a user

const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const user = await User.findById(id);
    if (user.role === "admin") {
      res.status(400);
      throw new Error("Admins can't be blocked");
    } else {
      user.isBlocked = !user.isBlocked;
      const updatedUser = await user.save();
      res.json({ updatedUser, message: "User Unblocked" });
    }
  } catch (error) {
    throw new Error(error);
  }
});

//unblock a user

const unblockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const user = await User.findById(id);
    if (user.role === "admin") {
      res.status(400);
      throw new Error("Admins can't be blocked");
    } else {
      user.isBlocked = !user.isBlocked;
      const updatedUser = await user.save();
      res.json({ updatedUser, message: "User Unblocked" });
    }
  } catch (error) {
    throw new Error(error);
  }
});

//delete a user
const deleteUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      await user.deleteOne();
      res.json({ message: "User removed" });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  } catch (error) {
    throw new Error(error);
  }
});

module.exports = {
  createUser,
  loginUser,
  getAllUsers,
  getUser,
  deleteUser,
  updateUser,
  blockUser,
  unblockUser,
  handleRefreshToken,
  logout,
};
