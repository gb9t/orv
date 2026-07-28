/**
 * Shared building blocks for the Staff Panel's CRUD screens: a data table
 * with edit/delete actions, a delete confirmation modal, and a couple of
 * form field builders. Each manager (bestiary, codex, quests, items) still
 * owns its own field layout, since those shapes differ too much to force
 * through one generic form generator, but the table, modal, and field
 * primitives are shared so behavior stays consistent everywhere.
 */
(function (ORV) {
  'use strict';

  var Utils = ORV.Utils;
  var UI = ORV.UI;

  function renderDataTable(rows, columns) {
    var head = columns.map(function (col) { return '<th>' + col.label + '</th>'; }).join('') + '<th></th>';
    var body = rows.map(function (row) {
      var cells = columns.map(function (col) { return '<td>' + (col.render ? col.render(row) : Utils.escapeHtml(row[col.key])) + '</td>'; }).join('');
      return (
        '<tr data-row-id="' + row.id + '">' + cells +
        '<td class="flex gap-sm"><button class="btn btn-sm btn-ghost" data-row-edit="' + row.id + '">Edit</button>' +
        '<button class="btn btn-sm btn-danger" data-row-delete="' + row.id + '">Delete</button></td></tr>'
      );
    }).join('');

    return (
      '<div class="card" style="overflow-x:auto"><table class="data-table"><thead><tr>' + head + '</tr></thead><tbody>' +
      (body || '<tr><td colspan="' + (columns.length + 1) + '" class="text-muted">No entries yet.</td></tr>') +
      '</tbody></table></div>'
    );
  }

  function confirmDelete(label, onConfirm) {
    var body = UI.createEl('div');
    body.innerHTML =
      '<p>Delete <strong>' + Utils.escapeHtml(label) + '</strong>? This cannot be undone here, though it only affects this browser\'s overrides.</p>' +
      '<div class="flex gap-sm mt-md">' +
        '<button class="btn btn-danger" data-role="confirm-delete">Delete Permanently</button>' +
        '<button class="btn btn-ghost" data-role="cancel-delete">Cancel</button>' +
      '</div>';
    UI.openModal({ title: 'Confirm Deletion', content: body });
    body.querySelector('[data-role="cancel-delete"]').addEventListener('click', UI.closeModal);
    body.querySelector('[data-role="confirm-delete"]').addEventListener('click', function () {
      onConfirm();
      UI.closeModal();
    });
  }

  function field(label, key, value, type, extraAttrs) {
    extraAttrs = extraAttrs || '';
    if (type === 'textarea') {
      return '<div class="field"><label>' + label + '</label><textarea data-field="' + key + '" ' + extraAttrs + '>' + Utils.escapeHtml(value || '') + '</textarea></div>';
    }
    return '<div class="field"><label>' + label + '</label><input type="' + type + '" data-field="' + key + '" value="' + Utils.escapeHtml(value === undefined || value === null ? '' : value) + '" ' + extraAttrs + '></div>';
  }

  function selectField(label, key, value, options) {
    var opts = options.map(function (opt) {
      var optValue = typeof opt === 'string' ? opt : opt.value;
      var optLabel = typeof opt === 'string' ? opt : opt.label;
      return '<option value="' + optValue + '" ' + (optValue === value ? 'selected' : '') + '>' + optLabel + '</option>';
    }).join('');
    return '<div class="field"><label>' + label + '</label><select data-field="' + key + '">' + opts + '</select></div>';
  }

  function imageUploadField(label, key, currentValue) {
    return (
      '<div class="field">' +
        '<label>' + label + '</label>' +
        (currentValue ? '<img src="' + currentValue + '" style="max-width:120px;border-radius:var(--radius-sm);margin-bottom:6px;display:block;">' : '') +
        '<input type="file" accept="image/*" data-image-field="' + key + '">' +
        '<span class="field-hint">Resized and stored in this browser. Leave blank to keep the placeholder icon.</span>' +
      '</div>'
    );
  }

  function resizeImageFile(file, maxDim, callback) {
    var reader = new FileReader();
    reader.onload = function (evt) {
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }

  /** Reads every [data-field] input/select/textarea in a form root into a flat object. Numbers are coerced when the input type is number. */
  function readSimpleFields(formRoot) {
    var values = {};
    formRoot.querySelectorAll('[data-field]').forEach(function (el) {
      var key = el.getAttribute('data-field');
      values[key] = el.type === 'number' ? (parseFloat(el.value) || 0) : el.value;
    });
    return values;
  }

  ORV.StaffUI = {
    renderDataTable: renderDataTable,
    confirmDelete: confirmDelete,
    field: field,
    selectField: selectField,
    imageUploadField: imageUploadField,
    resizeImageFile: resizeImageFile,
    readSimpleFields: readSimpleFields
  };

})(window.ORV = window.ORV || {});
