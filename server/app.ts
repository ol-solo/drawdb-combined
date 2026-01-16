import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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
  
  // Check if frontend dist exists before trying to serve it
  const indexHtmlPath = path.join(frontendDistPath, 'index.html');
  
  if (fs.existsSync(indexHtmlPath)) {
    res.sendFile(indexHtmlPath, (err) => {
      if (err) {
        res.status(404).json({ 
          error: 'Not found',
          message: 'Frontend not available. This is an API server.',
          endpoints: {
            gists: '/gists',
            email: '/email'
          }
        });
      }
    });
  } else {
    res.status(404).json({ 
      error: 'Not found',
      message: 'Frontend not built. This is an API server.',
      endpoints: {
        gists: '/gists',
        email: '/email'
      }
    });
  }
});

export default app;
