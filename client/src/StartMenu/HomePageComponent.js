import React, { useContext } from "react";
import { useGameStore } from "../GameStore";
import { GameMenuContext } from "../GameMenu";

export function HomePageComponent({ setGameSettingsAndKillMenu }) {
  const [ gameState ] = useGameStore();
  const { linkTo, formData } = useContext( GameMenuContext );

  function useSavedSettings(event) {
    event.preventDefault();
    setGameSettingsAndKillMenu({
      boardHeight: parseInt(formData.boardSize || formData.boardHeight),
      boardWidth: parseInt(formData.boardSize || formData.boardWidth),
      playerNames: [...formData.playerNames],
      gameType: formData.gameType,
      cpuDifficulty: formData.cpuDifficulty,
    });
  }

  return (
    <>
      <button className="gameMenuButton" onClick={() => linkTo("Choose Opponent Type")}>
        Play Locally
      </button>
      <button className="gameMenuButton" onClick={() => linkTo("Choose Online Name")}>
        Play Over Network
      </button>
      <button className="gameMenuButton" onClick={useSavedSettings}>
        Use { gameState.appSettings.savePreviousMatchSettings ? "Saved" : "Default" } Settings
      </button>
    </>
  );
}