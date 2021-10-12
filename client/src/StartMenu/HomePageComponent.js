import React from "react";

export function HomePageComponent({ linkTo, formData, setGameSettingsAndKillMenu, appSettings }) {
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
        Use {appSettings.savePreviousMatchSettings ? "Saved" : "Default"} Settings
      </button>
    </>
  );
}