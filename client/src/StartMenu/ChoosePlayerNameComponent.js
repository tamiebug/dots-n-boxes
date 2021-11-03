import React, { useContext } from "react";
import { GameMenuContext } from "../GameMenu";

export function ChoosePlayerNameComponent() {
  const { linkTo, formData, setFormData } = useContext( GameMenuContext );
  function onSubmit(event) {
    event.preventDefault();
    linkTo("Board Size");
  }

  function onFirstPlayerChange(event) {
    setFormData({ ...formData, playerNames: formData.playerNames.map((name, i) => i == 0 ? event.target.value : name) });
  }

  function onSecondPlayerChange(event) {
    setFormData({ ...formData, playerNames: formData.playerNames.map((name, i) => i == 1 ? event.target.value : name) });
  }

  return <>
    <form onSubmit={onSubmit}>
      <fieldset>
        <legend>Player Names</legend>
        <label>
          First Player:
          <input type="text" name="firstPlayer" value={formData.playerNames[0]} onChange={onFirstPlayerChange} />
        </label>
        <label>
          Second Player:
          <input type="text" name="secondPlayer" value={formData.playerNames[1]} onChange={onSecondPlayerChange} />
        </label>
        <input type="submit" value="enter" />
      </fieldset>
    </form>
  </>;
}