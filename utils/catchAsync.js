// function to handle error

module.exports = (method) => {
  // create node function, because this function by default don't know what is req,res,next
  const runMethod = (req, res, next) => {
    // run the function that passed as argument from controller
    method(req, res, next).catch(next);
  };

  return runMethod;
};
