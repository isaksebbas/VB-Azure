// Initialize WebSocket connection
//const socket = new WebSocket('ws://localhost:3000');
const socket = new WebSocket('wss://w-o-m-2023.azurewebsites.net');

// Store rendered notes and board-specific notes
let renderedNotes = [];
const boardNotes = {};
const notes = [];  // 


document.getElementById('addBoardButton').addEventListener('click', async () => {
  
  const boardName = document.getElementById('boardName').value;

  console.log(boardName, " : boardname to be added");

  try {
      const token = localStorage.getItem('token');

      //const response = await fetch('http://localhost:3000/addBoard', {
        const response = await fetch('https://w-o-m-2023.azurewebsites.net/addBoard', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ boardName, token })
      });

      const result = await response.json();

      if (response.ok) {
          alert(result.msg);
      } else {
          alert('Failed to add board. Please try again.');
      }
  } catch (error) {
      console.error('Error adding board:', error);
      alert('An error occurred while adding the board. Please try again.');
  }
});

// Function to send messages to the server
function sendMessage(type, data, boardId) {
    const message = { type, data, boardId };
    socket.send(JSON.stringify(message));
}

// Function to select a board
function selectBoard(boardId, selectedBoardId) {
    sendMessage('SELECT_BOARD', boardId, selectedBoardId);
    if (!boardNotes[boardId]) {
        boardNotes[boardId] = [];
    }
    unrenderNotes(selectedBoardId);
    return boardId;
}

// Event listener for board selection dropdown
document.getElementById('boardDropdown').addEventListener('change', (event) => {
    selectedBoardId = event.target.value;
    console.log(`Selected board ID: ${selectedBoardId}`);
    selectBoard(selectedBoardId);
});

// Function to add a new note
function addNote(text, selectedBoardId, x, y) {
  if (selectedBoardId) {
      sendMessage('ADD_NOTE', { text, x, y, boardId: selectedBoardId }, selectedBoardId);
  }

  if (selectedBoardId && boardNotes[selectedBoardId]) {
      const newNote = { id: Date.now(), text, x, y, boardId: selectedBoardId }; // Set initial x, y positions
      boardNotes[selectedBoardId].push(newNote);
  }
}

// Event listener for adding a note
document.getElementById('addNoteButton').addEventListener('click', () => {
    const noteText = document.getElementById('noteText').value.trim();
    if (noteText && selectedBoardId) {
        addNote(noteText, selectedBoardId);
        document.getElementById('noteText').value = '';
    }
});



// Function to move a note
function moveNote(id, x, y) {
    const noteElement = document.querySelector(`[data-note-id="${id}"]`);
    if (noteElement) {
        noteElement.style.left = `${x}px`;
        noteElement.style.top = `${y}px`;
    }
    sendMessage('MOVE_NOTE', { id, x, y }, selectedBoardId);
}

// Event listener for drag over
document.getElementById('board').addEventListener('dragover', (event) => {
    event.preventDefault();
});

// Event listener for drop
document.getElementById('board').addEventListener('drop', (event) => {
    const board = document.getElementById('board');
    try {
        event.preventDefault();
        const noteId = event.dataTransfer.getData('text/plain');
        const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
        if (noteElement) {
            const newX = event.clientX - board.getBoundingClientRect().left;
            const newY = event.clientY - board.getBoundingClientRect().top;
            moveNote(noteId, newX, newY);
        }
    } catch (error) {
        console.error('An error occurred while handling a drop event:', error);
    }
});

// Function to render a new note
function renderNewNote(note) {
    const noteElement = document.createElement('div');

    noteElement.className = 'note';
    noteElement.style.left = `${note.x}px`; // Set the left position
    noteElement.style.top = `${note.y}px`; // Set the top position
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
}

// WebSocket event listener for incoming messages
socket.addEventListener('message', (event) => {
    try {
        const message = JSON.parse(event.data);
        const { type, data } = message;

        if (type === 'INIT') {
          data.forEach((note) => {
            addToBoardNotes(note);
        });

        // If selectedBoardId is set, render notes for the selected board
        if (selectedBoardId) {
            unrenderNotes(selectedBoardId);
        }
        } else if (type === 'ADD_NOTE') {
          console.log("Received ADD_NOTE");
          const newNote = { id: data.id, text: data.text, x: data.x, y: data.y, boardId: selectedBoardId };
          notes.push(newNote);

          renderNewNote(newNote); // Render the new note

          wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({ type: 'ADD_NOTE', data: newNote }));
                  console.log("Sent a new note");
              }
          });

            
            
        } else if (type === 'MOVE_NOTE') {
            const noteId = data.id;
            const newX = data.x;
            const newY = data.y;

            const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);

            if (noteElement) {
                noteElement.style.left = `${newX}px`;
                noteElement.style.top = `${newY}px`;
            }
        } else if (type === 'UPDATE_NOTE_TEXT') {
            const noteId = data.id;
            const newText = data.text;

            const inputField = document.querySelector(`[data-note-id="${noteId}"] input`);

            if (inputField) {
                inputField.value = newText;
                console.log("From update note text eventlistener app.ks line 161, should now be updated to " + newText);
            }
        } else if (type === 'UPDATE_NOTE_CONTENT') {
          const noteId = data.id;
          const newContent = data.content;

          const note = notes.find((note) => note.id === parseInt(noteId));

          if (note) {
              note.content = newContent;

              // Broadcast the updated content to all connected clients
              wss.clients.forEach((client) => {
                  if (client.readyState === WebSocket.OPEN) {
                      client.send(JSON.stringify({ type: 'UPDATE_NOTE_CONTENT', data: { id: noteId, content: newContent } }));
                      console.log("Should now update for everyone the content?" + newContent + " + " + noteId);
                  }
              });
          }
      }
        }
     catch (e) {
        console.log("Error updating note", e);
    }
});

// WebSocket event listener for connection open
socket.addEventListener('open', async (event) => {
  console.log('WebSocket connection opened.');

  // If selectedBoardId is set, request notes for the selected board
  if (selectedBoardId) {
      sendMessage('REQUEST_NOTES', {}, selectedBoardId);
  }
});

// WebSocket event listener for connection close
socket.addEventListener('close', (event) => {
    console.log('WebSocket connection closed.');
});

// WebSocket event listener for error
socket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
});


// Function to unrender notes, backup
/*
function unrenderNotes(selectedBoardId) {
  const board = document.getElementById('board');
  board.innerHTML = '';

  if (selectedBoardId && boardNotes[selectedBoardId]) {
      console.log('Notes for selected board:', boardNotes[selectedBoardId]);
      boardNotes[selectedBoardId].forEach(note => {
          renderNewNote(note);
          renderedNotes.push(note);
      });
  }
}
*/
function unrenderNotes(selectedBoardId) {
  const board = document.getElementById('board');
  board.innerHTML = '';

  if (selectedBoardId && boardNotes[selectedBoardId]) {
      console.log('Notes for selected board:', boardNotes[selectedBoardId]);
      renderedNotes = boardNotes[selectedBoardId].slice(); // Copy notes for the selected board to renderedNotes
      boardNotes[selectedBoardId].forEach(note => {
          renderNewNote(note);
      });
  }
}




function addToBoardNotes(note) {
  if (!boardNotes[note.boardId]) {
      boardNotes[note.boardId] = [];
  }
  boardNotes[note.boardId].push(note);
}

function updateNoteContent(id, newContent) {
  const note = renderedNotes.find(note => note.id === id);
  if (note) {
      note.content = newContent;
      socket.send(JSON.stringify({ type: 'UPDATE_NOTE_CONTENT', data: { id, content: newContent } }));
      }
  }

  async function getUsersForDropdown() {
    console.log("Running getUsersForDropdown now");
    try {
      const response = await fetch('/users-dropdown');
      const users = await response.json();

      console.log("users: ", users);
  
      const accessDropdown = document.getElementById('accessDropdown');
      users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.text = user.name || user.email;
        accessDropdown.appendChild(option);
      });
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  document.getElementById('grantAccessBtn').addEventListener('click', async () => {
    const selectedUserId = document.getElementById('accessDropdown').value;
  
    if (selectedUserId) {
      const selectedBoardId = document.getElementById('boardDropdown').value;
      const boardId = selectedBoardId; 
  
      try {
        const response = await fetch(`/grant-access/${selectedUserId}/${boardId}`, {
          method: 'POST'
        });
  
        const updatedUser = await response.json();
        console.log('Access granted:', updatedUser);
      } catch (error) {
        console.error('Error granting access:', error);
      }
    }
  });


// Initial render of notes
renderedNotes = renderedNotes.filter(note => note.boardId === selectedBoardId);

document.addEventListener('DOMContentLoaded', getUsersForDropdown);

