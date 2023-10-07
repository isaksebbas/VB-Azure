

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path'); // Required for serving static files
const { Client } = require('pg');
const config = require('./config'); 

const dbClient = new Client({
  connectionString: config.databaseURL,
  user: config.databaseUsername,
  password: config.databasePassword,
});

dbClient.connect()
  .then(() => {
    console.log('Connected to ElephantSQL database');
  })
  .catch((error) => {
    console.error('Error connecting to ElephantSQL database:', error);
  });

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });



// Serve static files including JavaScript files from a directory (e.g., "public")
app.use('/public', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path, stat) => {
      if (path.endsWith('.js')) {
          res.set('Content-Type', 'application/javascript');
      }
  },
}));

// Store notes in memory (for simplicity; consider using a database)
const notes = [];

wss.on('connection', (ws) => {
    // Send existing notes to the new client
    ws.send(JSON.stringify({ type: 'INIT', data: notes }));
    console.log("wss connection on");

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'ADD_NOTE') {

          console.log("Received ADD_NOTE message with data.data.text:", data.data.text); // Access 'data.data.text'
            console.log("Received ADD_NOTE message with text:", data.text);

            console.log("ADDING NEW NOTE SERVER SIDE");
            const newNote = { id: Date.now(), text: data.data.text, x: 0, y: 0 };
            notes.push(newNote);

            console.log("Received ADD_NOTE message with data:", data);


            // Broadcast the new note to all connected clients
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'ADD_NOTE', data: newNote }));
                }
            });


        } else if (data.type === 'MOVE_NOTE') {

            console.log("recieved MOVE_NOTE request from client side");

            const receivedNoteId = data.data.id;

            console.log("Recieved note with id: " + data.data.id);

            // Log the current state of the notes array
            console.log("Current notes array:", notes);

            //const note = notes.find((note) => note.id === receivedNoteId);

            const note = notes.find((note) => note.id === parseInt(receivedNoteId));

            console.log(note + " = note log");

            if (note) {

                console.log("Found note:", note);
                note.x = data.data.x;
                note.y = data.data.y;
                console.log("data.x: " + data.data.x);
                console.log("data.y: " + data.data.y);
                

                // Broadcast the note's new position to all connected clients
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'MOVE_NOTE', data: { id: data.data.id, x: data.data.x, y: data.data.y } }));
                        console.log("Sending data to clientside, to move note to positions: " + data.data.x + " and " + data.data.y);
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


    });
});

//Om man använder root url (localhost / ) så redirectar det till index.html i public
app.get('/', (req, res) => {
  res.redirect('/public/index.html');
});


server.listen(process.env.PORT || 3000, () => {
    console.log('Server is running on port 3000');
});



