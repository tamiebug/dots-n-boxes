import { Server } from 'socket.io';

import { socketEventHandlers } from "./socketEventHandlers.js";
import log from "./logger.js";

const PORT = 1950;
const ORIGIN = "http://localhost:3000";

const io = new Server();

io.attach(PORT, { cors: {
  origin: ORIGIN,
  methods: ["GET", "POST"]
}});

io.on('connection', socket => {
  log.info(`a user connected, sockID ${socket.id} `);
  /* All of our commands take only one data variable followed by a callback
   * Using the ...args ensures that receiving a malformed request from a client with multiple data args doesn't
   * trip up the server
   */
  Object.entries(socketEventHandlers).forEach(([ command, func ]) => 
    socket.on(command, (...args) => {
      const callback = typeof(args[args.length - 1]) === 'function' ? args[args.length - 1] : () => {};
      func({ data: args[0], callback, socket, io });
    }));
});
