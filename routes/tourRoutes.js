const express = require('express');

// middleware to protect route
const authController = require('./../controllers/authController');

// import the controller
const tourController = require('../controllers/tourController');

// create mount routers
const router = express.Router();

// route aliases that user always visited
router
  .route('/top-5-tours')
  .get(tourController.aliasTopTours, tourController.getAllTours);

// route to get tour stats using mongo aggregation
router.route('/tour-stats').get(tourController.getTourStats);

router.route('/monthly-plan/:year').get(tourController.getMonthlyPlan);

router
  .route('/')
  // get request
  .get(authController.protect, tourController.getAllTours)
  // post request
  .post(tourController.createTour);

router
  .route('/:id')
  // get single request
  .get(tourController.getTour)
  // patch request
  .patch(tourController.updateTour)
  // delete request
  .delete(tourController.deleteTour);

module.exports = router;
