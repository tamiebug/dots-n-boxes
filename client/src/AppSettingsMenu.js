import React, { useEffect, useContext } from "react";
import { GameMenu, GameMenuContext } from './GameMenu';
import { useGameStore } from "./GameStore.js";

function ApplicationSettingsComponent({ setAppSettingsAndKillMenu }) {
  const { formData, setFormData } = useContext( GameMenuContext );
  const [ gameState ] = useGameStore();

  useEffect(() => {
    if ( !gameState.appSettings.debugMode )
      document.querySelector("#AppSettingsForm input[name='Show Move Ranges']").disabled = true;
  }, []);

  function saveAppSettings( event ) {
    event.preventDefault();
    setAppSettingsAndKillMenu(formData);
  }

  function changeDebugMode() {
    document.querySelector("#AppSettingsForm input[name='Show Move Ranges']").disabled = !!formData.debugMode;
    setFormData({ ...formData, debugMode: !formData.debugMode });
  }

  return (<form id="AppSettingsForm" onSubmit={ event => saveAppSettings( event )}>
    <fieldset>
      <legend> Debugging Settings </legend>
      <label> Debug Mode
        <input type="checkbox" value="debugMode" name="Debug Mode" defaultChecked={formData.debugMode}
          onClick={ event => changeDebugMode( event )} />
      </label>
      <label> Show Move Ranges
        <input type="checkbox" value="showMoveRanges" name="Show Move Ranges" defaultChecked={formData.showMoveRanges}
          onClick={ () => setFormData({...formData, showMoveRanges: !formData.showMoveRanges}) } />
      </label>
    </fieldset>
    <fieldset>
      <legend> Miscellaneous Settings </legend>
      <label> Save Previous Match Settings
        <input type="checkbox" value="savePreviousMatchSettings" name="Save Previous Match Settings"
          checked={formData.savePreviousMatchSettings}
          onClick={ () => setFormData({...formData, savePreviousMatchSettings: !formData.savePreviousMatchSettings })} />
      </label>
    </fieldset>
    <input type="Submit" value="Save Settings" />
  </form>);
}

export function AppSettingsMenu({ setAppSettingsAndKillMenu }) {
  const [ gameState ] = useGameStore();

  return <GameMenu name="AppSettings" startingItemName="Application Settings" defaultFormSettings={ gameState.appSettings }>
    <ApplicationSettingsComponent name="Application Settings" { ...{ setAppSettingsAndKillMenu }}/>
  </GameMenu>;
}