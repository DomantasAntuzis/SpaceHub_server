const { RedisStore } = require('connect-redis');
const session = require("express-session");
const cookieParser = require("cookie-parser");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const port = 3000;
require("dotenv").config();

const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const redisClient = require("./config/redis");
const { registerRoomHandlers } = require("./realtime/rooms");
// Routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const roomRoutes = require("./routes/room.routes");


app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionMiddleware = session({
  store: new RedisStore({client: redisClient}),
  secret: process.env.SESSION_SECRET || "SuPeReXtRaSeCrEtKeY",
  resave: false,
  saveUninitialized: false,
  sameSite: "lax",
  cookie: { secure: false, httpOnly: true, maxAge: 8*60*60*1000 }, // 8h
});
app.use(sessionMiddleware);

// Realtime: sockets share the express session
const io = new Server(server, { cors: { origin: clientOrigin, credentials: true } });
io.engine.use(sessionMiddleware);
registerRoomHandlers(io);

app.get("/", (req, res) => {
  res.send("hello world");
});

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/room", roomRoutes);

server.listen(port, () => {
  console.log("Howdy!");
});