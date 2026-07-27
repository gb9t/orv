/**
 * The rules engine. Every number a character has on screen (effective stats,
 * skill modifiers, max HP/Stamina/Mana) is computed here from raw data, on
 * demand, rather than stored and allowed to go stale. Traits, equipped gear,
 * active status effects, fables, and stigmas all feed into the same modifier
 * pipeline so nothing has to be special-cased twice.
 */
(function (ORV) {
  'use strict';

  var Utils = ORV.Utils;

  function findItemDef(itemId, gameData) {
    return gameData.items.items.find(function (i) { return i.id === itemId; }) || null;
  }

  function findTraitDef(traitId, gameData) {
    var pos = gameData.traits.positive.find(function (t) { return t.id === traitId; });
    if (pos) return pos;
    return gameData.traits.negative.find(function (t) { return t.id === traitId; }) || null;
  }

  /* ---------------- Character factory ---------------- */

  function createBlankCharacter(basics, gameData) {
    var stats = {};
    gameData.rules.stats.forEach(function (statKey) { stats[statKey] = gameData.rules.baseStatValue; });

    return {
      id: Utils.generateId('char'),
      name: basics.name || 'Unnamed',
      alias: basics.alias || '',
      gender: basics.gender || '',
      age: basics.age || null,
      appearance: basics.appearance || '',
      biography: basics.biography || '',
      occupation: basics.occupation || '',
      affiliation: basics.affiliation || '',
      species: basics.species || '',
      portrait: basics.portrait || null,
      level: 1,
      experience: 0,
      coins: gameData.rules.startingCoins,
      stats: stats,
      bonusResources: { hp: 0, stamina: 0, mana: 0 },
      resources: {
        hp: { current: 0, max: 0 },
        stamina: { current: 0, max: 0 },
        mana: { current: 0, max: 0 }
      },
      traits: { positive: [], negative: [] },
      unlockedSkills: [],
      stigmas: [],
      fables: [],
      statusEffects: [],
      inventory: [],
      equipped: { weapon: null, armour: null, accessory1: null, accessory2: null },
      quests: { active: [], completed: [], failed: [] },
      achievements: [],
      titles: [],
      relationships: [],
      scenarioHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /* ---------------- Modifier collection ---------------- */

  function collectAllModifiers(character, gameData) {
    var mods = [];
    function addFrom(list, source) {
      (list || []).forEach(function (m) {
        mods.push(Object.assign({}, m, { source: source }));
      });
    }

    (character.traits.positive || []).concat(character.traits.negative || []).forEach(function (traitId) {
      var def = findTraitDef(traitId, gameData);
      if (def) addFrom(def.modifiers, 'Trait: ' + def.name);
    });

    Object.keys(character.equipped || {}).forEach(function (slot) {
      var itemId = character.equipped[slot];
      if (!itemId) return;
      var def = findItemDef(itemId, gameData);
      if (def) addFrom((def.effects || []).filter(function (e) { return e.type === 'flat' || e.type === 'percent'; }), 'Gear: ' + def.name);
    });

    (character.statusEffects || []).forEach(function (instance) {
      var def = gameData.statusEffects.effects.find(function (e) { return e.id === instance.effectId; });
      if (def) addFrom(def.rollModifiers, 'Status: ' + def.name);
    });

    (character.fables || []).forEach(function (fableId) {
      var def = gameData.fables.fables.find(function (f) { return f.id === fableId; });
      if (def) addFrom(def.passiveEffects, 'Fable: ' + def.name);
    });

    (character.stigmas || []).forEach(function (stigmaId) {
      var def = gameData.stigmas.stigmas.find(function (s) { return s.id === stigmaId; });
      if (def) addFrom(def.passiveBonus, 'Stigma: ' + def.name);
    });

    (character.unlockedSkills || []).forEach(function (skillId) {
      var def = gameData.skills.skills.find(function (s) { return s.id === skillId; });
      if (def && def.type === 'passive') addFrom(def.effects, 'Skill: ' + def.name);
    });

    return mods;
  }

  function sumMods(mods, target, key, type) {
    return mods
      .filter(function (m) { return m.target === target && m.key === key && m.type === type; })
      .reduce(function (sum, m) { return sum + m.value; }, 0);
  }

  /* ---------------- Derived stats ---------------- */

  function computeDerived(character, gameData) {
    var mods = collectAllModifiers(character, gameData);

    var effectiveStats = {};
    gameData.rules.stats.forEach(function (statKey) {
      effectiveStats[statKey] = character.stats[statKey] + sumMods(mods, 'stat', statKey, 'flat');
    });

    var statModifiers = {};
    gameData.rules.stats.forEach(function (statKey) {
      statModifiers[statKey] = Utils.statModifier(effectiveStats[statKey]);
    });

    var skillModifiers = {};
    var allSkillsBonus = sumMods(mods, 'allSkills', 'all', 'flat');
    Object.keys(gameData.rules.skills).forEach(function (skillId) {
      var governingStat = gameData.rules.skills[skillId];
      var specific = sumMods(mods, 'skill', skillId, 'flat');
      skillModifiers[skillId] = statModifiers[governingStat] + specific + allSkillsBonus;
    });

    var rf = gameData.rules.resourceFormulas;
    var bonus = character.bonusResources || { hp: 0, stamina: 0, mana: 0 };

    var maxHpBase = rf.maxHp.base + rf.maxHp.perLevel * character.level +
      rf.maxHp.constitutionMultiplier * statModifiers.constitution + bonus.hp;
    var maxHp = Math.max(1, Math.round(maxHpBase * (1 + sumMods(mods, 'resource', 'maxHp', 'percent') / 100)));

    var maxStaminaBase = rf.maxStamina.base + rf.maxStamina.perLevel * character.level +
      rf.maxStamina.constitutionMultiplier * statModifiers.constitution +
      rf.maxStamina.strengthMultiplier * statModifiers.strength + bonus.stamina;
    var maxStamina = Math.max(0, Math.round(maxStaminaBase * (1 + sumMods(mods, 'resource', 'maxStamina', 'percent') / 100)));

    var maxManaBase = rf.maxMana.base + rf.maxMana.perLevel * character.level +
      rf.maxMana.intelligenceMultiplier * statModifiers.intelligence +
      rf.maxMana.wisdomMultiplier * statModifiers.wisdom + bonus.mana;
    var maxMana = Math.max(0, Math.round(maxManaBase * (1 + sumMods(mods, 'resource', 'maxMana', 'percent') / 100)));

    return {
      effectiveStats: effectiveStats,
      statModifiers: statModifiers,
      skillModifiers: skillModifiers,
      maxHp: maxHp,
      maxStamina: maxStamina,
      maxMana: maxMana,
      modifiers: mods
    };
  }

  function syncResourcesToMax(character, gameData) {
    var derived = computeDerived(character, gameData);
    character.resources.hp.max = derived.maxHp;
    character.resources.stamina.max = derived.maxStamina;
    character.resources.mana.max = derived.maxMana;
    character.resources.hp.current = Utils.clamp(character.resources.hp.current, 0, derived.maxHp);
    character.resources.stamina.current = Utils.clamp(character.resources.stamina.current, 0, derived.maxStamina);
    character.resources.mana.current = Utils.clamp(character.resources.mana.current, 0, derived.maxMana);
    return derived;
  }

  /** Called once at the end of character creation to fill resources to full. */
  function finalizeNewCharacter(character, gameData) {
    var derived = syncResourcesToMax(character, gameData);
    character.resources.hp.current = derived.maxHp;
    character.resources.stamina.current = derived.maxStamina;
    character.resources.mana.current = derived.maxMana;
    return character;
  }

  /* ---------------- Trait point-buy ---------------- */

  function getTraitPointBalance(selectedPositiveIds, selectedNegativeIds, gameData) {
    var traits = gameData.traits;
    var spent = selectedPositiveIds.reduce(function (sum, id) {
      var def = traits.positive.find(function (t) { return t.id === id; });
      return sum + (def ? def.points : 0);
    }, 0);
    var granted = selectedNegativeIds.reduce(function (sum, id) {
      var def = traits.negative.find(function (t) { return t.id === id; });
      return sum + (def ? def.points : 0);
    }, 0);
    var available = gameData.rules.traitPointBaseAllowance + granted;
    return { spent: spent, granted: granted, available: available, remaining: available - spent };
  }

  /* ---------------- Progression ---------------- */

  function costForStatIncrease(character, statKey, gameData) {
    var cfg = gameData.rules.progressionCosts.statIncrease;
    var timesPurchased = Math.max(0, character.stats[statKey] - gameData.rules.baseStatValue);
    return cfg.baseCost + cfg.scalingPerPoint * timesPurchased;
  }

  function purchaseStatIncrease(character, statKey, gameData) {
    var cost = costForStatIncrease(character, statKey, gameData);
    if (character.coins < cost) return { success: false, message: 'Not enough coins.' };
    character.coins -= cost;
    character.stats[statKey] += 1;
    syncResourcesToMax(character, gameData);
    return { success: true, message: Utils.titleCase(statKey) + ' increased to ' + character.stats[statKey] + '.', cost: cost };
  }

  var RESOURCE_CFG_KEYS = { hp: 'maxHpIncrease', stamina: 'maxStaminaIncrease', mana: 'maxManaIncrease' };

  function costForResourceIncrease(character, resourceKey, gameData) {
    var cfg = gameData.rules.progressionCosts[RESOURCE_CFG_KEYS[resourceKey]];
    var timesPurchased = (character.bonusResources[resourceKey] || 0) / cfg.amountPerPurchase;
    return cfg.baseCost + cfg.scalingPerPurchase * timesPurchased;
  }

  function purchaseResourceIncrease(character, resourceKey, gameData) {
    var cfg = gameData.rules.progressionCosts[RESOURCE_CFG_KEYS[resourceKey]];
    var cost = costForResourceIncrease(character, resourceKey, gameData);
    if (character.coins < cost) return { success: false, message: 'Not enough coins.' };
    character.coins -= cost;
    character.bonusResources[resourceKey] = (character.bonusResources[resourceKey] || 0) + cfg.amountPerPurchase;
    syncResourcesToMax(character, gameData);
    return { success: true, message: 'Max ' + resourceKey.toUpperCase() + ' increased by ' + cfg.amountPerPurchase + '.', cost: cost };
  }

  function purchaseUnlockSkill(character, skillId, gameData) {
    var def = gameData.skills.skills.find(function (s) { return s.id === skillId; });
    if (!def) return { success: false, message: 'Unknown skill.' };
    if (character.unlockedSkills.indexOf(skillId) >= 0) return { success: false, message: 'Already unlocked.' };
    if (character.level < def.requiredLevel) return { success: false, message: 'Requires level ' + def.requiredLevel + '.' };
    if (character.coins < def.unlockCost) return { success: false, message: 'Not enough coins.' };
    character.coins -= def.unlockCost;
    character.unlockedSkills.push(skillId);
    return { success: true, message: def.name + ' unlocked.', cost: def.unlockCost };
  }

  function addExperience(character, amount, gameData) {
    var mods = collectAllModifiers(character, gameData);
    var bonusPercent = sumMods(mods, 'special', 'experienceMultiplier', 'percent');
    var adjusted = Math.round(amount * (1 + bonusPercent / 100));
    character.experience += adjusted;

    var perLevel = gameData.rules.leveling.experiencePerLevel;
    var maxLevel = gameData.rules.leveling.maxLevel;
    var leveledUp = false;
    while (character.level < maxLevel && character.experience >= character.level * perLevel) {
      character.level += 1;
      leveledUp = true;
    }
    syncResourcesToMax(character, gameData);
    return { adjusted: adjusted, leveledUp: leveledUp, newLevel: character.level };
  }

  /* ---------------- Inventory ---------------- */

  function addItemToInventory(character, itemId, quantity) {
    quantity = quantity || 1;
    var entry = character.inventory.find(function (e) { return e.itemId === itemId; });
    if (entry) { entry.quantity += quantity; } else { character.inventory.push({ itemId: itemId, quantity: quantity }); }
  }

  function removeItemFromInventory(character, itemId, quantity) {
    quantity = quantity || 1;
    var entry = character.inventory.find(function (e) { return e.itemId === itemId; });
    if (!entry || entry.quantity < quantity) return false;
    entry.quantity -= quantity;
    if (entry.quantity <= 0) character.inventory = character.inventory.filter(function (e) { return e.itemId !== itemId; });
    return true;
  }

  var SLOT_BY_CATEGORY = { weapon: 'weapon', armour: 'armour' };

  function equipItem(character, itemId, gameData) {
    var def = findItemDef(itemId, gameData);
    if (!def) return { success: false, message: 'Unknown item.' };
    var slot = SLOT_BY_CATEGORY[def.category];
    if (!slot && def.category === 'accessory') {
      slot = !character.equipped.accessory1 ? 'accessory1' : (!character.equipped.accessory2 ? 'accessory2' : 'accessory1');
    }
    if (!slot) return { success: false, message: def.name + ' cannot be equipped.' };
    character.equipped[slot] = itemId;
    syncResourcesToMax(character, gameData);
    return { success: true, message: def.name + ' equipped.' };
  }

  function unequipItem(character, slot, gameData) {
    character.equipped[slot] = null;
    syncResourcesToMax(character, gameData);
  }

  function useConsumable(character, itemId, gameData) {
    var def = findItemDef(itemId, gameData);
    if (!def || def.category !== 'consumable') return { success: false, message: 'Not a consumable.' };
    if (!removeItemFromInventory(character, itemId, 1)) return { success: false, message: 'None left in inventory.' };

    var derived = computeDerived(character, gameData);
    var messages = [];
    (def.effects || []).forEach(function (fx) {
      if (fx.target === 'resource' && fx.type === 'flat') {
        if (fx.key === 'hp') character.resources.hp.current = Utils.clamp(character.resources.hp.current + fx.value, 0, derived.maxHp);
        if (fx.key === 'stamina') character.resources.stamina.current = Utils.clamp(character.resources.stamina.current + fx.value, 0, derived.maxStamina);
        if (fx.key === 'mana') character.resources.mana.current = Utils.clamp(character.resources.mana.current + fx.value, 0, derived.maxMana);
      }
      if (fx.type === 'text') messages.push(fx.value);
    });
    return { success: true, message: def.name + ' used.' + (messages.length ? ' ' + messages.join(' ') : '') };
  }

  /* ---------------- Status effects ---------------- */

  function addStatusEffect(character, effectId, gameData, customDuration) {
    var def = gameData.statusEffects.effects.find(function (e) { return e.id === effectId; });
    if (!def) return { success: false, message: 'Unknown status effect.' };
    var existing = character.statusEffects.find(function (e) { return e.effectId === effectId; });
    var duration = customDuration !== undefined ? customDuration : def.defaultDuration;
    if (existing) {
      existing.stacks = Math.min(existing.stacks + 1, def.stackLimit || 1);
      existing.remainingDuration = duration;
    } else {
      character.statusEffects.push({ effectId: effectId, stacks: 1, remainingDuration: duration, appliedAt: new Date().toISOString() });
    }
    syncResourcesToMax(character, gameData);
    return { success: true, message: def.name + ' applied.' };
  }

  function removeStatusEffect(character, effectId, gameData) {
    character.statusEffects = character.statusEffects.filter(function (e) { return e.effectId !== effectId; });
    syncResourcesToMax(character, gameData);
  }

  ORV.CharacterModel = {
    findItemDef: findItemDef,
    findTraitDef: findTraitDef,
    createBlankCharacter: createBlankCharacter,
    collectAllModifiers: collectAllModifiers,
    computeDerived: computeDerived,
    syncResourcesToMax: syncResourcesToMax,
    finalizeNewCharacter: finalizeNewCharacter,
    getTraitPointBalance: getTraitPointBalance,
    costForStatIncrease: costForStatIncrease,
    purchaseStatIncrease: purchaseStatIncrease,
    costForResourceIncrease: costForResourceIncrease,
    purchaseResourceIncrease: purchaseResourceIncrease,
    purchaseUnlockSkill: purchaseUnlockSkill,
    addExperience: addExperience,
    addItemToInventory: addItemToInventory,
    removeItemFromInventory: removeItemFromInventory,
    equipItem: equipItem,
    unequipItem: unequipItem,
    useConsumable: useConsumable,
    addStatusEffect: addStatusEffect,
    removeStatusEffect: removeStatusEffect
  };

})(window.ORV = window.ORV || {});
