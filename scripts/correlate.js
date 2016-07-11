// https://en.wikipedia.org/wiki/Pearson_product-moment_correlation_coefficient
var correlate, covariance, map, mean, range, stdDev, sum, zip, zipWith;

correlate = function(xs, ys) {
  return covariance(xs, ys) / (stdDev(xs) * stdDev(ys));
};

covariance = function(xs, ys) {
  var mx, my, ref;
  ref = [mean(xs), mean(ys)], mx = ref[0], my = ref[1];
  return mean(zipWith(xs, ys, function(x, y) {
    return (x - mx) * (y - my);
  }));
};

stdDev = function(xs) {
  var mx;
  mx = mean(xs);
  return Math.sqrt(mean(map(xs, function(x) {
    return Math.pow(x - mx, 2);
  })));
};

mean = function(xs) {
  return sum(xs) / xs.length;
};

sum = function(xs) {
  return xs.reduce((function(a, b) {
    return a + b;
  }), 0);
};

zipWith = function(xs, ys, fn) {
  return map(zip(xs, ys), function(arg) {
    var x, y;
    x = arg[0], y = arg[1];
    return fn(x, y);
  });
};

zip = function(xs, ys) {
  return map(range(Math.min(xs.length, ys.length)), function(i) {
    return [xs[i], ys[i]];
  });
};

map = function(xs, fn) {
  return xs.map(fn);
};

range = function(start, stop, step) {
  var j, ref, ref1, results;
  if (stop == null) {
    stop = start;
  }
  if (step == null) {
    step = 1;
  }
  if (arguments.length === 1) {
    start = 0;
  }
  return (function() {
    results = [];
    for (var j = ref = start / step, ref1 = stop / step; ref <= ref1 ? j < ref1 : j > ref1; ref <= ref1 ? j++ : j--){ results.push(j); }
    return results;
  }).apply(this).map(function(i) {
    return Math.floor(i * step);
  });
};