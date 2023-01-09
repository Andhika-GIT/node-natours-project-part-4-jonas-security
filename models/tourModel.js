const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

//// * MONGOOSE SCHEMA * ////////

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'a tour name must have less or equal than 40 characters'],
      minlength: [10, 'a tour name must have more or equal than 10 characters'],
      validate: {
        validator: function (val) {
          return validator.isAlpha(val, 'en-GB', { ignore: ' ' });
        },
        message: 'A tour name can only contain alpha characters',
      },
    },
    slug: {
      type: String,
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'rating must be above 1.0'],
      max: [5, 'rating must be below 5.0'],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        // custom rule validator
        validator: function (val) {
          return val < this.price; // price discount must be below than price model value
        },
        // custom message when return false
        message: 'discount price ({VALUE}) should be below the reguler price', // ({VALUE}) -> input value
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
  },
  {
    // schema option for virtual properties
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// virtual properties for additional information
tourSchema.virtual('durationWeeks').get(function () {
  // send the duration that is formatted in weeks
  // ex : duration is 21 days, so 21 / 7 -> 3 weeks
  return this.duration / 7;
});

// 1.) DOCUMENT MIDDLEWARE
// runs before any action that save document to database
tourSchema.pre('save', function (next) {
  // create a new property (slug) before we save it to database
  this.slug = slugify(this.name, { lower: true });
  // call the next mongo middleware ( if we have more than one )
  next();
});

// runs after document saved to database
tourSchema.post('save', function (doc, next) {
  next();
});

// 2.) QUERY MIDDLEWARE
// runs before query that has the word "find" -> find(), findById(), findOne()
tourSchema.pre(/^find/, function (next) {
  // the 'this' keyword is not a query object
  // select tour where the secretTour value is false
  this.find({ secretTour: { $ne: true } });

  // create new property "start" to count how long does it takes for query to run
  this.start = Date.now();
  next();
});

// runs after query that has the word "find" -> find(), findById(), findOne() has executed
tourSchema.post(/^find/, function (docs, next) {
  // access the "start" property that we defined in pre query middleware
  console.log(`query took ${Date.now() - this.start} milliseconds`);

  next();
});

// 3.) AGGREGATION MIDDLEWARE
// execute before aggregation happen
tourSchema.pre('aggregate', function (next) {
  // filter the secret tour out, before we execute the aggregation
  this.pipeline().unshift({
    // add another operation that filter out secret tour
    $match: { secretTour: { $ne: true } },
  });

  console.log(this);
  next();
});

// initiate the model
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;

/////////////////////////////////
