/**
 * Character profile: the full status window for one character. Traits are
 * fixed at creation; Stigmas, Fables, and Status Effects are granted by a
 * Dungeon Master (the Staff Panel, arriving in the next milestone) and are
 * shown read-only here. Equipment, consumables, quest tracking, and
 * progression spending are player actions and are interactive.
 */
(function (ORV) {
  'use strict';

  var Utils = ORV.Utils;
  var UI = ORV.UI;
  var CM = ORV.CharacterModel;

  var TABS = ['Traits', 'Skills', 'Stigmas', 'Fables', 'Status Effects', 'Inventory', 'Quests', 'Progression', 'Journal'];
  var activeTab = 'Traits';

  function mount(container) {
    var character = ORV.State.getActiveCharacter();
    if (!character) {
      container.innerHTML =
        '<div class="view-header"><div class="view-header__eyebrow">System Window // Profile</div><h1>Character Profile</h1></div>' +
        '<div class="empty-state"><h3>No active character</h3><p>Select a character from the Character Hub first.</p></div>';
      return;
    }
    render(container, character);
  }

  function render(container, character) {
    var gameData = ORV.State.getState().gameData;
    var derived = CM.computeDerived(character, gameData);

    container.innerHTML =
      '<div class="view-header"><div class="view-header__eyebrow">System Window // Profile</div><h1>Character Profile</h1></div>' +
      '<div class="profile-header">' +
        '<div class="profile-portrait bracket-frame">' + (character.portrait ? '<img src="' + character.portrait + '" alt="">' : UI.icon('icon-user', 'icon-lg')) + '</div>' +
        '<div class="profile-identity">' +
          '<h2 class="profile-identity__name">' + Utils.escapeHtml(character.name) + '</h2>' +
          '<div class="profile-identity__alias">' + Utils.escapeHtml(character.alias || 'No alias') + '</div>' +
          '<div class="profile-identity__meta">' +
            '<span>Level ' + character.level + '</span>' +
            '<span>' + Utils.escapeHtml(character.species || 'Species unset') + '</span>' +
            '<span>' + Utils.escapeHtml(character.occupation || 'Occupation unset') + '</span>' +
            '<span>' + Utils.escapeHtml(character.affiliation || 'Unaffiliated') + '</span>' +
            '<span class="text-cyan font-mono">' + UI.icon('icon-coin') + ' ' + character.coins + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="resource-grid">' +
        '<div class="card">' + UI.resourceBarHtml('HP', character.resources.hp.current, derived.maxHp, 'stat-bar__fill--hp') + '</div>' +
        '<div class="card">' + UI.resourceBarHtml('Stamina', character.resources.stamina.current, derived.maxStamina, 'stat-bar__fill--stamina') + '</div>' +
        '<div class="card">' + UI.resourceBarHtml('Mana', character.resources.mana.current, derived.maxMana, 'stat-bar__fill--mana') + '</div>' +
      '</div>' +
      '<div class="stat-grid" data-role="stat-grid"></div>' +
      '<div class="tab-bar" data-role="profile-tabs"></div>' +
      '<div data-role="profile-tab-content"></div>';

    renderStatGrid(container.querySelector('[data-role="stat-grid"]'), character, gameData, derived);
    renderTabs(container, character, gameData, derived);
  }

  function renderStatGrid(gridEl, character, gameData) {
    var derived = CM.computeDerived(character, gameData);
    gridEl.innerHTML = gameData.rules.stats.map(function (statKey) {
      return (
        '<div class="stat-cell">' +
          '<div class="stat-cell__label">' + gameData.rules.statLabels[statKey] + '</div>' +
          '<div class="stat-cell__value">' + derived.effectiveStats[statKey] + '</div>' +
          '<div class="stat-cell__mod">' + Utils.formatModifier(derived.statModifiers[statKey]) + '</div>' +
        '</div>'
      );
    }).join('');
  }

  function renderTabs(container, character, gameData, derived) {
    var tabBar = container.querySelector('[data-role="profile-tabs"]');
    tabBar.innerHTML = TABS.map(function (tab) {
      return '<button class="tab' + (tab === activeTab ? ' is-active' : '') + '" data-tab="' + tab + '">' + tab + '</button>';
    }).join('');

    tabBar.querySelectorAll('.tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeTab = btn.getAttribute('data-tab');
        render(container, ORV.State.getActiveCharacter());
      });
    });

    var content = container.querySelector('[data-role="profile-tab-content"]');
    var renderMap = {
      'Traits': renderTraitsTab, 'Skills': renderSkillsTab, 'Stigmas': renderStigmasTab,
      'Fables': renderFablesTab, 'Status Effects': renderStatusTab, 'Inventory': renderInventoryTab,
      'Quests': renderQuestsTab, 'Progression': renderProgressionTab, 'Journal': renderJournalTab
    };
    renderMap[activeTab](content, character, gameData, derived, container);
  }

  function refresh(container, character) {
    ORV.State.upsertCharacter(character);
    render(container, character);
  }

  /* ---------------- Traits ---------------- */

  function renderTraitsTab(content, character, gameData) {
    var positive = character.traits.positive.map(function (id) { return CM.findTraitDef(id, gameData); }).filter(Boolean);
    var negative = character.traits.negative.map(function (id) { return CM.findTraitDef(id, gameData); }).filter(Boolean);
    content.innerHTML =
      '<div class="trait-columns">' +
        '<div><h3>Positive</h3><div class="trait-list">' + (positive.map(traitRow).join('') || emptyLine('No positive traits.')) + '</div></div>' +
        '<div><h3>Negative</h3><div class="trait-list">' + (negative.map(traitRow).join('') || emptyLine('No negative traits.')) + '</div></div>' +
      '</div>';
  }

  function traitRow(trait) {
    return '<div class="trait-option"><div><div class="trait-option__name">' + Utils.escapeHtml(trait.name) + '</div>' +
      '<div class="trait-option__desc">' + Utils.escapeHtml(trait.description) + '</div></div></div>';
  }

  /* ---------------- Skills (unlockable abilities) ---------------- */

  function renderSkillsTab(content, character, gameData) {
    var unlocked = character.unlockedSkills.map(function (id) { return gameData.skills.skills.find(function (s) { return s.id === id; }); }).filter(Boolean);
    if (!unlocked.length) {
      content.innerHTML = emptyState('No skills unlocked yet.', 'Unlock abilities from the Progression tab as the character grows.');
      return;
    }
    content.innerHTML = '<div class="entry-grid">' + unlocked.map(function (skill) {
      return (
        '<div class="card">' +
          '<div class="card__header">' + UI.icon(skill.icon) + '<span class="badge text-cyan">' + skill.type + '</span></div>' +
          '<h3>' + Utils.escapeHtml(skill.name) + '</h3>' +
          '<p class="text-muted">' + Utils.escapeHtml(skill.description) + '</p>' +
          (skill.cost ? '<p class="font-mono">Cost: ' + skill.cost.amount + ' ' + skill.cost.resource + '</p>' : '') +
          (skill.cooldown ? '<p class="font-mono">Cooldown: ' + skill.cooldown + '</p>' : '') +
        '</div>'
      );
    }).join('') + '</div>';
  }

  /* ---------------- Stigmas ---------------- */

  function renderStigmasTab(content, character, gameData) {
    var stigmas = character.stigmas.map(function (id) { return gameData.stigmas.stigmas.find(function (s) { return s.id === id; }); }).filter(Boolean);
    if (!stigmas.length) {
      content.innerHTML = emptyState('No stigmas yet.', 'Stigmas are granted by a Dungeon Master through play.');
      return;
    }
    content.innerHTML = '<div class="entry-grid">' + stigmas.map(function (s) {
      return (
        '<div class="card">' +
          '<div class="card__header">' + UI.icon(s.icon) + '<span class="badge">Rank ' + s.rank + '</span></div>' +
          '<h3>' + Utils.escapeHtml(s.name) + '</h3>' +
          '<p class="text-muted">' + Utils.escapeHtml(s.description) + '</p>' +
          '<p><strong>' + Utils.escapeHtml(s.activeAbility.name) + '</strong>: ' + Utils.escapeHtml(s.activeAbility.description) + '</p>' +
          '<p class="font-mono text-muted">Cooldown: ' + s.activeAbility.cooldown + '</p>' +
        '</div>'
      );
    }).join('') + '</div>';
  }

  /* ---------------- Fables ---------------- */

  function renderFablesTab(content, character, gameData) {
    var fables = character.fables.map(function (id) { return gameData.fables.fables.find(function (f) { return f.id === id; }); }).filter(Boolean);
    if (!fables.length) {
      content.innerHTML = emptyState('No fables yet.', 'Fables are rare and are granted by a Dungeon Master for defining moments.');
      return;
    }
    content.innerHTML = '<div class="entry-grid">' + fables.map(function (f) {
      var gradeVar = '--grade-' + f.grade.toLowerCase().replace(/\s+/g, '-');
      return (
        '<div class="card" style="border-color:var(' + gradeVar + ')">' +
          '<div class="card__header">' + UI.icon(f.icon) + '<span class="badge" style="color:var(' + gradeVar + ');border-color:var(' + gradeVar + ')">' + f.grade + '</span></div>' +
          '<h3>' + Utils.escapeHtml(f.name) + '</h3>' +
          '<p class="text-muted">' + Utils.escapeHtml(f.story) + '</p>' +
        '</div>'
      );
    }).join('') + '</div>';
  }

  /* ---------------- Status Effects ---------------- */

  function renderStatusTab(content, character, gameData) {
    if (!character.statusEffects.length) {
      content.innerHTML = emptyState('No active status effects.', 'Applied and removed by a Dungeon Master during scenarios.');
      return;
    }
    content.innerHTML = '<div class="entry-grid">' + character.statusEffects.map(function (instance) {
      var def = gameData.statusEffects.effects.find(function (e) { return e.id === instance.effectId; });
      if (!def) return '';
      return (
        '<div class="card">' +
          '<div class="card__header"><h3 style="margin:0">' + Utils.escapeHtml(def.name) + '</h3>' +
          '<span class="badge text-warning">x' + instance.stacks + '</span></div>' +
          '<p class="text-muted">' + Utils.escapeHtml(def.description) + '</p>' +
          '<p class="font-mono text-muted">Remaining: ' + (instance.remainingDuration === null ? def.durationType : instance.remainingDuration + ' ' + def.durationType) + '</p>' +
        '</div>'
      );
    }).join('') + '</div>';
  }

  /* ---------------- Inventory ---------------- */

  function renderInventoryTab(content, character, gameData, derived, container) {
    var equippedRows = Object.keys(character.equipped).map(function (slot) {
      var itemId = character.equipped[slot];
      var def = itemId ? CM.findItemDef(itemId, gameData) : null;
      return (
        '<div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--color-border)">' +
          '<span>' + Utils.titleCase(slot) + ': ' + (def ? Utils.escapeHtml(def.name) : '<span class="text-muted">Empty</span>') + '</span>' +
          (def ? '<button class="btn btn-ghost btn-sm" data-unequip-slot="' + slot + '">Unequip</button>' : '') +
        '</div>'
      );
    }).join('');

    var inventoryRows = character.inventory.map(function (entry) {
      var def = CM.findItemDef(entry.itemId, gameData);
      if (!def) return '';
      var canEquip = def.category === 'weapon' || def.category === 'armour' || def.category === 'accessory';
      var canUse = def.category === 'consumable';
      return (
        '<div class="card" style="padding:12px">' +
          '<div class="flex-between">' +
            '<div class="flex items-center gap-sm">' + UI.icon(def.icon) +
              '<div><strong>' + Utils.escapeHtml(def.name) + '</strong>' +
              '<div class="text-muted" style="font-size:0.78rem">' + Utils.escapeHtml(def.description) + '</div></div></div>' +
            '<span class="badge" style="color:var(--rarity-' + def.rarity + ');border-color:var(--rarity-' + def.rarity + ')">' + def.rarity + '</span>' +
          '</div>' +
          '<div class="flex-between mt-sm">' +
            '<span class="font-mono text-muted">Qty ' + entry.quantity + '</span>' +
            '<span class="flex gap-sm">' +
              (canEquip ? '<button class="btn btn-sm btn-primary" data-equip-item="' + def.id + '">Equip</button>' : '') +
              (canUse ? '<button class="btn btn-sm btn-primary" data-use-item="' + def.id + '">Use</button>' : '') +
            '</span>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    content.innerHTML =
      '<h3>Equipped</h3><div class="card">' + equippedRows + '</div>' +
      '<h3 class="mt-lg">Inventory</h3>' +
      (character.inventory.length ? '<div class="entry-grid">' + inventoryRows + '</div>' : emptyState('Inventory is empty.', 'Items are found in scenarios or given by a Dungeon Master.'));

    content.querySelectorAll('[data-equip-item]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var result = CM.equipItem(character, btn.getAttribute('data-equip-item'), gameData);
        UI.notify(result.message, result.success ? 'success' : 'warning');
        refresh(container, character);
      });
    });
    content.querySelectorAll('[data-unequip-slot]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        CM.unequipItem(character, btn.getAttribute('data-unequip-slot'), gameData);
        refresh(container, character);
      });
    });
    content.querySelectorAll('[data-use-item]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var result = CM.useConsumable(character, btn.getAttribute('data-use-item'), gameData);
        UI.notify(result.message, result.success ? 'success' : 'warning');
        refresh(container, character);
      });
    });
  }

  /* ---------------- Quests ---------------- */

  function renderQuestsTab(content, character, gameData, derived, container) {
    var acceptedIds = character.quests.active.map(function (q) { return q.questId; })
      .concat(character.quests.completed.map(function (q) { return q.questId; }))
      .concat(character.quests.failed.map(function (q) { return q.questId; }));
    var available = gameData.quests.quests.filter(function (q) { return acceptedIds.indexOf(q.id) < 0; });

    content.innerHTML =
      '<h3>Active</h3>' + (character.quests.active.length ? character.quests.active.map(function (progress) {
        return renderActiveQuestCard(progress, gameData);
      }).join('') : emptyState('No active quests.', 'Accept one from the list below.')) +
      '<h3 class="mt-lg">Available</h3>' +
      (available.length ? '<div class="entry-grid">' + available.map(availableQuestCard).join('') + '</div>' : emptyState('No new quests available.', '')) +
      '<h3 class="mt-lg">Completed / Failed</h3>' +
      (character.quests.completed.length + character.quests.failed.length ? renderClosedQuests(character, gameData) : emptyState('Nothing resolved yet.', ''));

    content.querySelectorAll('[data-accept-quest]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var questId = btn.getAttribute('data-accept-quest');
        var quest = gameData.quests.quests.find(function (q) { return q.id === questId; });
        var progress = {};
        quest.objectives.forEach(function (o) { progress[o.id] = false; });
        character.quests.active.push({ questId: questId, objectiveProgress: progress });
        UI.notify(quest.name + ' accepted.', 'success');
        refresh(container, character);
      });
    });

    content.querySelectorAll('[data-toggle-objective]').forEach(function (checkbox) {
      checkbox.addEventListener('change', function () {
        var questId = checkbox.getAttribute('data-quest-id');
        var objId = checkbox.getAttribute('data-toggle-objective');
        var progress = character.quests.active.find(function (q) { return q.questId === questId; });
        if (progress) progress.objectiveProgress[objId] = checkbox.checked;
        refresh(container, character);
      });
    });
  }

  function renderActiveQuestCard(progress, gameData) {
    var quest = gameData.quests.quests.find(function (q) { return q.id === progress.questId; });
    if (!quest) return '';
    return (
      '<div class="card">' +
        '<div class="card__header"><h3 style="margin:0">' + Utils.escapeHtml(quest.name) + '</h3><span class="badge">' + quest.recommendedDifficulty + '</span></div>' +
        '<p class="text-muted">' + Utils.escapeHtml(quest.description) + '</p>' +
        '<div class="quest-card__objectives">' + quest.objectives.map(function (o) {
          var done = progress.objectiveProgress[o.id];
          return '<label class="quest-objective' + (done ? ' is-complete' : '') + '"><input type="checkbox" data-toggle-objective="' + o.id + '" data-quest-id="' + quest.id + '" ' + (done ? 'checked' : '') + '> ' + Utils.escapeHtml(o.text) + '</label>';
        }).join('') + '</div>' +
        rewardRow(quest.rewards) +
      '</div>'
    );
  }

  function availableQuestCard(quest) {
    return (
      '<div class="card">' +
        '<div class="card__header"><h3 style="margin:0">' + Utils.escapeHtml(quest.name) + '</h3><span class="badge">' + quest.recommendedDifficulty + '</span></div>' +
        '<p class="text-muted">' + Utils.escapeHtml(quest.description) + '</p>' +
        rewardRow(quest.rewards) +
        '<button class="btn btn-primary btn-sm mt-sm" data-accept-quest="' + quest.id + '">Accept Quest</button>' +
      '</div>'
    );
  }

  function renderClosedQuests(character, gameData) {
    var completed = character.quests.completed.map(function (q) { return gameData.quests.quests.find(function (d) { return d.id === q.questId; }); }).filter(Boolean);
    var failed = character.quests.failed.map(function (q) { return gameData.quests.quests.find(function (d) { return d.id === q.questId; }); }).filter(Boolean);
    return '<div class="inline-list">' +
      completed.map(function (q) { return '<div class="text-success">Completed: ' + Utils.escapeHtml(q.name) + '</div>'; }).join('') +
      failed.map(function (q) { return '<div class="text-danger">Failed: ' + Utils.escapeHtml(q.name) + '</div>'; }).join('') +
      '</div>';
  }

  function rewardRow(rewards) {
    var chips = [];
    if (rewards.coins) chips.push('<span class="badge text-cyan">' + rewards.coins + ' coins</span>');
    if (rewards.xp) chips.push('<span class="badge text-cyan">' + rewards.xp + ' xp</span>');
    (rewards.items || []).forEach(function () { chips.push('<span class="badge">item</span>'); });
    (rewards.titles || []).forEach(function (t) { chips.push('<span class="badge text-success">' + Utils.escapeHtml(t) + '</span>'); });
    return '<div class="quest-reward-row">' + chips.join('') + '</div>';
  }

  /* ---------------- Progression ---------------- */

  function renderProgressionTab(content, character, gameData, derived, container) {
    var statButtons = gameData.rules.stats.map(function (statKey) {
      var cost = CM.costForStatIncrease(character, statKey, gameData);
      return progressionItem(gameData.rules.statLabels[statKey], 'Current: ' + character.stats[statKey], cost, 'stat:' + statKey);
    }).join('');

    var resourceButtons = ['hp', 'stamina', 'mana'].map(function (key) {
      var cost = CM.costForResourceIncrease(character, key, gameData);
      var cfgKey = { hp: 'maxHpIncrease', stamina: 'maxStaminaIncrease', mana: 'maxManaIncrease' }[key];
      var amount = gameData.rules.progressionCosts[cfgKey].amountPerPurchase;
      return progressionItem('Max ' + key.toUpperCase(), '+' + amount + ' per purchase', cost, 'resource:' + key);
    }).join('');

    var lockedSkills = gameData.skills.skills.filter(function (s) { return character.unlockedSkills.indexOf(s.id) < 0; });
    var skillButtons = lockedSkills.map(function (skill) {
      var meetsLevel = character.level >= skill.requiredLevel;
      return (
        '<div class="progression-item">' +
          '<strong>' + Utils.escapeHtml(skill.name) + '</strong>' +
          '<span class="text-muted" style="font-size:0.8rem">' + Utils.escapeHtml(skill.description) + '</span>' +
          '<span class="progression-item__cost">' + skill.unlockCost + ' coins &middot; requires level ' + skill.requiredLevel + '</span>' +
          '<button class="btn btn-sm btn-primary" data-unlock-skill="' + skill.id + '" ' + (meetsLevel ? '' : 'disabled') + '>Unlock</button>' +
        '</div>'
      );
    }).join('');

    content.innerHTML =
      '<div class="card"><h3>Level and Experience</h3>' +
        '<p class="font-mono">Level ' + character.level + ' &middot; ' + character.experience + ' XP</p>' +
        '<div class="field-row">' +
          '<div class="field"><label>Log Coins Awarded</label><input type="number" value="0" data-role="log-coins"></div>' +
          '<div class="field"><label>Log XP Awarded</label><input type="number" value="0" data-role="log-xp"></div>' +
        '</div>' +
        '<button class="btn btn-ghost" data-role="log-rewards">Log Session Rewards</button>' +
        '<p class="field-hint mt-sm">Use this to record coins or experience your Dungeon Master announced during play.</p>' +
      '</div>' +
      '<h3 class="mt-lg">Increase Stats</h3><div class="progression-grid">' + statButtons + '</div>' +
      '<h3 class="mt-lg">Increase Resources</h3><div class="progression-grid">' + resourceButtons + '</div>' +
      '<h3 class="mt-lg">Unlock Skills</h3>' + (lockedSkills.length ? '<div class="progression-grid">' + skillButtons + '</div>' : emptyState('All available skills are unlocked.', ''));

    content.querySelectorAll('[data-buy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-buy');
        var result;
        if (key.indexOf('stat:') === 0) {
          result = CM.purchaseStatIncrease(character, key.slice(5), gameData);
        } else {
          result = CM.purchaseResourceIncrease(character, key.slice(9), gameData);
        }
        UI.notify(result.message, result.success ? 'success' : 'warning');
        refresh(container, character);
      });
    });

    content.querySelectorAll('[data-unlock-skill]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var result = CM.purchaseUnlockSkill(character, btn.getAttribute('data-unlock-skill'), gameData);
        UI.notify(result.message, result.success ? 'success' : 'warning');
        refresh(container, character);
      });
    });

    content.querySelector('[data-role="log-rewards"]').addEventListener('click', function () {
      var coins = parseInt(content.querySelector('[data-role="log-coins"]').value, 10) || 0;
      var xp = parseInt(content.querySelector('[data-role="log-xp"]').value, 10) || 0;
      character.coins += coins;
      if (xp > 0) {
        var xpResult = CM.addExperience(character, xp, gameData);
        if (xpResult.leveledUp) UI.notify(character.name + ' reached level ' + xpResult.newLevel + '.', 'success');
      }
      refresh(container, character);
    });
  }

  function progressionItem(label, subLabel, cost, buyKey) {
    return (
      '<div class="progression-item">' +
        '<strong>' + label + '</strong>' +
        '<span class="text-muted" style="font-size:0.8rem">' + subLabel + '</span>' +
        '<span class="progression-item__cost">' + cost + ' coins</span>' +
        '<button class="btn btn-sm btn-primary" data-buy="' + buyKey + '">Purchase</button>' +
      '</div>'
    );
  }

  /* ---------------- Journal (relationships, scenario history, achievements, titles) ---------------- */

  function renderJournalTab(content, character, gameData, derived, container) {
    content.innerHTML =
      '<h3>Titles</h3>' + (character.titles.length ? '<div class="quest-reward-row">' + character.titles.map(function (t) { return '<span class="badge text-success">' + Utils.escapeHtml(t) + '</span>'; }).join('') + '</div>' : emptyState('No titles earned yet.', '')) +
      '<h3 class="mt-lg">Achievements</h3>' + (character.achievements.length ? '<div class="inline-list">' + character.achievements.map(function (a) { return '<div class="card">' + Utils.escapeHtml(a.title) + '</div>'; }).join('') : emptyState('No achievements logged yet.', '')) +
      '<h3 class="mt-lg">Relationships</h3><div class="inline-list" data-role="relationships-list"></div>' +
      '<div class="field-row mt-sm">' +
        '<div class="field"><label>Name</label><input type="text" data-role="rel-name"></div>' +
        '<div class="field"><label>Status</label><input type="text" data-role="rel-status" placeholder="e.g. Ally, Rival"></div>' +
      '</div>' +
      '<button class="btn btn-ghost" data-role="add-relationship">Add Relationship</button>' +
      '<h3 class="mt-lg">Scenario History</h3><div class="inline-list" data-role="history-list"></div>' +
      '<div class="field"><label>New Entry</label><textarea data-role="history-entry" placeholder="What happened in this scenario?"></textarea></div>' +
      '<button class="btn btn-ghost" data-role="add-history">Log Scenario</button>';

    renderRelationships(content, character);
    renderHistory(content, character);

    content.querySelector('[data-role="add-relationship"]').addEventListener('click', function () {
      var name = content.querySelector('[data-role="rel-name"]').value.trim();
      var status = content.querySelector('[data-role="rel-status"]').value.trim();
      if (!name) { UI.notify('Give the relationship a name.', 'warning'); return; }
      character.relationships.push({ name: name, status: status || 'Unspecified' });
      refresh(container, character);
    });

    content.querySelector('[data-role="add-history"]').addEventListener('click', function () {
      var text = content.querySelector('[data-role="history-entry"]').value.trim();
      if (!text) return;
      character.scenarioHistory.unshift({ summary: text, date: new Date().toISOString() });
      refresh(container, character);
    });
  }

  function renderRelationships(content, character) {
    var list = content.querySelector('[data-role="relationships-list"]');
    list.innerHTML = character.relationships.length
      ? character.relationships.map(function (r) { return '<div class="flex-between card" style="padding:8px 12px"><span>' + Utils.escapeHtml(r.name) + '</span><span class="text-muted">' + Utils.escapeHtml(r.status) + '</span></div>'; }).join('')
      : emptyState('No relationships logged yet.', '');
  }

  function renderHistory(content, character) {
    var list = content.querySelector('[data-role="history-list"]');
    list.innerHTML = character.scenarioHistory.length
      ? character.scenarioHistory.map(function (h) { return '<div class="card"><div class="text-muted font-mono" style="font-size:0.75rem">' + Utils.formatTimestamp(h.date) + '</div><p style="margin:4px 0 0">' + Utils.escapeHtml(h.summary) + '</p></div>'; }).join('')
      : emptyState('No scenarios logged yet.', '');
  }

  /* ---------------- Shared helpers ---------------- */

  function emptyLine(text) { return '<p class="text-muted">' + text + '</p>'; }
  function emptyState(title, subtitle) {
    return '<div class="empty-state"><h3>' + title + '</h3>' + (subtitle ? '<p>' + subtitle + '</p>' : '') + '</div>';
  }

  ORV.CharacterProfile = { mount: mount };

})(window.ORV = window.ORV || {});
