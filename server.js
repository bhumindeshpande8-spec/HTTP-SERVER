const net = require('net');

const PORT = process.argv[2] || 8080;
const dataStore = new Map();
let nextId = 1;

// HTTP Message Format: Request-Line CRLF Headers CRLF CRLF Body
const CRLF = '\r\n';
const DOUBLE_CRLF = '\r\n\r\n';

function parseHttpRequest(buffer) {
  const str = buffer.toString('utf8');
  
  // 1. Find request line (first line)
  const requestLineEnd = str.indexOf(CRLF);
  if (requestLineEnd === -1) return null;
  
  const requestLine = str.slice(0, requestLineEnd);
  const [method, pathQuery, version] = requestLine.split(' ');
  
  // 2. Find headers end (DOUBLE_CRLF)
  const headersEnd = str.indexOf(DOUBLE_CRLF);
  if (headersEnd === -1) return null;
  
  // 3. Parse headers
  const headersRaw = str.slice(requestLineEnd + 2, headersEnd);
  const headers = {};
  headersRaw.split(CRLF).forEach(line => {
    const colon = line.indexOf(':');
    if (colon !== -1) {
      const key = line.slice(0, colon).trim().toLowerCase();
      const value = line.slice(colon + 1).trim();
      headers[key] = value;
    }
  });
  
  // 4. Parse path and query
  let path = pathQuery.split('?')[0];
  let queryParams = {};
  const queryStart = pathQuery.indexOf('?');
  if (queryStart !== -1) {
    const query = pathQuery.slice(queryStart + 1);
    query.split('&').forEach(param => {
      const [key, value] = param.split('=').map(decodeURIComponent);
      queryParams[key] = value;
    });
  }
  
  // 5. Handle body based on Content-Length
  const contentLength = parseInt(headers['content-length'] || 0);
  const bodyStart = headersEnd + 4; // DOUBLE_CRLF length
  const body = contentLength > 0 ? str.slice(bodyStart, bodyStart + contentLength) : '';
  
  return {
    method, path, version, headers, queryParams, body,
    isComplete: buffer.length >= (bodyStart + contentLength)
  };
}

function createResponse(statusCode, statusText, headers = {}, body = '') {
  const responseHeaders = {
    'Date': new Date().toUTCString(),
    'Server': 'CustomHTTP/1.0',
    'Connection': 'close',
    ...headers,
    'Content-Length': Buffer.byteLength(body)
  };
  
  let response = `HTTP/1.1 ${statusCode} ${statusText}${CRLF}`;
  for (const [key, value] of Object.entries(responseHeaders)) {
    response += `${key}: ${value}${CRLF}`;
  }
  response += DOUBLE_CRLF + body;
  
  return Buffer.from(response, 'utf8');
}

const server = net.createServer((socket) => {
  console.log(`Client connected: ${socket.remoteAddress}`);
  let requestBuffer = Buffer.alloc(0);
  
  socket.on('data', (data) => {
    // Accumulate raw bytes
    requestBuffer = Buffer.concat([requestBuffer, data]);
    
    // Try to parse HTTP request
    const req = parseHttpRequest(requestBuffer);
    
    if (!req || !req.isComplete) {
      return; // Need more data
    }
    
    console.log(`${req.method} ${req.path} ${req.version}`);
    console.log('Headers:', req.headers);
    
    let response;
    
    try {
      // ROUTING - exactly as required
      if (req.method === 'GET' && req.path === '/') {
        response = createResponse(200, 'OK', 
          { 'Content-Type': 'text/plain' }, 
          'Welcome to Raw HTTP/1.1 Server!\n');
          
      } else if (req.method === 'GET' && req.path === '/echo') {
        const message = req.queryParams.message || '';
        response = createResponse(200, 'OK', 
          { 'Content-Type': 'text/plain' }, 
          message);
          
      } else if (req.method === 'POST' && req.path === '/data') {
        if (req.headers['content-type'] !== 'application/json') {
          response = createResponse(400, 'Bad Request', 
            { 'Content-Type': 'text/plain' }, 
            'Content-Type must be application/json');
        } else {
          let jsonData;
          try {
            jsonData = JSON.parse(req.body);
          } catch (e) {
            response = createResponse(400, 'Bad Request', 
              { 'Content-Type': 'text/plain' }, 
              'Invalid JSON');
          }
          
          if (jsonData) {
            const id = nextId++;
            dataStore.set(id, jsonData);
            response = createResponse(200, 'OK', 
              { 'Content-Type': 'application/json' }, 
              JSON.stringify({ success: true, id }));
          }
        }
        
      } else if (req.method === 'GET' && req.path === '/data') {
        const allData = Array.from(dataStore, ([id, item]) => ({ id, ...item }));
        response = createResponse(200, 'OK', 
          { 'Content-Type': 'application/json' }, 
          JSON.stringify(allData));
          
      } else if (req.method === 'GET' && req.path.match(/^\/data\/(\d+)$/)) {
        const id = parseInt(req.path.split('/')[2]);
        if (!dataStore.has(id)) {
          response = createResponse(404, 'Not Found', 
            { 'Content-Type': 'text/plain' }, 
            'Item not found');
        } else {
          const item = dataStore.get(id);
          response = createResponse(200, 'OK', 
            { 'Content-Type': 'application/json' }, 
            JSON.stringify({ id, ...item }));
        }
        
      } else {
        response = createResponse(404, 'Not Found', 
          { 'Content-Type': 'text/plain' }, 
          'Not Found');
      }
      
    } catch (error) {
      console.error('Server error:', error);
      response = createResponse(500, 'Internal Server Error', 
        { 'Content-Type': 'text/plain' }, 
        'Internal Server Error');
    }
    
    // Send raw bytes response
    socket.write(response);
    socket.end();
    
    // Reset for next request (no keep-alive)
    requestBuffer = Buffer.alloc(0);
  });
  
  socket.on('error', (err) => {
    console.error('Socket error:', err.message);
  });
  
  socket.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Raw HTTP/1.1 Server listening on port ${PORT}`);
  console.log('Test with: curl http://localhost:8080/');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    process.exit(0);
  });
});
