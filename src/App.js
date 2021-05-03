import React, { useState, useEffect } from "react";
import { hot } from "react-hot-loader"
import "./App.css";
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css'

import { Game } from "./GameComponent.js";

export const DEFAULT_APP_SETTINGS = { debugMode: false, savePreviousMatchSettings: true };

export function App(props) {
	const [ appSettings, setAppSettings ] = useState(DEFAULT_APP_SETTINGS);
	const [ haveSettingsLoaded, setHaveSettingsLoaded ] = useState(false);

	useEffect(() => {
    const localSettings = JSON.parse(window.localStorage.getItem('App Settings'));
    if (localSettings) {
      setAppSettings({...appSettings, ...localSettings});
      setHaveSettingsLoaded(true);
    }
  }, []);

	useEffect(() => {
		const localSettings = JSON.parse(window.localStorage.getItem('App Settings'));
		// TODO: There's an additional unecessary call to the localStorage API on settings load, should elude it somehow maybe?
		const stringifiedSettings = JSON.stringify({...localSettings, ...appSettings});
		window.localStorage.setItem('App Settings', stringifiedSettings);
	}, [ appSettings ]);

	if (!haveSettingsLoaded) return null;
	else return (
		<div className="App">
			<Game appSettings={ appSettings } setAppSettings={ setAppSettings }/>
		</div>
	)
}

export default hot(module)(App);