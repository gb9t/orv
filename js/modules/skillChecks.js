/**
 * Skill checks: the 6 raw stats plus the 14 trained skills, all resolved as
 * a d20 roll plus an automatically calculated modifier pulled straight from
 * CharacterModel.computeDerived, so trait and gear bonuses are always current.
 */
(function (ORV) {
  'use strict';

  var Utils = ORV.Utils;
  var UI = ORV.UI;
  var CM = ORV.CharacterModel;

  function mount(container) {
    var state = ORV.State.getState();
    var character = ORV.State.getActiveCharacter();

    if (!character) {
      container.innerHTML =
        '<div class="view-header"><div class="view-header__eyebrow">System Window // Checks</div><h1>Skill Checks</h1></div>' +
        '<div class="empty-state"><h3>No active character</h3><p>Create or select a character first.</p></div>';
      return;
    }

    var gameData = state.gameData;
    var derived = CM.computeDerived(character, gameData);

    var statOptions = gameData.rules.stats.map(function (statKey) {
      return { id: statKey, label: gameData.rules.statLabels[statKey], modifier: derived.statModifiers[statKey] };
    });
    var skillOptions = Object.keys(gameData.rules.skills).map(function (skillId) {
      return { id: skillId, label: gameData.rules.skillLabels[skillId], modifier: derived.skillModifiers[skillId] };
    });
    var allOptions = statOptions.concat(skillOptions);

    container.innerHTML =
      '<div class="view-header"><div class="view-header__eyebrow">System Window // Checks</div><h1>Skill Checks</h1></div>' +
      '<div class="card" style="max-width:560px">' +
        '<div class="field"><label>Character</label><div class="text-cyan font-mono">' + Utils.escapeHtml(character.name) + '</div></div>' +
        '<div class="field"><label>Check Type</label><select data-role="check-select">' +
          allOptions.map(function (opt) {
            return '<option value="' + opt.id + '">' + opt.label + ' (' + Utils.formatModifier(opt.modifier) + ')</option>';
          }).join('') +
        '</select></div>' +
        '<div class="field"><label>Situational Modifier</label><input type="number" value="0" data-role="situational-modifier"></div>' +
        '<div class="field"><label>Visibility</label><select data-role="check-visibility"><option value="public">Public Roll</option><option value="hidden">Hidden Roll</option></select></div>' +
        '<button class="btn btn-primary w-full" data-role="check-roll-button">' + UI.icon('icon-dice') + ' Roll Check</button>' +
        '<div class="roll-result-display">' +
          '<div class="roll-result-display__value" data-role="check-result">--</div>' +
          '<div class="roll-result-display__breakdown" data-role="check-breakdown"></div>' +
        '</div>' +
      '</div>';

    var select = container.querySelector('[data-role="check-select"]');
    var situational = container.querySelector('[data-role="situational-modifier"]');
    var visibility = container.querySelector('[data-role="check-visibility"]');
    var resultEl = container.querySelector('[data-role="check-result"]');
    var breakdownEl = container.querySelector('[data-role="check-breakdown"]');

    container.querySelector('[data-role="check-roll-button"]').addEventListener('click', function () {
      var chosen = allOptions.find(function (o) { return o.id === select.value; });
      var situationalValue = parseInt(situational.value, 10) || 0;
      var totalModifier = chosen.modifier + situationalValue;

      ORV.DiceRoller.rollAndAnimate({
        sides: 20, count: 1, modifier: totalModifier, mode: 'normal',
        visibility: visibility.value, label: chosen.label + ' Check'
      }, resultEl, breakdownEl, function (finishedEntry) {
        ORV.Storage.addRollHistoryEntry(finishedEntry);
      });
    });
  }

  ORV.SkillChecks = { mount: mount };

})(window.ORV = window.ORV || {});
