import React from "react";
import ReactDOM from "react-dom";
import App from "./App.js";
ReactDOM.render(<App />, document.getElementById("root"));
document.addEventListener("dragstart", (e) => {e.preventDefault(); return false});
