const express = require('express');
const authController = require('../controllers/authController');

// import the controller
const userController = require('../controllers/userController');

// create mount routers
const router = express.Router();

// router for signup
router.post('/signup', authController.signup);
router.post('/login', authController.login);

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
