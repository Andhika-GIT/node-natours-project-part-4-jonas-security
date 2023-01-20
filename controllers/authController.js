const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

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

// method for reseting token and sending success status
const createSendToken = (user, statusCode, res, data) => {
  const token = signToken(user._id);

  res.status(statusCode).json({
    status: 'success',
    token,
    data,
  });
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

  createSendToken(newUser, 200, res, { ...newUser });
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
  createSendToken(user, 200, res);
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
  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `forgot your password? submit a patch request with your new password and password confirm to ${resetUrl}.\nif you didn't forget your password, please ignore this email`;

  try {
    // call the sendEmail to send the reset link
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message: message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token successfully sent to email',
    });
  } catch (err) {
    // if token is unsuccessfully send to user email, then clear the reset token and clear the reset token expired time
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // after make it undefined, save it to database
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('there was an error sending the email, try again later', 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1.) get user based on the request token
  const hashedRequestToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // find user based on the encrypted request reset token
  const user = await User.findOne({
    passwordResetToken: hashedRequestToken,
    // if token time is still greather than date.now, which means the token is valid
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2.) if token has not expired, and there is user, set new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  // get the new password from request body
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  // set the reset token and reset token expired to undefined
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save(); // save the changes to database

  // 3) update changedPasswordAt property for the user (use the pre-save middleware in userModel)

  // 4.) log the user in, send the new JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { passwordCurrent, newPassword, newPasswordConfirm } = req.body;
  // 1.) get user from collection

  const user = await User.findById(req.user.id).select('+password');

  // 2.) check if the current password that user sent is the same as the real user password in database
  if (!(await user.correctPassword(passwordCurrent, user.password))) {
    return next(new AppError('your current password is wrong', 401));
  }
  // 3.) if so, update password
  user.password = newPassword;
  user.passwordConfirm = newPasswordConfirm;

  await user.save();

  // 4.) log user in, re-generate new jwt-token
  createSendToken(user, 200, res);
});
