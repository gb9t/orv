/**
 * Encounter Tools. Player combatants are linked back to their real saved
 * character, so healing, damage, and status effects applied here also show
 * up on that player's own profile. Spawned enemies exist only for the
 * lifetime of the encounter, they are not saved characters.
 */
(function (ORV) {
  'use strict';

  var Utils = ORV.Utils;
  var UI = ORV.UI;
  var CM = ORV.CharacterModel;

  function mount(container) {
    var encounter = ORV.Storage.getActiveEncounter();
    render(container, encounter);
  }

  function persist(container, encounter) {
    ORV.Storage.saveActiveEncounter(encounter);
    render(container, encounter);
  }

  function render(container, encounter) {
    if (!encounter) {
      renderStartScreen(container);
    } else {
      renderEncounter(container, encounter);
    }
  }

  function renderStartScreen(container) {
    container.innerHTML =
      '<div class="view-header"><div class="view-header__eyebrow">Staff Panel // Encounters</div><h1>Encounter Tools</h1></div>' +
      '<div class="card" style="max-width:420px">' +
        '<div class="field"><label>Encounter Name</label><input type="text" data-role="encounter-name" placeholder="e.g. Choir at the Gate"></div>' +
        '<button class="btn btn-primary w-full" data-role="start-encounter">Start Encounter</button>' +
      '</div>';

    container.querySelector('[data-role="start-encounter"]').addEventListener('click', function () {
      var name = container.querySelector('[data-role="encounter-name"]').value.trim() || 'Unnamed Encounter';
      var encounter = { id: Utils.generateId('enc'), name: name, round: 1, combatants: [] };
      persist(container, encounter);
    });
  }

  function renderEncounter(container, encounter) {
    var gameData = ORV.State.getState().gameData;
    var characters = ORV.Storage.getCharacters();
    var sorted = encounter.combatants.slice().sort(function (a, b) { return (b.initiative || 0) - (a.initiative || 0); });

    container.innerHTML =
      '<div class="view-header flex-between">' +
        '<div><div class="view-header__eyebrow">Staff Panel // Encounters</div><h1>' + Utils.escapeHtml(encounter.name) + '</h1></div>' +
        '<div class="flex gap-sm"><span class="badge text-cyan">Round ' + encounter.round + '</span>' +
        '<button class="btn btn-ghost btn-sm" data-role="next-round">Next Round</button>' +
        '<button class="btn btn-danger btn-sm" data-role="end-encounter">End Encounter</button></div>' +
      '</div>' +

      '<div class="card"><h3>Add Combatant</h3>' +
        '<div class="field-row">' +
          '<div class="field" style="flex:2"><label>Add Player</label><select data-role="add-player-select"></select></div>' +
          '<div class="field"><button class="btn btn-ghost w-full" data-role="add-player" style="margin-top:22px">Add</button></div>' +
        '</div>' +
        '<div class="field-row">' +
          '<div class="field" style="flex:2"><label>Spawn Enemy</label><select data-role="spawn-enemy-select"></select></div>' +
          '<div class="field"><button class="btn btn-ghost w-full" data-role="spawn-enemy" style="margin-top:22px">Spawn</button></div>' +
        '</div>' +
      '</div>' +

      '<div class="card mt-md"><div class="flex-between"><h3>Combatants</h3><button class="btn btn-ghost btn-sm" data-role="roll-all-initiative">Roll All Initiative</button></div>' +
        '<div data-role="combatant-list"></div>' +
      '</div>';

    var playerSelect = container.querySelector('[data-role="add-player-select"]');
    var alreadyAdded = encounter.combatants.map(function (c) { return c.refId; });
    playerSelect.innerHTML = characters.filter(function (c) { return alreadyAdded.indexOf(c.id) < 0; })
      .map(function (c) { return '<option value="' + c.id + '">' + Utils.escapeHtml(c.name) + '</option>'; }).join('') || '<option>No characters available</option>';

    var enemySelect = container.querySelector('[data-role="spawn-enemy-select"]');
    enemySelect.innerHTML = gameData.bestiary.enemies.map(function (e) { return '<option value="' + e.id + '">' + Utils.escapeHtml(e.name) + '</option>'; }).join('');

    container.querySelector('[data-role="add-player"]').addEventListener('click', function () {
      var character = characters.find(function (c) { return c.id === playerSelect.value; });
      if (!character) { UI.notify('No character selected.', 'warning'); return; }
      encounter.combatants.push({
        id: Utils.generateId('cbt'), type: 'player', refId: character.id, name: character.name,
        hp: { current: character.resources.hp.current, max: character.resources.hp.max }, initiative: 0
      });
      persist(container, encounter);
    });

    container.querySelector('[data-role="spawn-enemy"]').addEventListener('click', function () {
      var enemy = gameData.bestiary.enemies.find(function (e) { return e.id === enemySelect.value; });
      if (!enemy) return;
      encounter.combatants.push({
        id: Utils.generateId('cbt'), type: 'enemy', refId: enemy.id, name: enemy.name,
        hp: { current: enemy.stats.hp, max: enemy.stats.hp }, initiative: 0, statusEffects: []
      });
      persist(container, encounter);
    });

    container.querySelector('[data-role="roll-all-initiative"]').addEventListener('click', function () {
      encounter.combatants.forEach(function (c) { c.initiative = Utils.rollDie(20); });
      persist(container, encounter);
    });

    container.querySelector('[data-role="next-round"]').addEventListener('click', function () {
      encounter.round += 1;
      persist(container, encounter);
    });

    container.querySelector('[data-role="end-encounter"]').addEventListener('click', function () {
      ORV.Storage.clearActiveEncounter();
      UI.notify('Encounter ended.', 'info');
      render(container, null);
    });

    renderCombatantList(container, encounter, sorted, characters, gameData);
  }

  function renderCombatantList(container, encounter, sorted, characters, gameData) {
    var listEl = container.querySelector('[data-role="combatant-list"]');
    if (!sorted.length) {
      listEl.innerHTML = '<p class="text-muted">No combatants yet.</p>';
      return;
    }

    listEl.innerHTML = sorted.map(function (c) {
      var pct = c.hp.max > 0 ? Utils.clamp((c.hp.current / c.hp.max) * 100, 0, 100) : 0;
      var statusList = c.type === 'enemy'
        ? (c.statusEffects || []).map(function (s) { return s.name; }).join(', ')
        : (characters.find(function (ch) { return ch.id === c.refId; }) || { statusEffects: [] }).statusEffects
            .map(function (s) { var def = gameData.statusEffects.effects.find(function (e) { return e.id === s.effectId; }); return def ? def.name : s.effectId; }).join(', ');

      return (
        '<div class="card" style="padding:12px;margin-bottom:8px">' +
          '<div class="flex-between">' +
            '<strong>' + Utils.escapeHtml(c.name) + '</strong>' +
            '<span class="badge">' + Utils.titleCase(c.type) + '</span>' +
          '</div>' +
          '<div class="flex-between mt-sm" style="align-items:center">' +
            '<span class="font-mono">Initiative: <input type="number" value="' + c.initiative + '" data-init="' + c.id + '" style="width:60px;background:transparent;border:1px solid var(--color-border);color:var(--color-white);border-radius:4px;padding:2px 4px"></span>' +
            '<button class="btn btn-danger btn-sm" data-remove-combatant="' + c.id + '">Remove</button>' +
          '</div>' +
          '<div class="stat-bar mt-sm"><div class="stat-bar__fill stat-bar__fill--hp" style="width:' + pct + '%"></div></div>' +
          '<div class="flex-between mt-sm">' +
            '<span class="font-mono">' + c.hp.current + ' / ' + c.hp.max + ' HP</span>' +
            '<span class="flex gap-sm">' +
              '<input type="number" value="10" data-hp-amount="' + c.id + '" style="width:60px;background:transparent;border:1px solid var(--color-border);color:var(--color-white);border-radius:4px;padding:2px 4px">' +
              '<button class="btn btn-ghost btn-sm" data-heal="' + c.id + '">Heal</button>' +
              '<button class="btn btn-danger btn-sm" data-damage="' + c.id + '">Damage</button>' +
            '</span>' +
          '</div>' +
          '<div class="mt-sm"><span class="text-muted" style="font-size:0.78rem">Conditions: ' + (statusList || 'None') + '</span></div>' +
          '<div class="field-row mt-sm">' +
            '<select data-condition-select="' + c.id + '">' + gameData.statusEffects.effects.map(function (e) { return '<option value="' + e.id + '">' + e.name + '</option>'; }).join('') + '</select>' +
            '<button class="btn btn-ghost btn-sm" data-apply-condition="' + c.id + '">Apply Condition</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    listEl.querySelectorAll('[data-init]').forEach(function (input) {
      input.addEventListener('change', function () {
        var combatant = encounter.combatants.find(function (c) { return c.id === input.getAttribute('data-init'); });
        combatant.initiative = parseInt(input.value, 10) || 0;
        persist(container, encounter);
      });
    });

    listEl.querySelectorAll('[data-remove-combatant]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        encounter.combatants = encounter.combatants.filter(function (c) { return c.id !== btn.getAttribute('data-remove-combatant'); });
        persist(container, encounter);
      });
    });

    listEl.querySelectorAll('[data-heal]').forEach(function (btn) {
      btn.addEventListener('click', function () { adjustHp(container, encounter, characters, btn.getAttribute('data-heal'), 1); });
    });
    listEl.querySelectorAll('[data-damage]').forEach(function (btn) {
      btn.addEventListener('click', function () { adjustHp(container, encounter, characters, btn.getAttribute('data-damage'), -1); });
    });

    listEl.querySelectorAll('[data-apply-condition]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var combatantId = btn.getAttribute('data-apply-condition');
        var select = container.querySelector('[data-condition-select="' + combatantId + '"]');
        applyCondition(container, encounter, characters, gameData, combatantId, select.value);
      });
    });
  }

  function adjustHp(container, encounter, characters, combatantId, direction) {
    var combatant = encounter.combatants.find(function (c) { return c.id === combatantId; });
    var amountInput = container.querySelector('[data-hp-amount="' + combatantId + '"]');
    var amount = (parseInt(amountInput.value, 10) || 0) * direction;
    combatant.hp.current = Utils.clamp(combatant.hp.current + amount, 0, combatant.hp.max);

    if (combatant.type === 'player') {
      var character = characters.find(function (c) { return c.id === combatant.refId; });
      if (character) {
        character.resources.hp.current = combatant.hp.current;
        ORV.Storage.saveCharacter(character);
      }
    }
    persist(container, encounter);
  }

  function applyCondition(container, encounter, characters, gameData, combatantId, effectId) {
    var combatant = encounter.combatants.find(function (c) { return c.id === combatantId; });
    var def = gameData.statusEffects.effects.find(function (e) { return e.id === effectId; });
    if (!def) return;

    if (combatant.type === 'player') {
      var character = characters.find(function (c) { return c.id === combatant.refId; });
      if (character) {
        CM.addStatusEffect(character, effectId, gameData);
        ORV.Storage.saveCharacter(character);
      }
    } else {
      combatant.statusEffects = combatant.statusEffects || [];
      combatant.statusEffects.push({ effectId: effectId, name: def.name });
    }
    UI.notify(def.name + ' applied to ' + combatant.name + '.', 'success');
    persist(container, encounter);
  }

  ORV.EncounterTools = { mount: mount };

})(window.ORV = window.ORV || {});
