import React from "react";
import { ALLOWED_DIFFICULTIES } from "../GameStore";
import { createSelect } from "./createSelect";

function AIDifficultySelectElement({ formData, setFormData, previousSettings }) {
  return createSelect(
    ALLOWED_DIFFICULTIES,
    previousSettings.cpuDifficulty,
    { name: "aiDifficulty", id: "aiDifficultySelect", onChange: e => setFormData({...formData, cpuDifficulty: e.target.value })}
  );
}

export function AIDifficultyComponent({ linkTo, formData, setFormData, previousSettings }) {
  function onSubmit(event) {
    event.preventDefault();
    linkTo("Choose Player Name");
  }
 
  return <form onSubmit={onSubmit}>
    <fieldset>
      <legend>AI Difficulty:</legend>
      <label>
        Choose Ai Level: <AIDifficultySelectElement { ...{ formData, setFormData, previousSettings }} />
      </label>
      <input type="submit" value="select" />
    </fieldset>
  </form>;
}