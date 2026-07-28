/**
 * Codex Manager. Only manages the lore-only categories that live in
 * codex.json, since Skills, Stigmas, Fables, Equipment, and Status Effects
 * already have their own systems and are pulled into the Codex read-only,
 * see codex.js for how that aggregation works.
 */
(function (ORV) {
  'use strict';

  var Utils = ORV.Utils;
  var UI = ORV.UI;
  var SUI = ORV.StaffUI;

  function mount(container) {
    var rules = ORV.State.getState().gameData.rules;

    container.innerHTML =
      '<div class="view-header flex-between"><div><div class="view-header__eyebrow">Staff Panel // Codex</div><h1>Codex Articles</h1></div>' +
      '<button class="btn btn-primary" data-role="new-entry">' + UI.icon('icon-plus') + ' New Article</button></div>' +
      '<p class="text-muted">Skills, Stigmas, Fables, Equipment, and Status Effects appear in the Codex automatically and are managed from their own screens.</p>' +
      '<div data-role="codex-table"></div>';

    function refreshTable() {
      var entries = ORV.State.getState().gameData.codex.entries;
      container.querySelector('[data-role="codex-table"]').innerHTML = SUI.renderDataTable(entries, [
        { key: 'name', label: 'Name' },
        { key: 'category', label: 'Category', render: function (r) { return rules.codexCategoryLabels[r.category] || r.category; } }
      ]);
      container.querySelectorAll('[data-row-edit]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          openForm(entries.find(function (e) { return e.id === btn.getAttribute('data-row-edit'); }));
        });
      });
      container.querySelectorAll('[data-row-delete]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var entry = entries.find(function (e) { return e.id === btn.getAttribute('data-row-delete'); });
          SUI.confirmDelete(entry.name, function () {
            ORV.ContentStore.deleteEntry('codex', entry.id);
            ORV.App.refreshGameData();
            refreshTable();
            UI.notify(entry.name + ' deleted.', 'info');
          });
        });
      });
    }

    function openForm(existing) {
      var draft = existing ? Utils.deepClone(existing) : {
        id: null, category: rules.codexCategories[0], name: '', body: '', tags: [], relatedIds: [], image: null
      };

      var body = UI.createEl('div');
      UI.openModal({ title: existing ? 'Edit Article' : 'New Article', content: body });

      body.innerHTML =
        SUI.field('Name', 'name', draft.name, 'text') +
        SUI.selectField('Category', 'category', draft.category, rules.codexCategories.map(function (c) { return { value: c, label: rules.codexCategoryLabels[c] || c }; })) +
        SUI.field('Body', 'body', draft.body, 'textarea') +
        SUI.field('Tags (comma separated)', 'tagsText', (draft.tags || []).join(', '), 'text') +
        SUI.imageUploadField('Article Image', 'image', draft.image) +
        '<div class="flex gap-sm mt-lg"><button class="btn btn-primary" data-role="save-entry">Save Article</button>' +
        '<button class="btn btn-ghost" data-role="cancel-entry">Cancel</button></div>';

      var imageInput = body.querySelector('[data-image-field="image"]');
      imageInput.addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file) return;
        SUI.resizeImageFile(file, 500, function (dataUrl) { draft.image = dataUrl; });
      });

      body.querySelector('[data-role="cancel-entry"]').addEventListener('click', UI.closeModal);
      body.querySelector('[data-role="save-entry"]').addEventListener('click', function () {
        var values = SUI.readSimpleFields(body);
        draft.name = values.name;
        draft.category = values.category;
        draft.body = values.body;
        draft.tags = values.tagsText.split(',').map(function (t) { return t.trim(); }).filter(Boolean);

        if (!draft.name.trim()) { UI.notify('Give the article a name.', 'warning'); return; }

        ORV.ContentStore.upsertEntry('codex', draft);
        ORV.App.refreshGameData();
        UI.closeModal();
        refreshTable();
        UI.notify(draft.name + ' saved.', 'success');
      });
    }

    container.querySelector('[data-role="new-entry"]').addEventListener('click', function () { openForm(null); });
    refreshTable();
  }

  ORV.CodexManager = { mount: mount };

})(window.ORV = window.ORV || {});
