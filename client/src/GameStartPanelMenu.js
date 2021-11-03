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
    /* The Following is a bugfix for bug introduced in commit 0CED8E2A
     *
     * For some reason, whenever this function's call stack originates from a callback in Socket.js, after this commit above
     * the old version of the GameBoard coexists with the new version for the first update and first update only, causing
     * errors, but only at setUpGame match initialization and at no other time.  By doing an extra setUpGame action, it seems
     * to prevent the error.  I have absolutely no clue why this is the case; setUpgame just does the trick and is able
     * to get React to properly handle this function being called by a callback registered to Socket.js, specifically after the
     * changes in the above commit which don't even change any of the seemingly relevant code.
     *
     * In case that code changed in 0CED8E2A is further modified, it is worth going back here to see if this fix is stil needed.
     * Applications are supposed to make sense, and this bug DOES have a yet-to-be-discovered reason for existing, whatever it may be.
     */
    gameStateDispatch({ type: 'setUpGame', settings: DEFAULT_GAME_SETTINGS });
    gameStateDispatch({ type: 'setUpGame', settings });
  }

  const menuItems = {
    "Home Page": ({ linkTo, formData }) => <HomePageComponent { ...{ linkTo, formData, setGameSettingsAndKillMenu }} />,
    "Choose Opponent Type": ({ linkTo, formData, setFormData }) => <ChooseOpponentTypeComponent { ...{ linkTo, formData, setFormData }} />,
    "Choose Online Name": ({ linkTo, formData, setFormData }) => <ChooseOnlineNameComponent { ...{ linkTo, formData, setFormData }} />,
    "Available Games List": ({ linkTo, formData, setFormData }) => <AvailableGamesListComponent { ...{ linkTo, formData, setFormData }} />,
    "Board Size": ({ formData, setFormData }) => <BoardSizeComponent { ...{ formData, setFormData, setGameSettingsAndKillMenu, previousSettings }} />,
    "Host Game Lobby": ({ linkTo, formData, setFormData }) => <HostGameLobbyComponent {...{ previousSettings, linkTo, formData, setFormData }} />,
    "Game Lobby": ({ linkTo, formData }) => <GameLobbyComponent { ...{ linkTo, formData }} />,
    "Choose Player Name": ({ linkTo, formData, setFormData }) => <ChoosePlayerNameComponent { ...{ linkTo, formData, setFormData }} />,
    "AI Difficulty": ({ linkTo, formData, setFormData }) => <AIDifficultyComponent { ...{ linkTo, formData, setFormData, previousSettings }} />,
  };

  return <GameMenu name="GameMenu" startingItemName="Home Page" defaultFormSettings={ previousSettings } menuItems={ menuItems } showMenu= { gameState.appState == appStates.PRE_MATCH } />;
}
