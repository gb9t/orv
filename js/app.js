/**
 * Application bootstrap. Loads all JSON game data, restores saved characters
 * from localStorage, builds the persistent nav frame, and wires a small
 * in-memory router so switching views never triggers a full page reload,
 * keeping the system-window illusion intact.
 */
(function (ORV) {
  'use strict';

  var UI = ORV.UI;

  var NAV_ITEMS = [
    { id: 'hub', label: 'Characters', icon: 'icon-user' },
    { id: 'create', label: 'New Character', icon: 'icon-plus' },
    { id: 'profile', label: 'Profile', icon: 'icon-scroll' },
    { id: 'dice', label: 'Dice Roller', icon: 'icon-dice' },
    { id: 'checks', label: 'Skill Checks', icon: 'icon-skill' },
    { id: 'bestiary', label: 'Bestiary', icon: 'icon-enemy' },
    { id: 'codex', label: 'Codex', icon: 'icon-book' }
  ];

  var VIEW_RENDERERS = {
    hub: function (el) { ORV.CharacterHub.mount(el); },
    create: function (el) { ORV.CharacterCreation.mount(el); },
    profile: function (el) { ORV.CharacterProfile.mount(el); },
    dice: function (el) { ORV.DiceRoller.mount(el); },
    checks: function (el) { ORV.SkillChecks.mount(el); },
    bestiary: function (el) { ORV.Bestiary.mount(el); },
    codex: function (el) { ORV.Codex.mount(el); }
  };

  var mainEl = null;
  var navEl = null;

  function navigateTo(viewId) {
    ORV.State.setState({ currentView: viewId });
    renderNav();
    renderCurrentView();
    if (mainEl) mainEl.scrollTop = 0;
  }

  function renderNav() {
    var state = ORV.State.getState();
    navEl.innerHTML =
      '<div class="app-nav__brand">' +
        '<span class="app-nav__brand-mark">SYSTEM WINDOW</span>' +
        '<span class="app-nav__brand-sub">Tabletop Interface</span>' +
      '</div>' +
      '<ul class="app-nav__list" data-role="nav-list"></ul>' +
      '<div class="app-nav__footer">Data is saved to this browser only.<br>Staff Panel arrives in the next build.</div>';

    var list = navEl.querySelector('[data-role="nav-list"]');
    NAV_ITEMS.forEach(function (item) {
      var li = document.createElement('li');
      var btn = UI.createEl('button', {
        className: 'app-nav__item' + (state.currentView === item.id ? ' is-active' : ''),
        html: UI.icon(item.icon) + '<span>' + item.label + '</span>'
      });
      btn.addEventListener('click', function () { navigateTo(item.id); });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  function renderCurrentView() {
    var state = ORV.State.getState();
    var renderer = VIEW_RENDERERS[state.currentView] || VIEW_RENDERERS.hub;
    mainEl.innerHTML = '';
    var section = UI.createEl('div', { className: 'view-section' });
    mainEl.appendChild(section);
    renderer(section);
  }

  function refreshGameData() {
    var state = ORV.State.getState();
    if (!state.baseGameData) return;
    var gameData = ORV.ContentStore.applyAllOverrides(state.baseGameData);
    ORV.State.setState({ gameData: gameData });
    renderCurrentView();
  }

  function boot() {
    navEl = document.querySelector('[data-role="app-nav"]');
    mainEl = document.querySelector('[data-role="app-main"]');

    UI.showBootLoader('Opening System Window');

    ORV.DataLoader.loadAll().then(function (baseGameData) {
      var characters = ORV.Storage.getCharacters();
      var activeId = ORV.Storage.getActiveCharacterId();
      var startView = activeId && characters.some(function (c) { return c.id === activeId; }) ? 'profile' : 'hub';

      ORV.State.setState({
        baseGameData: baseGameData,
        gameData: ORV.ContentStore.applyAllOverrides(baseGameData),
        characters: characters,
        activeCharacterId: activeId,
        currentView: startView
      });

      renderNav();
      renderCurrentView();
      UI.hideBootLoader();
    }).catch(function (err) {
      console.error('Boot failed', err);
    });
  }

  ORV.App = {
    navigateTo: navigateTo,
    refreshGameData: refreshGameData,
    boot: boot
  };

  document.addEventListener('DOMContentLoaded', boot);

})(window.ORV = window.ORV || {});
