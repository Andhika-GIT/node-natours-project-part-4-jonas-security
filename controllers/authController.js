const jwt = require('jsonwebtoken');

const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // jwt.sign(payload, secretOrPrivateKey, [options, callback])

  const token = jwt.sign(
    // create payload that contains all data that we wanna store into token
    {
      id: newUser._id,
    },
    // secret code for the token (use the JWT_SECRET from config.env)
    process.env.JWT_SECRET,
    // options : define when the token expired
    {
      expiredIn: process.env.JWT_EXPIRED_IN,
    }
  );

  res.status(201).json({
    status: 'success',
    data: {
      user: newUser,
    },
  });
});
