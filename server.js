// server setup
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// handling exception (! MUST BE PUT AT THE TOP !)

// catching uncaught exceptions -> bug or an error that are not handled anywhere
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION!');
  console.log(err.name, err.message);

  // close the server
  process.exit(1);
});

// define the configuration file, to access global variabel
dotenv.config({ path: './config.env' });

// ! IMPORTANT, WE MUST DEFINE THE PATH CONFIG, BEFORE REQUIRE THE MAIN APP

// import the app from app.js
const app = require('./app');

// setup listener when server start

// we can use the PORT from global variabel in config.env or using 3000 (default)
const port = process.env.PORT || 3000;

///////// * MONGOOSE * //////////

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  // replace the <PASSWORD> with the global DATABASE_PASSWORD
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then((con) => {
    console.log('DB CONNECTION SUCESSFULL');
  });
// .catch((err) => {
//   console.log(err.name, err.message);
//   console.log('CONNECTION TO DATABASE FAILED');
// });

/////////////////////////////////

const server = app.listen(port, () => {
  console.log(`app running on port ${port}...`);
});

// close the application if we failed to connect to database
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('CONNECTION TO DATABASE FAILED');

  // close the server
  server.close(() => {
    process.exit(1);
  });
});

// testing errors
// console.log(x);
