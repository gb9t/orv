/**
 * Bestiary Manager. Simple string lists (weaknesses, resistances, skills,
 * encounter ideas) are edited as one-per-line text areas and split/joined
 * on save, which is far less fiddly for a Dungeon Master than a dozen tiny
 * add/remove buttons for what is ultimately just flavor text.
 */
(function (ORV) {
  'use strict';

  var Utils = ORV.Utils;
  var UI = ORV.UI;
  var SUI = ORV.StaffUI;

  function linesToArray(text) {
    return String(text || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
  }
  function arrayToLines(arr) { return (arr || []).join('\n'); }

  function mount(container) {
    var gameData = ORV.State.getState().gameData;

    container.innerHTML =
      '<div class="view-header flex-between"><div><div class="view-header__eyebrow">Staff Panel // Bestiary</div><h1>Enemies</h1></div>' +
      '<button class="btn btn-primary" data-role="new-enemy">' + UI.icon('icon-plus') + ' New Enemy</button></div>' +
      '<div data-role="enemy-table"></div>';

    function refreshTable() {
      var enemies = ORV.State.getState().gameData.bestiary.enemies;
      container.querySelector('[data-role="enemy-table"]').innerHTML = SUI.renderDataTable(enemies, [
        { key: 'name', label: 'Name' },
        { key: 'threatRating', label: 'Threat' },
        { key: 'habitat', label: 'Habitat' }
      ]);
      container.querySelectorAll('[data-row-edit]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          openForm(enemies.find(function (e) { return e.id === btn.getAttribute('data-row-edit'); }));
        });
      });
      container.querySelectorAll('[data-row-delete]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var enemy = enemies.find(function (e) { return e.id === btn.getAttribute('data-row-delete'); });
          SUI.confirmDelete(enemy.name, function () {
            ORV.ContentStore.deleteEntry('bestiary', enemy.id);
            ORV.App.refreshGameData();
            refreshTable();
            UI.notify(enemy.name + ' deleted.', 'info');
          });
        });
      });
    }

    function openForm(existing) {
      var draft = existing ? Utils.deepClone(existing) : {
        id: null, name: '', threatRating: 1, images: [], description: '', lore: '', behaviour: '',
        weaknesses: [], resistances: [], stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, hp: 20 },
        skills: [], drops: [], habitat: '', encounterIdeas: [], relatedEnemies: []
      };

      var body = UI.createEl('div');
      UI.openModal({ title: existing ? 'Edit Enemy' : 'New Enemy', content: body });

      body.innerHTML =
        SUI.field('Name', 'name', draft.name, 'text') +
        SUI.field('Threat Rating (1-10)', 'threatRating', draft.threatRating, 'number', 'min="1" max="10"') +
        SUI.field('Description', 'description', draft.description, 'textarea') +
        SUI.field('Lore', 'lore', draft.lore, 'textarea') +
        SUI.field('Behaviour', 'behaviour', draft.behaviour, 'textarea') +
        SUI.field('Habitat', 'habitat', draft.habitat, 'text') +
        '<div class="field-row">' +
          SUI.field('Weaknesses (one per line)', 'weaknessesText', arrayToLines(draft.weaknesses), 'textarea') +
          SUI.field('Resistances (one per line)', 'resistancesText', arrayToLines(draft.resistances), 'textarea') +
        '</div>' +
        SUI.field('Skills / Abilities (one per line)', 'skillsText', arrayToLines(draft.skills), 'textarea') +
        SUI.field('Encounter Ideas (one per line)', 'encounterIdeasText', arrayToLines(draft.encounterIdeas), 'textarea') +
        '<h3 class="mt-lg">Statistics</h3><div class="field-row" data-role="stat-fields"></div>' +
        SUI.imageUploadField('Enemy Image', 'images0', draft.images[0]) +
        '<div class="flex gap-sm mt-lg"><button class="btn btn-primary" data-role="save-enemy">Save Enemy</button>' +
        '<button class="btn btn-ghost" data-role="cancel-enemy">Cancel</button></div>';

      var statFields = body.querySelector('[data-role="stat-fields"]');
      Object.keys(draft.stats).forEach(function (key) {
        statFields.innerHTML += SUI.field(Utils.titleCase(key), 'stat_' + key, draft.stats[key], 'number');
      });

      var imageInput = body.querySelector('[data-image-field="images0"]');
      imageInput.addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file) return;
        SUI.resizeImageFile(file, 500, function (dataUrl) { draft.images = [dataUrl]; });
      });

      body.querySelector('[data-role="cancel-enemy"]').addEventListener('click', UI.closeModal);
      body.querySelector('[data-role="save-enemy"]').addEventListener('click', function () {
        var values = SUI.readSimpleFields(body);
        draft.name = values.name;
        draft.threatRating = Utils.clamp(parseInt(values.threatRating, 10) || 1, 1, 10);
        draft.description = values.description;
        draft.lore = values.lore;
        draft.behaviour = values.behaviour;
        draft.habitat = values.habitat;
        draft.weaknesses = linesToArray(values.weaknessesText);
        draft.resistances = linesToArray(values.resistancesText);
        draft.skills = linesToArray(values.skillsText);
        draft.encounterIdeas = linesToArray(values.encounterIdeasText);
        Object.keys(draft.stats).forEach(function (key) {
          draft.stats[key] = parseInt(values['stat_' + key], 10) || 0;
        });

        if (!draft.name.trim()) { UI.notify('Give the enemy a name.', 'warning'); return; }

        ORV.ContentStore.upsertEntry('bestiary', draft);
        ORV.App.refreshGameData();
        UI.closeModal();
        refreshTable();
        UI.notify(draft.name + ' saved.', 'success');
      });
    }

    container.querySelector('[data-role="new-enemy"]').addEventListener('click', function () { openForm(null); });
    refreshTable();
  }

  ORV.BestiaryManager = { mount: mount };

})(window.ORV = window.ORV || {});
