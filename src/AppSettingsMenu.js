import React, { useEffect } from "react";
import { GameMenu, GameMenuItem } from './GameMenu.js';

export function AppSettingsMenu(props) {
  useEffect(() => {
    if (!props.appSettings.debugMode)
      document.querySelector("#AppSettingsForm input[name='Show Move Ranges']").disabled = true;
  }, []);

  function handleFormEvent(event, type, gameMenuContext) {
    const { formData, setFormData } = gameMenuContext;
    switch (type) {
      case 'debugModeChanged':
        document.querySelector("#AppSettingsForm input[name='Show Move Ranges']").disabled = !!formData.debugMode;
        setFormData({ ...formData, debugMode: !formData.debugMode });
        break;
      case 'showMoveRangesChanged':
        setFormData({ ...formData, showMoveRanges: !formData.showMoveRanges });
        break;
      case 'savePreviousMatchSettingsChanged':
        setFormData({ ...formData, savePreviousMatchSettings: !formData.savePreviousMatchSettings });
        break;
      case 'saveAppSettings':
        event.preventDefault();
        props.setAppSettingsAndKillMenu(formData);
        break;
      default:
        throw new Error(`Invalid form event type: ${type}`);
    }
  }

  return (
    <GameMenu name="AppSettings" startingItemName="Application Settings" defaultFormSettings={props.appSettings} items={gameMenuContext => {
      const { formData } = gameMenuContext;
      return (<>
        <GameMenuItem pageName="Application Settings">
          <form id="AppSettingsForm" onSubmit={(event) => handleFormEvent(event, 'saveAppSettings', gameMenuContext)}>
            <fieldset>
              <legend> Debugging Settings </legend>
              <label> Debug Mode
                <input type="checkbox" value="debugMode" name="Debug Mode" checked={formData.debugMode}
                  onClick={event => handleFormEvent(event, 'debugModeChanged', gameMenuContext)} />
              </label>
              <label> Show Move Ranges
                <input type="checkbox" value="showMoveRanges" name="Show Move Ranges" checked={formData.showMoveRanges}
                  onClick={event => handleFormEvent(event, 'showMoveRangesChanged', gameMenuContext)} />
              </label>
            </fieldset>
            <fieldset>
              <legend> Miscellaneous Settings </legend>
              <label> Save Previous Match Settings
                <input type="checkbox" value="savePreviousMatchSettings" name="Save Previous Match Settings"
                  checked={formData.savePreviousMatchSettings}
                  onClick={event => handleFormEvent(event, 'savePreviousMatchSettingsChanged', gameMenuContext)} />
              </label>
            </fieldset>
            <input type="Submit" value="Save Settings" />
          </form>
        </GameMenuItem>
      </>);
    }} />
  );
}
