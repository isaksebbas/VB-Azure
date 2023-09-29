const WebSocket = require('ws');
const http = require('http'); // Import the 'http' module

require('dotenv').config();

const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3030;

console.log("Starting WebSocket server on port " + PORT);

const wss = new WebSocket.Server({ noServer: true }); // Create a WebSocket server

// Set: datatyp "med bara nycklar", Wikipedia: Unlike most other collection types, rather than retrieving a specific element from a set, one typically tests a value for membership in a set. 
const clients = new Set();

wss.on('connection', (ws, req) => {
    // WebSocket connection handling code (unchanged)
    // ...
    // Check valid token (set token in .env as WS_TOKEN=my-secret-token )
    const urlParams = new URLSearchParams(req.url.slice(1));
    if (urlParams.get('token') !== process.env.WS_TOKEN) {
        console.log('Invalid token: ' + urlParams.get('token'));
        ws.send(JSON.stringify({
            type: 'error',
            msg: 'ERROR: Invalid token.'
        }));
        ws.close();
    }

    // Spara connectionen i vårt client-Set:
    if (!clients.has(ws)) {
        ws.createdAt = new Date()
        clients.add(ws)
    }
    console.log('Client connected:', req.headers['sec-websocket-key'], 
        'client count:', clients.size, ws);

    ws.on('message', (rawMessage) => {

        ws.lastMessage = new Date()
    
        // Vi konverterar vår råa JSON till ett objekt
        const message = JSON.parse(rawMessage.toString())

        message.clientId = req.headers['sec-websocket-key']

        console.log('Received message:', message)

        clients.forEach(client => {

            // Skicka inte till vår egen klient (ws)
            if (client === ws) return

            client.send(JSON.stringify({
                type: 'paste',
                text: message.text
            }));
        })
    });
});

const httpServer = http.createServer((req, res) => {
    if (req.url === '/') {
        // Read the HTML file
        fs.readFile('ws-frontend/index.html', (err, data) => {
            if (err) {
                // Handle file read error
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            } else {
                // Serve the HTML file
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    } else {
        // Handle other HTTP requests (if needed)
        // ...
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

// Upgrade HTTP requests to WebSocket requests
httpServer.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// Start listening on the specified port for both HTTP and WebSocket
httpServer.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});





