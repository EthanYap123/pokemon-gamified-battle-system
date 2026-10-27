// Vercel runs this file as one serverless function for every /api request
// (see the rewrite in vercel.json). Locally, index.js starts the same app.
module.exports = require('../src/app');
