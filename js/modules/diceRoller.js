/**
 * Dice roller: supports d2 through d100, flat modifiers, advantage and
 * disadvantage on single-die rolls, hidden versus public rolls, and a
 * persisted roll history. Advantage/disadvantage only apply when exactly
 * one die is being rolled, which is how they are meant to be used on a d20.
 */
(function (ORV) {
  'use strict';

  var Utils = ORV.Utils;
  var UI = ORV.UI;

  var localMode = { sides: 20, count: 1, modifier: 0, mode: 'normal', visibility: 'public' };

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function performRoll(config) {
    var rolls = [];
    var chosen;

    if (config.count === 1 && config.mode !== 'normal') {
      var rollA = Utils.rollDie(config.sides);
      var rollB = Utils.rollDie(config.sides);
      rolls.push(rollA, rollB);
      chosen = config.mode === 'advantage' ? Math.max(rollA, rollB) : Math.min(rollA, rollB);
    } else {
      for (var i = 0; i < config.count; i++) rolls.push(Utils.rollDie(config.sides));
      chosen = rolls.reduce(function (sum, r) { return sum + r; }, 0);
    }

    var total = chosen + config.modifier;
    var isCritSuccess = config.sides === 20 && config.count === 1 && chosen === 20;
    var isCritFail = config.sides === 20 && config.count === 1 && chosen === 1;

    return {
      id: Utils.generateId('roll'),
      sides: config.sides,
      count: config.count,
      modifier: config.modifier,
      mode: config.mode,
      visibility: config.visibility,
      rawRolls: rolls,
      keptValue: chosen,
      total: total,
      isCritSuccess: isCritSuccess,
      isCritFail: isCritFail,
      label: config.label || null,
      timestamp: new Date().toISOString()
    };
  }

  function renderHistoryEntry(entry) {
    var cls = 'roll-history-entry' + (entry.visibility === 'hidden' ? ' is-hidden-roll' : '');
    var totalCls = entry.isCritSuccess ? 'text-success' : (entry.isCritFail ? 'text-danger' : '');
    var label = entry.label ? Utils.escapeHtml(entry.label) + ': ' : '';
    var diceLabel = entry.count + 'd' + entry.sides + (entry.modifier ? Utils.formatModifier(entry.modifier) : '');
    var modeTag = entry.mode !== 'normal' ? ' (' + entry.mode + ')' : '';
    var visTag = entry.visibility === 'hidden' ? ' &middot; hidden' : '';
    return (
      '<div class="' + cls + '">' +
      '<span>' + label + diceLabel + modeTag + visTag + '</span>' +
      '<span class="roll-history-entry__total ' + totalCls + '">' + entry.total + '</span>' +
      '</div>'
    );
  }

  function renderHistoryList(container, history) {
    if (!history.length) {
      container.innerHTML = '<p class="text-muted">No rolls yet this session.</p>';
      return;
    }
    container.innerHTML = history.map(renderHistoryEntry).join('');
  }

  /**
   * Mount the standalone dice roller view into a container element.
   * Also exposed for the skill check module to reuse the same roll engine.
   */
  function mount(container) {
    var state = ORV.State.getState();
    var diceTypes = state.gameData.rules.diceTypes;

    container.innerHTML =
      '<div class="view-header"><div class="view-header__eyebrow">System Window // Dice</div><h1>Dice Roller</h1></div>' +
      '<div class="dice-layout">' +
        '<div class="card">' +
          '<h3>Configure Roll</h3>' +
          '<div class="die-grid" data-role="die-grid"></div>' +
          '<div class="field-row mt-md">' +
            '<div class="field"><label>Number of Dice</label><input type="number" min="1" max="20" value="' + localMode.count + '" data-role="dice-count"></div>' +
            '<div class="field"><label>Modifier</label><input type="number" value="' + localMode.modifier + '" data-role="dice-modifier"></div>' +
          '</div>' +
          '<div class="field-row">' +
            '<div class="field"><label>Advantage / Disadvantage</label>' +
              '<select data-role="dice-mode"><option value="normal">Normal</option><option value="advantage">Advantage</option><option value="disadvantage">Disadvantage</option></select>' +
            '</div>' +
            '<div class="field"><label>Visibility</label>' +
              '<select data-role="dice-visibility"><option value="public">Public Roll</option><option value="hidden">Hidden Roll</option></select>' +
            '</div>' +
          '</div>' +
          '<button class="btn btn-primary w-full" data-role="roll-button">' + UI.icon('icon-dice') + ' Roll</button>' +
        '</div>' +
        '<div class="flex-col gap-md">' +
          '<div class="card scanline-wrap">' +
            '<div class="roll-result-display">' +
              '<div class="roll-result-display__value" data-role="result-value">--</div>' +
              '<div class="roll-result-display__breakdown" data-role="result-breakdown">Configure a roll and press Roll</div>' +
            '</div>' +
          '</div>' +
          '<div class="card">' +
            '<div class="flex-between"><h3>Roll History</h3><button class="btn btn-ghost btn-sm" data-role="clear-history">Clear</button></div>' +
            '<div class="roll-history" data-role="roll-history"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var dieGrid = container.querySelector('[data-role="die-grid"]');
    diceTypes.forEach(function (sides) {
      var btn = UI.createEl('button', { className: 'die-button' + (sides === localMode.sides ? ' is-selected' : ''), text: 'd' + sides });
      btn.addEventListener('click', function () {
        localMode.sides = sides;
        dieGrid.querySelectorAll('.die-button').forEach(function (b) { b.classList.remove('is-selected'); });
        btn.classList.add('is-selected');
      });
      dieGrid.appendChild(btn);
    });

    container.querySelector('[data-role="dice-count"]').addEventListener('input', function (e) {
      localMode.count = Utils.clamp(parseInt(e.target.value, 10) || 1, 1, 20);
    });
    container.querySelector('[data-role="dice-modifier"]').addEventListener('input', function (e) {
      localMode.modifier = parseInt(e.target.value, 10) || 0;
    });
    container.querySelector('[data-role="dice-mode"]').addEventListener('change', function (e) {
      localMode.mode = e.target.value;
    });
    container.querySelector('[data-role="dice-visibility"]').addEventListener('change', function (e) {
      localMode.visibility = e.target.value;
    });

    var historyContainer = container.querySelector('[data-role="roll-history"]');
    renderHistoryList(historyContainer, ORV.Storage.getRollHistory());

    container.querySelector('[data-role="clear-history"]').addEventListener('click', function () {
      window.localStorage.setItem(ORV.Storage.KEYS.ROLL_HISTORY, JSON.stringify([]));
      renderHistoryList(historyContainer, []);
    });

    container.querySelector('[data-role="roll-button"]').addEventListener('click', function () {
      rollAndAnimate({
        sides: localMode.sides, count: localMode.count, modifier: localMode.modifier,
        mode: localMode.count === 1 ? localMode.mode : 'normal', visibility: localMode.visibility
      }, container.querySelector('[data-role="result-value"]'), container.querySelector('[data-role="result-breakdown"]'), function (entry) {
        var history = ORV.Storage.addRollHistoryEntry(entry);
        renderHistoryList(historyContainer, history);
      });
    });
  }

  /** Runs the roll animation, then calls onComplete(entry) once the true result is revealed. */
  function rollAndAnimate(config, valueEl, breakdownEl, onComplete) {
    var entry = performRoll(config);
    var reduceMotion = prefersReducedMotion();

    function reveal() {
      valueEl.classList.remove('is-rolling');
      valueEl.textContent = entry.total;
      valueEl.classList.toggle('is-crit-success', entry.isCritSuccess);
      valueEl.classList.toggle('is-crit-fail', entry.isCritFail);
      var breakdown = 'Rolled ' + entry.rawRolls.join(', ') +
        (config.mode !== 'normal' && config.count === 1 ? ' (' + config.mode + ', kept ' + entry.keptValue + ')' : '') +
        (config.modifier ? ' ' + Utils.formatModifier(config.modifier) + ' modifier' : '') +
        (entry.isCritSuccess ? ' - Critical Success' : '') +
        (entry.isCritFail ? ' - Critical Failure' : '') +
        (config.visibility === 'hidden' ? ' - hidden roll' : '');
      breakdownEl.textContent = breakdown;
      if (onComplete) onComplete(entry);
    }

    if (reduceMotion) {
      reveal();
      return entry;
    }

    valueEl.classList.add('is-rolling');
    var cycles = 0;
    var interval = setInterval(function () {
      valueEl.textContent = Utils.rollDie(config.sides);
      cycles++;
      if (cycles > 8) {
        clearInterval(interval);
        reveal();
      }
    }, 60);

    return entry;
  }

  ORV.DiceRoller = {
    mount: mount,
    performRoll: performRoll,
    rollAndAnimate: rollAndAnimate
  };

})(window.ORV = window.ORV || {});
