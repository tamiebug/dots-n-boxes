import React, { useEffect, useState, useContext } from "react";
import { SocketContext } from "../SocketContext.js";
import { GameMenuContext } from "../GameMenu";

export function GameLobbyComponent() {
  const { getGameLobbyHandler } = useContext( SocketContext );
  const gameLobbyHandler = getGameLobbyHandler();
  const { linkTo, formData } = useContext( GameMenuContext );

  const [ lobbyState, setLobbyState ] = useState( gameLobbyHandler.getLobbyState() );

  useEffect(() => {
    gameLobbyHandler.setChangeListener( newLobbyState => setLobbyState( newLobbyState ) );
    return function cleanup() {
      gameLobbyHandler.setChangeListener( null );
    };
  }, []);

  useEffect(() => {
    if ( !lobbyState.isValidLobby ) {
      goBack();
    }
  }, [ lobbyState ]);

  function goBack() {
    if ( lobbyState.isHost ) {
      linkTo("Host Game Lobby");
    } else {
      linkTo("Available Games List");
    }
    gameLobbyHandler.leaveLobby();
  }

  const generateDialogString = () => {
    if ( lobbyState.isHost ) {
      if ( lobbyState.playerNames.guest ) {
        if ( lobbyState.readyStatus.host ) {
          return `Waiting for guest ${ lobbyState.playerNames.guest } to press the Ready button...`;
        } else {
          return `Press the 'Start Game' button to proceed with match against ${ lobbyState.playerNames.guest }`;
        }
      } else {
        return `Waiting for a player to join Game Lobby...`;
      }
    } else { // lobbyState.isHost == false
      if ( lobbyState.readyStatus.guest ) {
        return `Waiting for host ${ lobbyState.playerNames.host } to start game`;
      } else {
        return `Press Ready to begin`;
      }
    }
  };

  const leftButton = formData.isHost ?
    <button onClick={ () => gameLobbyHandler.kickGuest() }>Kick Player</button> :
    <button onClick={ () => gameLobbyHandler.leaveLobby() }>Leave Lobby</button>;

  const isReady = lobbyState.readyStatus[ lobbyState.isHost ? 'host' : 'guest' ];
  const rightButton =
    <button className={ isReady ? "ready" : "" } onClick={ () => gameLobbyHandler.switchReadyStatus() } >
      { lobbyState.isHost ? "Start Game" : "Ready" }
    </button>;

  return (
    <div className="gameLobbyDiv">
      <p> { generateDialogString() } </p>
      <div className="buttonsDiv">
        { leftButton } { rightButton }
      </div>
    </div>
  );
}