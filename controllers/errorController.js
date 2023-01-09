const AppError = require('../utils/appError');

// function for handling if the error.name value is "castError"
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path} : ${err.value}.`;

  // insert it to AppError reusable class, so we can include it as operational error
  return new AppError(message, 400);
};

// function for handling duplicate tour name when creating new tour
const handleDuplicateField = (err) => {
  // take the key name from err.keyValue property
  const key = Object.keys(err.keyValue)[0];

  // take the value from err.keyValue property
  const value = Object.values(err.keyValue)[0];

  // define the message
  const message = `Duplicate field ${key}: ${value} is already used.`;

  // insert it to AppError reusable class, so we can include it as operational error
  return new AppError(message, 400);
};

// function for handling validation error when creating or updating tour
const handleValidationError = (err) => {
  const errors = Object.values(err.errors)
    // loop through all errors object keys
    // in each error property (name, duration, price, etc) return only the message
    .map((el) => el.message);

  const message = `Invalid input data ${errors}`;

  return new AppError(message, 400);
};

const sendError = (err, res, mode) => {
  //   if the mode is development send detail error
  if (mode === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  //   if the mode is not development, send more user friendly message
  else {
    // check if the error is operational or not
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } else {
      // if the error is not operational, then send generic 500 error to user in production mode

      console.error(`ERROR : ${err}`); // see the error in console.log for developer

      res.status(500).json({
        status: 'error',
        message: 'something went very wrong',
      });
    }
  }
};

module.exports = (err, req, res, next) => {
  // define default error status code
  err.statusCode = err.statusCode || 500;
  // define default error status
  err.status = err.status || 'error';

  // create different error message for development and production mode
  if (process.env.NODE_ENV === 'development') {
    sendError(err, res, 'development');
  } else if (process.env.NODE_ENV === 'production') {
    // variabel that holds error
    let error = Object.assign(err);

    // if the err.name property value is "CastError"
    if (error.name === 'CastError') {
      // run the handleCastErrorDB and insert the result into error variabel
      error = handleCastErrorDB(error);
    }

    // if the err.code property value is "11.000"
    if (error.code === 11000) {
      // run the handleDuplicateField and insert the result into error varibel
      error = handleDuplicateField(error);
    }

    // if the err.name property value is "validationError"
    if (error.name === 'ValidationError') {
      // run the handleValidationError and insert the result into error varibel
      error = handleValidationError(error);
    }

    sendError(error, res, 'production');
  }
};
