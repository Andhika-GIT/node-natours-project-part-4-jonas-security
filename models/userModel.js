const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

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
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'please enter your password'],
    minlength: 8,
    select: false,
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
  passwordChangedAt: {
    type: Date,
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
});

// pre-save middleware to encrypt password before it saves to database
userSchema.pre('save', async function (next) {
  // if password field is not changed, then skip this middleware
  if (!this.isModified('password')) return next();

  // only run this middleware, if the password field is changed

  // run the hash to bcrypt password field
  this.password = await bcrypt.hash(this.password, 12);

  // delete the passwordConfirm field, because we don't want to save it into database
  this.passwordConfirm = undefined;

  next();
});

// instanced method to compare the request body password with the database password
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  // use bcrypt.compare to compare the encrypted request password with database password

  return await bcrypt.compare(candidatePassword, userPassword);
  // return true or false
};

// instanced method, to check if the user has changed their password or not
userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    // if the passwordChangedAt property exist, it means the user has changed their password

    // change the passwordChangedAt field value time to miliseconds
    // using parseInt() to parse string into integer value
    // by using getTime() and divide it by 1000
    // add 10 after, to convert the result into 10 base number
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    console.log(changedTimeStamp, JWTTimeStamp);

    // return true, if the created token date is less than password changed date
    return JWTTimeStamp < changedTimeStamp;
  }

  // other than that, if the passwordChangedAt property not exist yet, it means the user hasn't changed their password
  return false;
};

// instance method to create reset token when user reset their password
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  // hash / encrypted the reset token
  // then save it into our db
  this.passwordResetToken = crypto
    .createHash('sh256')
    .update(resetToken)
    .digest('hex');

  // set the token expires time = expires in 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // send the real reset token (not the encrypted one)
  return resetToken;
};

// initiate the model
const User = mongoose.model('User', userSchema);

module.exports = User;
