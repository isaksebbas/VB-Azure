console.log("App.js log from line 3, loading app.js now...");

const socket = new WebSocket('ws://localhost:3000');

let renderedNotes = [];
const boardNotes = {};



document.getElementById('addBoardButton').addEventListener('click', async () => {
  
  const boardName = document.getElementById('boardName').value;

  console.log(boardName, " : boardname to be added");

  try {
      const token = localStorage.getItem('token');

      const response = await fetch('http://localhost:3000/addBoard', {
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

function sendMessage(type, data, boardId) {
    console.log(data + "data in sendMessage");
    const message = { type, data, boardId };
    socket.send(JSON.stringify(message));
    console.log("message sent using function sendMessage to server");
}

function selectBoard(boardId, selectedBoardId) {
    sendMessage('SELECT_BOARD', boardId, selectedBoardId);
    if (!boardNotes[boardId]) {
        boardNotes[boardId] = [];
    }
    unrenderNotes(selectedBoardId);
    return boardId;
}

document.getElementById('boardDropdown').addEventListener('change', (event) => {
  selectedBoardId = event.target.value; // Update the existing selectedBoardId variable
  console.log(`Selected board ID: ${selectedBoardId}`);
  selectBoard(selectedBoardId);
});


function addNote(text, selectedBoardId) {
    if (selectedBoardId) {
        sendMessage('ADD_NOTE', { text: text, boardId: selectedBoardId }, selectedBoardId);
        console.log("sent ADD_NOTE");
    } else {
        console.error("Selected board ID is not defined.");
    }

    if (selectedBoardId && boardNotes[selectedBoardId]) {
        const newNote = { id: Date.now(), text: text, x: 0, y: 0, boardId: selectedBoardId };
        boardNotes[selectedBoardId].push(newNote);
    }
}

function updateNoteContent(id, content) {
    console.log("Updating note content for ID:", id, "to:", content);
    sendMessage('UPDATE_NOTE_CONTENT', { id, content }, selectedBoardId);
}

const addNoteButton = document.getElementById('addNoteButton');
const noteTextInput = document.getElementById('noteText');

addNoteButton.addEventListener('click', () => {
    const noteText = noteTextInput.value.trim();
    if (noteText && selectedBoardId) {
        addNote(noteText, selectedBoardId);
        noteTextInput.value = '';
    } else {
        console.error("Note text or selected board ID is not defined.");
    }
});

function moveNote(id, x, y) {
    const noteElement = document.querySelector(`[data-note-id="${id}"]`);

    if (noteElement) {
        noteElement.style.left = `${x}px`;
        noteElement.style.top = `${y}px`;
    }

    sendMessage('MOVE_NOTE', { id, x, y }, selectedBoardId);
}

const board = document.getElementById('board');

board.addEventListener('dragover', (event) => {
    event.preventDefault();
});

board.addEventListener('drop', (event) => {
    try {
        event.preventDefault();
        const noteId = event.dataTransfer.getData('text/plain');
        const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);

        if (noteElement) {
            const newX = event.clientX - board.getBoundingClientRect().left;
            const newY = event.clientY - board.getBoundingClientRect().top;

            moveNote(noteId, newX, newY);
            console.log("dropping note at new positions (x and y): " + newX + " + " + newY);
        }
    } catch (error) {
        console.error('An error occurred while handling a drop event:', error);
    }
});

function renderNewNote(note) {
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
}

socket.addEventListener('message', (event) => {
    try {
        const message = JSON.parse(event.data);
        const { type, data } = message;

        if (type === 'INIT') {
            data.forEach((note) => {
                renderNewNote(note);
            });
        } else if (type === 'ADD_NOTE') {
            console.log("Received a new note with text:", data.text);
            renderNewNote(data);
            console.log("Should have added note?");
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

            const inputField = document.querySelector(`[data-note-id="${noteId}"] input`);

            if (inputField) {
                inputField.value = newContent;
                console.log("Updated note content to: " + newContent);
            }
        }
    } catch (e) {
        console.log("Error updating note");
    }
});

socket.addEventListener('open', (event) => {
    console.log('WebSocket connection opened.');

    if (selectedBoardId) {
        renderedNotes = renderedNotes.filter(note => note.boardId === selectedBoardId);
        boardNotes[selectedBoardId].forEach(note => {
            renderNewNote(note);
        });
    }

    unrenderNotes(selectedBoardId);
});

socket.addEventListener('close', (event) => {
    console.log('WebSocket connection closed.');
});

socket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
});



function unrenderNotes(selectedBoardId) {
  if (selectedBoardId) {
      const board = document.getElementById('board');
      board.innerHTML = '';

      if (boardNotes[selectedBoardId]) {
          console.log('Notes for selected board:', boardNotes[selectedBoardId]);
          boardNotes[selectedBoardId].forEach(note => {
              renderNewNote(note);
              renderedNotes.push(note);
          });
      }
  }
}



console.log("End of app.js on note taking website");

renderedNotes = renderedNotes.filter(note => note.boardId === selectedBoardId);
boardNotes[selectedBoardId].forEach(note => {
    renderNewNote(note);
});

