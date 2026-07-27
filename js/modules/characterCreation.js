/**
 * Multi-step character creation wizard. Each step renders into the same
 * panel element and writes into a local wizardState object; nothing is
 * saved until Review & Create, which builds a real character through
 * CharacterModel and hands it to State/Storage.
 */
(function (ORV) {
  'use strict';

  var Utils = ORV.Utils;
  var UI = ORV.UI;
  var CM = ORV.CharacterModel;

  var STEP_LABELS = ['Identity', 'Appearance', 'Traits', 'Equipment', 'Review'];

  var wizardState;

  function freshWizardState() {
    return {
      step: 0,
      data: {
        name: '', alias: '', gender: '', age: '', species: '', occupation: '', affiliation: '',
        appearance: '', biography: '', portrait: null,
        selectedPositiveTraits: [], selectedNegativeTraits: [],
        selectedStarterItems: []
      }
    };
  }

  function mount(container) {
    wizardState = freshWizardState();
    renderShell(container);
  }

  function renderShell(container) {
    container.innerHTML =
      '<div class="view-header"><div class="view-header__eyebrow">System Window // Character Creation</div><h1>New Character</h1></div>' +
      '<div class="wizard-steps" data-role="wizard-steps"></div>' +
      '<div class="card wizard-panel" data-role="wizard-panel"></div>' +
      '<div class="wizard-actions">' +
        '<button class="btn btn-ghost" data-role="wizard-back">Back</button>' +
        '<button class="btn btn-primary" data-role="wizard-next">Next</button>' +
      '</div>';

    renderStepIndicator(container);
    renderCurrentStep(container);

    container.querySelector('[data-role="wizard-back"]').addEventListener('click', function () { goToStep(container, -1); });
    container.querySelector('[data-role="wizard-next"]').addEventListener('click', function () { goToStep(container, 1); });
  }

  function renderStepIndicator(container) {
    var stepsEl = container.querySelector('[data-role="wizard-steps"]');
    stepsEl.innerHTML = STEP_LABELS.map(function (label, index) {
      var cls = 'wizard-step' + (index === wizardState.step ? ' is-active' : '') + (index < wizardState.step ? ' is-done' : '');
      return '<div class="' + cls + '">' + (index + 1) + '. ' + label + '</div>';
    }).join('');
  }

  function renderCurrentStep(container) {
    var panel = container.querySelector('[data-role="wizard-panel"]');
    var backBtn = container.querySelector('[data-role="wizard-back"]');
    var nextBtn = container.querySelector('[data-role="wizard-next"]');
    backBtn.disabled = wizardState.step === 0;
    nextBtn.textContent = wizardState.step === STEP_LABELS.length - 1 ? 'Create Character' : 'Next';

    var renderers = [renderIdentityStep, renderAppearanceStep, renderTraitsStep, renderEquipmentStep, renderReviewStep];
    renderers[wizardState.step](panel, container);
  }

  function goToStep(container, direction) {
    if (direction > 0) {
      var validation = validateStep(wizardState.step);
      if (!validation.valid) { UI.notify(validation.message, 'warning'); return; }
      if (wizardState.step === STEP_LABELS.length - 1) { finalizeCharacter(); return; }
    }
    wizardState.step = Utils.clamp(wizardState.step + direction, 0, STEP_LABELS.length - 1);
    renderStepIndicator(container);
    renderCurrentStep(container);
  }

  function validateStep(step) {
    if (step === 0 && !wizardState.data.name.trim()) {
      return { valid: false, message: 'Give the character a name before continuing.' };
    }
    if (step === 2) {
      var gameData = ORV.State.getState().gameData;
      var balance = CM.getTraitPointBalance(wizardState.data.selectedPositiveTraits, wizardState.data.selectedNegativeTraits, gameData);
      if (balance.remaining < 0) return { valid: false, message: 'Too many positive traits selected for the trait points available.' };
      if (wizardState.data.selectedNegativeTraits.length > gameData.rules.maxNegativeTraits) {
        return { valid: false, message: 'No more than ' + gameData.rules.maxNegativeTraits + ' negative traits can be selected.' };
      }
    }
    return { valid: true };
  }

  /* ---------------- Step 1: Identity ---------------- */

  function renderIdentityStep(panel) {
    var d = wizardState.data;
    panel.innerHTML =
      '<div class="field-row">' +
        field('Name', 'name', d.name, 'text') +
        field('Alias', 'alias', d.alias, 'text') +
      '</div>' +
      '<div class="field-row">' +
        field('Gender', 'gender', d.gender, 'text') +
        field('Age', 'age', d.age, 'number') +
        field('Species', 'species', d.species, 'text') +
      '</div>' +
      '<div class="field-row">' +
        field('Occupation', 'occupation', d.occupation, 'text') +
        field('Affiliation', 'affiliation', d.affiliation, 'text') +
      '</div>';
    bindInputs(panel, d);
  }

  /* ---------------- Step 2: Appearance & Portrait ---------------- */

  function renderAppearanceStep(panel) {
    var d = wizardState.data;
    panel.innerHTML =
      '<div class="field-row">' +
        '<div class="field" style="max-width:180px">' +
          '<label>Portrait</label>' +
          '<div class="profile-portrait" data-role="portrait-preview" style="width:120px;height:120px;">' +
            (d.portrait ? '<img src="' + d.portrait + '" alt="Portrait preview">' : UI.icon('icon-user', 'icon-lg')) +
          '</div>' +
        '</div>' +
        '<div class="field flex-col gap-sm" style="flex:2">' +
          '<label>Portrait URL</label>' +
          '<input type="text" data-role="portrait-url" placeholder="https://..." value="' + (d.portrait && d.portrait.indexOf('data:') !== 0 ? Utils.escapeHtml(d.portrait) : '') + '">' +
          '<label class="mt-sm">Or Upload an Image</label>' +
          '<input type="file" accept="image/*" data-role="portrait-file">' +
          '<span class="field-hint">Uploaded images are resized and stored in this browser only.</span>' +
        '</div>' +
      '</div>' +
      field('Appearance', 'appearance', d.appearance, 'textarea') +
      field('Biography', 'biography', d.biography, 'textarea');

    bindInputs(panel, d);

    var preview = panel.querySelector('[data-role="portrait-preview"]');
    panel.querySelector('[data-role="portrait-url"]').addEventListener('input', function (e) {
      d.portrait = e.target.value.trim() || null;
      preview.innerHTML = d.portrait ? '<img src="' + Utils.escapeHtml(d.portrait) + '" alt="Portrait preview">' : UI.icon('icon-user', 'icon-lg');
    });
    panel.querySelector('[data-role="portrait-file"]').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      resizeImageFile(file, 320, function (dataUrl) {
        d.portrait = dataUrl;
        preview.innerHTML = '<img src="' + dataUrl + '" alt="Portrait preview">';
      });
    });
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
        callback(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---------------- Step 3: Traits ---------------- */

  function renderTraitsStep(panel) {
    var gameData = ORV.State.getState().gameData;
    var d = wizardState.data;
    var balance = CM.getTraitPointBalance(d.selectedPositiveTraits, d.selectedNegativeTraits, gameData);

    panel.innerHTML =
      '<div class="trait-points-tracker' + (balance.remaining < 0 ? ' is-negative' : '') + '" data-role="trait-tracker">' +
        '<span>Trait Points</span><span class="font-mono">' + balance.spent + ' spent / ' + balance.available + ' available (' + Utils.formatModifier(balance.remaining) + ')</span>' +
      '</div>' +
      '<div class="trait-columns">' +
        '<div><h3>Positive Traits</h3><div class="trait-list" data-role="positive-list"></div></div>' +
        '<div><h3>Negative Traits</h3><div class="trait-list" data-role="negative-list"></div></div>' +
      '</div>';

    renderTraitList(panel.querySelector('[data-role="positive-list"]'), gameData.traits.positive, d.selectedPositiveTraits, false, panel);
    renderTraitList(panel.querySelector('[data-role="negative-list"]'), gameData.traits.negative, d.selectedNegativeTraits, true, panel);
  }

  function renderTraitList(listEl, traitDefs, selectedIds, isNegative, panel) {
    listEl.innerHTML = traitDefs.map(function (trait) {
      var isSelected = selectedIds.indexOf(trait.id) >= 0;
      var cls = 'trait-option' + (isNegative ? ' is-negative' : '') + (isSelected ? ' is-selected' : '');
      return (
        '<div class="' + cls + '" data-trait-id="' + trait.id + '">' +
          '<div><div class="trait-option__name">' + Utils.escapeHtml(trait.name) + '</div>' +
          '<div class="trait-option__desc">' + Utils.escapeHtml(trait.description) + '</div></div>' +
          '<div class="trait-option__cost">' + (isNegative ? '+' : '-') + trait.points + '</div>' +
        '</div>'
      );
    }).join('');

    listEl.querySelectorAll('.trait-option').forEach(function (row) {
      row.addEventListener('click', function () {
        var traitId = row.getAttribute('data-trait-id');
        var index = selectedIds.indexOf(traitId);
        if (index >= 0) {
          selectedIds.splice(index, 1);
        } else {
          selectedIds.push(traitId);
        }
        renderTraitsStep(panel);
      });
    });
  }

  /* ---------------- Step 4: Equipment ---------------- */

  function renderEquipmentStep(panel) {
    var gameData = ORV.State.getState().gameData;
    var starterItems = gameData.items.items.filter(function (i) { return i.isStarterItem; });
    var d = wizardState.data;

    panel.innerHTML =
      '<p class="text-muted">Pick a small set of starting gear. The Dungeon Master can grant more through play.</p>' +
      '<div class="equip-pick-grid" data-role="equip-grid"></div>';

    var grid = panel.querySelector('[data-role="equip-grid"]');
    grid.innerHTML = starterItems.map(function (item) {
      var isSelected = d.selectedStarterItems.indexOf(item.id) >= 0;
      return (
        '<div class="chip' + (isSelected ? ' is-selected' : '') + '" data-item-id="' + item.id + '" style="flex-direction:column;align-items:flex-start;padding:12px;">' +
          '<div class="flex-between w-full">' + UI.icon(item.icon) + '<span class="badge" style="color:var(--rarity-' + item.rarity + ')">' + item.rarity + '</span></div>' +
          '<strong>' + Utils.escapeHtml(item.name) + '</strong>' +
          '<span class="text-muted" style="font-size:0.78rem">' + Utils.escapeHtml(item.description) + '</span>' +
        '</div>'
      );
    }).join('');

    grid.querySelectorAll('[data-item-id]').forEach(function (card) {
      card.addEventListener('click', function () {
        var itemId = card.getAttribute('data-item-id');
        var index = d.selectedStarterItems.indexOf(itemId);
        if (index >= 0) { d.selectedStarterItems.splice(index, 1); } else { d.selectedStarterItems.push(itemId); }
        renderEquipmentStep(panel);
      });
    });
  }

  /* ---------------- Step 5: Review ---------------- */

  function renderReviewStep(panel) {
    var gameData = ORV.State.getState().gameData;
    var d = wizardState.data;
    var balance = CM.getTraitPointBalance(d.selectedPositiveTraits, d.selectedNegativeTraits, gameData);

    var positiveNames = d.selectedPositiveTraits.map(function (id) {
      return gameData.traits.positive.find(function (t) { return t.id === id; }).name;
    });
    var negativeNames = d.selectedNegativeTraits.map(function (id) {
      return gameData.traits.negative.find(function (t) { return t.id === id; }).name;
    });
    var itemNames = d.selectedStarterItems.map(function (id) {
      return CM.findItemDef(id, gameData).name;
    });

    panel.innerHTML =
      '<div class="profile-header">' +
        '<div class="profile-portrait">' + (d.portrait ? '<img src="' + d.portrait + '">' : UI.icon('icon-user', 'icon-lg')) + '</div>' +
        '<div class="profile-identity">' +
          '<h2 class="profile-identity__name">' + Utils.escapeHtml(d.name) + '</h2>' +
          '<div class="profile-identity__alias">' + Utils.escapeHtml(d.alias || 'No alias') + '</div>' +
          '<div class="profile-identity__meta">' +
            '<span>' + Utils.escapeHtml(d.species || 'Species unset') + '</span>' +
            '<span>' + Utils.escapeHtml(d.occupation || 'Occupation unset') + '</span>' +
            '<span>' + Utils.escapeHtml(d.affiliation || 'Unaffiliated') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<p>' + Utils.escapeHtml(d.biography || 'No biography written yet.') + '</p>' +
      '<div class="field-row">' +
        '<div><h3>Positive Traits</h3><p>' + (positiveNames.join(', ') || 'None selected') + '</p></div>' +
        '<div><h3>Negative Traits</h3><p>' + (negativeNames.join(', ') || 'None selected') + '</p></div>' +
      '</div>' +
      '<p class="text-muted font-mono">Trait points: ' + balance.spent + ' spent / ' + balance.available + ' available</p>' +
      '<h3>Starting Equipment</h3><p>' + (itemNames.join(', ') || 'None selected') + '</p>' +
      '<p class="field-hint mt-md">Press "Create Character" to save. This is stored in this browser and can be edited later from the profile.</p>';
  }

  /* ---------------- Finalize ---------------- */

  function finalizeCharacter() {
    var gameData = ORV.State.getState().gameData;
    var d = wizardState.data;

    var character = CM.createBlankCharacter({
      name: d.name, alias: d.alias, gender: d.gender, age: d.age ? parseInt(d.age, 10) : null,
      species: d.species, occupation: d.occupation, affiliation: d.affiliation,
      appearance: d.appearance, biography: d.biography, portrait: d.portrait
    }, gameData);

    character.traits.positive = d.selectedPositiveTraits.slice();
    character.traits.negative = d.selectedNegativeTraits.slice();
    d.selectedStarterItems.forEach(function (itemId) { CM.addItemToInventory(character, itemId, 1); });

    CM.finalizeNewCharacter(character, gameData);
    ORV.State.upsertCharacter(character);
    ORV.Storage.setActiveCharacterId(character.id);
    ORV.State.setState({ activeCharacterId: character.id });

    UI.notify(character.name + ' has entered the Star Stream.', 'success');
    ORV.App.navigateTo('profile');
  }

  /* ---------------- Small render helpers ---------------- */

  function field(label, key, value, type) {
    if (type === 'textarea') {
      return '<div class="field"><label>' + label + '</label><textarea data-field="' + key + '">' + Utils.escapeHtml(value || '') + '</textarea></div>';
    }
    return '<div class="field"><label>' + label + '</label><input type="' + type + '" data-field="' + key + '" value="' + Utils.escapeHtml(value || '') + '"></div>';
  }

  function bindInputs(panel, dataObject) {
    panel.querySelectorAll('[data-field]').forEach(function (el) {
      el.addEventListener('input', function () {
        dataObject[el.getAttribute('data-field')] = el.value;
      });
    });
  }

  ORV.CharacterCreation = { mount: mount };

})(window.ORV = window.ORV || {});
