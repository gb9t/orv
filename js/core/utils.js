/**
 * Core utility functions shared across every module.
 * Attaches to window.ORV.Utils so plain <script> tags can use it in order,
 * with no bundler and no module loader required.
 */
(function (ORV) {
  'use strict';

  /** Generate a reasonably unique id. Not cryptographic, just unique enough for local records. */
  function generateId(prefix) {
    var random = Math.random().toString(36).slice(2, 9);
    var time = Date.now().toString(36);
    return (prefix ? prefix + '_' : '') + time + random;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /** Standard tabletop modifier: floor((statValue - 10) / 2). */
  function statModifier(statValue) {
    return Math.floor((statValue - 10) / 2);
  }

  function formatModifier(value) {
    return value >= 0 ? '+' + value : String(value);
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function debounce(fn, waitMs) {
    var timer = null;
    return function () {
      var args = arguments;
      var context = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, waitMs);
    };
  }

  /** Roll a single die and return an integer between 1 and sides. */
  function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  /**
   * Parse and roll a simple dice expression like "1d4", "2d6", or a flat number like "5".
   * Returns { total, rolls, sides, count }.
   */
  function rollExpression(expression) {
    if (typeof expression === 'number') {
      return { total: expression, rolls: [expression], sides: null, count: 1 };
    }
    var match = /^(\d+)d(\d+)$/i.exec(String(expression).trim());
    if (!match) {
      var flat = parseInt(expression, 10);
      return { total: isNaN(flat) ? 0 : flat, rolls: [], sides: null, count: 0 };
    }
    var count = parseInt(match[1], 10);
    var sides = parseInt(match[2], 10);
    var rolls = [];
    var total = 0;
    for (var i = 0; i < count; i++) {
      var r = rollDie(sides);
      rolls.push(r);
      total += r;
    }
    return { total: total, rolls: rolls, sides: sides, count: count };
  }

  function formatTimestamp(isoString) {
    if (!isoString) return '';
    var date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function titleCase(str) {
    return String(str)
      .replace(/[_-]+/g, ' ')
      .replace(/\w\S*/g, function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      });
  }

  ORV.Utils = {
    generateId: generateId,
    clamp: clamp,
    statModifier: statModifier,
    formatModifier: formatModifier,
    deepClone: deepClone,
    escapeHtml: escapeHtml,
    debounce: debounce,
    rollDie: rollDie,
    rollExpression: rollExpression,
    formatTimestamp: formatTimestamp,
    titleCase: titleCase
  };

})(window.ORV = window.ORV || {});
