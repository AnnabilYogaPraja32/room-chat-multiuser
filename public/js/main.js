// ================== SOCKET ==================
const socket = io(window.location.origin);

// ================== STATE ==================
let currentUser = {
    id: null,
    full_name: "Guest",
    username: "guest",
    email: ""
};

// 🔥 chat target (GLOBAL / PRIVATE)
let activeChat = {
    type: "global", // global | private
    to: null        // username target
};

let typingTimeout = null;

// ================== INIT ==================
document.addEventListener("DOMContentLoaded", async () => {
    await fetchUserData();
    initEventListeners();

    // default load global chat
    socket.emit("load_messages");
});

// ================== FETCH USER ==================
async function fetchUserData() {
    try {
        const res = await fetch('/api/me');

        if (!res.ok) {
            window.location.href = '/login.html';
            return;
        }

        currentUser = await res.json();

        document.getElementById('navUsername').innerText = currentUser.full_name;

        document.getElementById('editFullName').value = currentUser.full_name;
        document.getElementById('editEmail').value = currentUser.email || "";

    } catch (err) {
        console.error("Gagal ambil user:", err);
    }
}

// ================== EVENT LISTENERS ==================
function initEventListeners() {

    // Enter untuk kirim
    UI.msgInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    // Tombol kirim
    if (UI.sendBtn) {
        UI.sendBtn.addEventListener("click", sendMessage);
    }

    // 🔥 Typing debounce (ANTI SPAM)
    UI.msgInput.addEventListener("input", () => {
        socket.emit("typing", {
            to: activeChat.to,
            type: activeChat.type
        });

        clearTimeout(typingTimeout);

        typingTimeout = setTimeout(() => {
            socket.emit("stop_typing", {
                to: activeChat.to,
                type: activeChat.type
            });
        }, 1000);
    });
}

// ================== SWITCH CHAT (🔥 PRIVATE CHAT) ==================
function openPrivateChat(username) {
    activeChat = {
        type: "private",
        to: username
    };

    UI.clearChat();
    UI.setChatHeader(`Chat dengan ${username}`);

    socket.emit("load_private_messages", {
        to: username
    });
}

// 🔥 balik ke global
function openGlobalChat() {
    activeChat = {
        type: "global",
        to: null
    };

    UI.clearChat();
    UI.setChatHeader("Global Chat");

    socket.emit("load_messages");
}

// ================== SEND MESSAGE ==================
async function sendMessage() {
    const msg = UI.msgInput.value.trim();
    const file = UI.fileInput.files[0];

    let fileUrl = null;
    let fileType = null;

    // 🔹 Upload file
    if (file) {
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Upload gagal");
            }

            fileUrl = data.url;
            fileType = data.type;

        } catch (err) {
            console.error("Upload error:", err);
            alert("Gagal upload file");
            return;
        }
    }

    if (!msg && !fileUrl) return;

    const payload = {
        msg,
        fileUrl,
        fileType,
        to: activeChat.to,
        type: activeChat.type
    };

    socket.emit("send_message", payload);

    UI.clearInputs();
}

// ================== RECEIVE MESSAGE ==================
socket.on("receive_message", (data) => {

    // 🔥 filter private chat
    if (data.type === "private") {
        const isForMe =
            (data.from === currentUser.username && data.to === activeChat.to) ||
            (data.from === activeChat.to && data.to === currentUser.username);

        if (!isForMe) return;
    }

    const isMe = data.from === currentUser.username;

    UI.appendMessage({
        user: data.from,
        msg: data.msg,
        fileUrl: data.fileUrl,
        time: data.time
    }, isMe);

    UI.scrollToBottom();
});

// ================== GLOBAL CHAT HISTORY ==================
socket.on("chat_history", (messages) => {
    UI.clearChat();

    messages.forEach(msg => {
        const isMe = msg.sender === currentUser.username;

        UI.appendMessage({
            user: msg.sender,
            msg: msg.content,
            fileUrl: msg.file_url,
            time: msg.created_at
        }, isMe);
    });

    UI.scrollToBottom();
});

// ================== PRIVATE CHAT HISTORY ==================
socket.on("private_history", (messages) => {
    UI.clearChat();

    messages.forEach(msg => {
        const isMe = msg.sender === currentUser.username;

        UI.appendMessage({
            user: msg.sender,
            msg: msg.content,
            fileUrl: msg.file_url,
            time: msg.created_at
        }, isMe);
    });

    UI.scrollToBottom();
});

// ================== ONLINE USERS ==================
socket.on("online_users", (users) => {
    UI.updateOnlineUsers(users, currentUser.username, openPrivateChat);
});

// ================== TYPING ==================
socket.on("user_typing", ({ from }) => {
    if (from !== currentUser.username) {
        UI.showTyping(from);
    }
});

socket.on("stop_typing", () => {
    UI.hideTyping();
});

// ================== CALL ==================
const videoCallBtn = document.getElementById("videoCallBtn");

if (videoCallBtn) {
    videoCallBtn.onclick = () => {
        socket.emit("call_signal", {
            from: currentUser.username,
            to: activeChat.to,
            type: "video"
        });

        alert("Memanggil...");
    };
}

socket.on("incoming_call", (data) => {
    UI.showCallNotification(
        data.from,
        () => console.log("Call accepted"),
        () => console.log("Call rejected")
    );
});

// ================== DEBUG ==================
socket.on("connect", () => {
    console.log("Connected:", socket.id);
});

socket.on("disconnect", () => {
    console.log("Disconnected");
});