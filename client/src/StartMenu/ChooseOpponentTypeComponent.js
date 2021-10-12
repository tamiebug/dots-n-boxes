import React from "react";

export function ChooseOpponentTypeComponent({ linkTo, formData, setFormData }) {
  function aiMatchOnClick(event) {
    event.preventDefault();
    setFormData({ ...formData, gameType: "CPU" });
    linkTo("AI Difficulty");
  }

  function localMatchOnClick(event) {
    event.preventDefault();
    setFormData({ ...formData, gameType: "local" });
    linkTo("Choose Player Name");
  }

  return (
    <>
      <button className="gameMenuButton" onClick={aiMatchOnClick}>
        vs AI?
      </button>
      <button className="gameMenuButton" onClick={localMatchOnClick}>
        vs Local Player?
      </button>
    </>
  );
}