/**
 * Item Creator. New and edited items are written to ContentStore under the
 * "items" category, which the Player Panel's inventory, entryBrowser-based
 * Codex, and character creation equipment step all read automatically once
 * gameData is refreshed, since they all read from the merged catalog.
 */
(function (ORV) {
  'use strict';

  var Utils = ORV.Utils;
  var UI = ORV.UI;
  var SUI = ORV.StaffUI;

  var ICON_CHOICES = ['icon-weapon', 'icon-armour', 'icon-consumable', 'icon-material', 'icon-accessory', 'icon-quest'];
  var MODIFIER_TARGETS = ['stat', 'skill', 'allSkills', 'resource', 'special'];
  var MODIFIER_TYPES = ['flat', 'percent', 'text'];

  function mount(container) {
    var gameData = ORV.State.getState().gameData;
    var rules = gameData.rules;

    container.innerHTML =
      '<div class="view-header flex-between"><div><div class="view-header__eyebrow">Staff Panel // Item Creator</div><h1>Items</h1></div>' +
      '<button class="btn btn-primary" data-role="new-item">' + UI.icon('icon-plus') + ' New Item</button></div>' +
      '<div data-role="item-table"></div>';

    function refreshTable() {
      var items = ORV.State.getState().gameData.items.items;
      container.querySelector('[data-role="item-table"]').innerHTML = SUI.renderDataTable(items, [
        { key: 'name', label: 'Name' },
        { key: 'category', label: 'Category', render: function (r) { return Utils.titleCase(r.category); } },
        { key: 'rarity', label: 'Rarity', render: function (r) { return '<span style="color:var(--rarity-' + r.rarity + ')">' + r.rarity + '</span>'; } },
        { key: 'sellValue', label: 'Sell Value' }
      ]);
      wireRowActions(items);
    }

    function wireRowActions(items) {
      container.querySelectorAll('[data-row-edit]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var item = items.find(function (i) { return i.id === btn.getAttribute('data-row-edit'); });
          openForm(item);
        });
      });
      container.querySelectorAll('[data-row-delete]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var item = items.find(function (i) { return i.id === btn.getAttribute('data-row-delete'); });
          SUI.confirmDelete(item.name, function () {
            ORV.ContentStore.deleteEntry('items', item.id);
            ORV.App.refreshGameData();
            refreshTable();
            UI.notify(item.name + ' deleted.', 'info');
          });
        });
      });
    }

    function openForm(existingItem) {
      var draft = existingItem ? Utils.deepClone(existingItem) : {
        id: null, name: '', description: '', category: 'weapon', rarity: 'common', icon: 'icon-weapon',
        image: null, weight: 1, stackSize: 1, sellValue: 0, requirements: null, isStarterItem: false, effects: []
      };

      var body = UI.createEl('div');
      UI.openModal({ title: existingItem ? 'Edit Item' : 'New Item', content: body });
      renderForm();

      function renderForm() {
        body.innerHTML =
          SUI.field('Name', 'name', draft.name, 'text') +
          SUI.field('Description', 'description', draft.description, 'textarea') +
          '<div class="field-row">' +
            SUI.selectField('Category', 'category', draft.category, rules.itemCategories) +
            SUI.selectField('Rarity', 'rarity', draft.rarity, rules.rarities) +
          '</div>' +
          '<div class="field-row">' +
            SUI.selectField('Icon', 'icon', draft.icon, ICON_CHOICES) +
            SUI.field('Weight', 'weight', draft.weight, 'number', 'step="0.1"') +
          '</div>' +
          '<div class="field-row">' +
            SUI.field('Stack Size', 'stackSize', draft.stackSize, 'number') +
            SUI.field('Sell Value', 'sellValue', draft.sellValue, 'number') +
          '</div>' +
          SUI.field('Requirements (optional)', 'requirements', draft.requirements, 'text') +
          '<label class="flex items-center gap-sm mt-sm"><input type="checkbox" data-field="isStarterItem" ' + (draft.isStarterItem ? 'checked' : '') + '> Available as starting equipment</label>' +
          SUI.imageUploadField('Item Image', 'image', draft.image) +
          '<h3 class="mt-lg">Effects</h3><div data-role="effects-list"></div>' +
          '<button class="btn btn-ghost btn-sm mt-sm" data-role="add-effect">Add Effect</button>' +
          '<div class="flex gap-sm mt-lg"><button class="btn btn-primary" data-role="save-item">Save Item</button>' +
          '<button class="btn btn-ghost" data-role="cancel-item">Cancel</button></div>';

        renderEffects();

        var imageInput = body.querySelector('[data-image-field="image"]');
        if (imageInput) {
          imageInput.addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (!file) return;
            SUI.resizeImageFile(file, 400, function (dataUrl) { draft.image = dataUrl; });
          });
        }

        body.querySelector('[data-role="add-effect"]').addEventListener('click', function () {
          draft.effects.push({ target: 'stat', key: '', type: 'flat', value: 0 });
          renderEffects();
        });

        body.querySelector('[data-role="cancel-item"]').addEventListener('click', UI.closeModal);
        body.querySelector('[data-role="save-item"]').addEventListener('click', function () {
          var values = SUI.readSimpleFields(body);
          Object.assign(draft, values);
          draft.weight = parseFloat(values.weight) || 0;
          draft.stackSize = parseInt(values.stackSize, 10) || 1;
          draft.sellValue = parseInt(values.sellValue, 10) || 0;
          draft.isStarterItem = body.querySelector('[data-field="isStarterItem"]').checked;

          if (!draft.name.trim()) { UI.notify('Give the item a name.', 'warning'); return; }

          ORV.ContentStore.upsertEntry('items', draft);
          ORV.App.refreshGameData();
          UI.closeModal();
          refreshTable();
          UI.notify(draft.name + ' saved.', 'success');
        });
      }

      function renderEffects() {
        var list = body.querySelector('[data-role="effects-list"]');
        if (!draft.effects.length) {
          list.innerHTML = '<p class="text-muted">No effects. This item is flavor-only.</p>';
          return;
        }
        list.innerHTML = draft.effects.map(function (fx, index) {
          return (
            '<div class="field-row" data-effect-row="' + index + '" style="align-items:flex-end">' +
              selectSnippet('Target', index, 'target', fx.target, MODIFIER_TARGETS) +
              inputSnippet('Key', index, 'key', fx.key) +
              selectSnippet('Type', index, 'type', fx.type, MODIFIER_TYPES) +
              inputSnippet('Value', index, 'value', fx.value) +
              '<button class="btn btn-danger btn-sm" data-remove-effect="' + index + '">Remove</button>' +
            '</div>'
          );
        }).join('');

        list.querySelectorAll('[data-effect-field]').forEach(function (el) {
          el.addEventListener('input', function () {
            var idx = parseInt(el.getAttribute('data-effect-index'), 10);
            var key = el.getAttribute('data-effect-field');
            draft.effects[idx][key] = key === 'value' && el.getAttribute('data-effect-type') !== 'text' ? (parseFloat(el.value) || 0) : el.value;
          });
        });
        list.querySelectorAll('[data-remove-effect]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            draft.effects.splice(parseInt(btn.getAttribute('data-remove-effect'), 10), 1);
            renderEffects();
          });
        });
      }

      function selectSnippet(label, index, key, value, options) {
        var opts = options.map(function (o) { return '<option value="' + o + '" ' + (o === value ? 'selected' : '') + '>' + o + '</option>'; }).join('');
        return '<div class="field"><label>' + label + '</label><select data-effect-field="' + key + '" data-effect-index="' + index + '">' + opts + '</select></div>';
      }
      function inputSnippet(label, index, key, value) {
        return '<div class="field"><label>' + label + '</label><input type="text" data-effect-field="' + key + '" data-effect-index="' + index + '" value="' + Utils.escapeHtml(value) + '"></div>';
      }
    }

    container.querySelector('[data-role="new-item"]').addEventListener('click', function () { openForm(null); });
    refreshTable();
  }

  ORV.ItemCreator = { mount: mount };

})(window.ORV = window.ORV || {});
