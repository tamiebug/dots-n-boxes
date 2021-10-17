import React, { useEffect, useState, useContext } from "react";
import { SocketContext, lobbyEvents, lobbyCommands } from "../SocketContext.js";

export function GameLobbyComponent({ setGameSettingsAndKillMenu, linkTo, formData }) {
  const { registerLobbyCallback, performLobbyCommand } = useContext(SocketContext);
  const [ hostReady, setHostReady ] = useState(false);
  const [ guestReady, setGuestReady ] = useState(false);

  const [{ hostName, guestName }, setPlayers] = useState(() => {
    if (formData.isHost)
      return { hostName: formData.onlineName, guestName: null };
    else
      return { hostName: formData.hostName, guestName: formData.onlineName };
  });

  const resetLobby = () => {
    setPlayers({ hostName: null, guestName: null });
    setHostReady(false);
    setGuestReady(false);
  };

  const goBack = () => {
    if (formData.isHost) {
      linkTo("Host Game Lobby");
    } else {
      linkTo("Available Games List");
    }
  };

  const lobbyEventCallback = event => {
    switch (event.type) {
    case lobbyEvents.HOST_LEFT:
      resetLobby();
      goBack();
      break;
    case lobbyEvents.HOST_READY:
      setHostReady(true);
      break;
    case lobbyEvents.HOST_NOT_READY:
      setHostReady(false);
      break;
    case lobbyEvents.GUEST_KICKED:
      resetLobby();
      alert("You have been kicked from lobby");
      goBack();
      break;
    case lobbyEvents.GUEST_JOINED:
      setPlayers({ hostName, guestName: event.playerName });
      break;
    case lobbyEvents.GUEST_LEFT:
      setPlayers({ hostName, guestName: null });
      break;
    case lobbyEvents.GUEST_READY:
      setGuestReady(true);
      break;
    case lobbyEvents.GUEST_NOT_READY:
      setGuestReady(false);
      break;
    case lobbyEvents.START_GAME:
      console.log("starting game");
      setGameSettingsAndKillMenu({
        boardHeight: event.settings.dimensions.boardHeight,
        boardWidth: event.settings.dimensions.boardWidth,
        playerNames: [hostName, guestName],
        gameType: "online",
        isHost: formData.isHost
      });
      break;
    }
  };

  useEffect(() => {
    registerLobbyCallback(lobbyEventCallback);
  });

  useEffect(() => {
    return function cleanup() {
      registerLobbyCallback(null);
    };
  }, []);

  const dialogString = () => {
    if (formData.isHost) {
      if (guestName) {
        if (hostReady) {
          return `Waiting for guest ${guestName} to press the Ready button...`;
        } else {
          return `Press the 'Start Game' button to proceed with match against ${guestName}`;
        }
      } else {
        return `Waiting for a player to join Game Lobby...`;
      }
    } else { // !formData.isHost
      if (guestReady) {
        return `Waiting for host ${hostName} to start game`;
      } else {
        return `Press Ready to begin`;
      }
    }
  };

  const startGameOnClick = () => {
    if (!hostReady) {
      performLobbyCommand(lobbyCommands.HOST_IS_READY);
      setHostReady(true);
    } else {
      performLobbyCommand(lobbyCommands.HOST_IS_NOT_READY);
      setHostReady(false);
    }
  };

  const readyOnClick = () => {
    if (!guestReady) {
      performLobbyCommand(lobbyCommands.GUEST_IS_READY);
      setGuestReady(true);
    } else {
      performLobbyCommand(lobbyCommands.GUEST_IS_NOT_READY);
      setGuestReady(false);
    }
  };

  const leftButton = formData.isHost ?
    <button onClick={() => performLobbyCommand(lobbyCommands.KICK_GUEST)}>Kick Player</button> :
    <button onClick={() => performLobbyCommand(lobbyCommands.LEAVE_LOBBY)}>Leave Lobby</button>;

  const rightButton = formData.isHost ?
    <button className={`${hostReady ? "ready" : ""}`} onClick={startGameOnClick}>Start Game</button> :
    <button className={`${guestReady ? "ready" : ""}`} onClick={readyOnClick}>Ready</button>;

  return (
    <div className="gameLobbyDiv">
      <p> {dialogString()} </p>
      <div className="buttonsDiv">
        {leftButton} {rightButton}
      </div>
    </div>
  );
}