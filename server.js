const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb'); 
const { ObjectId } = require('mongodb');

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
  const { token } = req.body;

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

app.get('/main', authenticateToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'path-to-main-page.html'));
});


app.post('/receiveToken', authenticateToken, (req, res) => {


  const receivedToken = req.body.token; // Access token from request body
  

  //console.log("Token recieved in /recieveToken POST: ", receivedToken);

  res.redirect('http://localhost:3000/public');

});

app.post('/verifyToken', authenticateToken, async (req, res) => {
  try {
    //console.log("beginning of verifyToken");
    //console.log("verify token body (inkommande): ", req.body);
    //console.log("verify token inkommande e-post: ", req.user.email);
    //console.log("verify token inkommande id: ", req.user.sub);

    const jwtuserid = req.user.sub;

    const usersCollection = client.db("notesdb").collection("users");

    console.log("usersCollection defined");

    const user = await usersCollection.findOne({ _id: new ObjectId(jwtuserid) });

    console.log("beginning of usersCollection loop");

    if (!user) {
      console.error('User not found');
      return res.status(404).send({ msg: 'User not found' });
    }

    // Retrieve accessible boards
    const accessibleBoards = await client.db("notesdb").collection("boards").find({
      _id: { $in: user.accessibleBoards }
    }).toArray();

    console.log(user.email);
    res.send({ msg: 'Success', user: { email: user.email, accessibleBoards } });
    console.log("verifyToken successful, sending response");

  } catch (error) {
    console.error('Error in verifyToken:', error);
    res.sendStatus(500);
  }

  
});



//const accessibleItems = user.accessibleItems;
//res.send({ msg: 'Success', user: { email: user.email, accessibleItems } });


//verify the token from authorization header
function verifyToken(req, res, next) {

  //console.log(req.headers);

  const token = req.headers.authorization.split(' ')[1]; // Get the token without "Bearer "

  //console.log("Function verifyToken: " + req.headers.authorization);

  if (!token) {
    console.error('Token not provided');
    return res.status(403).send({ msg: 'Token not provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Error verifying token:', err);
      return res.status(403).send({ msg: 'Failed to authenticate token' });
    }

    req.user = user;
    next();
  });
}

app.get('/private', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;

    const user = await client.db("notesdb").collection("users").findOne({ _id: new ObjectId(userId) });

    if (!user) {
      console.error('User not found');
      return res.status(404).send({ msg: 'User not found' });
    }

    const accessibleBoardIds = user.accessibleBoards.map(id => new ObjectId(id));

    const accessibleBoards = await client.db("notesdb").collection("boards").find({
      _id: { $in: accessibleBoardIds }
    }).toArray();

    //console.log(accessibleBoards, ": accessible boards from the server.js function");

    res.send({ msg: 'You have access to this route', user: req.user, accessibleBoards });
  } catch (error) {
    console.error('Error fetching accessible boards:', error);
    res.status(500).send({ msg: 'Internal Server Error' });
  }
});





let selectedBoardId; // Global variable to store the selected board ID



const notes = [];



wss.on('connection', (ws) => {

  try {

  ws.send(JSON.stringify({ type: 'INIT', data: [] }));
  console.log("WebSocket connection established");

  

  ws.on('message', (message) => {

    try {
    console.log("message recieved, beginning to process");

    const data = JSON.parse(message);

    const { type, data: messageData, boardId } = data; // Extract boardId

    console.log("messageData.boardId(det som kommer från clientside:", messageData.boardId);
    console.log("global variabel för boardId: ", selectedBoardId);

    selectedBoardId = messageData.boardId;

    console.log("Selected board efter redefine före typ:", selectedBoardId);

    if (type === 'SELECT_BOARD') {
      console.log("Select board");
      
      const boardNotes = notes.filter(note => note.boardId === selectedBoardId);

      ws.send(JSON.stringify({ type: 'INIT', data: boardNotes }));

    } else if (type === 'ADD_NOTE') {
      console.log("Received ADD_NOTE");
      const newNote = { id: Date.now(), text: messageData.text, x: 0, y: 0, boardId: selectedBoardId }; // Use selectedBoardId here
      notes.push(newNote);

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'ADD_NOTE', data: newNote }));
          console.log("Sent a new note");
        }
      });


  } else if (data.type === 'MOVE_NOTE') {
      const receivedNoteId = data.data.id;
      const note = notes.find((note) => note.id === parseInt(receivedNoteId));

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
