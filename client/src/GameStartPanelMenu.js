import React, { useState } from "react";

import { GameMenu } from './GameMenu.js';
import { appStates, useGameStore } from "./GameStore.js";
import { DEFAULT_GAME_SETTINGS } from "./GameEngine.js";

import { ChooseOnlineNameComponent } from "./StartMenu/ChooseOnlineNameComponent";
import { AvailableGamesListComponent } from "./StartMenu/AvailableGamesListComponent";
import { GameLobbyComponent } from "./StartMenu/GameLobbyComponent";
import { HostGameLobbyComponent } from "./StartMenu/HostGameLobbyComponent";
import { HomePageComponent } from "./StartMenu/HomePageComponent";
import { ChooseOpponentTypeComponent } from "./StartMenu/ChooseOpponentTypeComponent";
import { BoardSizeComponent } from "./StartMenu/BoardSizeComponent";
import { ChoosePlayerNameComponent } from "./StartMenu/ChoosePlayerNameComponent";
import { AIDifficultyComponent } from "./StartMenu/AIDifficultyComponent";

export function GameStartPanelMenu() {
  const [ gameState, gameStateDispatch ] = useGameStore();
  const [ previousSettings, setPreviousSettings ] = useState( () => loadPreviousSettings() );

  function loadPreviousSettings() {
    let previousGameSettings = {};
    if ( gameState.appSettings.savePreviousMatchSettings ) {
      const previousGameSettingsString = window.localStorage.getItem('Previous Game Settings');
      previousGameSettings = JSON.parse(previousGameSettingsString);
    }
    return { ...DEFAULT_GAME_SETTINGS, ...previousGameSettings };
  }

  function setGameSettingsAndKillMenu( settings ) {
    setPreviousSettings({ ...settings });
    if ( gameState.appSettings.savePreviousMatchSettings == true ) {
      const stringifiedSettings = JSON.stringify(settings);
      window.localStorage.setItem('Previous Game Settings', stringifiedSettings);
    }
    gameStateDispatch({ type: 'setUpGame', settings });
  }

  return <GameMenu name="GameMenu" startingItemName="Home Page" defaultFormSettings={ previousSettings } showMenu={ gameState.appState == appStates.PRE_MATCH }>
    <HomePageComponent name="Home Page" { ...{setGameSettingsAndKillMenu }}/>
    <ChooseOpponentTypeComponent name="Choose Opponent Type"/>
    <ChooseOnlineNameComponent name="Choose Online Name"/>
    <AvailableGamesListComponent name="Available Games List"/>
    <BoardSizeComponent name="Board Size" { ...{ setGameSettingsAndKillMenu, previousSettings }}/>
    <HostGameLobbyComponent name="Host Game Lobby" { ...{ previousSettings }}/>
    <GameLobbyComponent name="Game Lobby"/>
    <ChoosePlayerNameComponent name="Choose Player Name"/>
    <AIDifficultyComponent name="AI Difficulty" { ...{ previousSettings }}/>
  </GameMenu>;
}
