const { RedisStore } = require('connect-redis');
const session = require("express-session");
const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
const port = 3000;
require("dotenv").config();

const redisClient = require("./config/redis");
// Routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");


app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new RedisStore({client: redisClient}),
    secret: process.env.SESSION_SECRET || "SuPeReXtRaSeCrEtKeY",
    resave: false,
    saveUninitialized: false,
    sameSite: "lax",
    cookie: { secure: false, httpOnly: true, maxAge: 8*60*60*1000 }, //8h 
  })
);

app.get("/", (req, res) => {
  res.send("hello world");
});

app.use("/auth", authRoutes);
app.use("/user", userRoutes);

app.listen(port, () => {
  console.log("Howdy!");
});