// Vercel serverless entry. vercel.json rewrites every /api/* path here, and the
// Express app does its own routing from the original URL.
export { default } from '../backend/app.js';
