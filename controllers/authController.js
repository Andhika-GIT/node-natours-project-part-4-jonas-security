const jwt = require('jsonwebtoken');

const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// jwt.sign(payload, secretOrPrivateKey, [options, callback])

const signToken = (id) => {
  return jwt.sign(
    // create payload that contains all data that we wanna store into token
    {
      id: id,
    },
    // secret code for the token (use the JWT_SECRET from config.env)
    process.env.JWT_SECRET,
    // options : define when the token expired
    {
      expiresIn: process.env.JWT_EXPIRED_IN,
    }
  );
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  const token = signToken(newUser._id);

  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: newUser,
    },
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1.) check if email and password exist
  if (!email || !password) {
    return next(new AppError('please provide email and password!', 400));
  }

  // 2.) check if user exist && password is correct
  const user = await User.findOne({ email: email }).select('+password');

  // check the user crendetial
  if (
    // if there's not user
    // or
    !user ||
    // call the instance method that return true/false to check if the request body password from client is correct/not
    !(await user.correctPassword(password, user.password))
  ) {
    return next(new AppError('Incorrect email or password', 401));
  }

  console.log(user);

  // 3.) if everthing ok, send token to client
  const token = signToken(user._id);
  res.status(200).json({
    status: 'success',
    token,
  });
});
