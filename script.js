// ➤ INSERT YOUR API KEY HERE
const API_KEY = "AIzaSyA6Ncf-06nnKsNExGaCyzsMdddLeGJiefc";

// In-memory queue
let queue = [];
let mode = null;

// Mode selection
// function setMode(m) {
//   mode = m;
//   document.getElementById("modeSelect").classList.add("hidden");
//   document.getElementById("app").classList.remove("hidden");
// }

///////////////////////////////////////////////////
// Generate a random alphanumeric code and display it in the input field
document.addEventListener("DOMContentLoaded", () => {
    const playlistDiv = document.querySelector(".playlist");
    const generateCodeButton = document.querySelector(".gen-code");
    const inputField = document.getElementById("cs-placeholder");
    
    const generatedCodeElement = document.createElement("p"); // Create a div to hold the code
    generatedCodeElement.id = "generated-code"; // Add an ID for styling or reference
    playlistDiv.appendChild(generatedCodeElement); // Append it to the body or a specific container

    // Handle "Generate Code" button click
    generateCodeButton.addEventListener("click", () => {
        // Generate a random 5-character code
        const code = generateRandomCode(5);

        // Display the generated code
        generatedCodeElement.textContent = `Code: ${code}`;
    });

    // Function to generate a random alphanumeric code
    function generateRandomCode(length) {
        const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            result += characters[randomIndex];
        }
        return result;
    }

    // Handle input field changes
    inputField.addEventListener("input", () => {
        const enteredCode = inputField.value.trim();

        // Display the entered code if it's not empty
        if (enteredCode) {
            generatedCodeElement.textContent = `Code: ${enteredCode}`;
        } else {
            generatedCodeElement.textContent = ""; // Clear the text if input is empty
        }
    });

});

///////////////////////////////////////////////////

// Search YouTube for music videos
async function searchSongs() {
    const q = document.getElementById("searchBox").value;

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=10&q=${encodeURIComponent(q)}&key=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    renderResults(data.items);
}

function renderResults(items) {
    const list = document.getElementById("results");
    list.innerHTML = "";

    items.forEach(video => {
        const id = video.id.videoId;
        const title = video.snippet.title;
        const artist = video.snippet.channelTitle;
        const thumb = video.snippet.thumbnails.default.url;

        const li = document.createElement("li");
        li.className = "bg-gray-800 rounded p-3 flex items-center justify-between";

        li.innerHTML = `
      <div class="flex items-center gap-3">
        <img src="${thumb}" class="w-12 h-12 rounded" />
        <div>
          <div class="font-semibold">${title}</div>
          <div class="text-gray-400 text-sm">${artist}</div>
        </div>
      </div>
      <button class="btn-sm" onclick='addToQueue("${id}", "${title.replace(/"/g, "'")}")'>
        Add
      </button>
    `;

        list.appendChild(li);
    });
}

// Add to queue
function addToQueue(id, title) {
    queue.push({ id, title });
    renderQueue();
}

function renderQueue() {
    const list = document.getElementById("queue");
    list.innerHTML = "";

    queue.forEach((song, index) => {
        const li = document.createElement("li");
        li.className = "bg-gray-800 rounded p-3 flex justify-between items-center";

        li.innerHTML = `
      <span>${song.title}</span>
      ${mode === "master"
                ? `<button class="text-red-400" onclick="removeFromQueue(${index})">✕</button>`
                : ""
            }
    `;

        list.appendChild(li);
    });
}

function removeFromQueue(i) {
    queue.splice(i, 1);
    renderQueue();
}