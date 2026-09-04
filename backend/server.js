import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend REST API server running at http://localhost:${PORT}`);
});
