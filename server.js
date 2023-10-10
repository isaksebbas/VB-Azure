const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(express.json());

const cors = require('cors');

app.use(cors());

const corsOptions = {
  origin: 'http://localhost:3030',
};

app.use(cors(corsOptions));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const uri = require('./config');
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect()
  .then(() => {
    console.log('Connected to MongoDB database');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB database:', error);
  });

const authenticateToken = (req, res, next) => {
  try {

    //console.log("Using secret key: " + process.env.JWT_SECRET);

    const { token } = req.body;

    //const token = req.headers['authorization']; 

    //console.log("Recieved token ((const authenticateToken) server.js)", token);

    //res.json({ message: 'Token received and verified successfully' });

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.error('Error verifying token in const authenticateToken:', err);
        return res.sendStatus(403);
      }
      console.log("Decoded user email successfully: " + user.email);
      req.user = user;  // Add the user object to the request for later use
      next();  // Continue with the next middleware or route handler
    });
  } catch (error) {
    console.error('Error in authenticateToken:', error);
    res.sendStatus(500); // Internal server error
  }
};

app.use('/public', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path, stat) => {
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    }
  },
}));

app.post('/receiveToken', authenticateToken, (req, res) => {
  //console.log(`Received request to verify token: ${req.body.token}`);
  //console.log('Decoded object:', req.user);

  const receivedToken = req.body.token; // Access token from request body
  //console.log(`Received token: ${receivedToken}`);

  // Log that a request has been received
  //console.log("Received request to verify token (app.post /recievetoken):", receivedToken);

  //console.log("Secret key to decode: " + process.env.JWT_SECRET);



  // Perform any additional logic here based on the authenticated user (req.user)
  // For example, you can use req.user.email or req.user.id to identify the user

  //res.json({ message: 'Token received and verified successfully (from NTW)' });

  console.log("Token recieved and verified, redirecting user to website");

  res.redirect('http://localhost:3000/public');

});


const notes = [];

wss.on('connection', (ws) => {
  try {

    ws.send(JSON.stringify({ type: 'INIT', data: notes }));
    console.log("WebSocket connection established");

    ws.on('message', (message) => {
      try {

        const data = JSON.parse(message);

        if (data.type === 'ADD_NOTE') {
          const newNote = { id: Date.now(), text: data.data.text, x: 0, y: 0 };
          notes.push(newNote);

          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'ADD_NOTE', data: newNote }));
            }
          });
        } else if (data.type === 'MOVE_NOTE') {
          const receivedNoteId = data.data.id;
          const note = notes.find((note) => note.id === parseInt(receivedNoteId));

          if (note) {
            note.x = data.data.x;
            note.y = data.data.y;

            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'MOVE_NOTE', data: { id: data.data.id, x: data.data.x, y: data.data.y } }));
              }
            });
          }
        } else if (data.type === "UPDATE_NOTE_TEXT") {
          const noteId = data.data.id;
          const newText = data.data.text;

          const note = notes.find((note) => note.id === parseInt(noteId));

          if (note) {
            note.text = newText;
            console.log(note + " note text updates to " + newText);

            // Broadcast the updated text to all connected clients
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'UPDATE_NOTE_TEXT', data: { id: noteId, text: newText } }));
                console.log("useless shit called?");
              }
            });
          }
        } else if (data.type === 'UPDATE_NOTE_CONTENT') {
          console.log("CALLING UPDATE CONTENT");
          const noteId = data.data.id;
          const newContent = data.data.content;

          const note = notes.find((note) => note.id === parseInt(noteId));

          if (note) {
            note.content = newContent;
            console.log(`Note ${noteId} content updated to: ${newContent}`);

            // Broadcast the updated content to all connected clients
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'UPDATE_NOTE_CONTENT', data: { id: noteId, content: newContent } }));
                console.log("Should now update for everyone the content?" + newContent + " + " + noteId);
              }
            });
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
  } catch (error) {
    console.error('WebSocket connection error:', error);
  }
});

app.get('/', authenticateToken, (req, res) => {
  res.redirect('/public/index.html');
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Server is running on port 3000');
});
