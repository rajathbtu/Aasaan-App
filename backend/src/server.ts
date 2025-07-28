import http from 'http';
import app from './app';
import dotenv from 'dotenv';

// Load environment variables from .env if present
dotenv.config();

const PORT = process.env.PORT || 3000;

// Create an HTTP server using the Express app.  Keeping the server setup
// separate from the app allows easier testing and potential reuse (e.g.
// attaching WebSockets).
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Aasaan backend is running on http://localhost:${PORT}`);
});