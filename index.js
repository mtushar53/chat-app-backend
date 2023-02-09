const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const messageRoute = require("./routes/messagesRoutes");
const socket = require("socket.io");

dotenv.config();
app.use(cors());
app.use(express.json());

app.use("/api/auth", userRoutes);
app.use("/api/message", messageRoute);

//mongoose connection
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("DB Connection Successful!");
  })
  .catch((err) => console.log(err));

const server = app.listen(process.env.PORT, () => {
  console.log(`Server started on Port ${process.env.PORT}`);
});

const io = socket(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

//store all online users inside this map
global.onlineUsers = [];

io.on("connection", (socket) => {
  global.chatSocket = socket;
  socket.on("add-user", (userId) => {
    console.log("user added", userId);
    console.log("socket id", socket.id);
    const alreadyAddedUser = onlineUsers.find((item) => item.key == userId);
    if (!alreadyAddedUser) onlineUsers.push({ key: userId, value: socket.id });
    else alreadyAddedUser.value = socket.id;
  });

  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.find((item) => item.key == data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket.value).emit("msg-recieved", data.message);
    }
  });

  socket.on("typing", (data) => {
    const sendUserSocket = onlineUsers.find((item) => item.key == data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket.value).emit("is-typing", data.from);
    }
  });

  socket.on("not-typing", (data) => {
    const sendUserSocket = onlineUsers.find((item) => item.key == data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket.value).emit("is-typing", null);
    }
  });

  socket.on("disconnect", (reason) => {
    if (reason === "io server disconnect") {
      // the disconnection was initiated by the server, you need to reconnect manually
      socket.connect();
    }
  });

  setInterval(() => {
    socket.emit("online-users", onlineUsers);
  }, 5000);

});
