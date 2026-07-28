/**
 * Character Manager. This is the one place a Dungeon Master directly edits
 * a player's saved character record. It reuses CharacterModel wherever an
 * action already exists there (inventory, equip, status effects) and
 * writes straight to the character object for DM-only actions that have no
 * player-side equivalent (renaming, granting skills/stigmas/fables for
 * free, resolving quests).
 */
(function (ORV) {
  'use strict';

  var Utils = ORV.Utils;
  var UI = ORV.UI;
  var CM = ORV.CharacterModel;

  var selectedCharacterId = null;

  function mount(container) {
    selectedCharacterId = null;
    render(container);
  }

  function render(container) {
    var character = selectedCharacterId
      ? ORV.Storage.getCharacters().find(function (c) { return c.id === selectedCharacterId; })
      : null;

    if (!character) {
      renderList(container);
    } else {
      renderDetail(container, character);
    }
  }

  function renderList(container) {
    var characters = ORV.Storage.getCharacters();
    container.innerHTML =
      '<div class="view-header"><div class="view-header__eyebrow">Staff Panel // Characters</div><h1>Player Characters</h1></div>' +
      (characters.length
        ? '<div class="hub-grid" data-role="char-grid"></div>'
        : '<div class="empty-state"><h3>No characters yet</h3><p>Players create them from the Player Panel.</p></div>');

    var grid = container.querySelector('[data-role="char-grid"]');
    if (!grid) return;

    characters.forEach(function (character) {
      var card = UI.createEl('div', { className: 'card card--interactive' });
      card.innerHTML =
        '<div class="char-card__portrait">' + UI.mediaHtml(character.portrait, 'icon-user', 'icon-lg') + '</div>' +
        '<div class="char-card__name">' + Utils.escapeHtml(character.name) + '</div>' +
        '<div class="text-muted" style="font-size:0.8rem">Level ' + character.level + ' &middot; ' + character.coins + ' coins &middot; HP ' + character.resources.hp.current + '/' + character.resources.hp.max + '</div>' +
        '<button class="btn btn-primary btn-sm w-full mt-md">Manage</button>';
      card.addEventListener('click', function () {
        selectedCharacterId = character.id;
        render(container);
      });
      grid.appendChild(card);
    });
  }

  function save(container, character) {
    ORV.Storage.saveCharacter(character);
    render(container);
  }

  function renderDetail(container, character) {
    var gameData = ORV.State.getState().gameData;
    var derived = CM.computeDerived(character, gameData);

    container.innerHTML =
      '<div class="view-header flex-between">' +
        '<div><div class="view-header__eyebrow">Staff Panel // Managing</div><h1>' + Utils.escapeHtml(character.name) + '</h1></div>' +
        '<button class="btn btn-ghost" data-role="back-to-list">Back to List</button>' +
      '</div>' +

      '<div class="card"><h3>Identity</h3>' +
        '<div class="field-row">' +
          field('Name', 'name', character.name) +
          field('Coins', 'coins', character.coins, 'number') +
        '</div>' +
        '<button class="btn btn-primary btn-sm" data-role="save-identity">Save</button>' +
      '</div>' +

      '<div class="card mt-md"><h3>HP / Stamina / Mana</h3>' +
        '<div class="field-row">' +
          hpField('hp', 'HP', character.resources.hp, derived.maxHp) +
          hpField('stamina', 'Stamina', character.resources.stamina, derived.maxStamina) +
          hpField('mana', 'Mana', character.resources.mana, derived.maxMana) +
        '</div>' +
        '<button class="btn btn-primary btn-sm" data-role="save-resources">Save</button>' +
      '</div>' +

      '<div class="card mt-md"><h3>Stats</h3><div class="field-row" data-role="stat-fields"></div>' +
        '<button class="btn btn-primary btn-sm" data-role="save-stats">Save</button>' +
      '</div>' +

      '<div class="card mt-md"><h3>Skills</h3><div class="field-row">' +
        '<div style="flex:1"><h4 class="text-muted">Unlocked</h4><div data-role="unlocked-skills"></div></div>' +
        '<div style="flex:1"><h4 class="text-muted">Grant</h4><div data-role="available-skills"></div></div>' +
      '</div></div>' +

      '<div class="card mt-md"><h3>Stigmas</h3><div class="field-row">' +
        '<div style="flex:1"><h4 class="text-muted">Owned</h4><div data-role="owned-stigmas"></div></div>' +
        '<div style="flex:1"><h4 class="text-muted">Grant</h4><div data-role="available-stigmas"></div></div>' +
      '</div></div>' +

      '<div class="card mt-md"><h3>Fables</h3><div class="field-row">' +
        '<div style="flex:1"><h4 class="text-muted">Owned</h4><div data-role="owned-fables"></div></div>' +
        '<div style="flex:1"><h4 class="text-muted">Grant</h4><div data-role="available-fables"></div></div>' +
      '</div></div>' +

      '<div class="card mt-md"><h3>Status Effects</h3>' +
        '<div class="field-row"><div class="field" style="flex:2"><label>Apply Effect</label><select data-role="status-select"></select></div>' +
        '<div class="field" style="flex:1"><button class="btn btn-primary" data-role="apply-status" style="margin-top:22px">Apply</button></div></div>' +
        '<div data-role="active-statuses"></div>' +
      '</div>' +

      '<div class="card mt-md"><h3>Inventory</h3>' +
        '<div class="field-row"><div class="field" style="flex:2"><label>Give Item</label><select data-role="give-item-select"></select></div>' +
        '<div class="field" style="width:100px"><label>Qty</label><input type="number" value="1" data-role="give-item-qty"></div>' +
        '<div class="field"><button class="btn btn-primary" data-role="give-item" style="margin-top:22px">Give</button></div></div>' +
        '<div data-role="inventory-list"></div>' +
        '<h4 class="mt-md text-muted">Equipped</h4><div data-role="equipped-list"></div>' +
      '</div>' +

      '<div class="card mt-md"><h3>Quests</h3><div data-role="quest-management"></div></div>';

    container.querySelector('[data-role="back-to-list"]').addEventListener('click', function () {
      selectedCharacterId = null;
      render(container);
    });

    container.querySelector('[data-role="save-identity"]').addEventListener('click', function () {
      character.name = container.querySelector('[data-field="name"]').value.trim() || character.name;
      character.coins = parseInt(container.querySelector('[data-field="coins"]').value, 10) || 0;
      UI.notify('Identity updated.', 'success');
      save(container, character);
    });

    container.querySelector('[data-role="save-resources"]').addEventListener('click', function () {
      ['hp', 'stamina', 'mana'].forEach(function (key) {
        var value = parseInt(container.querySelector('[data-field="' + key + '-current"]').value, 10) || 0;
        character.resources[key].current = Utils.clamp(value, 0, character.resources[key].max);
      });
      UI.notify('Resources updated.', 'success');
      save(container, character);
    });

    var statFields = container.querySelector('[data-role="stat-fields"]');
    gameData.rules.stats.forEach(function (statKey) {
      statFields.innerHTML += field(gameData.rules.statLabels[statKey], 'stat_' + statKey, character.stats[statKey], 'number');
    });
    container.querySelector('[data-role="save-stats"]').addEventListener('click', function () {
      gameData.rules.stats.forEach(function (statKey) {
        character.stats[statKey] = parseInt(container.querySelector('[data-field="stat_' + statKey + '"]').value, 10) || gameData.rules.baseStatValue;
      });
      CM.syncResourcesToMax(character, gameData);
      UI.notify('Stats updated.', 'success');
      save(container, character);
    });

    renderGrantList(container, 'unlocked-skills', 'available-skills', gameData.skills.skills, character.unlockedSkills,
      function (id) { character.unlockedSkills.push(id); save(container, character); },
      function (id) { character.unlockedSkills = character.unlockedSkills.filter(function (x) { return x !== id; }); save(container, character); });

    renderGrantList(container, 'owned-stigmas', 'available-stigmas', gameData.stigmas.stigmas, character.stigmas,
      function (id) { character.stigmas.push(id); save(container, character); },
      function (id) { character.stigmas = character.stigmas.filter(function (x) { return x !== id; }); save(container, character); });

    renderGrantList(container, 'owned-fables', 'available-fables', gameData.fables.fables, character.fables,
      function (id) { character.fables.push(id); save(container, character); },
      function (id) { character.fables = character.fables.filter(function (x) { return x !== id; }); save(container, character); });

    renderStatusSection(container, character, gameData);
    renderInventorySection(container, character, gameData);
    renderQuestSection(container, character, gameData);
  }

  function field(label, key, value, type) {
    type = type || 'text';
    return '<div class="field"><label>' + label + '</label><input type="' + type + '" data-field="' + key + '" value="' + Utils.escapeHtml(value) + '"></div>';
  }

  function hpField(key, label, resource, max) {
    return '<div class="field"><label>' + label + ' (max ' + max + ')</label><input type="number" data-field="' + key + '-current" value="' + resource.current + '" max="' + max + '"></div>';
  }

  function renderGrantList(container, ownedRole, availableRole, catalog, ownedIds, onGrant, onRevoke) {
    var ownedEl = container.querySelector('[data-role="' + ownedRole + '"]');
    var availableEl = container.querySelector('[data-role="' + availableRole + '"]');
    var owned = catalog.filter(function (c) { return ownedIds.indexOf(c.id) >= 0; });
    var available = catalog.filter(function (c) { return ownedIds.indexOf(c.id) < 0; });

    ownedEl.innerHTML = owned.map(function (c) {
      return '<div class="flex-between" style="padding:4px 0"><span>' + Utils.escapeHtml(c.name) + '</span><button class="btn btn-danger btn-sm" data-revoke="' + c.id + '">Remove</button></div>';
    }).join('') || '<p class="text-muted">None yet.</p>';

    availableEl.innerHTML = available.map(function (c) {
      return '<div class="flex-between" style="padding:4px 0"><span>' + Utils.escapeHtml(c.name) + '</span><button class="btn btn-primary btn-sm" data-grant="' + c.id + '">Grant</button></div>';
    }).join('') || '<p class="text-muted">Nothing left to grant.</p>';

    ownedEl.querySelectorAll('[data-revoke]').forEach(function (btn) { btn.addEventListener('click', function () { onRevoke(btn.getAttribute('data-revoke')); }); });
    availableEl.querySelectorAll('[data-grant]').forEach(function (btn) { btn.addEventListener('click', function () { onGrant(btn.getAttribute('data-grant')); }); });
  }

  function renderStatusSection(container, character, gameData) {
    var select = container.querySelector('[data-role="status-select"]');
    select.innerHTML = gameData.statusEffects.effects.map(function (e) { return '<option value="' + e.id + '">' + e.name + '</option>'; }).join('');

    container.querySelector('[data-role="apply-status"]').addEventListener('click', function () {
      var result = CM.addStatusEffect(character, select.value, gameData);
      UI.notify(result.message, result.success ? 'success' : 'warning');
      save(container, character);
    });

    var activeEl = container.querySelector('[data-role="active-statuses"]');
    activeEl.innerHTML = character.statusEffects.map(function (instance) {
      var def = gameData.statusEffects.effects.find(function (e) { return e.id === instance.effectId; });
      return '<div class="flex-between status-chip" style="margin:4px 0"><span>' + (def ? def.name : instance.effectId) + ' x' + instance.stacks + '</span><button class="btn btn-danger btn-sm" data-remove-status="' + instance.effectId + '">Remove</button></div>';
    }).join('') || '<p class="text-muted">No active status effects.</p>';

    activeEl.querySelectorAll('[data-remove-status]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        CM.removeStatusEffect(character, btn.getAttribute('data-remove-status'), gameData);
        save(container, character);
      });
    });
  }

  function renderInventorySection(container, character, gameData) {
    var itemSelect = container.querySelector('[data-role="give-item-select"]');
    itemSelect.innerHTML = gameData.items.items.map(function (i) { return '<option value="' + i.id + '">' + i.name + '</option>'; }).join('');

    container.querySelector('[data-role="give-item"]').addEventListener('click', function () {
      var qty = parseInt(container.querySelector('[data-role="give-item-qty"]').value, 10) || 1;
      CM.addItemToInventory(character, itemSelect.value, qty);
      UI.notify('Item given.', 'success');
      save(container, character);
    });

    var invList = container.querySelector('[data-role="inventory-list"]');
    invList.innerHTML = character.inventory.map(function (entry) {
      var def = CM.findItemDef(entry.itemId, gameData);
      if (!def) return '';
      return '<div class="flex-between" style="padding:4px 0"><span>' + Utils.escapeHtml(def.name) + ' x' + entry.quantity + '</span><button class="btn btn-danger btn-sm" data-remove-item="' + entry.itemId + '">Remove One</button></div>';
    }).join('') || '<p class="text-muted">Empty.</p>';

    invList.querySelectorAll('[data-remove-item]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        CM.removeItemFromInventory(character, btn.getAttribute('data-remove-item'), 1);
        save(container, character);
      });
    });

    var equipList = container.querySelector('[data-role="equipped-list"]');
    equipList.innerHTML = Object.keys(character.equipped).map(function (slot) {
      var itemId = character.equipped[slot];
      var def = itemId ? CM.findItemDef(itemId, gameData) : null;
      return '<div class="flex-between" style="padding:4px 0"><span>' + Utils.titleCase(slot) + ': ' + (def ? Utils.escapeHtml(def.name) : 'Empty') + '</span>' +
        (def ? '<button class="btn btn-ghost btn-sm" data-unequip="' + slot + '">Unequip</button>' : '') + '</div>';
    }).join('');

    equipList.querySelectorAll('[data-unequip]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        CM.unequipItem(character, btn.getAttribute('data-unequip'), gameData);
        save(container, character);
      });
    });
  }

  function renderQuestSection(container, character, gameData) {
    var el = container.querySelector('[data-role="quest-management"]');
    if (!character.quests.active.length) {
      el.innerHTML = '<p class="text-muted">No active quests to resolve.</p>';
      return;
    }
    el.innerHTML = character.quests.active.map(function (progress) {
      var quest = gameData.quests.quests.find(function (q) { return q.id === progress.questId; });
      if (!quest) return '';
      return (
        '<div class="flex-between" style="padding:6px 0;border-bottom:1px solid var(--color-border)">' +
          '<span>' + Utils.escapeHtml(quest.name) + '</span>' +
          '<span class="flex gap-sm">' +
            '<button class="btn btn-primary btn-sm" data-complete-quest="' + quest.id + '">Complete + Reward</button>' +
            '<button class="btn btn-danger btn-sm" data-fail-quest="' + quest.id + '">Fail</button>' +
          '</span>' +
        '</div>'
      );
    }).join('');

    el.querySelectorAll('[data-complete-quest]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        resolveQuest(character, gameData, btn.getAttribute('data-complete-quest'), 'completed');
        save(container, character);
      });
    });
    el.querySelectorAll('[data-fail-quest]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        resolveQuest(character, gameData, btn.getAttribute('data-fail-quest'), 'failed');
        save(container, character);
      });
    });
  }

  function resolveQuest(character, gameData, questId, outcome) {
    var quest = gameData.quests.quests.find(function (q) { return q.id === questId; });
    character.quests.active = character.quests.active.filter(function (p) { return p.questId !== questId; });
    character.quests[outcome].push({ questId: questId, resolvedAt: new Date().toISOString() });

    if (outcome === 'completed' && quest) {
      character.coins += quest.rewards.coins || 0;
      (quest.rewards.items || []).forEach(function (itemId) { CM.addItemToInventory(character, itemId, 1); });
      (quest.rewards.titles || []).forEach(function (title) { if (character.titles.indexOf(title) < 0) character.titles.push(title); });
      (quest.rewards.fables || []).forEach(function (fableId) { if (character.fables.indexOf(fableId) < 0) character.fables.push(fableId); });
      (quest.rewards.stigmas || []).forEach(function (stigmaId) { if (character.stigmas.indexOf(stigmaId) < 0) character.stigmas.push(stigmaId); });
      if (quest.rewards.xp) CM.addExperience(character, quest.rewards.xp, gameData);
      UI.notify(quest.name + ' completed, rewards granted.', 'success');
    } else {
      UI.notify((quest ? quest.name : 'Quest') + ' marked failed.', 'warning');
    }
  }

  ORV.CharacterManager = { mount: mount };

})(window.ORV = window.ORV || {});
