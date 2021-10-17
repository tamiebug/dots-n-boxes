import React from "react";
import ReactDOM from "react-dom";
import App from "./App.js";
import { mouseTracker } from "./utility.js";
import { SocketProvider } from "./SocketContext.js";

ReactDOM.render(
  <SocketProvider>
    <App />
  </SocketProvider>,
  document.getElementById("root"));

document.addEventListener("dragstart", e => {e.preventDefault(); return false;});
document.addEventListener("mouseup", () => {mouseTracker.onUp();});
document.addEventListener("mousedown", () => {mouseTracker.onDown();});
