/**
 * A minimal, framework-free state store. Views subscribe to change events
 * and re-render themselves; nothing polls, nothing depends on a router.
 * This is the whole mechanism behind "everything updates dynamically".
 */
(function (ORV) {
  'use strict';

  var state = {
    gameData: null,        // loaded JSON: rules, traits, statusEffects, items, skills, stigmas, fables, bestiary, codex, quests
    characters: [],        // all saved characters
    activeCharacterId: null,
    currentView: 'hub',
    rollHistory: []
  };

  var listeners = [];

  function getState() {
    return state;
  }

  function setState(partial) {
    state = Object.assign({}, state, partial);
    listeners.forEach(function (listener) {
      listener(state);
    });
  }

  function subscribe(listener) {
    listeners.push(listener);
    return function unsubscribe() {
      listeners = listeners.filter(function (l) { return l !== listener; });
    };
  }

  function getActiveCharacter() {
    if (!state.activeCharacterId) return null;
    return state.characters.find(function (c) { return c.id === state.activeCharacterId; }) || null;
  }

  /** Persist and refresh a single character in both storage and in-memory state. */
  function upsertCharacter(character) {
    ORV.Storage.saveCharacter(character);
    var characters = ORV.Storage.getCharacters();
    setState({ characters: characters });
  }

  ORV.State = {
    getState: getState,
    setState: setState,
    subscribe: subscribe,
    getActiveCharacter: getActiveCharacter,
    upsertCharacter: upsertCharacter
  };

})(window.ORV = window.ORV || {});
