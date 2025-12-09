// TODO
// Kill session
// Update Queue

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCUOOLfb98oxiZoGuZB_GVES2up0lMA3FA",
    authDomain: "qmusik-2006b.firebaseapp.com",
    projectId: "qmusik-2006b",
    storageBucket: "qmusik-2006b.firebasestorage.app",
    messagingSenderId: "904530626138",
    appId: "1:904530626138:web:0e2bc984a639b0773eba63"
};

// Global playback state (host-side)
let isPlaying = false;
let playTimer = null;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkSessionExists(code) {
    const sessionRef = doc(db, "sessions", code);
    const snap = await getDoc(sessionRef);
    if (snap.exists()) {
        await setDoc(sessionRef, { hostActive: true }, { merge: true });
        return true;
    }
    return false;
}

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

    const generatedCodeElement = document.createElement("p");
    generatedCodeElement.id = "generated-code";
    playlistDiv.appendChild(generatedCodeElement);

    const genCodeNote = document.createElement("p");
    genCodeNote.id = "gen-code-note";
    genCodeNote.textContent = "Share this code with others to join your playlist!";
    genCodeNote.style.display = "none";
    genCodeNote.classList.add("text-muted");
    playlistDiv.appendChild(genCodeNote);

    const refreshBtn = document.createElement("button");
    refreshBtn.id = "refresh-code";
    refreshBtn.textContent = "Generate New Code";
    refreshBtn.classList.add("vintage-btn", "mt-2");
    refreshBtn.style.display = "none";
    playlistDiv.appendChild(refreshBtn);

    const createPlaylistBtn = document.createElement("button");
    createPlaylistBtn.id = "cr-playlist-btn";
    createPlaylistBtn.textContent = "Create Playlist";
    createPlaylistBtn.classList.add("vintage-btn", "mt-3");
    createPlaylistBtn.style.display = "none";
    playlistDiv.appendChild(createPlaylistBtn);

    // Generate a random 5-character code
    function generateRandomCode(length) {
        const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            result += characters[randomIndex];
        }
        return result;
    }

    generateCodeButton.addEventListener("click", () => {
        const code = generateRandomCode(5);
        generatedCodeElement.textContent = `Code: ${code}`;
        showNewUIFields();
        hideOldUIFields();
        processSessionExists(code);
    });

    refreshBtn.addEventListener("click", () => {
        showOldUIFields();
        inputField.value = "";
        generatedCodeElement.textContent = "";
        hideNewUIFields();
    });

    inputField.addEventListener("input", () => {
        const enteredCode = inputField.value.trim();

        if (enteredCode.length === 5) {
            generatedCodeElement.textContent = `Code: ${enteredCode}`;
            showNewUIFields();
            hideOldUIFields();
            processSessionExists(enteredCode);
        } else {
            generatedCodeElement.textContent = "";
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
                document.getElementById("search-res-q").innerHTML = html;

                // Attach event listeners inside the loaded HTML for THIS session
                initializeSearchUI(sessionCode);
            });
    });
});

// -------------------------------------------------
// SEARCH + QUEUE + PLAYBACK FOR A GIVEN SESSION
// -------------------------------------------------

function initializeSearchUI(sessionCode) {
    const searchBox = document.getElementById("search-box");
    const searchBtn = document.getElementById("search-song-btn");
    const resultsDiv = document.getElementById("search-results");
    const queueDiv = document.getElementById("queue");

    const API_KEY = "AIzaSyA6Ncf-06nnKsNExGaCyzsMdddLeGJiefc";

    // ---- Parse ISO duration like PT4M10S into seconds ----
    function parseDuration(iso) {
        let match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

        const hours = parseInt(match?.[1] || 0);
        const minutes = parseInt(match?.[2] || 0);
        const seconds = parseInt(match?.[3] || 0);

        return hours * 3600 + minutes * 60 + seconds;
    }

    // ---- Search YouTube + fetch duration ----
    async function searchYouTube(query) {
        const searchUrl =
            `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(query)}&key=${API_KEY}`;

        const searchRes = await fetch(searchUrl).then(res => res.json());
        let items = searchRes.items || [];

        // Fetch duration for each result
        for (let item of items) {
            const vid = item.id.videoId;
            const videoMetaUrl =
                `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${vid}&key=${API_KEY}`;

            const videoDetails = await fetch(videoMetaUrl).then(r => r.json());
            const durationISO = videoDetails.items?.[0]?.contentDetails?.duration || "PT3M";
            const durationSec = parseDuration(durationISO);

            item.duration = durationSec;
        }

        return items;
    }

    // ---- Append to Firestore queue and tell if this was first song ----
    async function addToQueue(sessionCode, song) {
        const sessionRef = doc(db, "sessions", sessionCode);
        const snapshot = await getDoc(sessionRef);
        const existingQueue = snapshot.data()?.queue || [];

        const isFirst = existingQueue.length === 0;
        const newQueue = [...existingQueue, song];

        await setDoc(sessionRef, { queue: newQueue }, { merge: true });

        return isFirst;
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

            card.querySelector(".add-btn").addEventListener("click", async () => {
                const songObj = {
                    title,
                    videoId,
                    thumbnail,
                    duration: item.duration
                };

                // Update UI immediately
                addSongToQueueUI(songObj);

                // Persist to Firestore and know if this is the first song
                const firstSong = await addToQueue(sessionCode, songObj);

                // Auto start ONLY when first song is added
                if (firstSong) {
                    isPlaying = true;
                    playFromIndex(sessionCode, 0);
                }
            });

            resultsDiv.appendChild(card);
        });
    }

    // ---- Queue UI: Add item with Play + Remove ----
    function addSongToQueueUI(song) {
        document.getElementById("queue-placeholder")?.remove();

        const card = document.createElement("div");
        card.className = "d-flex align-items-center mb-2 queue-item";
        card.dataset.videoId = song.videoId;

        card.innerHTML = `
            <img src="${song.thumbnail}" width="60" height="60" class="rounded me-2">
            <p class="mb-0 flex-grow-1">${song.title}</p>
            <button class="btn play-btn me-2">Play</button>
            <button class="btn remove-btn me-2">Remove</button>
        `;

        // Manual play: start playback from this song
        card.querySelector(".play-btn").addEventListener("click", () => {
            startPlaybackFrom(sessionCode, song.videoId);
        });

        // Remove from queue
        card.querySelector(".remove-btn").addEventListener("click", () => {
            removeSongFromQueue(sessionCode, song.videoId, card);
        });

        queueDiv.appendChild(card);
    }

    // ---- Highlight "Now Playing" ----
    function highlightCurrentPlaying(videoId) {
        document.querySelectorAll(".queue-item").forEach(card => {
            card.classList.remove("now-playing");
        });

        document.querySelectorAll(".queue-item").forEach(card => {
            if (card.dataset.videoId === videoId) {
                card.classList.add("now-playing");
            }
        });
    }

    // ---- Play from a given index in Firestore queue ----
    async function playFromIndex(sessionCode, index) {
        const sessionRef = doc(db, "sessions", sessionCode);
        const snap = await getDoc(sessionRef);
        const data = snap.data() || {};
        const queue = data.queue || [];

        if (!queue.length || index >= queue.length) {
            await setDoc(sessionRef, { nowPlayingVideoId: null }, { merge: true });
            isPlaying = false;
            return;
        }

        const song = queue[index];
        // Save now playing to Firestore so guests can see highlight
        await setDoc(sessionRef, { nowPlayingVideoId: song.videoId }, { merge: true });

        highlightCurrentPlaying(song.videoId);
        playSong(song.videoId);

        const durationSec =
            song.duration && song.duration > 0 ? song.duration : 180;

        clearTimeout(playTimer);
        playTimer = setTimeout(() => {
            playFromIndex(sessionCode, index + 1);
        }, durationSec * 1000);
    }

    // ---- Start playback from a specific videoId ----
    function startPlaybackFrom(sessionCode, videoId) {
        clearTimeout(playTimer);
        isPlaying = true;

        const sessionRef = doc(db, "sessions", sessionCode);
        getDoc(sessionRef).then(snap => {
            const data = snap.data() || {};
            const queue = data.queue || [];

            const idx = queue.findIndex(s => s.videoId === videoId);
            if (idx === -1) return;

            playFromIndex(sessionCode, idx);
        });
    }

    // ---- Remove song from Firestore queue + UI ----
    async function removeSongFromQueue(sessionCode, videoId, cardElement) {
        const sessionRef = doc(db, "sessions", sessionCode);
        const sessionSnapshot = await getDoc(sessionRef);
        const currentQueue = sessionSnapshot.data()?.queue || [];

        const updatedQueue = currentQueue.filter(song => song.videoId !== videoId);

        await setDoc(sessionRef, { queue: updatedQueue }, { merge: true });

        cardElement.remove();

        if (updatedQueue.length === 0) {
            const placeholder = document.createElement("p");
            placeholder.id = "queue-placeholder";
            placeholder.className = "text-muted";
            placeholder.textContent = "No songs in queue yet…";
            queueDiv.appendChild(placeholder);
            clearTimeout(playTimer);
            isPlaying = false;
        }
    }

    // ---- Open YouTube Music / Browser ----
    function playSong(videoId) {
        const appLink = `youtubemusic://music.youtube.com/watch?v=${videoId}`;
        const browserLink = `https://music.youtube.com/watch?v=${videoId}`;

        window.location.href = appLink;

        setTimeout(() => {
            window.open(browserLink, "_blank");
        }, 500);
    }

    // ---- Search button ----
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

    // Clear results when input field is empty
    searchBox.addEventListener("input", () => {
        if (searchBox.value.trim() === "") {
            resultsDiv.innerHTML = `<p id="sr-song-placeholder" class="text-muted">Search for a song above…</p>`;
        }
    });

    // ---- Live queue listener (guest sees current queue + highlight) ----
    const sessionRef = doc(db, "sessions", sessionCode);

    onSnapshot(sessionRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const queue = data.queue || [];
        const nowPlayingVideoId = data.nowPlayingVideoId || null;

        renderLiveQueue(queue, nowPlayingVideoId);
    });

    function renderLiveQueue(queue, nowPlayingVideoId) {
        queueDiv.innerHTML = "";
        if (queue.length === 0) {
            const placeholder = document.createElement("p");
            placeholder.id = "queue-placeholder";
            placeholder.className = "text-muted";
            placeholder.textContent = "No songs in queue yet…";
            queueDiv.appendChild(placeholder);
            return;
        }

        queue.forEach(song => {
            const card = document.createElement("div");
            card.className = "d-flex align-items-center mb-2 queue-item";
            card.dataset.videoId = song.videoId;

            card.innerHTML = `
            <img src="${song.thumbnail}" width="60" height="60" class="rounded me-2">
            <p class="mb-0 flex-grow-1">${song.title}</p>
            <button class="btn play-btn me-2">Play</button>
            <button class="btn remove-btn me-2">Remove</button>
        `;

            // Manual play: start playback from this song
            card.querySelector(".play-btn").addEventListener("click", () => {
                startPlaybackFrom(sessionCode, song.videoId);
            });

            // Remove from queue
            card.querySelector(".remove-btn").addEventListener("click", () => {
                removeSongFromQueue(sessionCode, song.videoId, card);
            });

            if (nowPlayingVideoId && song.videoId === nowPlayingVideoId) {
                card.classList.add("now-playing");
            }

            queueDiv.appendChild(card);
        });

    }
}

async function restoreExistingQueueUI(sessionCode) {
    const queueDiv = document.getElementById("queue");
    const sessionRef = doc(db, "sessions", sessionCode);
    const snap = await getDoc(sessionRef);

    const queue = snap.data()?.queue || [];
    const nowPlaying = snap.data()?.nowPlayingVideoId || null;

    if (queue.length === 0) return;

    // Remove placeholder
    document.getElementById("queue-placeholder")?.remove();

    queue.forEach(song => {
        const card = document.createElement("div");
        card.className = "d-flex align-items-center mb-2 queue-item";
        card.dataset.videoId = song.videoId;

        // If song is currently playing → highlight it
        if (song.videoId === nowPlaying) {
            card.classList.add("now-playing");
        }

        card.innerHTML = `
            <img src="${song.thumbnail}" width="60" height="60" class="rounded me-2">
            <p class="mb-0 flex-grow-1">${song.title}</p>
            <button class="btn play-btn me-2">Play</button>
            <button class="btn remove-btn me-2">Remove</button>
        `;

        // Play event
        card.querySelector(".play-btn").addEventListener("click", () => {
            startPlaybackFrom(sessionCode, song.videoId);
        });

        // Remove event
        card.querySelector(".remove-btn").addEventListener("click", () => {
            removeSongFromQueue(sessionCode, song.videoId, card);
        });

        queueDiv.appendChild(card);
    });
}

async function processSessionExists(sessionCode) {
    const refreshBtn = document.getElementById("refresh-code");
    const createPlaylistBtn = document.getElementById("cr-playlist-btn");
    const sessionExists = await checkSessionExists(sessionCode);
    if (sessionExists) {
        refreshBtn.style.display = "none";
        createPlaylistBtn.style.display = "none";

        fetch("search_res_queue.html")
            .then(res => res.text())
            .then(html => {
                document.getElementById("search-res-q").innerHTML = html;

                // Attach event listeners inside the loaded HTML for THIS session
                initializeSearchUI(sessionCode);

                // Restore existing queue only if session already existed

                // restoreExistingQueueUI(sessionCode);
            });
    }
}