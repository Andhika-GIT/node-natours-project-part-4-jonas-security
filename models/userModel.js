const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'please enter your name'],
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    required: [true, 'please enter your email'],
    validate: {
      validator: function (val) {
        return validator.isEmail(val);
      },
      message: 'please enter a valid email',
    },
  },
  photo: {
    type: String,
  },
  password: {
    type: String,
    required: [true, 'please enter your password'],
    minlength: 8,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'please confirm your password'],
    validate: {
      // only works on save
      validator: function (val) {
        return validator.equals(val, this.password);
      },
      message: 'password is not matched',
    },
  },
});

// initiate the model
const User = mongoose.model('User', userSchema);

module.exports = User;
