// guest_script.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Same Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCUOOLfb98oxiZoGuZB_GVES2up0lMA3FA",
    authDomain: "qmusik-2006b.firebaseapp.com",
    projectId: "qmusik-2006b",
    storageBucket: "qmusik-2006b.firebasestorage.app",
    messagingSenderId: "904530626138",
    appId: "1:904530626138:web:0e2bc984a639b0773eba63"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
    const guestJoinDiv = document.getElementById("guest-join");
    const guestCodeInput = document.getElementById("guest-code");
    const joinBtn = document.getElementById("join-session");
    const joinError = document.getElementById("join-error");

    joinBtn.addEventListener("click", async () => {
        const code = guestCodeInput.value.trim().toLowerCase();

        if (code.length !== 5) {
            joinError.textContent = "Code must be 5 characters.";
            joinError.style.display = "block";
            return;
        }

        const sessionRef = doc(db, "sessions", code);
        const snap = await getDoc(sessionRef);

        if (!snap.exists()) {
            joinError.textContent = "Invalid code or session not found.";
            joinError.style.display = "block";
            return;
        }

        joinError.style.display = "none";
        joinBtn.style.display = "none";
        guestCodeInput.style.display = "none";

        const guestJoinNote = document.createElement("p");
        guestJoinNote.id = "guest-join-note";
        guestJoinNote.textContent = "Playlist Joined!!. Code is " + code;
        guestJoinNote.style.display = "block";
        guestJoinNote.classList.add("text-muted");
        guestJoinDiv.appendChild(guestJoinNote);

        // Load search + queue UI
        fetch("search_res_queue.html")
            .then(res => res.text())
            .then(html => {
                document.getElementById("search-res-q").innerHTML = html;

                // Hide join UI after success
                document.getElementById("guest-join").style.display = "none";

                initializeGuestUI(code);
            });
    });
});

// ---------------------------------------------
// GUEST: SEARCH + ADD TO QUEUE + LIVE QUEUE VIEW
// ---------------------------------------------

function initializeGuestUI(sessionCode) {
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

        // Clear results when input field is empty
    searchBox.addEventListener("input", () => {
        if (searchBox.value.trim() === "") {
            resultsDiv.innerHTML = `<p id="sr-song-placeholder" class="text-muted">Search for a song above…</p>`;
        }
    });

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

    // ---- Append to Firestore queue (guest can add songs) ----
    async function addToQueue(song) {
        const sessionRef = doc(db, "sessions", sessionCode);
        const snapshot = await getDoc(sessionRef);
        const existingQueue = snapshot.data()?.queue || [];

        const newQueue = [...existingQueue, song];

        await setDoc(sessionRef, { queue: newQueue }, { merge: true });
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

                await addToQueue(songObj);
                // Host will auto play / update – guest just adds.
            });

            resultsDiv.appendChild(card);
        });
    }

    // ---- Live queue listener (guest sees current queue + highlight) ----
    const sessionRef = doc(db, "sessions", sessionCode);

    onSnapshot(sessionRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const queue = data.queue || [];
        const nowPlayingVideoId = data.nowPlayingVideoId || null;

        renderQueue(queue, nowPlayingVideoId);
    });

    function renderQueue(queue, nowPlayingVideoId) {
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
            `;

            if (nowPlayingVideoId && song.videoId === nowPlayingVideoId) {
                card.classList.add("now-playing");
            }

            queueDiv.appendChild(card);
        });
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
}