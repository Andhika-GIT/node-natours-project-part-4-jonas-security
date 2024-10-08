const express = require('express');
const authController = require('../controllers/authController');

// import the controller
const userController = require('../controllers/userController');

// create mount routers
const router = express.Router();

// router for signup
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// forgot password
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
router.patch(
  '/updatePassword',
  authController.protect,
  authController.updatePassword
);

// update user
router.patch('/updateMe', authController.protect, userController.updateMe);

// delete user
router.delete('/deleteMe', authController.protect, userController.deleteMe);

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
