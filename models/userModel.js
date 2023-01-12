const mongoose = require('mongoose');
const validator = require('validator');
const bcryptjs = require('bcryptjs');

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

// pre-save middleware to encrypt password before it saves to database
userSchema.pre('save', async function (next) {
  // if password field is not changed, then skip this middleware
  if (!this.isModified('password')) return next();

  // only run this middleware, if the password field is changed

  // run the hash to bcrypt password field
  this.password = await bcryptjs.hash(this.password, 12);

  // delete the passwordConfirm field, because we don't want to save it into database
  this.passwordConfirm = undefined;

  next();
});

// initiate the model
const User = mongoose.model('User', userSchema);

module.exports = User;
