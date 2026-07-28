/**
 * A generic searchable, filterable entry browser. Bestiary and Codex are
 * both thin configuration wrappers around this one component, so the
 * search/filter/detail-modal behavior only has to be built and fixed once.
 */
(function (ORV) {
  'use strict';

  var Utils = ORV.Utils;
  var UI = ORV.UI;

  /**
   * config = {
   *   eyebrow, title,
   *   entries: [{ id, name, icon, category, searchText, summaryHtml, detailHtml }],
   *   categories: [{ id, label }]  // optional, omit for no category filter
   * }
   */
  function mount(container, config) {
    var browserState = { query: '', category: 'all' };

    function draw() {
      container.innerHTML =
        '<div class="view-header"><div class="view-header__eyebrow">' + config.eyebrow + '</div><h1>' + config.title + '</h1></div>' +
        '<div class="browser-toolbar">' +
          '<input type="search" placeholder="Search..." data-role="browser-search" value="' + Utils.escapeHtml(browserState.query) + '">' +
          (config.categories ? '<div class="filter-chip-row" data-role="browser-filters"></div>' : '') +
        '</div>' +
        '<div class="entry-grid" data-role="browser-grid"></div>';

      if (config.categories) {
        var filterRow = container.querySelector('[data-role="browser-filters"]');
        var chips = [{ id: 'all', label: 'All' }].concat(config.categories);
        filterRow.innerHTML = chips.map(function (chip) {
          return '<button class="chip' + (chip.id === browserState.category ? ' is-selected' : '') + '" data-cat="' + chip.id + '">' + chip.label + '</button>';
        }).join('');
        filterRow.querySelectorAll('.chip').forEach(function (chip) {
          chip.addEventListener('click', function () {
            browserState.category = chip.getAttribute('data-cat');
            draw();
          });
        });
      }

      container.querySelector('[data-role="browser-search"]').addEventListener('input', Utils.debounce(function (e) {
        browserState.query = e.target.value;
        draw();
      }, 180));

      renderGrid();
    }

    function renderGrid() {
      var grid = container.querySelector('[data-role="browser-grid"]');
      var query = browserState.query.trim().toLowerCase();
      var filtered = config.entries.filter(function (entry) {
        var matchesCategory = browserState.category === 'all' || entry.category === browserState.category;
        var matchesQuery = !query || entry.searchText.toLowerCase().indexOf(query) >= 0;
        return matchesCategory && matchesQuery;
      });

      if (!filtered.length) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>No matches</h3><p>Try a different search term or filter.</p></div>';
        return;
      }

      grid.innerHTML = filtered.map(function (entry) {
        return (
          '<div class="card card--interactive" data-entry-id="' + entry.id + '">' +
            '<div class="card__header">' + UI.mediaHtml(entry.imageUrl, entry.icon || 'icon-book') + (entry.badge || '') + '</div>' +
            '<h3>' + Utils.escapeHtml(entry.name) + '</h3>' +
            '<p class="text-muted" style="font-size:0.85rem">' + (entry.summaryHtml || '') + '</p>' +
          '</div>'
        );
      }).join('');

      grid.querySelectorAll('[data-entry-id]').forEach(function (card) {
        card.addEventListener('click', function () {
          var entry = config.entries.find(function (e) { return e.id === card.getAttribute('data-entry-id'); });
          UI.openModal({ title: entry.name, content: entry.detailHtml });
        });
      });
    }

    draw();
  }

  ORV.EntryBrowser = { mount: mount };

})(window.ORV = window.ORV || {});
