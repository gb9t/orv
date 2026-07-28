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
    STAFF_SESSION: 'orv_staff_session',
    STAFF_ROLL_HISTORY: 'orv_staff_roll_history',
    DICE_PRESETS: 'orv_staff_dice_presets',
    ACTIVE_ENCOUNTER: 'orv_staff_active_encounter'
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

  /* ---------------- Staff session (cleared when the browser tab closes) ---------------- */

  function isStaffAuthenticated() {
    try {
      return window.sessionStorage.getItem(KEYS.STAFF_SESSION) === 'true';
    } catch (err) {
      return false;
    }
  }

  function setStaffAuthenticated(value) {
    try {
      window.sessionStorage.setItem(KEYS.STAFF_SESSION, value ? 'true' : 'false');
    } catch (err) {
      console.error('Could not set staff session', err);
    }
  }

  /* ---------------- Staff dice log and presets ---------------- */

  function getStaffRollHistory() {
    return safeGet(KEYS.STAFF_ROLL_HISTORY, []);
  }

  function addStaffRollHistoryEntry(entry) {
    var history = getStaffRollHistory();
    history.unshift(entry);
    if (history.length > 80) history = history.slice(0, 80);
    safeSet(KEYS.STAFF_ROLL_HISTORY, history);
    return history;
  }

  function updateStaffRollHistory(history) {
    safeSet(KEYS.STAFF_ROLL_HISTORY, history);
  }

  function getDicePresets() {
    return safeGet(KEYS.DICE_PRESETS, []);
  }

  function saveDicePresets(presets) {
    safeSet(KEYS.DICE_PRESETS, presets);
  }

  /* ---------------- Active encounter ---------------- */

  function getActiveEncounter() {
    return safeGet(KEYS.ACTIVE_ENCOUNTER, null);
  }

  function saveActiveEncounter(encounter) {
    safeSet(KEYS.ACTIVE_ENCOUNTER, encounter);
  }

  function clearActiveEncounter() {
    safeSet(KEYS.ACTIVE_ENCOUNTER, null);
  }

  ORV.Storage = {
    KEYS: KEYS,
    getCharacters: getCharacters,
    saveCharacter: saveCharacter,
    deleteCharacter: deleteCharacter,
    getActiveCharacterId: getActiveCharacterId,
    setActiveCharacterId: setActiveCharacterId,
    getRollHistory: getRollHistory,
    addRollHistoryEntry: addRollHistoryEntry,
    isStaffAuthenticated: isStaffAuthenticated,
    setStaffAuthenticated: setStaffAuthenticated,
    getStaffRollHistory: getStaffRollHistory,
    addStaffRollHistoryEntry: addStaffRollHistoryEntry,
    updateStaffRollHistory: updateStaffRollHistory,
    getDicePresets: getDicePresets,
    saveDicePresets: saveDicePresets,
    getActiveEncounter: getActiveEncounter,
    saveActiveEncounter: saveActiveEncounter,
    clearActiveEncounter: clearActiveEncounter
  };

})(window.ORV = window.ORV || {});
