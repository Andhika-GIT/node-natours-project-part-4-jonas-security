const jwt = require('jsonwebtoken');
const { promisify } = require('util');
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
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
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

exports.protect = catchAsync(async (req, res, next) => {
  // 1.) get the token after logged in, and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Authorization : Bearer asdfasdfasasdfasdf -> take the second value after Bearer using split
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    // send error if token doesn't exist
    return next(new AppError('Please log in to get access', 401));
  }

  // 2.) verification token

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3.) check if user still exists

  // the decoded result from jwt.verify method contains the user unique id from database
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    // if currentuser didn't exist based on the decoded user id
    return next(
      new AppError('The user belonging to this token does no longer exist.')
    );
  }

  // 4.) check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    // if the created token date is less than password changed date, means the user has changed the password, after the token is created
    return next(
      new AppError('user recently changed password! please log in again', 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  next();
});

// create a wrapper function that returns middleware function
// because middleware function can't receive argument
exports.restrictTo = (...roles) => {
  // return our real middleware function

  // roles['admin', 'lead-guide'], role = 'user'
  return (req, res, next) => {
    // if the roles didn't include ['admin', 'lead-guide'], then  don't give the user permission to delete tour
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1.) get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('there is no user with that email address', 404));
  }

  // 2.) generate the random reset token
  const resetToken = user.createPasswordResetToken();
  // save the reset token into db
  // disable the validation for this handler
  await user.save({ validateBeforeSave: false });

  // 3.) send it to user's email
});

exports.resetPassword = (req, res, next) => {};
