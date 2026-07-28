# System Window - ORV-Inspired Tabletop RPG Website

This is the Player Panel for a browser-based tabletop RPG campaign tool,
styled after an Omniscient Reader's Viewpoint system window. Built in plain
HTML, CSS, and JavaScript, no framework, no build step, no bundler.

## Run this first, before anything else

**Do not open `index.html` by double-clicking it.** Browsers block local
JSON loading from a raw `file://` path for security reasons, so the game
data (traits, items, bestiary, and so on) will fail to load and you will
see an on-screen error explaining the same thing.

Instead, serve the folder over a local address. From this folder, run:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser. If you don't have
Python installed, any other static file server works the same way, for
example VS Code's "Live Server" extension, or `npx serve`.

Everything you create (characters, roll history) is saved in that
browser's local storage, tied to the address you loaded it from. Closing
the tab is fine, your saves are still there next time. Clearing your
browser's site data for that address is not, so avoid that if you want to
keep your characters.

## What is built so far (Milestone 1: Player Panel)

- Character Hub: create, select, and delete characters
- Character Creation wizard: identity, appearance and portrait, trait
  point-buy, starting equipment, review and save
- Character Profile: stats, HP/Stamina/Mana, traits, unlockable Skills,
  Stigmas, Fables, Status Effects, Inventory (equip/unequip, use
  consumables), Quests (browse, accept, track personal objective
  progress), Progression (spend coins on stats, resources, and skills,
  log session rewards), and a Journal (relationships, scenario history,
  titles, achievements)
- Dice Roller: d2 through d100, modifiers, advantage/disadvantage,
  hidden/public rolls, animated results, roll history
- Skill Checks: all 6 stats and 14 trained skills, modifier calculated
  automatically from the active character
- Bestiary and Codex: searchable, filterable browsers with detail views.
  The Codex aggregates Skills, Stigmas, Fables, Equipment, and Status
  Effects live from their own data files, plus its own lore-only
  categories (Locations, Organisations, Constellations, Incarnations,
  Historical Events, World Lore, Rules), so nothing is duplicated

Stigmas, Fables, and Status Effects are meant to be granted by a Dungeon
Master, so a freshly created character will show empty states for those
tabs until the Staff Panel (see below) can grant them, or you assign some
yourself for testing through the browser console, for example:

```js
var gameData = ORV.State.getState().gameData;
var character = ORV.State.getActiveCharacter();
ORV.CharacterModel.addStatusEffect(character, 'bleeding', gameData);
ORV.State.upsertCharacter(character);
```

## Staff Panel (Milestone 2)

The Staff Panel lives at `staff/index.html` and is a separate interface
from the Player Panel, exactly as the brief asked for, not a mode toggle
on the same page. From the running server, go to
`http://localhost:8000/staff/index.html`.

**Default login:** username `dm`, password `starstream`. Change it by
editing `data/staffConfig.json`, see the comment inside that file for the
one-line browser console command that generates a new password hash.

**Read this before you rely on it:** this is a fully static, no-backend
site, so any login gate built entirely in the browser can be bypassed by
anyone who opens the page's source and calls the unlock function directly.
The password is hashed rather than stored in plain text, which stops a
casual glance at the file from revealing it, but that is the extent of the
protection. Treat this as a tidy lock for keeping curious players out of
the Dungeon Master tools, not real security. If this ever needs to be
genuinely protected from your own players, that requires a small real
backend to check the password server-side, which is a separate, optional
piece of work I did not build here since the brief specified a static
site.

What the Staff Panel can do:

- **Bestiary Manager**: create, edit, and delete enemies, including stat
  blocks, weaknesses/resistances/abilities/encounter ideas, and an image
- **Codex Manager**: create, edit, and delete lore articles across the
  seven lore-only categories, with an image per article. Skills, Stigmas,
  Fables, Equipment, and Status Effects still appear in the Codex
  automatically since those are managed from their own systems
- **Quest Manager**: create, edit, and delete quests, with a repeatable
  objectives list and reward checklists pulled from the live item, fable,
  and stigma catalogs, so a quest can never reward something that does not
  exist
- **Item Creator**: create, edit, and delete items in every category, with
  a repeatable effects editor (the same target/key/type/value shape used
  throughout the rules engine) and an image
- **Character Manager**: view every saved character, rename, award or
  remove coins, edit HP/Stamina/Mana and stats directly, grant or remove
  Skills/Stigmas/Fables, apply or remove Status Effects, give or remove
  inventory items, force-unequip gear, and resolve a player's active
  quests (Complete, which grants the quest's rewards automatically, or
  Fail)
- **DM Dice Tools**: the same roll engine as the Player Panel's dice
  roller, plus a third visibility tier (Secret, which hides the total
  behind a Reveal button), quick Initiative/Encounter Check buttons, a
  free-text damage expression roller (e.g. `2d6+3`), named saved presets,
  and a full log
- **Encounter Tools**: start a named encounter, add existing players or
  spawn enemies from the Bestiary, roll or set initiative, track HP with
  heal/damage buttons, and apply status effects. Effects applied to a
  player combatant are written straight to that player's real saved
  character, so it shows up on their profile immediately; spawned enemies
  only exist for the life of the encounter

**How staff content reaches the Player Panel:** since there is no backend,
edits made in the Staff Panel are stored as overrides in this browser's
local storage and layered on top of the shipped JSON every time either
page loads, so new or edited items, enemies, codex articles, and quests
show up in the Player Panel automatically once the player reloads the
page. Deleting a shipped entry is tracked as a tombstone rather than
actually rewriting the JSON file, since a static site cannot write to its
own files, restoring the original JSON files at any point clears every
override.

**Known gaps in this milestone:** enemy drops and related-enemy links, and
codex cross-links between articles, are preserved when editing an existing
entry but are not yet exposed as fields in the Staff Panel's forms, they
can still be set by editing the JSON directly or through the browser
console. "Image Management" is handled inline on each entity's own edit
form (upload the enemy's image while editing the enemy, and so on) rather
than as a separate media-library screen, which keeps the upload next to
the thing it belongs to instead of a disconnected step.

## Project structure

```
index.html                 Player Panel entry point
staff/index.html           Staff Panel entry point, separate interface
css/
  tokens.css                Colors, fonts, spacing (edit this to reskin)
  base.css                  Reset, typography, layout shell, keyframes
  components.css            Buttons, cards, tabs, modal, toasts, forms, bars
  player.css                Layouts specific to each Player Panel view
  staff.css                 Data table styling for the Staff Panel
data/
  rules.json                Stats, skills, formulas, costs (edit this to rebalance)
  traits.json                The 20 starting positive/negative traits
  statusEffects.json         All 37 status effects
  items.json                 Seed item catalog
  skills.json                Seed unlockable ability catalog
  stigmas.json                Seed stigma catalog
  fables.json                 Seed fable catalog, one per grade
  bestiary.json               Seed enemy catalog
  codex.json                  Lore-only codex entries
  quests.json                 Seed quest catalog
  staffConfig.json            Staff username and hashed password
assets/icons/sprite.svg       Placeholder line-art icons, swap for real art later
js/core/                      Utilities, UI helpers, storage, content overrides,
                              state, data loading, shared by both panels
js/modules/                   Player Panel features: character creation, hub,
                              profile, dice roller, skill checks, entry browser,
                              bestiary, codex
js/staff/                     Staff Panel features: auth, shared CRUD table/form
                              helpers, bestiary/codex/quest/item managers,
                              character manager, dice tools, encounter tools
js/app.js                     Boots the Player Panel
js/staff/staffApp.js          Boots the Staff Panel
```

## Adding content

Every catalog is a plain JSON file with a short `_comment` field at the
top explaining its shape. To add a new item, trait, enemy, quest, and so
on, copy an existing entry in the matching file and change the values,
there is no code to touch. IDs just need to be unique within their file.

## Editing the numbers

Every tunable number (trait point allowance, stat costs, HP/Stamina/Mana
formulas, experience curve) lives in `data/rules.json` in one place, so
rebalancing the whole system does not mean hunting through code.

## Browser support note

This targets current versions of Chrome, Firefox, Edge, and Safari. It
uses CSS custom properties, `backdrop-filter`, and `fetch()`, all standard
in any browser from the last several years.
