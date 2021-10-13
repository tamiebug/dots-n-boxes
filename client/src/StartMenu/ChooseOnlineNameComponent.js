import React, { useEffect, useState, useContext, useRef } from "react";
import { SocketContext } from "../SocketContext.js";

export function ChooseOnlineNameComponent({ linkTo, formData, setFormData }) {
  const { reserveName } = useContext(SocketContext);

  const [currentName, setCurrentName] = useState(formData.onlineName || "");
  const [nameValid, setNameValid] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current.focus();
  }, []);

  function onSubmit(event) {
    event.preventDefault();
    // isHost set to false in case a "true" value was stored
    setFormData({ ...formData, onlineName: currentName, isHost: false });
    linkTo("Available Games List");
  }

  const handleKey = e => {
    if (e.keyCode == 13) {
      e.preventDefault();
      if (!nameValid)
        checkForAvailability(e);
      else { /*(nameValid) */
        setFormData({ ...formData, onlineName: currentName, isHost: false });
        linkTo("Available Games List");
      }
    }
  };

  const nameInput = <input className={`${nameValid ? "validatedNameInput" : ""}`}
    type="text" name="onlineName" value={currentName}
    onChange={e => { setCurrentName(e.target.value); setNameValid(false); }}
    onKeyDown={e => handleKey(e)}
    ref={inputRef} />;

  function checkForAvailability(event) {
    event.preventDefault();
    reserveName(currentName, response => {
      if (response.available || response.pairAlreadyExists) {
        setNameValid(true);
        inputRef.current.setCustomValidity("");
      } else {
        inputRef.current.setCustomValidity(`${currentName} is not available`);
        inputRef.current.reportValidity();
        console.log(`${currentName} is not available`);
        setNameValid(false);
      }
    });
  }

  return (
    <form onSubmit={event => onSubmit(event)}>
      <fieldset>
        <legend> choose name </legend>
        {nameInput}
        <input type="submit" value="Check If Available" disabled={nameValid} onClick={checkForAvailability} />
      </fieldset>
      <input type="submit" value="Select Name" disabled={!nameValid} />
    </form>
  );
}