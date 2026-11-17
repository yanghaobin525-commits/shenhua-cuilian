/* User-requested single-player Roguelike rules; not historical Forge rules.
 * No Phaser/DOM/storage dependency. Engine integration deliberately separate. */
(function (root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShenhuaRunSystem = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  const clone = o => JSON.parse(JSON.stringify(o));
  const freeze = o => { Object.values(o).forEach(v => { if (v && typeof v === 'object') freeze(v); }); return Object.freeze(o); };
  const DEFAULTS = freeze({ enemyHpMultiplier: 1, difficulty: 1, loops: 1, endless: false });
  const LIMITS = freeze({ enemyHpMultiplier: [0.25, 5], difficulty: [0.5, 3], loops: [1, 10], teamSize: 5, maxEventsPerEncounter: 100000, cycleScalingCap: 20 });
  const AWARDS = freeze([
    { key: 'damage', title: '最佳输出', weight: 0.30 },
    { key: 'damageTaken', title: '最佳承伤', weight: 0.20 },
    { key: 'healing', title: '最佳治疗', weight: 0.30 },
    { key: 'revives', title: '最佳救助', weight: 0.20 }
  ]);
  const REWARDS = freeze([
    { id: 'might', name: '破军', stat: 'damageMul', perStack: 0.08, op: 'addBaseMultiplier', description: '全队伤害基准倍率 +8%' },
    { id: 'vitality', name: '莲生', stat: 'maxHp', perStack: 0.10, op: 'addBaseMultiplier', description: '全队最大生命基准倍率 +10%（不自动回血）' },
    { id: 'renewal', name: '回春', stat: 'regen', perStack: 1, op: 'add', description: '全队每秒自然恢复 +1；自然恢复不刷治疗奖' },
    { id: 'mercy', name: '慈航', stat: 'healMul', perStack: 0.10, op: 'addBaseMultiplier', needsHealer: true, description: '全队治疗基准倍率 +10%' },
    { id: 'haste', name: '御风', stat: 'speed', perStack: 0.025, op: 'addBaseMultiplier', maxStacks: 12, description: '全队移动基准倍率 +2.5%，最多12层' },
    { id: 'ward', name: '金身', stat: 'armor', perStack: 0.025, op: 'add', maxStacks: 10, description: '全队减伤 +2.5个百分点；最终减伤须限至80%' },
    { id: 'focus', name: '澄心', stat: 'cooldown', perStack: -0.04, op: 'addBaseMultiplier', maxStacks: 10, description: '武器普攻/技能基准冷却 -4%，最多10层' },
    { id: 'keen', name: '照见', stat: 'critChance', perStack: 0.025, op: 'add', maxStacks: 10, description: '全队暴击 +2.5个百分点；最终暴击须限至95%' }
  ]);
  let seedCounter = 0;
  function freshSeed() {
    const a = new Uint32Array(1);
    if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(a);
    else a[0] = Math.floor(Math.random() * 4294967296);
    return Date.now().toString(36) + '-' + (++seedCounter).toString(36) + '-' + a[0].toString(36);
  }
  function rng(seed) {
    let s = 2166136261;
    for (const c of String(seed)) { s ^= c.charCodeAt(0); s = Math.imul(s, 16777619); }
    return function () { s += 0x6D2B79F5; let t = Math.imul(s ^ s >>> 15, 1 | s); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function shuffled(xs, random) {
    const a = xs.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function validateSettings(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
    const settings = {}, issues = [];
    for (const k of ['enemyHpMultiplier', 'difficulty', 'loops']) {
      const v = input[k];
      let n = typeof v === 'number' ? v : NaN;
      if (!Number.isFinite(n)) { n = DEFAULTS[k]; if (v !== undefined) issues.push(k + ': invalid, defaulted'); }
      const [lo, hi] = LIMITS[k], bounded = Math.max(lo, Math.min(hi, k === 'loops' ? Math.floor(n) : n));
      if (bounded !== n) issues.push(k + ': clamped/integer-normalized');
      settings[k] = bounded;
    }
    settings.endless = typeof input.endless === 'boolean' ? input.endless : DEFAULTS.endless;
    if (input.endless !== undefined && typeof input.endless !== 'boolean') issues.push('endless: boolean required, defaulted');
    return { settings, issues };
  }
  const normalizeSettings = input => validateSettings(input).settings;
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const need = (condition, message) => { if (!condition) throw new Error('RunSystem: ' + message); };
  const idOK = id => typeof id === 'string' && id.length > 0 && id.length <= 128;
  function calculateAwards(team) {
    const awards = {}, totals = {};
    for (const a of AWARDS) {
      const values = team.map(h => finite(h.stats[a.key]) ? Math.max(0, h.stats[a.key]) : 0);
      const value = Math.max(0, ...values);
      totals[a.key] = values.reduce((s, n) => s + n, 0);
      awards[a.key] = { title: a.title, value, winners: value > 0 ? team.filter((h, i) => Math.abs(values[i] - value) < 1e-9).map(h => h.id).sort() : [] };
    }
    const activeWeight = AWARDS.reduce((s, a) => s + (totals[a.key] > 0 ? a.weight : 0), 0);
    const scores = team.map(h => {
      const breakdown = {};
      for (const a of AWARDS) breakdown[a.key] = totals[a.key] > 0 ? Math.max(0, h.stats[a.key]) / totals[a.key] * a.weight / activeWeight : 0;
      return { id: h.id, score: Object.values(breakdown).reduce((s, n) => s + n, 0), breakdown };
    });
    const best = Math.max(0, ...scores.map(s => s.score));
    return { awards, mvp: best > 0 ? { winners: scores.filter(s => Math.abs(s.score - best) < 1e-9).map(s => s.id).sort(), score: best, scores } : null, totals };
  }
  function createRun(options = {}) {
    const settings = normalizeSettings(options.settings), seed = String(options.seed === undefined ? freshSeed() : options.seed);
    need(seed.length > 0 && seed.length <= 256, 'seed must contain 1..256 characters');
    const now = typeof options.now === 'function' ? options.now : Date.now;
    const startedAt = now(); need(finite(startedAt), 'clock must return milliseconds');
    const waves = clone(options.waves || [
      { name: '小妖出洞', spawn: { imp: 6, zheng: 2 } }, { name: '狰群夜袭', spawn: { imp: 4, zheng: 4, gudiao: 2 } },
      { name: '蛊雕盘旋', spawn: { imp: 6, zheng: 4, gudiao: 4 } }, { name: '九婴现身', boss: true, spawn: { imp: 4 } }
    ]);
    need(waves.length > 0 && waves.length <= 32, 'waves must contain 1..32 definitions');
    waves.forEach((w, i) => {
      need(Boolean(w.boss) === (i === waves.length - 1), 'each loop must end with exactly one Boss wave');
      need(w.spawn && typeof w.spawn === 'object', 'wave requires spawn dictionary');
      Object.entries(w.spawn).forEach(([key, n]) => need(idOK(key) && Number.isInteger(n) && n >= 0 && n <= 300, 'invalid spawn count/key'));
      need(Object.values(w.spawn).reduce((s, n) => s + n, 0) <= 600, 'wave too large');
    });
    const inputTeam = clone(options.team || []);
    need(inputTeam.length > 0 && inputTeam.length <= LIMITS.teamSize, 'team must contain 1..5 distinct entity IDs');
    const units = new Map(), party = inputTeam.map(h => {
      need(idOK(h.id) && !units.has(h.id) && idOK(h.heroId) && finite(h.maxHp) && h.maxHp > 0, 'invalid/duplicate party member');
      const member = { id: h.id, heroId: h.heroId, name: h.name || h.heroId, isPlayer: Boolean(h.isPlayer), canHeal: Boolean(h.canHeal), stats: { damage: 0, damageTaken: 0, healing: 0, revives: 0, revivesCompleted: 0 } };
      units.set(h.id, { faction: 'hero', maxHp: h.maxHp, hp: h.maxHp, healDebt: 0, downToken: null, downCount: 0 }); return member;
    });
    need(party.filter(h => h.isPlayer).length <= 1, 'at most one player');
    const stacks = Object.fromEntries(REWARDS.map(r => [r.id, 0]));
    const history = [], seen = new Set(), rescueTargets = new Set();
    let phase = 'ready', cleared = 0, bossKills = 0, current = null, offer = null, result = null, terminalElapsed = null;
    const elapsed = () => terminalElapsed === null ? Math.max(0, now() - startedAt) : terminalElapsed;
    const member = id => party.find(h => h.id === id);
    const alive = id => units.has(id) && units.get(id).hp > 0;
    const open = () => need(!result, 'run already settled');
    const fight = () => { open(); need(phase === 'fighting', 'combat event outside encounter'); };
    const progress = () => ({ clearedWaves: cleared, wavesPerLoop: waves.length, completedLoops: Math.floor(cleared / waves.length), bossKills, nextWaveIndex: cleared % waves.length, nextLoopNumber: Math.floor(cleared / waves.length) + 1, totalWaves: settings.endless ? null : settings.loops * waves.length });
    function build() {
      return { damageMultiplier: 1 + stacks.might * .08, maxHpMultiplier: 1 + stacks.vitality * .10, healingMultiplier: 1 + stacks.mercy * .10,
        regenAdd: stacks.renewal, speedMultiplier: 1 + stacks.haste * .025, armorAdd: stacks.ward * .025,
        cooldownMultiplier: 1 - stacks.focus * .04, critChanceAdd: stacks.keen * .025, stacks: clone(stacks) };
    }
    function encounterAt(index) {
      need(Number.isSafeInteger(index) && index >= 0, 'invalid encounter index');
      const cycleIndex = Math.floor(index / waves.length), waveIndex = index % waves.length, base = waves[waveIndex];
      const random = rng(seed + ':encounter:' + index), spawn = Object.create(null);
      for (const key of Object.keys(base.spawn).sort()) spawn[key] = base.spawn[key] === 0 ? 0 : Math.max(1, Math.round(base.spawn[key] * (.85 + random() * .30)));
      const spawnOrder = shuffled(Object.entries(spawn).flatMap(([key, n]) => Array(n).fill(key)), random);
      return { id: seed + ':wave:' + index, index, waveIndex, cycleIndex, loopNumber: cycleIndex + 1, name: base.name || '遭遇', boss: Boolean(base.boss), spawn, spawnOrder };
    }
    function getEnemyScales(encounter = current || encounterAt(cleared)) {
      need(encounter && Number.isSafeInteger(encounter.cycleIndex) && encounter.cycleIndex >= 0 && Number.isSafeInteger(encounter.index) && encounter.index >= 0, 'invalid encounter for scaling');
      const cycle = Math.min(LIMITS.cycleScalingCap, encounter.cycleIndex);
      return { hp: settings.enemyHpMultiplier * Math.pow(1.12, cycle), damage: settings.difficulty * (1 + .10 * cycle), speed: Math.max(.9, Math.min(1.2, 1 + .10 * (settings.difficulty - 1))) };
    }
    function scaleEnemy(base, encounter) {
      need(base && !base._runScale, 'pass immutable unscaled base definition, never a previous result');
      need(finite(base.hp) && base.hp > 0, 'enemy base HP required');
      const def = clone(base), scales = getEnemyScales(encounter);
      function damageFields(o) { for (const k of Object.keys(o)) { if (o[k] && typeof o[k] === 'object') damageFields(o[k]); else if ((k === 'damage' || /Damage$/.test(k)) && finite(o[k])) o[k] = o[k] * scales.damage; } }
      damageFields(def); def.hp = Math.max(1, Math.round(base.hp * scales.hp));
      if (finite(base.speed)) def.speed = base.speed * scales.speed;
      def._runScale = { seed, encounterIndex: (encounter || current || encounterAt(cleared)).index, ...scales };
      return def;
    }
    function startEncounter() {
      open(); need(phase === 'ready' || phase === 'between', 'resolve previous encounter/reward first');
      for (const [id, u] of units) if (u.faction === 'enemy') units.delete(id);
      seen.clear(); rescueTargets.clear(); current = encounterAt(cleared); phase = 'fighting'; return clone(current);
    }
    function registerEnemy(e) {
      fight(); need(e && idOK(e.id) && !units.has(e.id) && finite(e.maxHp) && e.maxHp > 0, 'enemy requires unique ID and final scaled maxHp');
      units.set(e.id, { faction: 'enemy', maxHp: e.maxHp, hp: e.maxHp }); return e.id;
    }
    function eventTarget(e) {
      fight(); need(e && idOK(e.eventId), 'unique eventId required');
      if (seen.has(e.eventId)) return null;
      need(seen.size < LIMITS.maxEventsPerEncounter, 'combat event safety limit reached');
      const t = units.get(e.targetId);
      if (!t || !finite(e.hpBefore) || !finite(e.hpAfter) || Math.abs(t.hp - e.hpBefore) > 1e-6) return null;
      seen.add(e.eventId); return t;
    }
    function recordDamage(e) {
      const t = eventTarget(e); if (!t || t.hp <= 0 || e.hpAfter >= t.hp) return { actual: 0, credited: 0 };
      const actual = t.hp - Math.max(0, e.hpAfter); t.hp -= actual;
      const source = units.get(e.sourceId), kind = e.kind || 'combat'; let credited = 0;
      if (kind === 'combat' && e.sourceId !== e.targetId && source && source.faction !== t.faction) {
        if (source.faction === 'hero' && t.faction === 'enemy') { member(e.sourceId).stats.damage += actual; credited = actual; }
        if (source.faction === 'enemy' && t.faction === 'hero') { member(e.targetId).stats.damageTaken += actual; t.healDebt = Math.min(t.maxHp, t.healDebt + actual); credited = actual; }
      }
      return { actual, credited };
    }
    function recordHeal(e) {
      const t = eventTarget(e); if (!t || t.faction !== 'hero' || t.hp <= 0 || e.hpAfter <= t.hp) return { actual: 0, credited: 0 };
      const actual = Math.min(t.maxHp, e.hpAfter) - t.hp; t.hp += actual;
      const source = units.get(e.sourceId), debt = Math.min(actual, t.healDebt); t.healDebt -= debt;
      const credited = (e.kind || 'combat') === 'combat' && source && source.faction === 'hero' && source.hp > 0 ? debt : 0;
      if (credited) member(e.sourceId).stats.healing += credited;
      return { actual, credited };
    }
    function markDown(id) {
      fight(); const t = units.get(id); need(t && t.faction === 'hero' && t.hp <= 0, 'down requires a zero-HP teammate');
      if (!t.downToken) t.downToken = current.id + ':' + id + ':' + (++t.downCount);
      return t.downToken;
    }
    function recordRevive(e) {
      fight(); const t = units.get(e.targetId), source = units.get(e.sourceId);
      if (!t || !source || source.faction !== 'hero' || source.hp <= 0 || t.faction !== 'hero' || t.hp > 0 || e.sourceId === e.targetId || !t.downToken || e.token !== t.downToken || e.completed !== true || !finite(e.hpAfter) || e.hpAfter <= 0) return { completed: false, credited: 0 };
      t.hp = Math.min(t.maxHp, e.hpAfter); t.downToken = null; t.healDebt = 0;
      const m = member(e.sourceId); m.stats.revivesCompleted++;
      const credited = rescueTargets.has(e.targetId) ? 0 : 1;
      rescueTargets.add(e.targetId); m.stats.revives += credited;
      return { completed: true, credited };
    }
    function syncHeroHP(id, hp, maxHp) {
      open(); const t = units.get(id); need(t && t.faction === 'hero' && finite(hp), 'sync requires a teammate and finite HP');
      if (maxHp !== undefined) { need(finite(maxHp) && maxHp > 0, 'invalid maxHp'); t.maxHp = maxHp; }
      const before = t.hp; t.hp = Math.max(0, Math.min(t.maxHp, hp));
      // Uncredited intermission recovery consumes old hostile damage even when a max-HP
      // blessing also created missing HP. Merely clamping debt to missing HP is insufficient.
      t.healDebt = Math.min(Math.max(0,t.healDebt-Math.max(0,t.hp-before)), t.maxHp-t.hp);
      if (t.hp > 0) t.downToken = null;
      return { hp: t.hp, maxHp: t.maxHp };
    }
    function setCanHeal(id, canHeal) {
      open(); need(phase !== 'reward', 'capability cannot change while choosing reward');
      const h = member(id); need(h && typeof canHeal === 'boolean', 'capability requires teammate ID and boolean');
      h.canHeal = canHeal;
    }
    function applicableRewards() { return REWARDS.filter(r => (!r.needsHealer || party.some(h => h.canHeal)) && (!r.maxStacks || stacks[r.id] < r.maxStacks)); }
    function clearEncounter() {
      fight(); need(!Array.from(units.values()).some(u => u.faction === 'enemy' && u.hp > 0), 'living enemies remain');
      // The engine must additionally verify its not-yet-spawned queue is empty.
      phase = 'reward'; offer = shuffled(applicableRewards(), rng(seed + ':reward:' + current.index)).slice(0, 3).map(r => ({ ...clone(r), scope: 'team', stacksBefore: stacks[r.id], stacksAfter: stacks[r.id] + 1 }));
      need(offer.length === 3, 'reward pool exhausted'); return clone(offer);
    }
    function chooseReward(id) {
      open(); need(phase === 'reward' && offer, 'no pending reward');
      const card = offer.find(r => r.id === id); need(card, 'reward must be one of the current 3 cards');
      stacks[id]++; history.push({ encounterIndex: current.index, offered: offer.map(r => r.id), chosen: id, stack: stacks[id] });
      cleared++; if (current.boss) bossKills++; offer = null;
      phase = !settings.endless && cleared >= settings.loops * waves.length ? 'won' : 'between';
      const response = { chosen: clone(card), build: build(), phase };
      if (phase === 'won') { const finalBuild=build();for(const base of inputTeam){const u=units.get(base.id);u.maxHp=Math.round(base.maxHp*finalBuild.maxHpMultiplier);u.hp=Math.min(u.hp,u.maxHp);u.healDebt=Math.min(u.healDebt,u.maxHp-u.hp);}result = { outcome: 'victory', reason: 'finite-loops-cleared' }; terminalElapsed = elapsed(); }
      return response;
    }
    function fail(reason = 'team-wipe') { open(); result = { outcome: 'defeat', reason: String(reason).slice(0, 200) }; terminalElapsed = elapsed(); phase = 'lost'; return settlement(); }
    function snapshot() {
      return clone({ version: 1, seed, settings, phase, elapsedMs: elapsed(), progress: progress(), encounter: current, pendingRewards: offer || [],
        team: party.map(h => ({ ...h, hp: units.get(h.id).hp, maxHp: units.get(h.id).maxHp })), build: build(), rewardHistory: history, result });
    }
    function settlement() {
      need(result, 'settlement requires victory or defeat');
      return { ...snapshot(), ...calculateAwards(party) };
    }
    function restart(opts = {}) { return createRun({ settings, team: inputTeam, waves, now: opts.now || now, seed: opts.seed === undefined ? freshSeed() : opts.seed }); }
    return Object.freeze({ snapshot, settlement, startEncounter, encounterAt, getEnemyScales, scaleEnemy, registerEnemy, recordDamage, recordHeal, markDown, recordRevive,
      syncHeroHP, setCanHeal, clearEncounter, chooseReward, getRewardChoices: () => clone(offer || []), getBuild: build, fail, restart });
  }
  return Object.freeze({ version: 1, DEFAULTS, LIMITS, REWARDS, AWARDS, validateSettings, normalizeSettings, freshSeed, createRun, calculateAwards });
});
