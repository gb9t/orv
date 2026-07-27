/**
 * Codex: normalizes seven data sources into one flat list for EntryBrowser.
 * Locations/Organisations/Constellations/Incarnations/Historical Events/
 * World Lore/Rules come from codex.json. Skills, Stigmas, Fables, Equipment,
 * and Status Effects are read live from their own systems so nothing here
 * ever goes out of sync with the rest of the app.
 */
(function (ORV) {
  'use strict';

  var Utils = ORV.Utils;

  function fromLore(gameData) {
    return gameData.codex.entries.map(function (entry) {
      return {
        id: entry.id, name: entry.name, icon: 'icon-book', category: entry.category,
        searchText: [entry.name, entry.body, (entry.tags || []).join(' ')].join(' '),
        summaryHtml: Utils.escapeHtml(entry.body.slice(0, 110)) + (entry.body.length > 110 ? '...' : ''),
        detailHtml: '<p>' + Utils.escapeHtml(entry.body) + '</p>' +
          (entry.tags && entry.tags.length ? '<div class="quest-reward-row">' + entry.tags.map(function (t) { return '<span class="badge">' + Utils.escapeHtml(t) + '</span>'; }).join('') + '</div>' : '')
      };
    });
  }

  function fromSkills(gameData) {
    return gameData.skills.skills.map(function (s) {
      return {
        id: s.id, name: s.name, icon: 'icon-skill', category: 'skills',
        searchText: [s.name, s.description].join(' '),
        summaryHtml: Utils.escapeHtml(s.description),
        detailHtml: '<p>' + Utils.escapeHtml(s.description) + '</p><p class="font-mono text-muted">Type: ' + s.type +
          (s.cost ? ' &middot; Cost: ' + s.cost.amount + ' ' + s.cost.resource : '') +
          (s.cooldown ? ' &middot; Cooldown: ' + s.cooldown : '') + '</p>'
      };
    });
  }

  function fromStigmas(gameData) {
    return gameData.stigmas.stigmas.map(function (s) {
      return {
        id: s.id, name: s.name, icon: 'icon-stigma', category: 'stigmas',
        searchText: [s.name, s.description].join(' '),
        summaryHtml: 'Rank ' + s.rank,
        detailHtml: '<p>' + Utils.escapeHtml(s.description) + '</p>' +
          '<p><strong>' + Utils.escapeHtml(s.activeAbility.name) + '</strong>: ' + Utils.escapeHtml(s.activeAbility.description) + '</p>'
      };
    });
  }

  function fromFables(gameData) {
    return gameData.fables.fables.map(function (f) {
      return {
        id: f.id, name: f.name, icon: 'icon-fable', category: 'fables',
        searchText: [f.name, f.description, f.story].join(' '),
        summaryHtml: f.grade,
        detailHtml: '<p>' + Utils.escapeHtml(f.story) + '</p><p class="text-muted">Requirements: ' + Utils.escapeHtml(f.requirements) + '</p>'
      };
    });
  }

  function fromItems(gameData) {
    return gameData.items.items.map(function (i) {
      return {
        id: i.id, name: i.name, icon: i.icon, category: 'equipment',
        searchText: [i.name, i.description, i.category].join(' '),
        summaryHtml: Utils.titleCase(i.category) + ' &middot; ' + i.rarity,
        detailHtml: '<p>' + Utils.escapeHtml(i.description) + '</p><p class="font-mono text-muted">Weight ' + i.weight + ' &middot; Sell value ' + i.sellValue + '</p>'
      };
    });
  }

  function fromStatusEffects(gameData) {
    return gameData.statusEffects.effects.map(function (e) {
      return {
        id: e.id, name: e.name, icon: 'icon-skill', category: 'statusEffects',
        searchText: [e.name, e.description].join(' '),
        summaryHtml: Utils.escapeHtml(e.description),
        detailHtml: '<p>' + Utils.escapeHtml(e.description) + '</p>' +
          '<p class="font-mono text-muted">Duration: ' + (e.defaultDuration ? e.defaultDuration + ' ' + e.durationType : e.durationType) + '</p>' +
          '<p class="text-muted">Removed by: ' + e.removalMethods.map(Utils.escapeHtml).join(', ') + '</p>'
      };
    });
  }

  function mount(container) {
    var gameData = ORV.State.getState().gameData;
    var entries = []
      .concat(fromLore(gameData))
      .concat(fromSkills(gameData))
      .concat(fromStigmas(gameData))
      .concat(fromFables(gameData))
      .concat(fromItems(gameData))
      .concat(fromStatusEffects(gameData));

    var categories = gameData.rules.codexCategories.concat(['skills', 'stigmas', 'fables', 'equipment', 'statusEffects'])
      .map(function (id) { return { id: id, label: gameData.rules.codexCategoryLabels[id] || Utils.titleCase(id) }; });

    ORV.EntryBrowser.mount(container, {
      eyebrow: 'System Window // Codex',
      title: 'Codex',
      entries: entries,
      categories: categories
    });
  }

  ORV.Codex = { mount: mount };

})(window.ORV = window.ORV || {});
