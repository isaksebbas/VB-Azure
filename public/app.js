console.log("App.js loaded");

//const socket = new WebSocket('ws://localhost:3000'); // Replace 'your-server-url' with your actual WebSocket server URL
const socket = new WebSocket('wss://w-o-m-2023.azurewebsites.net');
// Function to send a message over the WebSocket
function sendMessage(type, data) {
  console.log(data + "data in sendMessage");
    const message = { type, data };
    socket.send(JSON.stringify(message));
    console.log("message sent using function sendMessage to server");
}

// Function to add a new note
function addNote(text) {
  console.log("Text from addNote: " + text);
  sendMessage('ADD_NOTE', { text: text }); // Set the 'text' property
  console.log("ADDING NOTE app.js line 140");
}


// Handle user interaction when the "Add Note" button is clicked
const addNoteButton = document.getElementById('addNoteButton');
const noteTextInput = document.getElementById('noteText');

addNoteButton.addEventListener('click', () => {
  const noteText = noteTextInput.value.trim();
  if (noteText) {
      addNote(noteText);
      // Clear the input field after adding the note
      noteTextInput.value = '';
  }
});

// Function to move a note to a new position
function moveNote(id, x, y) {
    console.log("Calling moveNote with id:", id, "x:", x, "y:", y);

    sendMessage('MOVE_NOTE', { id, x, y });
    
    console.log("LOG: moveNote function called, sending data to server.js");
}

const board = document.getElementById('board');

board.addEventListener('dragover', (event) => {
    event.preventDefault();
});

board.addEventListener('drop', (event) => {
  event.preventDefault();
  const noteId = event.dataTransfer.getData('text/plain');
  const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);

  if (noteElement) {
      const newX = event.clientX - board.getBoundingClientRect().left;
      const newY = event.clientY - board.getBoundingClientRect().top;

      // Call the moveNote function to update note positions
      moveNote(noteId, newX, newY);
      console.log("dropping note at new positions (x and y): " + newX + " + " + newY);
  }
});





// Function to render a new note on the board
function renderNewNote(note) {
  // Create a new note element
  const noteElement = document.createElement('div');
  noteElement.className = 'note';
  
  // Check if the note text exists and is not undefined
  if (note.text !== undefined) {
    console.log('Received note with text:', note.text); // Log the received note text
    noteElement.textContent = note.text;
  } else {
    console.log('Received note with undefined text. Note:', note); // Log the entire note object
  }

  noteElement.style.left = '50px'; // Set the initial position
  noteElement.style.top = '50px';
  noteElement.setAttribute('data-note-id', note.id); // Set the unique ID as a data attribute

  // Make the note draggable
  noteElement.draggable = true;

  // Attach drag-and-drop event handlers
  noteElement.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', note.id.toString());
  });

  // Append the note element to the board
  const board = document.getElementById('board');
  board.appendChild(noteElement);
  console.log("renderNewNote function called upon");
}




// Handle WebSocket messages received from the server
socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const { type, data } = message;

    if (type === 'INIT') {
        // Handle initial data (list of existing notes)
        data.forEach((note) => {
          renderNewNote(note);
            // Implement code to render existing notes on the board
        });
    } else if (type === 'ADD_NOTE') {
        // Handle a new note added by another user
        // Implement code to render the new note on the board
        console.log("Received a new note with text:", data.text);
        renderNewNote(data);
        console.log("Should have added note?");
    } else if (type === 'MOVE_NOTE') {
        // Handle a note moved by another user
        const noteId = data.id;
        const newX = data.x;
        const newY = data.y;
    
        // Find the note element on the board by its ID
        const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);

        if (noteElement) {
            // Update the position of the note element
            noteElement.style.left = `${newX}px`;
            noteElement.style.top = `${newY}px`;
    }
    }
});

socket.addEventListener('open', (event) => {
  console.log('WebSocket connection opened.');
});

socket.addEventListener('close', (event) => {
  console.log('WebSocket connection closed.');
});

socket.addEventListener('error', (error) => {
  console.error('WebSocket error:', error);
});

console.log("End of app.js");

// Example usage:
// You can call these functions when needed, e.g., when a user interacts with your HTML/CSS interface.

// To add a new note:
// addNote('This is a new note');

// To move an existing note:
// moveNote(noteId, newX, newY);
