document.addEventListener('DOMContentLoaded', function() {

console.log("App.js loaded");

const socket = new WebSocket('ws://localhost:3000'); // Replace 'your-server-url' with your actual WebSocket server URL
//const socket = new WebSocket('wss://w-o-m-2023.azurewebsites.net');

let selectedBoardId; // Global variable to store the selected board ID

let renderedNotes = []; 

const boardNotes = {}; 

// Function to send a message over the WebSocket
function sendMessage(type, data) {
    console.log(data + "data in sendMessage");
    const message = { type, data, boardId: selectedBoardId }; // Include selected board ID
    socket.send(JSON.stringify(message));
    console.log("message sent using function sendMessage to server");
}

function selectBoard(boardId) {
  sendMessage('SELECT_BOARD', boardId);
}



document.getElementById('boardDropdown').addEventListener('change', (event) => {
  selectedBoardId = event.target.value;
  console.log(`Selected board ID: ${selectedBoardId}`);
  selectBoard(selectedBoardId);
  // Unrender notes that belong to the previous board
  unrenderNotes();
});



function addNote(text) {
  if (selectedBoardId) {
    sendMessage('ADD_NOTE', { text: text, boardId: selectedBoardId });
    console.log("sent ADD_NOTE");
  } else {
    console.error("Selected board ID is not defined.");
  }
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
  if (noteText && selectedBoardId) { // Ensure selectedBoardId is defined
      addNote(noteText);
      noteTextInput.value = '';
  } else {
      console.error("Note text or selected board ID is not defined.");
  }
});


// Function to move a note to a new position
function moveNote(id, x, y) {
  const noteElement = document.querySelector(`[data-note-id="${id}"]`);

  if (noteElement) {
    noteElement.style.left = `${x}px`;
    noteElement.style.top = `${y}px`;
  }

  // Send the updated position to the server
  sendMessage('MOVE_NOTE', { id, x, y });
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

function renderNewNote(note) {
  console.log("Rendernewnote starts");

  if (!boardNotes[note.boardId]) {
    boardNotes[note.boardId] = [];
  }

  boardNotes[note.boardId].push(note);

  
  if (note.boardId === selectedBoardId) {
    const noteElement = document.createElement('div');
    noteElement.className = 'note';
    noteElement.style.left = '50px';
    noteElement.style.top = '50px';
    noteElement.setAttribute('data-note-id', note.id);

    noteElement.draggable = true;

    noteElement.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', note.id.toString());
    });

    const titleElement = document.createElement('div');
    titleElement.className = 'note-title';
    titleElement.textContent = note.text || '';

    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.value = note.content || '';
    inputField.addEventListener('input', (event) => {
      const newContent = event.target.value;
      updateNoteContent(note.id, newContent);
    });

    noteElement.appendChild(titleElement);
    noteElement.appendChild(inputField);

    const board = document.getElementById('board');
    board.appendChild(noteElement);

    if (note.text !== undefined) {
      console.log('Received note with title:', note.text);
      titleElement.textContent = note.text;
    } else {
      console.log('Received note with undefined title. Note:', note);
    }

    // Add note to the renderedNotes array
    renderedNotes.push(note);
  }
}


function unrenderNotes() {
  if (selectedBoardId) {
    const board = document.getElementById('board');
    board.innerHTML = '';

    if (boardNotes[selectedBoardId]) {
      boardNotes[selectedBoardId].forEach(note => {
        renderNewNote(note);
      });
    }

    // Clear the renderedNotes array
    renderedNotes = [];
  }
}


  // Update the renderedNotes array to only include notes from the current board
  renderedNotes = renderedNotes.filter(note => note.boardId === selectedBoardId);

  // Add the code below to re-render the notes from the selected board
  /*
  boardNotes[selectedBoardId].forEach(note => {
    renderNewNote(note);
  });
*/


function selectBoard(boardId) {
  sendMessage('SELECT_BOARD', boardId);

  // Initialize boardNotes for the selected board if it doesn't exist
  if (!boardNotes[boardId]) {
    boardNotes[boardId] = [];
  }

  // Unrender notes that belong to the previous board
  unrenderNotes();
}



// Handle WebSocket messages received from the server
socket.addEventListener('message', (event) => {
  console.log("Beginning of socket eventlistener");
  const message = JSON.parse(event.data);
  const { type, data } = message;

  if (type === 'INIT') {
    // Handle initial data (list of existing notes)
    data.forEach((note) => {
      renderNewNote(note);
      // Implement code to render existing notes on the board
    });
  } else if (type === 'ADD_NOTE') {
    console.log("Log data ADD_NOTE app.js:", data);
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
      console.log("From update note text eventlistener app.ks line 161, should now be updated to " + newText);
    }
  } else if (type === 'UPDATE_NOTE_CONTENT') {
    // Handle an update to a note's content
    const noteId = data.id;
    const newContent = data.content;

    // Find the input field for the note by its ID
    const inputField = document.querySelector(`[data-note-id="${noteId}"] input`);

    if (inputField) {
      // Update the input field's value with the new content
      inputField.value = newContent;
      console.log("Updated note content to: " + newContent);
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
});




