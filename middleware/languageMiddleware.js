const languageMiddleware = (req, res, next) => {
  const lang = req.headers["accept-language"] || "en";
  req.language = lang.split(",")[0]; //primary language code
  next();
};

module.exports = languageMiddleware;
