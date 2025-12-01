import express from 'express';
import cors from 'cors';
import path from 'path';
import { emailRouter } from './routes/email-route';
import { gistRouter } from './routes/gist-route';
import { config } from './config';

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: config.dev
      ? '*'
      : (origin, callback) => {
          if (origin && config.server.allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
          } else {
            callback(null, false);
          }
        },
  }),
);

// Serve static files from frontend build (before API routes to handle assets)
const frontendDistPath = path.join(__dirname, '../client-dist');
app.use(express.static(frontendDistPath));

// API routes
app.use('/email', emailRouter);
app.use('/gists', gistRouter);

// Serve frontend for all non-API routes (SPA fallback)
// This must be last to catch all routes not handled above
app.get('*', (req, res) => {
  // Don't serve index.html for API routes (though they should be caught above)
  if (req.path.startsWith('/email') || req.path.startsWith('/gists')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).json({ error: 'Not found' });
    }
  });
});

export default app;
