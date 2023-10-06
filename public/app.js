

console.log("App.js loaded");

//const socket = new WebSocket('ws://localhost:3000'); // Replace 'your-server-url' with your actual WebSocket server URL
const socket = new WebSocket('wss://20.107.224.52:3000');

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

// Function to update the content of a note
function updateNoteContent(id, content) {
  console.log("Updating note content for ID:", id, "to:", content);
  sendMessage('UPDATE_NOTE_CONTENT', { id, content });
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
  noteElement.style.left = '50px'; // Set the initial position
  noteElement.style.top = '50px';
  noteElement.setAttribute('data-note-id', note.id); // Set the unique ID as a data attribute

  // Make the note draggable
  noteElement.draggable = true;

  // Attach drag-and-drop event handlers
  noteElement.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('text/plain', note.id.toString());
  });

  // Create a separate element for displaying the note's title or label
  const titleElement = document.createElement('div');
  titleElement.className = 'note-title';
  titleElement.textContent = note.text || ''; // Set the initial title based on the note's text

  // Create an input field for editing the note's content
  const inputField = document.createElement('input');
  inputField.type = 'text';
  inputField.value = note.content || ''; // Set the initial value based on the note's content
  inputField.addEventListener('input', (event) => {
    // When the input field value changes, update the content and send an update to the server
    const newContent = event.target.value;
    updateNoteContent(note.id, newContent);
  });

  // Append the title element and input field to the note element
  noteElement.appendChild(titleElement);
  noteElement.appendChild(inputField);

  // Append the note element to the board
  const board = document.getElementById('board');
  board.appendChild(noteElement);

  // Display the note title if it exists and is not undefined
  if (note.text !== undefined) {
    console.log('Received note with title:', note.text); // Log the received note title
    titleElement.textContent = note.text; // Set the title element's text
  } else {
    console.log('Received note with undefined title. Note:', note); // Log the entire note object
  }
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
  } else if (type === 'UPDATE_NOTE_TEXT') {
    // Handle an update to a note's text
    const noteId = data.id;
    const newText = data.text;

    // Find the input field for the note by its ID
    const inputField = document.querySelector(`[data-note-id="${noteId}"] input`);

    if (inputField) {
      // Update the input field's value
      inputField.value = newText;
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

