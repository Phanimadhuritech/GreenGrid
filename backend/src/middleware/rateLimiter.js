/**
 * Lightweight, in-memory rate limiter middleware for sensitive endpoints (e.g. login)
 */

const ipRequestsMap = new Map();

const rateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute
  const max = options.max || 60; // 60 requests per window
  const message = options.message || "Too many requests. Please try again shortly.";

  return (req, res, next) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "global";
    const now = Date.now();

    const record = ipRequestsMap.get(ip);

    if (!record) {
      ipRequestsMap.set(ip, { count: 1, startTime: now });
      return next();
    }

    if (now - record.startTime > windowMs) {
      record.count = 1;
      record.startTime = now;
      return next();
    }

    record.count++;
    if (record.count > max) {
      return res.status(429).json({
        success: false,
        message,
      });
    }

    next();
  };
};

// Periodic map cleanup to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestsMap.entries()) {
    if (now - record.startTime > 5 * 60 * 1000) {
      ipRequestsMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

module.exports = rateLimiter;
