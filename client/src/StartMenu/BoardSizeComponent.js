import React from "react";
import { MAX_BOARD_SIZE, MIN_BOARD_SIZE } from "../GameStore";
import { createSelect } from "./createSelect";

function BoardSizeSelectElement ({ formData, setFormData, previousSettings }) {
  return createSelect(
    [...Array(MAX_BOARD_SIZE - MIN_BOARD_SIZE)].map((_, index) => `${index + MIN_BOARD_SIZE} x ${index + MIN_BOARD_SIZE}`),
    `${previousSettings.boardWidth} x ${previousSettings.boardHeight}`,
    { name: "boardSize", id: "boardSizeSelect", onChange: e => setFormData({...formData, boardSize: e.target.value })}
  );
}

export function BoardSizeComponent({ formData, setFormData, setGameSettingsAndKillMenu, previousSettings }) {
  function onFormSubmit(event) {
    event.preventDefault();
    setGameSettingsAndKillMenu({
      boardHeight: parseInt(formData.boardSize || formData.boardHeight),
      boardWidth: parseInt(formData.boardSize || formData.boardWidth),
      playerNames: [...formData.playerNames],
      gameType: formData.gameType,
      cpuDifficulty: formData.cpuDifficulty,
    });
  } 

  return <form onSubmit={onFormSubmit}>
    <fieldset>
      <legend>Board Size</legend>
      <label>
        choose Board Size:
        <BoardSizeSelectElement {... { formData, setFormData, previousSettings }} />
      </label>
      <input type="submit" value="go" />
    </fieldset>
  </form>;
}