/**
 * Bestiary: a thin configuration layer over EntryBrowser. All the actual
 * search/filter/card/modal behavior lives in entryBrowser.js.
 */
(function (ORV) {
  'use strict';

  var Utils = ORV.Utils;

  function threatTier(rating) {
    if (rating <= 2) return { id: 'low', label: 'Low' };
    if (rating <= 5) return { id: 'moderate', label: 'Moderate' };
    if (rating <= 8) return { id: 'high', label: 'High' };
    return { id: 'severe', label: 'Severe' };
  }

  function threatMeterHtml(rating) {
    var dots = '';
    for (var i = 1; i <= 10; i++) dots += '<span class="' + (i <= rating ? 'is-lit' : '') + '"></span>';
    return '<div class="threat-meter">' + dots + '</div>';
  }

  function buildDetailHtml(enemy) {
    return (
      threatMeterHtml(enemy.threatRating) +
      '<p>' + Utils.escapeHtml(enemy.description) + '</p>' +
      '<h3>Lore</h3><p class="text-muted">' + Utils.escapeHtml(enemy.lore) + '</p>' +
      '<h3>Behaviour</h3><p class="text-muted">' + Utils.escapeHtml(enemy.behaviour) + '</p>' +
      '<div class="field-row">' +
        '<div><h3>Weaknesses</h3><p>' + enemy.weaknesses.map(Utils.escapeHtml).join(', ') + '</p></div>' +
        '<div><h3>Resistances</h3><p>' + enemy.resistances.map(Utils.escapeHtml).join(', ') + '</p></div>' +
      '</div>' +
      '<h3>Statistics</h3><div class="stat-grid">' +
        Object.keys(enemy.stats).map(function (key) {
          return '<div class="stat-cell"><div class="stat-cell__label">' + Utils.titleCase(key) + '</div><div class="stat-cell__value">' + enemy.stats[key] + '</div></div>';
        }).join('') +
      '</div>' +
      '<h3>Skills</h3><p class="text-muted">' + enemy.skills.map(Utils.escapeHtml).join('; ') + '</p>' +
      '<h3>Habitat</h3><p class="text-muted">' + Utils.escapeHtml(enemy.habitat) + '</p>' +
      '<h3>Encounter Ideas</h3><p class="text-muted">' + enemy.encounterIdeas.map(Utils.escapeHtml).join('; ') + '</p>'
    );
  }

  function mount(container) {
    var gameData = ORV.State.getState().gameData;
    var entries = gameData.bestiary.enemies.map(function (enemy) {
      var tier = threatTier(enemy.threatRating);
      return {
        id: enemy.id,
        name: enemy.name,
        icon: 'icon-enemy',
        category: tier.id,
        badge: '<span class="badge text-danger">' + tier.label + '</span>',
        searchText: [enemy.name, enemy.description, enemy.lore, enemy.habitat].join(' '),
        summaryHtml: Utils.escapeHtml(enemy.description),
        detailHtml: buildDetailHtml(enemy)
      };
    });

    ORV.EntryBrowser.mount(container, {
      eyebrow: 'System Window // Bestiary',
      title: 'Bestiary',
      entries: entries,
      categories: [
        { id: 'low', label: 'Low' }, { id: 'moderate', label: 'Moderate' },
        { id: 'high', label: 'High' }, { id: 'severe', label: 'Severe' }
      ]
    });
  }

  ORV.Bestiary = { mount: mount };

})(window.ORV = window.ORV || {});
