import React from "react";
import ReactDOM from "react-dom";
import App from "./App.js";
import { mouseTracker } from "./utility.js";

ReactDOM.render(<App />, document.getElementById("root"));

document.addEventListener("dragstart", (e) => {e.preventDefault(); return false;});
document.addEventListener("mouseup", (e) => {mouseTracker.onUp();});
document.addEventListener("mousedown", (e) => {mouseTracker.onDown();});