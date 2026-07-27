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

## What is not built yet

The Staff Panel (Dungeon Master tools: authenticated login, Bestiary and
Codex management, Quest management, Item Creator, Inventory management,
Character management, DM dice tools, Encounter tools, and image
management) is the next milestone. A quick note on that in advance: since
this is a fully static, no-backend site, any login gate built entirely in
the browser can be bypassed by anyone who opens the page's source, so it
is a convenience lock for keeping casual players out of the DM tools, not
real security. If the Staff Panel ever needs to be genuinely protected
from your own players (not just tidy), that needs a small real backend,
which is a separate, optional piece of work.

## Project structure

```
index.html              Entry point, loads everything in order
css/
  tokens.css            Colors, fonts, spacing (edit this to reskin)
  base.css              Reset, typography, layout shell, keyframes
  components.css        Buttons, cards, tabs, modal, toasts, forms, bars
  player.css            Layouts specific to each Player Panel view
data/
  rules.json            Stats, skills, formulas, costs (edit this to rebalance)
  traits.json           The 20 starting positive/negative traits
  statusEffects.json    All 37 status effects
  items.json            Seed item catalog
  skills.json           Seed unlockable ability catalog
  stigmas.json          Seed stigma catalog
  fables.json           Seed fable catalog, one per grade
  bestiary.json         Seed enemy catalog
  codex.json            Lore-only codex entries
  quests.json           Seed quest catalog
assets/icons/sprite.svg Placeholder line-art icons, swap for real art later
js/core/                Utilities, UI helpers, storage, state, data loading
js/modules/             One file per feature: character creation, profile,
                        dice roller, skill checks, entry browser, bestiary,
                        codex
js/app.js               Boots the app, builds the nav, routes between views
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
