//Elements for adding from input field via button to drop down
const itemInput = document.getElementById('itemInput');
const addItemButton = document.getElementById('addItemButton');
const dropdownMenu = document.querySelector('.dropdown-menu');

//TEST DATABASE
/*
fetch('/query')
  .then((response) => response.json())
  .then((data) => {
    // Update the DOM with the data
    //check type of data before structuring
    console.log(data + 'datatype');


    //const id = data[0]; // Assuming the result is an array with a single value

    //const id = data[0].id; // Assuming the result is an array of objects


    document.querySelector('#result').innerText = `ID: ${data}`;
  })

  .catch((error) => {
    console.error('Error fetching data:', error.message);
  });

*/

if (!localStorage.getItem('pastebin_token')) {
    localStorage.setItem('pastebin_token', prompt('Enter token'));
}

WS_TOKEN = localStorage.getItem('pastebin_token') || 'my-secret-token';
        
// wss = SSL-krypterad
WS_URL = `wss://w-o-m-2023.azurewebsites.net/?token=${WS_TOKEN}` 
//WS_URL = `ws://localhost:3030?token=${WS_TOKEN}`

console.log(WS_URL);


// Create a WebSocket connection
const socket = new WebSocket(WS_URL);

// Connection established 
socket.onopen = function (event) {
    console.log('Connected to WebSocket server');

    document.querySelector('#itemInput').addEventListener('input', (evt) => {
            socket.send(JSON.stringify({
                type: 'paste',
                text: evt.target.value
            }));
        });
};

// Event listener for the "Add Item" button click
addItemButton.addEventListener('click', () => {

    const newItemName = itemInput.value;
    
    // Send the new item name to the server using Websockets
    socket.send(JSON.stringify({ action: 'add_item', itemName: newItemName }));

});

   // WebSocket event listener for messages from the server
   socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    
    // Check if the server is sending an updated list of items
    if (data.action === 'update_items') {
      updateDropdownMenu(data.items);
    }
  });

  // Function to update the dropdown menu with the new items
  function updateDropdownMenu(items) {
    // Clear existing items
    dropdownMenu.innerHTML = '';
    
    // Add the new items to the dropdown
    items.forEach((item) => {
      const dropdownItem = document.createElement('a');
      dropdownItem.classList.add('dropdown-item');
      dropdownItem.href = '#';
      dropdownItem.textContent = item;
      dropdownMenu.appendChild(dropdownItem);
    });
  }


        

        // Message listener
        socket.onmessage = function (event) {
            console.log('Received message:', event.data);
            const data = JSON.parse(event.data);

            if (data.type == 'paste') {
                document.querySelector('#out').innerText = data.text;
                document.querySelector('#err').innerText = '';
            } else if (data.type == 'error') {
                document.querySelector('#err').innerText = data.msg;
            }
            
        };

        

        

        // Connection closed 
        socket.onclose = function (event) {
            console.log('Connection closed');
        };