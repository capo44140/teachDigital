const cors = require('cors');

// Base allowed origins
const baseAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://teach-digital.vercel.app',
  'https://teachdigital.vercel.app'
];

// Get all allowed origins including env vars
const getAllowedOrigins = () => {
  const origins = [...baseAllowedOrigins];

  // Add FRONTEND_URL if defined
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }

  // Add ALLOWED_ORIGIN if defined (comma separated)
  if (process.env.ALLOWED_ORIGIN) {
    const additionalOrigins = process.env.ALLOWED_ORIGIN.split(',')
      .map(url => url.trim())
      .filter(Boolean);
    origins.push(...additionalOrigins);
  }

  return origins;
};

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow localhost with any port in development
    const isLocalhost = origin.startsWith('http://localhost');
    const allowedOrigins = getAllowedOrigins();

    if (isLocalhost || allowedOrigins.indexOf(origin) !== -1) {
      // Trusted origin: reflect it and allow credentials
      callback(null, true);
    } else {
      // Untrusted origin: allow it but as '*' (no credentials)
      // Note: passing a string to callback sets Access-Control-Allow-Origin to that string
      callback(null, '*');
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  maxAge: 86400,
  credentials: true // This will be ignored/handled correctly if origin is '*' by standard browser rules
};

// Wrapper for Vercel serverless functions
const runCors = (req, res) => {
  return new Promise((resolve, reject) => {
    cors(corsOptions)(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      resolve(result);
    });
  });
};

module.exports = {
  corsOptions,
  runCors,
  corsMiddleware: cors(corsOptions)
};
