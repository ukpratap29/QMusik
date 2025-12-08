// TODO
// Kill session
// Update Queue

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCUOOLfb98oxiZoGuZB_GVES2up0lMA3FA",
    authDomain: "qmusik-2006b.firebaseapp.com",
    projectId: "qmusik-2006b",
    storageBucket: "qmusik-2006b.firebasestorage.app",
    messagingSenderId: "904530626138",
    appId: "1:904530626138:web:0e2bc984a639b0773eba63"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createNewSession(code) {
    await setDoc(doc(db, "sessions", code), {
        createdAt: Date.now(),
        queue: [],
        hostActive: true
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const playlistDiv = document.getElementById("cr-playlist");
    const generateCodeButton = document.getElementById("gen-code");
    const inputField = document.getElementById("enter-code");
    const orText = document.getElementById("or");

    const generatedCodeElement = document.createElement("p"); // Create a div to hold the code
    generatedCodeElement.id = "generated-code"; // Add an ID for styling or reference
    playlistDiv.appendChild(generatedCodeElement); // Append it to the body or a specific container

    const genCodeNote = document.createElement("p");
    genCodeNote.id = "gen-code-note";
    genCodeNote.textContent = "Share this code with others to join your playlist!";
    genCodeNote.style.display = "none"; // initially hidden
    genCodeNote.classList.add("text-muted");
    playlistDiv.appendChild(genCodeNote); // appended but hidden

    const refreshBtn = document.createElement("button");
    refreshBtn.id = "refresh-code";
    refreshBtn.textContent = "Generate New Code";
    refreshBtn.classList.add("vintage-btn", "mt-2");
    refreshBtn.style.display = "none";  // initially hidden
    playlistDiv.appendChild(refreshBtn);

    const createPlaylistBtn = document.createElement("button");
    createPlaylistBtn.id = "cr-playlist-btn";
    createPlaylistBtn.textContent = "Create Playlist";
    createPlaylistBtn.classList.add("vintage-btn", "mt-3");
    createPlaylistBtn.style.display = "none";  // initially hidden
    playlistDiv.appendChild(createPlaylistBtn);

    // Handle "Generate Code" button click
    generateCodeButton.addEventListener("click", () => {
        // Generate a random 5-character code
        const code = generateRandomCode(5);
        // Display the generated code
        generatedCodeElement.textContent = `Code: ${code}`;
        showNewUIFields();
        hideOldUIFields();
    });

    refreshBtn.addEventListener("click", () => {
        showOldUIFields();
        inputField.value = "";

        generatedCodeElement.textContent = "";
        hideNewUIFields();
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
        if (enteredCode.length == 5) {
            generatedCodeElement.textContent = `Code: ${enteredCode}`;
            showNewUIFields();
            hideOldUIFields();
        } else {
            generatedCodeElement.textContent = ""; // Clear the text if input is empty
            hideNewUIFields();
        }
    });

    function hideOldUIFields() {
        inputField.style.display = "none";
        orText.style.display = "none";
        generateCodeButton.style.display = "none";
    }

    function showOldUIFields() {
        inputField.style.display = "block";
        orText.style.display = "block";
        generateCodeButton.style.display = "block";
    }

    function hideNewUIFields() {
        genCodeNote.style.display = "none";
        refreshBtn.style.display = "none";
        createPlaylistBtn.style.display = "none";
    }

    function showNewUIFields() {
        genCodeNote.style.display = "block";
        refreshBtn.style.display = "block";
        createPlaylistBtn.style.display = "block";
    }

    createPlaylistBtn.addEventListener("click", async () => {
        const sessionCode = generatedCodeElement.textContent.replace("Code: ", "");
        await createNewSession(sessionCode);
        refreshBtn.style.display = "none";
        createPlaylistBtn.style.display = "none";
        fetch("search_res_queue.html")
            .then(res => res.text())
            .then(html => {
                document.getElementById('search-res-q').innerHTML = html;

                // Attach event listeners inside the loaded HTML
                initializeSearchUI(sessionCode);
            });
    });
});


// ---------------------------------------------
// SEARCH + ADD TO QUEUE FUNCTIONALITY
// ---------------------------------------------

function initializeSearchUI(sessionCode) {

    const searchBox = document.getElementById("search-box");
    const searchBtn = document.getElementById("search-song-btn");
    const resultsDiv = document.getElementById("search-results");
    const queueDiv = document.getElementById("queue");

    const API_KEY = "AIzaSyA6Ncf-06nnKsNExGaCyzsMdddLeGJiefc";

    // ---- Search Function ----
    async function searchYouTube(query) {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(query)}&key=${API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();
        return data.items || [];
    }

    // ---- Update Firebase Queue ----
    async function addToQueue(song) {
        const sessionRef = doc(db, "sessions", sessionCode);

        await setDoc(sessionRef, {
            queue: [song],
        }, { merge: true });
    }

    // ---- Render Search Results ----
    function renderResults(items) {
        resultsDiv.innerHTML = "";

        items.forEach(item => {
            const videoId = item.id.videoId;
            const title = item.snippet.title;
            const thumbnail = item.snippet.thumbnails.default.url;

            const card = document.createElement("div");
            card.className = "d-flex align-items-center mb-2";

            card.innerHTML = `
                <img src="${thumbnail}" width="60" height="60" class="rounded me-2">
                <div class="flex-grow-1">
                    <p class="mb-0" style="font-size: 0.9rem;">${title}</p>
                </div>
                <button class="btn add-btn">Add</button>
            `;

            // Add button click
            card.querySelector(".add-btn").addEventListener("click", () => {
                addSongToQueueUI({ title, videoId, thumbnail });
                addToQueue({ title, videoId, thumbnail });
            });

            resultsDiv.appendChild(card);
        });
    }

    // ---- Show item in Queue (UI only) ----
    function addSongToQueueUI(song) {
        document.getElementById("queue-placeholder")?.remove();

        const card = document.createElement("div");
        card.className = "d-flex align-items-center mb-2 queue-item";
        card.dataset.videoId = song.videoId; // Store id for removal

        card.innerHTML = `
        <img src="${song.thumbnail}" width="60" height="60" class="rounded me-2">
        <p class="mb-0 flex-grow-1">${song.title}</p>
        <button class="btn play-btn me-2">Play</button>
        <button class="btn remove-btn">Remove</button>
    `;

        // Attach Remove click handler
        card.querySelector(".remove-btn").addEventListener("click", () => {
            removeSongFromQueue(song.videoId, card);
        });

        // Play click handler
        card.querySelector(".play-btn").addEventListener("click", () => {
            playSong(song.videoId);
        });

        queueDiv.appendChild(card);
    }

    // ---- Button Click Listener ----
    searchBtn.addEventListener("click", async () => {
        const query = searchBox.value.trim();
        if (!query) return;

        resultsDiv.innerHTML = `<p class="text-muted">Searching…</p>`;

        const results = await searchYouTube(query);

        if (results.length === 0) {
            resultsDiv.innerHTML = `<p class="text-muted">No results found</p>`;
            return;
        }

        renderResults(results);
    });

    async function removeSongFromQueue(videoId, cardElement) {
        const sessionRef = doc(db, "sessions", sessionCode);

        // Read current queue
        const sessionSnapshot = await getDoc(sessionRef);
        let currentQueue = sessionSnapshot.data()?.queue || [];

        // Filter out removed song
        const updatedQueue = currentQueue.filter(song => song.videoId !== videoId);

        // Update database
        await setDoc(sessionRef, { queue: updatedQueue }, { merge: true });

        // Remove UI element
        cardElement.remove();

        // Show placeholder if queue becomes empty
        if (updatedQueue.length === 0) {
            const placeholder = document.createElement("p");
            placeholder.id = "queue-placeholder";
            placeholder.className = "text-muted";
            placeholder.textContent = "No songs in queue yet…";
            queueDiv.appendChild(placeholder);
        }

    }

    function playSong(videoId) {
        const appLink = `youtubemusic://music.youtube.com/watch?v=${videoId}`;
        const browserLink = `https://music.youtube.com/watch?v=${videoId}`;

        // Try opening YouTube Music app
        window.location.href = appLink;

        // Fallback to browser player
        setTimeout(() => {
            window.open(browserLink, "_blank");
        }, 500);
    }
}