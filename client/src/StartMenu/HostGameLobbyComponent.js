import React, { useState, useContext } from "react";
import { MIN_BOARD_SIZE, MAX_BOARD_SIZE } from "../GameStore.js";
import { SocketContext } from "../SocketContext.js";
import { createSelect } from "./createSelect";
import { GameMenuContext } from "../GameMenu";

export function HostGameLobbyComponent({ previousSettings }) {
  const { startLobby } = useContext(SocketContext);
  const [ localFormData, setLocalFormData ] = useState({ boardSize: previousSettings.boardWidth, gameLobbyDescription: "" });
  const { linkTo, formData, setFormData } = useContext( GameMenuContext );

  const boardSizeSelect = createSelect(
    [...Array(MAX_BOARD_SIZE - MIN_BOARD_SIZE)].map((_, index) => `${index + MIN_BOARD_SIZE} x ${index + MIN_BOARD_SIZE}`),
    `${previousSettings.boardWidth} x ${previousSettings.boardHeight}`,
    { name: "boardSize", id: "hostGameBoardSizeSelect", onChange: e => setLocalFormData({ ...localFormData, boardSize: e.target.value }) }
  );

  const onFormSubmit = e => {
    e.preventDefault();
    const cb = success => {
      if ( success ) {
        console.log(`Hosting w/ name: ${formData.onlineName}, size: ${localFormData.boardSize} and description: ${localFormData.gameLobbyDescription}`);
        setFormData({ ...formData, isHost: true, ...localFormData });
        linkTo("Game Lobby");
      } else {
        console.log(`Hosting failed`);
      }
    };
    startLobby( { ...localFormData }, formData.onlineName, cb );
  };

  return (
    <form onSubmit={onFormSubmit}>
      <fieldset>
        <label>
          Choose Board Size:
          {boardSizeSelect}
        </label>
        <label>
          Choose Game Description:
          <input type="text" name="game" value={localFormData.gameLobbyDescription}
            onChange={e => setLocalFormData({ ...localFormData, gameLobbyDescription: e.target.value })} />
        </label>
        <input type="submit" value="Host" />
      </fieldset>
    </form>
  );
}