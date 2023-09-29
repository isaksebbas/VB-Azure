const PORT = process.env.PORT || 3030;
const port = 3000;


//DATABASE
const { Client } = require('pg');
const config = require('./config'); 

const dbClient = new Client({
    connectionString: config.databaseURL,
    user: config.databaseUsername,
    password: config.databasePassword,
  });

// Connect to the database
dbClient.connect()
  .then(() => {
    console.log('Connected to ElephantSQL database');
  })
  .catch((error) => {
    console.error('Error connecting to ElephantSQL database:', error);
  });

  //Add Express
  const express = require('express');
  const app = express();

  app.use(express.json());

  app.get('/query', async (req, res) => {
    try {
      await dbClient.connect();
  
      //const result = await dbClient.query('SELECT * FROM users');

      const result = await dbClient.query('SELECT id FROM users WHERE user_id = 1'); // Replace with your actual query conditions

  
      // Send the result as JSON
      res.json(result.rows);
      //res.json({ id: 123 }); // Replace with your actual data

    } catch (error) {
      console.error('Error executing query:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      await dbClient.end();
    }
  });
  
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

  
  /////////////////////




const WebSocket = require('ws');
const http = require('http'); // Import the 'http' module

require('dotenv').config();

const fs = require('fs');



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





