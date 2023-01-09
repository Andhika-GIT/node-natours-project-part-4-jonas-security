const fs = require('fs');
const Tour = require('./../models/tourModel');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');

const AppError = require('../utils/appError');

// handler for top 5 tours
exports.aliasTopTours = (req, res, next) => {
  // because it's top 5, we set the limit to 5
  req.query.limit = '5';

  //  sort it with the highest ratings first
  req.query.sort = '-ratingsAverage,price';

  // only select some fields
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';

  next();
};

exports.getAllTours = catchAsync(async (req, res, next) => {
  // initialize class into some variabel
  const features = new APIFeatures(
    // pass all the tour model query and the req.query parameters
    Tour.find(),
    req.query
  )
    // chained all methods in APIFeatures class
    .filter()
    .sort()
    .limitFields()
    .paginate();

  // EXECUTE QUERY
  const tours = await features.query;

  res
    .status(200)
    // send the json format data into client
    .json({
      status: 'success',
      results: tours.length,
      data: {
        tours,
      },
    });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // findById() return spesific document, based on given id
  const tour = await Tour.findById(req.params.id);

  // check if there's no tour
  if (!tour) {
    // add 404 page not found using our appError reusable error handling class
    return next(new AppError('no tour found with that ID', 404));
  }
  // send the status
  res
    .status(200)
    // send the json format data into client
    .json({
      status: 'success',
      data: {
        tour,
      },
    });
});

exports.createTour = catchAsync(async (req, res, next) => {
  // create new documents (new data) using Tour model that we imported
  const newTour = await Tour.create(
    // pass the request body data
    req.body
  );

  res.status(201).json({
    status: 'success',
    data: {
      tour: newTour,
    },
  });
});

exports.updateTour = catchAsync(async (req, res, next) => {
  // update document based on the id
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    // validate incoming updated data
    runValidators: true,
  });

  // check if there's no tour
  if (!tour) {
    // add 404 page not found using our appError reusable error handling class
    return next(new AppError('no tour found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      message: 'successfully update the tour',
      tour,
    },
  });
});

exports.deleteTour = catchAsync(async (req, res, next) => {
  // delete the tour based on the id
  const deletedTour = await Tour.findByIdAndDelete(req.params.id);

  // check if there's no tour
  if (!tour) {
    // add 404 page not found using our appError reusable error handling class
    return next(new AppError('no tour found with that ID', 404));
  }

  // we can still return or send the deleted data as respond to client
  res.status(200).json({
    status: 'success',
    data: {
      message: 'successfully delete the tour',
      deletedTour,
    },
  });
});

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      // mongodb aggregation to only show tour that has rating average greater than 4.5
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: '$difficulty',
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    {
      $match: {
        // we already define that _id is difficulty field in $group stage
        _id: {
          // $ne -> not equal
          //  select all document's where the difficulty is not 'easy'
          $ne: 'easy',
        },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      message: 'the data stats of tour',
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = +req.params.year; // 2021

  const plan = await Tour.aggregate([
    {
      // one document for each startDates array data
      $unwind: '$startDates',
    },
    {
      $match: {
        // filter the data to based on given year , ex : the given year is 2021
        startDates: {
          $gte: new Date(`${year}-01-01`), // greater or equal to 2021-01-01
          $lte: new Date(`${year}-12-31`), // lest or equal to 2021-12-31

          // so we want to filter data, between the first day of the given year and the last day of the given year
        },
      },
    },
    {
      $group: {
        // group based on month in 2021
        _id: { $month: '$startDates' },
        // count how many tour that start in each month based on the year 2021
        numTourStarts: { $sum: 1 },
        // get the name of the tour in each month
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: {
        month: '$_id',
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: {
        numTourStarts: -1,
      },
    },
    {
      $limit: 6,
    },
  ]);

  res.status(200).json({
    status: 'success',
    result: plan.length,
    data: {
      plan,
    },
  });
});
