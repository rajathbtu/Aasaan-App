import http from 'http';
import app from './app';
import dotenv from 'dotenv';

// Load environment variables from .env if present
dotenv.config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Create an HTTP server using the Express app.  Keeping the server setup
// separate from the app allows easier testing and potential reuse (e.g.
// attaching WebSockets).
const server = http.createServer(app);

server.listen({ port: Number(PORT), host: HOST }, () => {
  console.log(`Aasaan backend is running on http://${HOST}:${PORT}`);
});