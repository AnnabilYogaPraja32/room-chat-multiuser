const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
require('dotenv').config();

const db = require('./config/db');

const app = express();
const server = http.createServer(app);

// ================== SOCKET.IO ==================
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ================== ONLINE USERS ==================
let onlineUsers = new Map(); 
// key: username → value: socket.id

// ================== MIDDLEWARE ==================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// ================== PASSPORT ==================
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
},
async (accessToken, refreshToken, profile, done) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE google_id = ?', [profile.id]
        );

        if (rows.length > 0) return done(null, rows[0]);

        const [result] = await db.execute(
            'INSERT INTO users (full_name, username, email, google_id) VALUES (?, ?, ?, ?)',
            [
                profile.displayName,
                profile.emails[0].value,
                profile.emails[0].value,
                profile.id
            ]
        );

        const newUser = {
            id: result.insertId,
            full_name: profile.displayName,
            username: profile.emails[0].value,
            email: profile.emails[0].value
        };

        done(null, newUser);
    } catch (err) {
        done(err);
    }
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ================== AUTH ROUTES ==================
app.get('/api/me', (req, res) => {
    if (req.session.user) res.json(req.session.user);
    else res.status(401).json({ message: "Tidak login" });
});

app.post('/register', async (req, res) => {
    const { full_name, username, email, password } = req.body;

    try {
        const hash = await bcrypt.hash(password, 10);

        await db.execute(
            'INSERT INTO users (full_name, username, email, password) VALUES (?, ?, ?, ?)',
            [full_name, username, email, hash]
        );

        res.redirect('/login.html');
    } catch {
        res.status(500).send("Register gagal");
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [users] = await db.execute(
            'SELECT * FROM users WHERE username = ?', [username]
        );

        if (users.length && await bcrypt.compare(password, users[0].password)) {
            req.session.user = users[0];
            res.redirect('/');
        } else {
            res.send("Login gagal");
        }
    } catch {
        res.status(500).send("Error server");
    }
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html' }),
    (req, res) => {
        req.session.user = req.user;
        res.redirect('/');
    }
);

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login.html'));
});

// ================== AUTH PROTECTION ==================
app.use((req, res, next) => {
    const publicRoutes = [
        '/login.html',
        '/register.html',
        '/auth/google',
        '/auth/google/callback'
    ];

    if (!req.session.user && !publicRoutes.includes(req.path)) {
        return res.redirect('/login.html');
    }

    next();
});

// ================== STATIC ==================
app.use(express.static('public'));

// ================== FILE UPLOAD ==================
const storage = multer.diskStorage({
    destination: 'public/uploads/',
    filename: (req, file, cb) =>
        cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send("No file");

    res.json({
        url: `/uploads/${req.file.filename}`,
        type: req.file.mimetype
    });
});

// ================== SHARE SESSION ==================
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

// ================== SOCKET.IO ==================
io.on('connection', (socket) => {
    const session = socket.request.session;

    if (!session.user) return;

    const user = session.user;
    const username = user.username;

    console.log("Connected:", username);

    // 🔥 ONLINE USERS
    onlineUsers.set(username, socket.id);
    io.emit('online_users', Array.from(onlineUsers.keys()));

    // 🔥 JOIN GLOBAL
    socket.join("global");

    // ================== JOIN PRIVATE ==================
    socket.on("join_private", (targetUser) => {
        const room = [username, targetUser].sort().join("-");
        socket.join(room);
    });

    // ================== SEND MESSAGE ==================
    socket.on('send_message', async (data) => {
        try {
            const { msg, fileUrl, targetUser } = data;
            const time = new Date();

            let room = "global";

            if (targetUser) {
                room = [username, targetUser].sort().join("-");
            }

            await db.execute(
                'INSERT INTO messages (sender, content, file_url) VALUES (?, ?, ?)',
                [username, msg, fileUrl || null]
            );

            io.to(room).emit('receive_message', {
                user: username,
                msg,
                fileUrl,
                time,
                room
            });

        } catch (err) {
            console.error(err);
        }
    });

    // ================== TYPING ==================
    socket.on("typing", (targetUser) => {
        let room = "global";

        if (targetUser) {
            room = [username, targetUser].sort().join("-");
        }

        socket.to(room).emit("user_typing", username);
    });

    // ================== CALL ==================
    socket.on('call_signal', (data) => {
        socket.broadcast.emit('incoming_call', data);
    });

    // ================== DISCONNECT ==================
    socket.on('disconnect', () => {
        onlineUsers.delete(username);
        io.emit('online_users', Array.from(onlineUsers.keys()));

        console.log("Disconnected:", username);
    });
});

// ================== START SERVER ==================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});