/**
 * Since this is a static, no-backend site, the Staff Panel cannot write
 * back to the JSON files on disk. Instead, staff edits are stored as
 * overrides in localStorage and layered on top of the base JSON every time
 * data loads, in both the Player Panel and the Staff Panel, since they
 * share the same browser storage. Deleting a shipped entry is handled with
 * a tombstone list rather than actually removing it from the base file.
 */
(function (ORV) {
  'use strict';

  var Utils = ORV.Utils;

  var STORAGE_PREFIX = 'orv_staff_overrides_';

  /** Maps a content category to where its array lives inside gameData. */
  var CATEGORY_MAP = {
    items: { dataKey: 'items', listKey: 'items' },
    bestiary: { dataKey: 'bestiary', listKey: 'enemies' },
    codex: { dataKey: 'codex', listKey: 'entries' },
    quests: { dataKey: 'quests', listKey: 'quests' }
  };

  function storageKey(category) {
    return STORAGE_PREFIX + category;
  }

  function getOverrides(category) {
    try {
      var raw = window.localStorage.getItem(storageKey(category));
      if (!raw) return { entries: {}, deletedIds: [] };
      var parsed = JSON.parse(raw);
      return { entries: parsed.entries || {}, deletedIds: parsed.deletedIds || [] };
    } catch (err) {
      console.error('Failed to read overrides for', category, err);
      return { entries: {}, deletedIds: [] };
    }
  }

  function saveOverrides(category, overrides) {
    try {
      window.localStorage.setItem(storageKey(category), JSON.stringify(overrides));
      return true;
    } catch (err) {
      console.error('Failed to save overrides for', category, err);
      if (ORV.UI) ORV.UI.notify('Could not save, local storage may be full.', 'danger');
      return false;
    }
  }

  /** Create or update an entry. If entry.id is missing, a new id is generated. */
  function upsertEntry(category, entry) {
    var overrides = getOverrides(category);
    if (!entry.id) entry.id = Utils.generateId(category.slice(0, 3));
    overrides.entries[entry.id] = entry;
    overrides.deletedIds = overrides.deletedIds.filter(function (id) { return id !== entry.id; });
    saveOverrides(category, overrides);
    return entry;
  }

  function deleteEntry(category, id) {
    var overrides = getOverrides(category);
    delete overrides.entries[id];
    if (overrides.deletedIds.indexOf(id) < 0) overrides.deletedIds.push(id);
    saveOverrides(category, overrides);
  }

  function restoreDefaults(category) {
    saveOverrides(category, { entries: {}, deletedIds: [] });
  }

  /** Merge a base array with this category's overrides: edits replace, additions append, deletions filter out. */
  function mergeList(category, baseList) {
    var overrides = getOverrides(category);
    var merged = baseList
      .filter(function (item) { return overrides.deletedIds.indexOf(item.id) < 0; })
      .map(function (item) { return overrides.entries[item.id] || item; });

    Object.keys(overrides.entries).forEach(function (id) {
      var alreadyIncluded = baseList.some(function (item) { return item.id === id; });
      if (!alreadyIncluded) merged.push(overrides.entries[id]);
    });

    return merged;
  }

  /** Rebuild gameData from a pristine base copy, with every category's overrides re-applied. Safe to call as often as needed. */
  function applyAllOverrides(baseGameData) {
    var gameData = Utils.deepClone(baseGameData);
    Object.keys(CATEGORY_MAP).forEach(function (category) {
      var map = CATEGORY_MAP[category];
      gameData[map.dataKey][map.listKey] = mergeList(category, gameData[map.dataKey][map.listKey]);
    });
    return gameData;
  }

  ORV.ContentStore = {
    CATEGORY_MAP: CATEGORY_MAP,
    getOverrides: getOverrides,
    upsertEntry: upsertEntry,
    deleteEntry: deleteEntry,
    restoreDefaults: restoreDefaults,
    mergeList: mergeList,
    applyAllOverrides: applyAllOverrides
  };

})(window.ORV = window.ORV || {});
