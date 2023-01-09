// server setup
const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('../../models/tourModel');

// connect to the configuration file, to access global variabel
dotenv.config({ path: './config.env' });

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
  })
  .then(() => {
    console.log('DB CONNECTION SUCESSFULL');
  });

// READ JSON FILE

// convert json into array object
const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/tours-simple.json`, 'utf-8')
);

// IMPORT DATA INTO DB
const importData = async () => {
  try {
    await Tour.create(tours);
    console.log('data successfully loaded');
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

// DELETE ALL DATA FROM COLLECTION DB

const deleteData = async () => {
  try {
    await Tour.deleteMany();
    console.log('data successfully deleted');
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

console.log(process.argv);

// if we write node dev-data/data/import-dev-data.js --import in command line
if (process.argv[2] === '--import') {
  //  run the import method
  importData();
}
// if we write node dev-data/data/import-dev-data.js --delete in command line
else if (process.argv[2] === '--delete') {
  //  run the delete method
  deleteData();
}
