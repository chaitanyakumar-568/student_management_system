// Strips MongoDB operator keys ("$ne", "$gt", ...) and dotted keys from request input
// to block NoSQL operator injection. Mutates in place (safe for Express 4).
function clean(value) {
  if (Array.isArray(value)) {
    value.forEach(clean);
  } else if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete value[key];
      } else {
        clean(value[key]);
      }
    }
  }
  return value;
}

module.exports = function sanitize(req, _res, next) {
  clean(req.body);
  clean(req.query);
  clean(req.params);
  next();
};
