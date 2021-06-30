import { Server } from 'socket.io';
import { createServer } from 'http';
import ioClient from "socket.io-client";
import { clientApi as cApi, serverApi as sApi } from "../api.js";
import { socketEventHandlers , clearDataStore } from "./socketEventHandlers.js";

const emitPromise = function (socket, command, data) {
  return new Promise(resolve => socket.emit(command, data, response => resolve(response)));
};

const responsePromise = function (socket, on) {
  return new Promise(resolve => socket.on(on, data => resolve(data)));
};

describe("The dots-n-boxes server", () => {
  const numClientSockets = 3;
  let clientSockets = new Array(numClientSockets).fill(null);
  let io;

  beforeAll( done => {
    const httpServer = createServer();
    io = new Server(httpServer);

    clearDataStore();
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSockets = clientSockets.map( () => new ioClient(`http://localhost:${port}`));

      io.on("connection", socket => { 
        // Hook up the test server to the incoming request handler methods
        Object.entries( socketEventHandlers ).forEach( ([ command, func ]) => 
          socket.on(command, (...args) => {
            const callback = typeof(args[args.length - 1]) === 'function' ? args[args.length - 1] : () => {};
            func({ data: args[0], callback, socket, io });
          }));
      });
      
      const clientConnectPromises = clientSockets.map( socket => new Promise(res => socket.on("connect", res)) );
      Promise.all(clientConnectPromises).then( done() );
    });
  });

  afterAll(() => {
    io.close();
    clientSockets.forEach( clientSocket => clientSocket.close());
  });

  test("properly lists hosted games", async () => {
    const clientSocket = clientSockets[0];
    const guestSocket = clientSockets[1];

    await expect(emitPromise(clientSocket, sApi.ReserveName, { name: "Paulie"}))
      .resolves.toEqual({ available : true });

    await expect(emitPromise(clientSocket, sApi.CreateLobby, { settings: { dimensions : { boardWidth: 5, boardHeight: 5}, description: "This is MY game!"}}))
      .resolves.toEqual({ success: true });

    await expect(emitPromise(clientSocket, sApi.GetOpenGamesList))
      .resolves.toMatchObject([{ dimensions: { boardWidth: 5, boardHeight: 5}, description: "This is MY game!", hostName: "Paulie"}]);

    await expect(emitPromise(guestSocket, sApi.JoinLobby, { userName: "Paulie" }).then( () => emitPromise(guestSocket, sApi.GetOpenGamesList, {})))
      .resolves.toEqual([]);
  });

  test("properly handles host kicking players", async () => {
    clearDataStore();
    const guestSocket = clientSockets[0];
    const hostSocket = clientSockets[1];
    const guestName = "Bob";
    const hostName = "Charles";
    const settings = { dimensions : { boardWidth: 4, boardHeight: 4}, description: "Best lobby around"};
    const guestKickedPromise = responsePromise(guestSocket, cApi.HostKicked);

    hostSocket.emit(sApi.ReserveName, { name: hostName });
    guestSocket.emit(sApi.ReserveName, { name: guestName });
    await expect(emitPromise(hostSocket, sApi.CreateLobby, { settings })).resolves.toEqual({ success: true });
    await expect(emitPromise(guestSocket, sApi.JoinLobby, { userName: hostName })).resolves.toEqual({ success: true });

    await expect(emitPromise(hostSocket, sApi.KickPlayer))
      .resolves.toEqual({ success: true });
    await expect(guestKickedPromise).resolves;
  });

  test("refuses second register attempt of same name", async() => {
    clearDataStore();
    const clientSocket = clientSockets[0];
    const impostorSocket = clientSockets[1];
    const clientName = "Corey";

    await expect(emitPromise(clientSocket, sApi.ReserveName, { name: clientName }))
      .resolves.toEqual({ available: true });
    await expect(emitPromise(impostorSocket, sApi.ReserveName, { name: clientName }))
      .resolves.toEqual({ available: false , pairAlreadyExists: false });
  });

  test("rejects game lobby creation attempt with invalid or missing settings", async () => {
    clearDataStore();
    const hostSocket = clientSockets[0];
    const badSettings = [ 
      {},
      { dimensions: { boardWithd: 6, boardHeight: 6}, description: "This is a game"},
      { dimensins: { boardWidth: 6, boardHeight: 6}, description: "This is a game"},
      { dimensions: { boardWidth: 6, boardheight: 6}, descriptoin: "This is a game"},
      { dimensions: { boardWidth: 1, boardHeight: 1}, description: "This is a game"},
      { dimensions: { boardWidth: 4000, boardHeight: 4000 }, description: "This is a game"}
    ];

    for (const badSetting in badSettings) {
      await expect(emitPromise(hostSocket, sApi.CreateLobby, badSetting))
        .resolves.toMatchObject({ success: false });
    }
  });

  test("properly rejects leaving game lobby when you're not in one", async () => {
    clearDataStore();
    const guestSocket = clientSockets[0]; 

    await expect(emitPromise(guestSocket, sApi.LeaveLobby, ""))
      .resolves.toMatchObject({ success: false });
  });

  test('properly rejects issuing player kick command when not host of a game', async () => {
    clearDataStore();
    const guestSocket = clientSockets[0];
    const hostSocket = clientSockets[1];
    const guestName = "Clarence";
    const hostName = "Juan";
    const settings = { dimensions: { boardWidth: 6, boardHeight: 6}, description: "This is a game"};

    hostSocket.emit(sApi.ReserveName, { name: hostName });
    guestSocket.emit(sApi.ReserveName, { name: guestName });

    await expect(emitPromise(hostSocket, sApi.KickPlayer))
      .resolves.toMatchObject({ success: false });
    await expect(emitPromise(hostSocket, sApi.CreateLobby, { settings }))
      .resolves.toEqual({ success: true });
    await expect(emitPromise(hostSocket, sApi.KickPlayer))
      .resolves.toMatchObject({ success: false });
    await expect(emitPromise(guestSocket, sApi.JoinLobby, { userName: hostName }))
      .resolves.toEqual({ success: true });
    await expect(emitPromise(guestSocket, sApi.KickPlayer))
      .resolves.toMatchObject({ success: false });
  });

  describe("properly handles multiple players", () => {
    beforeAll(() => clearDataStore());
    afterAll(() => clearDataStore());
    const names = ["John", "Paulie", "Trish"];

    const gameSettings = [
      { dimensions : { boardWidth: 4, boardHeight: 4}, description: "Best lobby around"},
      { dimensions : { boardWidth: 10, boardHeight: 10}, description: "Pros only pls n thnk you"},
      { dimensions : { boardWidth: 7, boardHeight: 7}, description: "Lucky game, join now"}
    ];
  
    test("registering their names", async () => {
      for (const [index, name] of names.entries()) {
        await expect(emitPromise(clientSockets[index], sApi.ReserveName, { name }))
          .resolves.toEqual({ available: true });
      }
    });

    test("trying to create games", async () => {
      for ( const [index, settings] of gameSettings.entries()) {
        await expect(emitPromise(clientSockets[index], sApi.CreateLobby, { settings }))
          .resolves.toEqual({ success: true });
      }
    });

    test("listing created games", async () => {
      for ( const [socketIndex] of names.entries()) {
        await expect(emitPromise(clientSockets[socketIndex], sApi.GetOpenGamesList))
          .resolves.toMatchObject(gameSettings.map( (settings, settingsIndex) => ({...settings, hostName: names[settingsIndex], gameId: expect.anything()}) ));
      }
    });
    
    test("trying to leave created lobbies", async () => {
      await expect(emitPromise(clientSockets[0], sApi.LeaveLobby))
        .resolves.toEqual({ success: true });
      await expect(emitPromise(clientSockets[2], sApi.LeaveLobby))
        .resolves.toEqual({ success: true });
      await expect(emitPromise(clientSockets[1], sApi.GetOpenGamesList))
        .resolves.toMatchObject([{ hostName: names[1]}]);
    });

    
    test("trying to join same lobby", async () => {
      const hostPromise = responsePromise(clientSockets[1], cApi.GuestJoined);

      await expect(emitPromise(clientSockets[0], sApi.JoinLobby, { userName: names[1] }))
        .resolves.toEqual({ success : true });
      await expect(emitPromise(clientSockets[2], sApi.JoinLobby, { userName: names[1] }))
        .resolves.toEqual({ success : false });
      await expect(hostPromise)
        .resolves.toEqual({ playerName: names[0]});
    });

    test("players readying and starting game", async () => {
      const createSocketPromise = socket => responsePromise(socket, cApi.StartGame);
      const guestSocket = clientSockets[0];
      const hostSocket = clientSockets[1];
      const hostPromise = createSocketPromise(hostSocket);
      const guestPromise = createSocketPromise(guestSocket);

      await expect(emitPromise(guestSocket, sApi.PlayerStatusChange, { ready: true }))
        .resolves.toEqual({ success: true });
      await expect(emitPromise(hostSocket, sApi.PlayerStatusChange, { ready: true }))
        .resolves.toEqual({ success: true });
   
      await expect(emitPromise(clientSockets[2], sApi.PlayerStatusChange, { ready: true }))
        .resolves.toEqual({ success: false, reason: "Cannot find associated player gameId.  Are they in a game?"});

      await expect(hostPromise)
        .resolves.toEqual({ settings: { dimensions: { boardWidth: 10, boardHeight: 10 }}});
      await expect(guestPromise)
        .resolves.toEqual({ settings: { dimensions: { boardWidth: 10, boardHeight: 10 }}});
    });
  });
});
