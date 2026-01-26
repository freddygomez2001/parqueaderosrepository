const next = require('next');
const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = '0.0.0.0';
const dev = false;

console.log('==========================================');
console.log('NEXT.JS PRODUCTION SERVER');
console.log('==========================================');
console.log('Puerto:', port);
console.log('Directorio:', __dirname);
console.log('Node version:', process.version);
console.log('==========================================\n');

const app = next({ 
  dev, 
  hostname,
  port,
  dir: __dirname,
  conf: {
    distDir: '.next'
  }
});

const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error handling request:', err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    }).listen(port, hostname, (err) => {
      if (err) {
        console.error('Error starting server:', err);
        throw err;
      }
      console.log(`✅ Next.js ready on http://${hostname}:${port}`);
    });
  })
  .catch((err) => {
    console.error('Error preparing Next.js:', err);
    process.exit(1);
  });