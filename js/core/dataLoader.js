/**
 * Loads every JSON data file over fetch(). This requires the page to be
 * served over http:// (a local server or real hosting), not opened directly
 * as a file:// path, since browsers block fetch() of local files for
 * security reasons. See README.md for the one-line fix if this fails.
 */
(function (ORV) {
  'use strict';

  var BASE = window.ORV_BASE_PATH || '';

  var FILES = {
    rules: BASE + 'data/rules.json',
    traits: BASE + 'data/traits.json',
    statusEffects: BASE + 'data/statusEffects.json',
    items: BASE + 'data/items.json',
    skills: BASE + 'data/skills.json',
    stigmas: BASE + 'data/stigmas.json',
    fables: BASE + 'data/fables.json',
    bestiary: BASE + 'data/bestiary.json',
    codex: BASE + 'data/codex.json',
    quests: BASE + 'data/quests.json'
  };

  function loadOne(key, path) {
    return fetch(path).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status + ' loading ' + path);
      return response.json();
    }).then(function (json) {
      return { key: key, data: json };
    });
  }

  function loadAll() {
    var keys = Object.keys(FILES);
    return Promise.all(keys.map(function (key) { return loadOne(key, FILES[key]); }))
      .then(function (results) {
        var gameData = {};
        results.forEach(function (result) { gameData[result.key] = result.data; });
        return gameData;
      })
      .catch(function (err) {
        console.error('Data load failed', err);
        showFileProtocolError();
        throw err;
      });
  }

  function showFileProtocolError() {
    var isFileProtocol = window.location.protocol === 'file:';
    var box = document.createElement('div');
    box.className = 'boot-loader';
    box.innerHTML =
      '<div class="glass-panel" style="max-width:560px;padding:32px;text-align:center;">' +
      '<h2 class="text-danger">System Window Could Not Load Data</h2>' +
      '<p>' + (isFileProtocol
        ? 'This page was opened directly from a file, and browsers block local data loading from a raw file path for security reasons.'
        : 'A data file failed to load. Check the browser console for the exact file and error.') + '</p>' +
      (isFileProtocol ? '<p class="text-cyan font-mono">Run this from the project folder, then open the printed address:</p>' +
      '<p class="font-mono">python3 -m http.server 8000</p>' : '') +
      '</div>';
    document.body.innerHTML = '';
    document.body.appendChild(box);
  }

  ORV.DataLoader = {
    loadAll: loadAll
  };

})(window.ORV = window.ORV || {});
