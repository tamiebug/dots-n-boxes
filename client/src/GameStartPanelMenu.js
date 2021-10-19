import React, { useEffect, useState } from "react";

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
  const [ previousSettings, setPreviousSettings ] = useState( DEFAULT_GAME_SETTINGS );

  useEffect(() => {
    let previousGameSettings = {};
    if ( gameState.appSettings.savePreviousMatchSettings ) {
      const previousGameSettingsString = window.localStorage.getItem('Previous Game Settings');
      previousGameSettings = JSON.parse(previousGameSettingsString);
    }
    setPreviousSettings({ ...DEFAULT_GAME_SETTINGS, ...previousGameSettings });
  }, [ ]);

  function setGameSettingsAndKillMenu( settings ) {
    setPreviousSettings({ ...settings });
    if ( gameState.appSettings.savePreviousMatchSettings == true ) {
      const stringifiedSettings = JSON.stringify(settings);
      window.localStorage.setItem('Previous Game Settings', stringifiedSettings);
    }
    gameStateDispatch({ type: 'setUpGame', settings });
  }

  const menuItems = {
    "Home Page": ({ linkTo, formData }) => <HomePageComponent { ...{ linkTo, formData, setGameSettingsAndKillMenu }} />,
    "Choose Opponent Type": ({ linkTo, formData, setFormData }) => <ChooseOpponentTypeComponent { ...{ linkTo, formData, setFormData }} />,
    "Choose Online Name": ({ linkTo, formData, setFormData }) => <ChooseOnlineNameComponent { ...{ linkTo, formData, setFormData }} />,
    "Available Games List": ({ linkTo, formData, setFormData }) => <AvailableGamesListComponent { ...{ linkTo, formData, setFormData }} />,
    "Board Size": ({ formData, setFormData }) => <BoardSizeComponent { ...{ formData, setFormData, setGameSettingsAndKillMenu, previousSettings }} />,
    "Host Game Lobby": ({ linkTo, formData, setFormData }) => <HostGameLobbyComponent {...{ previousSettings, linkTo, formData, setFormData }} />,
    "Game Lobby": ({ linkTo, formData }) => <GameLobbyComponent { ...{ linkTo, formData, setGameSettingsAndKillMenu }} />,
    "Choose Player Name": ({ linkTo, formData, setFormData }) => <ChoosePlayerNameComponent { ...{ linkTo, formData, setFormData }} />,
    "AI Difficulty": ({ linkTo, formData, setFormData }) => <AIDifficultyComponent { ...{ linkTo, formData, setFormData, previousSettings }} />,
  };

  return gameState.appState == appStates.PRE_MATCH && <GameMenu name="GameMenu" startingItemName="Home Page" defaultFormSettings={ previousSettings } menuItems={ menuItems } />;
}
