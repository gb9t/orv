/**
 * Staff authentication. This hashes the entered password in the browser
 * and compares it to a stored hash, which is a step above storing the
 * password in plain text, but it is still a client-side check running in
 * code the person themselves can read and step through. Treat this as a
 * lock that keeps casual players out of the Dungeon Master tools, not as
 * real access control. See README.md for the honest version of this note.
 */
(function (ORV) {
  'use strict';

  var BASE = window.ORV_BASE_PATH || '';

  function hashPassword(password) {
    var bytes = new TextEncoder().encode(password);
    return window.crypto.subtle.digest('SHA-256', bytes).then(function (buffer) {
      return Array.from(new Uint8Array(buffer)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  function loadConfig() {
    return fetch(BASE + 'data/staffConfig.json').then(function (r) { return r.json(); });
  }

  function isAuthenticated() {
    return ORV.Storage.isStaffAuthenticated();
  }

  function logout() {
    ORV.Storage.setStaffAuthenticated(false);
    window.location.reload();
  }

  function renderLoginGate(container, onSuccess) {
    container.innerHTML =
      '<div class="flex-center" style="min-height:100vh">' +
        '<div class="card bracket-frame" style="max-width:380px;width:100%">' +
          '<div class="view-header__eyebrow">System Window // Staff Access</div>' +
          '<h1>Dungeon Master Login</h1>' +
          '<p class="text-muted" style="font-size:0.85rem">This is a local convenience lock, not real security. See the README before exposing this page to anyone you do not trust.</p>' +
          '<div class="field"><label>Username</label><input type="text" data-role="staff-username" autocomplete="username"></div>' +
          '<div class="field"><label>Password</label><input type="password" data-role="staff-password" autocomplete="current-password"></div>' +
          '<button class="btn btn-primary w-full" data-role="staff-login">Enter System Window</button>' +
          '<p class="field-hint mt-sm" data-role="staff-login-error"></p>' +
          '<p class="field-hint mt-md"><a href="../index.html">Back to Player Panel</a></p>' +
        '</div>' +
      '</div>';

    var submit = function () {
      var username = container.querySelector('[data-role="staff-username"]').value.trim();
      var password = container.querySelector('[data-role="staff-password"]').value;
      var errorEl = container.querySelector('[data-role="staff-login-error"]');
      errorEl.textContent = '';

      loadConfig().then(function (config) {
        return hashPassword(password).then(function (hashed) {
          if (username === config.username && hashed === config.passwordHash) {
            ORV.Storage.setStaffAuthenticated(true);
            onSuccess();
          } else {
            errorEl.textContent = 'Incorrect username or password.';
            errorEl.className = 'text-danger mt-sm';
          }
        });
      }).catch(function (err) {
        console.error('Staff login failed', err);
        errorEl.textContent = 'Could not reach staff config. Are you running this from a local server?';
        errorEl.className = 'text-danger mt-sm';
      });
    };

    container.querySelector('[data-role="staff-login"]').addEventListener('click', submit);
    container.querySelector('[data-role="staff-password"]').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submit();
    });
  }

  ORV.StaffAuth = {
    isAuthenticated: isAuthenticated,
    logout: logout,
    renderLoginGate: renderLoginGate
  };

})(window.ORV = window.ORV || {});
