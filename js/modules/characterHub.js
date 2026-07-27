/**
 * Character hub: the landing view. Lists every saved character as a card,
 * lets the player pick one as active (which the rest of the app reads from
 * State.getActiveCharacter), delete one, or jump into character creation.
 */
(function (ORV) {
  'use strict';

  var Utils = ORV.Utils;
  var UI = ORV.UI;

  function mount(container) {
    var state = ORV.State.getState();
    var characters = state.characters;

    container.innerHTML =
      '<div class="view-header"><div class="view-header__eyebrow">System Window // Characters</div><h1>Character Hub</h1></div>' +
      '<div class="hub-grid" data-role="hub-grid"></div>';

    var grid = container.querySelector('[data-role="hub-grid"]');

    var newCard = UI.createEl('div', { className: 'card card--interactive new-char-card' });
    newCard.innerHTML = UI.icon('icon-plus', 'icon-lg') + '<span>New Character</span>';
    newCard.addEventListener('click', function () { ORV.App.navigateTo('create'); });
    grid.appendChild(newCard);

    characters.slice().reverse().forEach(function (character) {
      grid.appendChild(buildCharacterCard(character));
    });

    if (characters.length === 0) {
      var hint = UI.createEl('div', { className: 'empty-state', attrs: { style: 'grid-column:1/-1' } });
      hint.innerHTML = '<p>No characters yet. Start with "New Character" above.</p>';
      grid.appendChild(hint);
    }
  }

  function buildCharacterCard(character) {
    var card = UI.createEl('div', { className: 'card card--interactive' });
    card.innerHTML =
      '<div class="char-card__portrait">' + (character.portrait ? '<img src="' + character.portrait + '" alt="">' : UI.icon('icon-user', 'icon-lg')) + '</div>' +
      '<div class="char-card__name">' + Utils.escapeHtml(character.name) + '</div>' +
      '<div class="char-card__alias">' + Utils.escapeHtml(character.alias || '') + '</div>' +
      '<div class="text-muted" style="font-size:0.8rem;margin-top:6px;">Level ' + character.level + ' &middot; ' + Utils.escapeHtml(character.species || 'Unknown species') + '</div>' +
      '<div class="flex gap-sm mt-md">' +
        '<button class="btn btn-primary btn-sm w-full" data-action="select">Open</button>' +
        '<button class="btn btn-danger btn-sm" data-action="delete">Delete</button>' +
      '</div>';

    card.querySelector('[data-action="select"]').addEventListener('click', function (evt) {
      evt.stopPropagation();
      ORV.Storage.setActiveCharacterId(character.id);
      ORV.State.setState({ activeCharacterId: character.id });
      ORV.App.navigateTo('profile');
    });

    card.querySelector('[data-action="delete"]').addEventListener('click', function (evt) {
      evt.stopPropagation();
      confirmDelete(character);
    });

    return card;
  }

  function confirmDelete(character) {
    var body = UI.createEl('div');
    body.innerHTML =
      '<p>Delete <strong>' + Utils.escapeHtml(character.name) + '</strong>? This cannot be undone.</p>' +
      '<div class="flex gap-sm mt-md">' +
        '<button class="btn btn-danger" data-role="confirm-delete">Delete Permanently</button>' +
        '<button class="btn btn-ghost" data-role="cancel-delete">Cancel</button>' +
      '</div>';

    UI.openModal({ title: 'Confirm Deletion', content: body });

    body.querySelector('[data-role="cancel-delete"]').addEventListener('click', UI.closeModal);
    body.querySelector('[data-role="confirm-delete"]').addEventListener('click', function () {
      ORV.Storage.deleteCharacter(character.id);
      ORV.State.setState({ characters: ORV.Storage.getCharacters(), activeCharacterId: ORV.Storage.getActiveCharacterId() });
      UI.closeModal();
      UI.notify(character.name + ' was removed.', 'info');
      ORV.App.navigateTo('hub');
    });
  }

  ORV.CharacterHub = { mount: mount };

})(window.ORV = window.ORV || {});
