// ================== UI OBJECT ==================
const UI = {
    messagesDiv: document.getElementById('messages'),
    msgInput: document.getElementById('msgInput'),
    fileInput: document.getElementById('fileInput'),
    profileModal: document.getElementById('profileModal'),
    onlineUsersDiv: document.getElementById('onlineUsers'),
    chatHeader: document.getElementById('chatHeader'),

    typingIndicator: null,
    typingTimeout: null,
    activeUserEl: null,

    // ================== APPEND MESSAGE ==================
    appendMessage: (data, isMe = false) => {
        const wrapper = document.createElement('div');
        wrapper.className = `message-group ${isMe ? 'sent' : 'received'}`;

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        // 🔹 Username
        const name = document.createElement('div');
        name.className = 'user-name';
        name.textContent = isMe ? 'Anda' : data.user;

        const content = document.createElement('div');

        // 🔹 File
        if (data.fileUrl) {
            const isVideo = data.fileType && data.fileType.includes('video');

            if (isVideo) {
                const video = document.createElement('video');
                video.src = data.fileUrl;
                video.controls = true;
                video.className = 'chat-media';
                content.appendChild(video);
            } else {
                const img = document.createElement('img');
                img.src = data.fileUrl;
                img.className = 'chat-media';
                img.onclick = () => window.open(img.src);
                content.appendChild(img);
            }
        }

        // 🔹 Text
        if (data.msg) {
            const text = document.createElement('div');
            text.className = 'text-content';
            text.textContent = data.msg;
            content.appendChild(text);
        }

        // 🔹 Timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'timestamp';

        const time = data.time ? new Date(data.time) : new Date();

        timestamp.textContent = time.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        // 🔹 Build
        bubble.appendChild(content);
        bubble.appendChild(timestamp);

        wrapper.appendChild(name);
        wrapper.appendChild(bubble);

        UI.messagesDiv.appendChild(wrapper);
        UI.scrollToBottom();
    },

    // ================== ONLINE USERS ==================
    updateOnlineUsers: (users, currentUsername, onClickUser) => {
        if (!UI.onlineUsersDiv) return;

        UI.onlineUsersDiv.innerHTML = '';

        const uniqueUsers = new Map();

        users.forEach(u => {
            if (!uniqueUsers.has(u.username)) {
                uniqueUsers.set(u.username, u);
            }
        });

        // 🔹 Counter
        const counter = document.createElement('div');
        counter.className = 'online-count';
        counter.textContent = `Online: ${uniqueUsers.size}`;
        UI.onlineUsersDiv.appendChild(counter);

        // 🔹 List user
        uniqueUsers.forEach(user => {
            // ❌ skip diri sendiri
            if (user.username === currentUsername) return;

            const item = document.createElement('div');
            item.className = 'online-user';

            item.innerHTML = `
                <span class="status-dot"></span>
                <span class="online-name">${user.full_name}</span>
            `;

            // 🔥 CLICK USER → PRIVATE CHAT
            item.onclick = () => {
                // remove active sebelumnya
                if (UI.activeUserEl) {
                    UI.activeUserEl.classList.remove('active');
                }

                item.classList.add('active');
                UI.activeUserEl = item;

                UI.showSystemMessage(`Chat dengan ${user.full_name}`);

                if (onClickUser) {
                    onClickUser(user.username);
                }
            };

            UI.onlineUsersDiv.appendChild(item);
        });
    },

    // ================== CHAT HEADER ==================
    setChatHeader: (text) => {
        if (UI.chatHeader) {
            UI.chatHeader.textContent = text;
        }
    },

    // ================== CLEAR CHAT ==================
    clearChat: () => {
        UI.messagesDiv.innerHTML = '';
    },

    // ================== CLEAR INPUT ==================
    clearInputs: () => {
        UI.msgInput.value = '';
        UI.fileInput.value = '';
    },

    // ================== SCROLL ==================
    scrollToBottom: () => {
        UI.messagesDiv.scrollTop = UI.messagesDiv.scrollHeight;
    },

    // ================== MODAL ==================
    openModal: () => {
        if (UI.profileModal) UI.profileModal.style.display = 'flex';
    },

    closeModal: () => {
        if (UI.profileModal) UI.profileModal.style.display = 'none';
    },

    // ================== CALL ==================
    showCallNotification: (callerName, onAccept, onReject) => {
        const confirmCall = confirm(`📹 Panggilan dari ${callerName}. Terima?`);
        confirmCall ? onAccept() : onReject();
    },

    // ================== SYSTEM MESSAGE ==================
    showSystemMessage: (text) => {
        const el = document.createElement('div');
        el.className = 'system-message';
        el.textContent = text;

        UI.messagesDiv.appendChild(el);
        UI.scrollToBottom();
    },

    // ================== TYPING ==================
    showTyping: (username) => {
        if (!UI.typingIndicator) {
            UI.typingIndicator = document.createElement('div');
            UI.typingIndicator.className = 'typing-indicator';
            UI.messagesDiv.appendChild(UI.typingIndicator);
        }

        UI.typingIndicator.textContent = `${username} sedang mengetik...`;

        UI.scrollToBottom();

        clearTimeout(UI.typingTimeout);
        UI.typingTimeout = setTimeout(() => {
            UI.hideTyping();
        }, 1500);
    },

    hideTyping: () => {
        if (UI.typingIndicator) {
            UI.typingIndicator.remove();
            UI.typingIndicator = null;
        }
    }
};

// ================== GLOBAL ==================
window.UI = UI;