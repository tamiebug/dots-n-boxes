export const clientApi = Object.freeze({
  GuestJoined: "GUEST_JOINED",
  GuestLeft: "GUEST_LEFT",
  GuestReady: "GUEST_READY",
  GuestNotReady: "GUEST_NOT_READY", 
  HostLeft: "HOST_LEFT",
  HostKicked: "HOST_KICKED",
  HostReady: "HOST_READY",
  HostNotReady: "HOST_NOT_READY",
  StartGame: "START_GAME",
  MoveAttempted: "MOVE_ATTEMPTED"
});

export const serverApi = Object.freeze({
  LeaveLobby: "LEAVE_LOBBY",
  CreateLobby: "CREATE_LOBBY",
  JoinLobby: "JOIN_LOBBY",
  PlayerStatusChange: "PLAYER_STATUS_CHANGE",
  KickPlayer: "KICK_PLAYER",
  ReserveName: "RESERVE_NAME",
  GetOpenGamesList: "GET_OPEN_GAMES_LIST",
  AttemptMove: "ATTEMPT_MOVE" 
});