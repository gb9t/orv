/**
 * Staff Panel bootstrap. Gates on StaffAuth before loading anything, then
 * mirrors the Player Panel's app.js pattern: load data, build a nav, route
 * between views in memory.
 */
(function (ORV) {
  'use strict';

  var UI = ORV.UI;

  var NAV_ITEMS = [
    { id: 'bestiary', label: 'Bestiary', icon: 'icon-enemy' },
    { id: 'codex', label: 'Codex', icon: 'icon-book' },
    { id: 'quests', label: 'Quests', icon: 'icon-quest' },
    { id: 'items', label: 'Items', icon: 'icon-material' },
    { id: 'characters', label: 'Characters', icon: 'icon-user' },
    { id: 'dice', label: 'Dice Tools', icon: 'icon-dice' },
    { id: 'encounters', label: 'Encounters', icon: 'icon-skill' }
  ];

  var VIEW_RENDERERS = {
    bestiary: function (el) { ORV.BestiaryManager.mount(el); },
    codex: function (el) { ORV.CodexManager.mount(el); },
    quests: function (el) { ORV.QuestManager.mount(el); },
    items: function (el) { ORV.ItemCreator.mount(el); },
    characters: function (el) { ORV.CharacterManager.mount(el); },
    dice: function (el) { ORV.DiceTools.mount(el); },
    encounters: function (el) { ORV.EncounterTools.mount(el); }
  };

  var mainEl = null;
  var navEl = null;
  var currentView = 'bestiary';

  function navigateTo(viewId) {
    currentView = viewId;
    renderNav();
    renderCurrentView();
    if (mainEl) mainEl.scrollTop = 0;
  }

  function renderNav() {
    navEl.innerHTML =
      '<div class="app-nav__brand">' +
        '<span class="app-nav__brand-mark">SYSTEM WINDOW</span>' +
        '<span class="app-nav__brand-sub">Staff Interface</span>' +
      '</div>' +
      '<ul class="app-nav__list" data-role="nav-list"></ul>' +
      '<div class="app-nav__footer"><a href="../index.html">Back to Player Panel</a><br><button class="btn btn-ghost btn-sm mt-sm" data-role="logout">Log Out</button></div>';

    var list = navEl.querySelector('[data-role="nav-list"]');
    NAV_ITEMS.forEach(function (item) {
      var li = document.createElement('li');
      var btn = UI.createEl('button', {
        className: 'app-nav__item' + (currentView === item.id ? ' is-active' : ''),
        html: UI.icon(item.icon) + '<span>' + item.label + '</span>'
      });
      btn.addEventListener('click', function () { navigateTo(item.id); });
      li.appendChild(btn);
      list.appendChild(li);
    });

    navEl.querySelector('[data-role="logout"]').addEventListener('click', function () { ORV.StaffAuth.logout(); });
  }

  function renderCurrentView() {
    var renderer = VIEW_RENDERERS[currentView] || VIEW_RENDERERS.bestiary;
    mainEl.innerHTML = '';
    var section = UI.createEl('div', { className: 'view-section' });
    mainEl.appendChild(section);
    renderer(section);
  }

  function boot() {
    var root = document.getElementById('staff-root');

    if (!ORV.StaffAuth.isAuthenticated()) {
      ORV.StaffAuth.renderLoginGate(root, startPanel);
      return;
    }
    startPanel();
  }

  function startPanel() {
    var root = document.getElementById('staff-root');
    root.innerHTML =
      '<div class="app-shell">' +
        '<nav class="app-nav" data-role="app-nav"></nav>' +
        '<main class="app-main" data-role="app-main"></main>' +
      '</div>';

    navEl = root.querySelector('[data-role="app-nav"]');
    mainEl = root.querySelector('[data-role="app-main"]');

    UI.showBootLoader('Opening Staff Console');

    ORV.DataLoader.loadAll().then(function (baseGameData) {
      ORV.State.setState({
        baseGameData: baseGameData,
        gameData: ORV.ContentStore.applyAllOverrides(baseGameData),
        characters: ORV.Storage.getCharacters()
      });
      renderNav();
      renderCurrentView();
      UI.hideBootLoader();
    }).catch(function (err) {
      console.error('Staff boot failed', err);
    });
  }

  function refreshGameData() {
    var state = ORV.State.getState();
    if (!state.baseGameData) return;
    var gameData = ORV.ContentStore.applyAllOverrides(state.baseGameData);
    ORV.State.setState({ gameData: gameData });
    renderCurrentView();
  }

  ORV.App = {
    navigateTo: navigateTo,
    refreshGameData: refreshGameData
  };

  document.addEventListener('DOMContentLoaded', boot);

})(window.ORV = window.ORV || {});
