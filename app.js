const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// import error handling class file
const AppError = require('./utils/appError');

// import the routes
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

// import error controller
const globalErrorController = require('./controllers/errorController');

const app = express();

// set security HTTP headers (helmet)
app.use(helmet());

// limit incoming request from same ip adress
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this IP, please try again in an hour',
});

app.use('/api', limiter);

// parses incoming JSON requests and puts the parsed data in req.body
app.use(express.json({ limit: '50kb' }));

// use morgan when in development mode
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// create middleware route definition
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

app.all('*', (req, res, next) => {
  // this function will run when there's request url route that is not defined in the middleware route definition

  // pass the error to global error middleware using next()
  next(new AppError(`can't find the ${req.originalUrl} on this server!`, 404));
});

// global error handling middleware
app.use(globalErrorController);

module.exports = app;
