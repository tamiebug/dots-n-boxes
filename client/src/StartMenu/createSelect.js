import React from "react";

export function createSelect(entries, defaultValue, { name, id, onChange, className = {} }) {
  return (
    <select {...{ className, name, id, onChange, defaultValue }}>
      {entries.map((entry, index) => (
        <option key={index} value={entry}>{entry}</option>
      ))}
    </select>
  );
}