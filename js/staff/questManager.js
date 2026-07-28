/**
 * Quest Manager. Objectives are a repeatable list of short text lines.
 * Rewards reuse checkboxes against the live item/fable/stigma catalogs, so
 * a quest can never reward something that does not actually exist.
 */
(function (ORV) {
  'use strict';

  var Utils = ORV.Utils;
  var UI = ORV.UI;
  var SUI = ORV.StaffUI;

  function mount(container) {
    container.innerHTML =
      '<div class="view-header flex-between"><div><div class="view-header__eyebrow">Staff Panel // Quests</div><h1>Quest Catalog</h1></div>' +
      '<button class="btn btn-primary" data-role="new-quest">' + UI.icon('icon-plus') + ' New Quest</button></div>' +
      '<div data-role="quest-table"></div>';

    function refreshTable() {
      var quests = ORV.State.getState().gameData.quests.quests;
      container.querySelector('[data-role="quest-table"]').innerHTML = SUI.renderDataTable(quests, [
        { key: 'name', label: 'Name' },
        { key: 'recommendedDifficulty', label: 'Difficulty' },
        { key: 'recommendedLevel', label: 'Level' }
      ]);
      container.querySelectorAll('[data-row-edit]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          openForm(quests.find(function (q) { return q.id === btn.getAttribute('data-row-edit'); }));
        });
      });
      container.querySelectorAll('[data-row-delete]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var quest = quests.find(function (q) { return q.id === btn.getAttribute('data-row-delete'); });
          SUI.confirmDelete(quest.name, function () {
            ORV.ContentStore.deleteEntry('quests', quest.id);
            ORV.App.refreshGameData();
            refreshTable();
            UI.notify(quest.name + ' deleted.', 'info');
          });
        });
      });
    }

    function openForm(existing) {
      var gameData = ORV.State.getState().gameData;
      var draft = existing ? Utils.deepClone(existing) : {
        id: null, name: '', description: '', recommendedDifficulty: 'Low', recommendedLevel: 1,
        objectives: [], rewards: { coins: 0, xp: 0, items: [], titles: [], fables: [], stigmas: [] }
      };

      var body = UI.createEl('div');
      UI.openModal({ title: existing ? 'Edit Quest' : 'New Quest', content: body });
      renderForm();

      function renderForm() {
        body.innerHTML =
          SUI.field('Name', 'name', draft.name, 'text') +
          SUI.field('Description', 'description', draft.description, 'textarea') +
          '<div class="field-row">' +
            SUI.selectField('Difficulty', 'recommendedDifficulty', draft.recommendedDifficulty, ['Low', 'Moderate', 'High', 'Severe']) +
            SUI.field('Recommended Level', 'recommendedLevel', draft.recommendedLevel, 'number') +
          '</div>' +
          '<h3 class="mt-lg">Objectives</h3><div data-role="objectives-list"></div>' +
          '<button class="btn btn-ghost btn-sm mt-sm" data-role="add-objective">Add Objective</button>' +
          '<h3 class="mt-lg">Rewards</h3>' +
          '<div class="field-row">' +
            SUI.field('Coins', 'coins', draft.rewards.coins, 'number') +
            SUI.field('XP', 'xp', draft.rewards.xp, 'number') +
          '</div>' +
          SUI.field('Titles (comma separated)', 'titlesText', (draft.rewards.titles || []).join(', '), 'text') +
          '<div class="field-row">' +
            '<div class="field" style="flex:1"><label>Item Rewards</label><div data-role="items-checklist" style="max-height:140px;overflow-y:auto"></div></div>' +
            '<div class="field" style="flex:1"><label>Fable Rewards</label><div data-role="fables-checklist" style="max-height:140px;overflow-y:auto"></div></div>' +
            '<div class="field" style="flex:1"><label>Stigma Rewards</label><div data-role="stigmas-checklist" style="max-height:140px;overflow-y:auto"></div></div>' +
          '</div>' +
          '<div class="flex gap-sm mt-lg"><button class="btn btn-primary" data-role="save-quest">Save Quest</button>' +
          '<button class="btn btn-ghost" data-role="cancel-quest">Cancel</button></div>';

        renderObjectives();
        renderChecklist('items-checklist', gameData.items.items, draft.rewards.items);
        renderChecklist('fables-checklist', gameData.fables.fables, draft.rewards.fables);
        renderChecklist('stigmas-checklist', gameData.stigmas.stigmas, draft.rewards.stigmas);

        body.querySelector('[data-role="add-objective"]').addEventListener('click', function () {
          draft.objectives.push({ id: Utils.generateId('obj'), text: '' });
          renderObjectives();
        });
        body.querySelector('[data-role="cancel-quest"]').addEventListener('click', UI.closeModal);
        body.querySelector('[data-role="save-quest"]').addEventListener('click', save);
      }

      function renderObjectives() {
        var list = body.querySelector('[data-role="objectives-list"]');
        list.innerHTML = draft.objectives.map(function (obj, index) {
          return (
            '<div class="flex gap-sm mt-sm">' +
              '<input type="text" style="flex:1" data-objective-index="' + index + '" value="' + Utils.escapeHtml(obj.text) + '">' +
              '<button class="btn btn-danger btn-sm" data-remove-objective="' + index + '">Remove</button>' +
            '</div>'
          );
        }).join('') || '<p class="text-muted">No objectives yet.</p>';

        list.querySelectorAll('[data-objective-index]').forEach(function (input) {
          input.addEventListener('input', function () {
            draft.objectives[parseInt(input.getAttribute('data-objective-index'), 10)].text = input.value;
          });
        });
        list.querySelectorAll('[data-remove-objective]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            draft.objectives.splice(parseInt(btn.getAttribute('data-remove-objective'), 10), 1);
            renderObjectives();
          });
        });
      }

      function renderChecklist(role, catalog, selectedIds) {
        var holder = body.querySelector('[data-role="' + role + '"]');
        holder.innerHTML = catalog.map(function (entry) {
          var checked = selectedIds.indexOf(entry.id) >= 0;
          return '<label class="flex items-center gap-sm" style="font-size:0.82rem;padding:3px 0"><input type="checkbox" value="' + entry.id + '" ' + (checked ? 'checked' : '') + '> ' + Utils.escapeHtml(entry.name) + '</label>';
        }).join('') || '<p class="text-muted">None available.</p>';

        holder.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
          cb.addEventListener('change', function () {
            var index = selectedIds.indexOf(cb.value);
            if (cb.checked && index < 0) selectedIds.push(cb.value);
            if (!cb.checked && index >= 0) selectedIds.splice(index, 1);
          });
        });
      }

      function save() {
        var values = SUI.readSimpleFields(body);
        draft.name = values.name;
        draft.description = values.description;
        draft.recommendedDifficulty = values.recommendedDifficulty;
        draft.recommendedLevel = parseInt(values.recommendedLevel, 10) || 1;
        draft.rewards.coins = parseInt(values.coins, 10) || 0;
        draft.rewards.xp = parseInt(values.xp, 10) || 0;
        draft.rewards.titles = values.titlesText.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
        draft.objectives = draft.objectives.filter(function (o) { return o.text.trim(); });

        if (!draft.name.trim()) { UI.notify('Give the quest a name.', 'warning'); return; }

        ORV.ContentStore.upsertEntry('quests', draft);
        ORV.App.refreshGameData();
        UI.closeModal();
        refreshTable();
        UI.notify(draft.name + ' saved.', 'success');
      }
    }

    container.querySelector('[data-role="new-quest"]').addEventListener('click', function () { openForm(null); });
    refreshTable();
  }

  ORV.QuestManager = { mount: mount };

})(window.ORV = window.ORV || {});
