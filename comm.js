module.exports = { dispatch };

require('dotenv').config();

// SETUP
const { Server } = require("socket.io");
const io = new Server(process.env.WSPORT, {
    cors: {
        origin: "https://jaskaa.com:8765",
        methods: ["GET", "POST"],
        allowedHeaders: ["Access-Control-Allow-Origin"]
    }
});

var MainSocket = null;

// MESSAGES
io.on("connection", (socket) => {
    MainSocket = socket;
    console.log(`Connection initiated: ${socket.id}`);
    
    socket.on("disconnect", () => {
        console.log(`Client disconnected ${socket.id}`); // undefined
    });

    socket.on("recv_Msg", (args) => {});
    
});

io.on("connect_error", (err) => {
    console.log("event: connection error");
    console.log("connection error");
});


function dispatch(msg) {
    if (!MainSocket) { return null; }

    console.log(`msg dispatch: ${msg}`);
    io.emit(msg);
}
