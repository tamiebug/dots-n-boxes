import { CPUMoveFunctions } from "./CPU";

export const playerTypes = Object.freeze({
  LOCAL:  Symbol("local"),
  REMOTE: Symbol("remote"),
  CPU:     Symbol("cpu"),
});

export const Player = function( name, type, difficulty = undefined ) {
  this.name = name;
  this.type = type;
  this.score = 0;
  this.difficulty = difficulty;
};

Player.prototype.getNameInitials = function getNameInitials() {
  let initials;
  if ( nameIsAlreadyLikeAcronym(this.name) ) {
    initials = this.name;
  } else {
    initials = this.name
      .split(" ")
      .slice(0, 3)
      .map( subName => subName.charAt(0) )
      .join("");
  }
  return initials;
};

Player.prototype.addScore = function addScore( points ) {
  return Object.assign( Object.create( Player.prototype ), { ...this, score: this.score + points } );
};

Player.prototype.isCPU = function isCPU() {
  return this.type == playerTypes.CPU;
};

Player.prototype.isLocal = function isLocal() {
  return this.type == playerTypes.LOCAL;
};

Player.prototype.isRemote = function isRemote() {
  return this.type == playerTypes.REMOTE;
};

Player.prototype.getCPUMovePromise = function getCPUMovePromise( gameState ) {
  return CPUMoveFunctions[ this.difficulty ]( gameState );
};

function nameIsAlreadyLikeAcronym( name ) {
  return name.length < 3 && name.toUpperCase() === name;
}
