const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// import error handling class file
const AppError = require('./utils/appError');

// import the routes
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

// import error controller
const globalErrorController = require('./controllers/errorController');

const app = express();

// parses incoming JSON requests and puts the parsed data in req.body
app.use(express.json());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use((req, res, next) => {
  // for checking headers
  // console.log(req.headers);
  next();
});

// limit incoming request from same ip adress
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this IP, please try again in an hour',
});

app.use('/api', limiter);

// create middleware route definition
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

app.all('*', (req, res, next) => {
  // will be caught in global error middleware
  // const err = new Error(`can't find the ${req.originalUrl} on this server!`);
  // err.status = 'fail';
  // err.statusCode = 404;

  // pass the error to global error middleware using next()
  next(new AppError(`can't find the ${req.originalUrl} on this server!`, 404));
});

// global error handling middleware
app.use(globalErrorController);

module.exports = app;
