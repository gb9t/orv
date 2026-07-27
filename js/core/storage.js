/**
 * Persistence layer. Everything lives in localStorage under an "orv_" prefix,
 * so this app can be opened again later, or on another day, with saves intact.
 * Swap the internals of this file for a real backend later without touching
 * any other module, every module only calls the functions exposed here.
 */
(function (ORV) {
  'use strict';

  var KEYS = {
    CHARACTERS: 'orv_characters',
    ACTIVE_CHARACTER: 'orv_active_character_id',
    ROLL_HISTORY: 'orv_roll_history',
    STAFF_SESSION: 'orv_staff_session'
  };

  function safeGet(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.error('Storage read failed for', key, err);
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('Storage write failed for', key, err);
      if (err && err.name === 'QuotaExceededError') {
        ORV.UI.notify('Local storage is full. Try removing a large portrait or old roll history.', 'danger');
      }
      return false;
    }
  }

  function getCharacters() {
    return safeGet(KEYS.CHARACTERS, []);
  }

  function saveCharacter(character) {
    var characters = getCharacters();
    var index = characters.findIndex(function (c) { return c.id === character.id; });
    character.updatedAt = new Date().toISOString();
    if (index >= 0) {
      characters[index] = character;
    } else {
      characters.push(character);
    }
    safeSet(KEYS.CHARACTERS, characters);
    return character;
  }

  function deleteCharacter(characterId) {
    var characters = getCharacters().filter(function (c) { return c.id !== characterId; });
    safeSet(KEYS.CHARACTERS, characters);
    if (getActiveCharacterId() === characterId) {
      setActiveCharacterId(null);
    }
  }

  function getActiveCharacterId() {
    return safeGet(KEYS.ACTIVE_CHARACTER, null);
  }

  function setActiveCharacterId(id) {
    safeSet(KEYS.ACTIVE_CHARACTER, id);
  }

  function getRollHistory() {
    return safeGet(KEYS.ROLL_HISTORY, []);
  }

  function addRollHistoryEntry(entry) {
    var history = getRollHistory();
    history.unshift(entry);
    if (history.length > 50) history = history.slice(0, 50);
    safeSet(KEYS.ROLL_HISTORY, history);
    return history;
  }

  ORV.Storage = {
    KEYS: KEYS,
    getCharacters: getCharacters,
    saveCharacter: saveCharacter,
    deleteCharacter: deleteCharacter,
    getActiveCharacterId: getActiveCharacterId,
    setActiveCharacterId: setActiveCharacterId,
    getRollHistory: getRollHistory,
    addRollHistoryEntry: addRollHistoryEntry
  };

})(window.ORV = window.ORV || {});
