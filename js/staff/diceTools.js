/**
 * DM Dice Tools. Reuses the same roll engine as the Player Panel's dice
 * roller (ORV.DiceRoller.performRoll), but keeps its own log, its own
 * visibility model (public, hidden, and secret), and named presets, since
 * a Dungeon Master's dice needs are different enough from a player's to
 * warrant their own screen rather than a shared one.
 */
(function (ORV) {
  'use strict';

  var Utils = ORV.Utils;
  var UI = ORV.UI;

  var config = { sides: 20, count: 1, modifier: 0, mode: 'normal', visibility: 'public', label: '' };

  function mount(container) {
    var gameData = ORV.State.getState().gameData;
    var diceTypes = gameData.rules.diceTypes;

    container.innerHTML =
      '<div class="view-header"><div class="view-header__eyebrow">Staff Panel // Dice</div><h1>Dungeon Master Dice Tools</h1></div>' +
      '<div class="dice-layout">' +
        '<div class="card">' +
          '<h3>Configure Roll</h3>' +
          '<div class="field"><label>Label (optional)</label><input type="text" data-role="roll-label" placeholder="e.g. Cinder Alpha claw attack"></div>' +
          '<div class="die-grid" data-role="die-grid"></div>' +
          '<div class="field-row mt-md">' +
            '<div class="field"><label>Number of Dice</label><input type="number" min="1" max="20" value="1" data-role="dice-count"></div>' +
            '<div class="field"><label>Modifier</label><input type="number" value="0" data-role="dice-modifier"></div>' +
          '</div>' +
          '<div class="field-row">' +
            '<div class="field"><label>Advantage / Disadvantage</label><select data-role="dice-mode"><option value="normal">Normal</option><option value="advantage">Advantage</option><option value="disadvantage">Disadvantage</option></select></div>' +
            '<div class="field"><label>Visibility</label><select data-role="dice-visibility"><option value="public">Public</option><option value="hidden">Hidden</option><option value="secret">Secret</option></select></div>' +
          '</div>' +
          '<button class="btn btn-primary w-full" data-role="roll-button">' + UI.icon('icon-dice') + ' Roll</button>' +
          '<div class="flex gap-sm mt-md flex-wrap">' +
            '<button class="btn btn-ghost btn-sm" data-quick="initiative">Roll Initiative</button>' +
            '<button class="btn btn-ghost btn-sm" data-quick="encounter">Roll Encounter Check</button>' +
          '</div>' +
          '<div class="field mt-md"><label>Quick Damage Expression</label>' +
            '<div class="flex gap-sm"><input type="text" placeholder="e.g. 2d6+3" data-role="damage-expression" style="flex:1"><button class="btn btn-ghost" data-role="roll-damage">Roll</button></div></div>' +

          '<h3 class="mt-lg">Saved Presets</h3>' +
          '<div data-role="preset-list"></div>' +
          '<button class="btn btn-ghost btn-sm mt-sm" data-role="save-preset">Save Current as Preset</button>' +
        '</div>' +
        '<div class="flex-col gap-md">' +
          '<div class="card scanline-wrap"><div class="roll-result-display">' +
            '<div class="roll-result-display__value" data-role="result-value">--</div>' +
            '<div class="roll-result-display__breakdown" data-role="result-breakdown">Configure a roll and press Roll</div>' +
          '</div></div>' +
          '<div class="card"><div class="flex-between"><h3>Roll Log</h3><button class="btn btn-ghost btn-sm" data-role="clear-log">Clear</button></div>' +
          '<div class="roll-history" data-role="staff-roll-history"></div></div>' +
        '</div>' +
      '</div>';

    var dieGrid = container.querySelector('[data-role="die-grid"]');
    diceTypes.forEach(function (sides) {
      var btn = UI.createEl('button', { className: 'die-button' + (sides === config.sides ? ' is-selected' : ''), text: 'd' + sides });
      btn.addEventListener('click', function () {
        config.sides = sides;
        dieGrid.querySelectorAll('.die-button').forEach(function (b) { b.classList.remove('is-selected'); });
        btn.classList.add('is-selected');
      });
      dieGrid.appendChild(btn);
    });

    container.querySelector('[data-role="roll-label"]').addEventListener('input', function (e) { config.label = e.target.value; });
    container.querySelector('[data-role="dice-count"]').addEventListener('input', function (e) { config.count = Utils.clamp(parseInt(e.target.value, 10) || 1, 1, 20); });
    container.querySelector('[data-role="dice-modifier"]').addEventListener('input', function (e) { config.modifier = parseInt(e.target.value, 10) || 0; });
    container.querySelector('[data-role="dice-mode"]').addEventListener('change', function (e) { config.mode = e.target.value; });
    container.querySelector('[data-role="dice-visibility"]').addEventListener('change', function (e) { config.visibility = e.target.value; });

    container.querySelector('[data-role="roll-button"]').addEventListener('click', function () { rollNow(container, Object.assign({}, config)); });

    container.querySelector('[data-quick="initiative"]').addEventListener('click', function () {
      rollNow(container, { sides: 20, count: 1, modifier: 0, mode: 'normal', visibility: 'public', label: 'Initiative' });
    });
    container.querySelector('[data-quick="encounter"]').addEventListener('click', function () {
      rollNow(container, { sides: 20, count: 1, modifier: 0, mode: 'normal', visibility: 'hidden', label: 'Encounter Check' });
    });
    container.querySelector('[data-role="roll-damage"]').addEventListener('click', function () {
      var expr = container.querySelector('[data-role="damage-expression"]').value.trim();
      if (!expr) { UI.notify('Enter a dice expression like 2d6+3.', 'warning'); return; }
      var parsedMatch = /^(\d+d\d+)([+-]\d+)?$/i.exec(expr.replace(/\s+/g, ''));
      var base = parsedMatch ? parsedMatch[1] : expr;
      var mod = parsedMatch && parsedMatch[2] ? parseInt(parsedMatch[2], 10) : 0;
      var diceMatch = /^(\d+)d(\d+)$/i.exec(base);
      if (!diceMatch) { UI.notify('Could not parse that expression.', 'warning'); return; }
      rollNow(container, { sides: parseInt(diceMatch[2], 10), count: parseInt(diceMatch[1], 10), modifier: mod, mode: 'normal', visibility: 'public', label: 'Damage (' + expr + ')' });
    });

    container.querySelector('[data-role="clear-log"]').addEventListener('click', function () {
      ORV.Storage.updateStaffRollHistory([]);
      renderLog(container);
    });

    container.querySelector('[data-role="save-preset"]').addEventListener('click', function () {
      var name = window.prompt('Name this preset:');
      if (!name) return;
      var presets = ORV.Storage.getDicePresets();
      presets.push(Object.assign({ id: Utils.generateId('preset'), name: name }, config));
      ORV.Storage.saveDicePresets(presets);
      renderPresets(container);
    });

    renderPresets(container);
    renderLog(container);
  }

  function rollNow(container, rollConfig) {
    var entry = ORV.DiceRoller.performRoll(rollConfig);
    entry.revealed = rollConfig.visibility !== 'secret';

    var valueEl = container.querySelector('[data-role="result-value"]');
    var breakdownEl = container.querySelector('[data-role="result-breakdown"]');
    valueEl.textContent = entry.total;
    valueEl.classList.toggle('is-crit-success', entry.isCritSuccess);
    valueEl.classList.toggle('is-crit-fail', entry.isCritFail);
    breakdownEl.textContent = (rollConfig.label ? rollConfig.label + ': ' : '') + 'Rolled ' + entry.rawRolls.join(', ') +
      (rollConfig.modifier ? ' ' + Utils.formatModifier(rollConfig.modifier) + ' modifier' : '') +
      (rollConfig.visibility !== 'public' ? ' - ' + rollConfig.visibility : '');

    ORV.Storage.addStaffRollHistoryEntry(entry);
    renderLog(container);
  }

  function renderLog(container) {
    var history = ORV.Storage.getStaffRollHistory();
    var el = container.querySelector('[data-role="staff-roll-history"]');
    if (!history.length) { el.innerHTML = '<p class="text-muted">No rolls logged yet.</p>'; return; }

    el.innerHTML = history.map(function (entry) {
      var hidden = entry.visibility === 'secret' && !entry.revealed;
      var cls = 'roll-history-entry' + (entry.visibility !== 'public' ? ' is-hidden-roll' : '');
      var totalCls = entry.isCritSuccess ? 'text-success' : (entry.isCritFail ? 'text-danger' : '');
      return (
        '<div class="' + cls + '">' +
          '<span>' + (entry.label ? Utils.escapeHtml(entry.label) + ': ' : '') + entry.count + 'd' + entry.sides + (entry.modifier ? Utils.formatModifier(entry.modifier) : '') + ' &middot; ' + entry.visibility + '</span>' +
          (hidden
            ? '<span class="flex gap-sm"><span class="font-mono">???</span><button class="btn btn-ghost btn-sm" data-reveal="' + entry.id + '">Reveal</button></span>'
            : '<span class="roll-history-entry__total ' + totalCls + '">' + entry.total + '</span>') +
        '</div>'
      );
    }).join('');

    el.querySelectorAll('[data-reveal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var updated = history.map(function (e) {
          if (e.id === btn.getAttribute('data-reveal')) e.revealed = true;
          return e;
        });
        ORV.Storage.updateStaffRollHistory(updated);
        renderLog(container);
      });
    });
  }

  function renderPresets(container) {
    var presets = ORV.Storage.getDicePresets();
    var el = container.querySelector('[data-role="preset-list"]');
    el.innerHTML = presets.map(function (p) {
      return (
        '<div class="flex-between" style="padding:4px 0">' +
          '<span>' + Utils.escapeHtml(p.name) + ' <span class="text-muted font-mono">(' + p.count + 'd' + p.sides + (p.modifier ? Utils.formatModifier(p.modifier) : '') + ')</span></span>' +
          '<span class="flex gap-sm"><button class="btn btn-ghost btn-sm" data-load-preset="' + p.id + '">Load</button>' +
          '<button class="btn btn-danger btn-sm" data-delete-preset="' + p.id + '">Delete</button></span>' +
        '</div>'
      );
    }).join('') || '<p class="text-muted">No presets saved yet.</p>';

    el.querySelectorAll('[data-load-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var preset = presets.find(function (p) { return p.id === btn.getAttribute('data-load-preset'); });
        rollNow(container, preset);
      });
    });
    el.querySelectorAll('[data-delete-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ORV.Storage.saveDicePresets(presets.filter(function (p) { return p.id !== btn.getAttribute('data-delete-preset'); }));
        renderPresets(container);
      });
    });
  }

  ORV.DiceTools = { mount: mount };

})(window.ORV = window.ORV || {});
