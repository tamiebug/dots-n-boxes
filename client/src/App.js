import React, { useState, useEffect, useMemo } from "react";
import { hot } from "react-hot-loader";
import "./App.css";
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import { useGameStateStore, GameStateContext } from "./GameContext.js";
import { GameBoard } from "./GameBoard.js";
import { ControlPanel } from "./ControlPanel.js";

export const DEFAULT_APP_SETTINGS = { debugMode: false, savePreviousMatchSettings: true };

export function App() {
  const [ appSettings, setAppSettings ] = useState(DEFAULT_APP_SETTINGS);
  const [ haveSettingsLoaded, setHaveSettingsLoaded ] = useState(false);
  const { gameState, gameStateDispatch } = useGameStateStore(appSettings);

  useEffect(() => {
    const localSettings = JSON.parse(window.localStorage.getItem('App Settings'));
    if (localSettings) {
      setAppSettings({...appSettings, ...localSettings});
      setHaveSettingsLoaded(true);
    }
  }, []);

  useEffect(() => {
    const localSettings = JSON.parse(window.localStorage.getItem('App Settings'));
    // TODO: There's an additional unecessary call to the localStorage APApI on settings load, should elude it somehow maybe?
    const stringifiedSettings = JSON.stringify({...localSettings, ...appSettings});
    window.localStorage.setItem('App Settings', stringifiedSettings);
  }, [ appSettings ]);

  /* Precaution to avoid unneeded renders in child components on parent component rerender */
  const contextValue = useMemo(() => {
    return { gameState, gameStateDispatch };
  }, [ gameState, gameStateDispatch ]);

  return !haveSettingsLoaded ? null : (
    <div className="row game-div App">
      <GameStateContext.Provider value={ contextValue }>
        <div className="col col-sm-auto">
          <GameBoard key={ gameState.matchNumber + 1 } { ...{appSettings, setAppSettings} }/>
        </div>
        <div className="col col-sm-auto">
          <ControlPanel key={ 0 } { ...{appSettings, setAppSettings} }/>
        </div>
      </GameStateContext.Provider>
      
    </div>
  );
}

export default hot(module)(App);
