'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const R = require('../run-system.js');
const team = () => ['nezha', 'erlang', 'change', 'tangseng', 'wukong'].map((heroId, i) => ({ id: 'h' + i, heroId, name: heroId, maxHp: 100, isPlayer: i === 0, canHeal: i === 2 || i === 3 }));
const waves = [{ name: 'mob', spawn: { imp: 4, zheng: 2 } }, { name: 'boss', boss: true, spawn: { imp: 2 } }];
function run(extra = {}) { return R.createRun({ seed: 'unit-seed', team: team(), waves, now: () => 1000, ...extra }); }
function damage(r, eventId, sourceId, targetId, hpBefore, hpAfter, kind) { return r.recordDamage({ eventId, sourceId, targetId, hpBefore, hpAfter, kind }); }
function killAndClear(r, card) {
  const e = r.startEncounter(); r.registerEnemy({ id: 'enemy:' + e.index, maxHp: 10 });
  damage(r, 'kill', 'h0', 'enemy:' + e.index, 10, -100);
  const cards = r.clearEncounter(); r.chooseReward(card && cards.some(c => c.id === card) ? card : cards[0].id); return e;
}
function stats(r, id) { return r.snapshot().team.find(h => h.id === id).stats; }
function row(id, overrides = {}) { return { id, stats: { damage: 0, damageTaken: 0, healing: 0, revives: 0, revivesCompleted: 0, ...overrides } }; }

test('Browser namespace and Node module both load without Phaser/DOM', () => {
  const context = { Date, Math, Uint32Array }; vm.runInNewContext(fs.readFileSync(require.resolve('../run-system.js'), 'utf8'), context);
  assert.equal(context.ShenhuaRunSystem.version, 1); assert.equal(R.version, 1);
});
test('defaults are finite, limits clamp and non-numeric values do not coerce', () => {
  assert.deepEqual(R.normalizeSettings(), { enemyHpMultiplier: 1, difficulty: 1, loops: 1, endless: false });
  assert.deepEqual(R.normalizeSettings({ enemyHpMultiplier: 99, difficulty: -1, loops: 3.9, endless: true }), { enemyHpMultiplier: 5, difficulty: .5, loops: 3, endless: true });
  assert.deepEqual(R.normalizeSettings({ enemyHpMultiplier: NaN, difficulty: Infinity, loops: '8', endless: 'false' }), R.DEFAULTS);
  assert.equal(R.normalizeSettings({ loops: 0 }).loops, 1); assert.equal(R.normalizeSettings({ loops: 100 }).loops, 10);
  assert.equal(R.validateSettings({ difficulty: false }).issues.length, 1);
  assert.equal(R.normalizeSettings({ enemyHpMultiplier: .01 }).enemyHpMultiplier, .25);
});
test('same seed/settings/choices reproduce encounters and rewards; query order does not advance RNG', () => {
  const a = run(), b = run();
  a.encounterAt(12); a.encounterAt(12);
  for (let i = 0; i < 2; i++) {
    assert.deepEqual(a.startEncounter(), b.startEncounter());
    for (const r of [a, b]) { r.registerEnemy({ id: 'e', maxHp: 10 }); damage(r, 'd', 'h0', 'e', 10, 0); }
    assert.deepEqual(a.clearEncounter(), b.clearEncounter()); assert.deepEqual(a.getRewardChoices(), a.getRewardChoices());
    const choice = a.getRewardChoices()[0].id; a.chooseReward(choice); b.chooseReward(choice);
  }
  assert.deepEqual(a.settlement(), b.settlement());
  assert.notDeepEqual(run({ seed: 'another-seed' }).encounterAt(2), a.encounterAt(2));
});
test('HP and difficulty have separate once-only scaling, including Boss nested damage', () => {
  const base = { hp: 100, damage: 10, speed: 100, biteDamage: 15, breath: { damage: 20 }, howl: { damage: 5, summonImps: 3 } };
  const a = run({ settings: { enemyHpMultiplier: 2, difficulty: 3 } });
  const b = run({ settings: { enemyHpMultiplier: 2, difficulty: .5 } });
  const x = a.scaleEnemy(base), y = b.scaleEnemy(base);
  assert.equal(x.hp, 200); assert.equal(y.hp, 200); assert.equal(x.damage, 30); assert.equal(y.damage, 5);
  assert.equal(x.biteDamage, 45); assert.equal(x.breath.damage, 60); assert.equal(x.howl.summonImps, 3);
  assert.equal(base.hp, 100); assert.equal(base.breath.damage, 20); assert.throws(() => a.scaleEnemy(x), /unscaled/);
  assert.equal(a.scaleEnemy(base, a.encounterAt(2)).hp, 224); assert.ok(Math.abs(a.getEnemyScales(a.encounterAt(2)).damage - 3.3) < 1e-9);
});
test('party entity IDs are distinct even when hero IDs repeat; max team size and wave Boss rules enforced', () => {
  const t = team(); t[1].heroId = t[0].heroId; assert.equal(run({ team: t }).snapshot().team.length, 5);
  t[1].id = t[0].id; assert.throws(() => run({ team: t }), /duplicate/);
  assert.throws(() => run({ team: [] }), /1..5/);
  assert.throws(() => run({ waves: [{ spawn: { imp: 1 } }] }), /Boss/);
  assert.throws(() => run({ waves: [{ boss: true, spawn: { imp: 999 } }] }), /spawn/);
});
test('3 reward cards are unique, applicable and capped rewards disappear; 3 universal cards sustain endless', () => {
  const t = team().map(h => ({ ...h, canHeal: false }));
  const r = run({ team: t, settings: { endless: true }, waves: [{ boss: true, spawn: {} }] });
  for (let i = 0; i < 180; i++) {
    r.startEncounter(); r.registerEnemy({ id: 'e', maxHp: 1 }); damage(r, 'hit', 'h0', 'e', 1, 0);
    const cards = r.clearEncounter(); assert.equal(cards.length, 3); assert.equal(new Set(cards.map(c => c.id)).size, 3);
    cards.forEach(c => { assert.notEqual(c.id, 'mercy'); assert.ok(!c.maxStacks || c.stacksBefore < c.maxStacks); });
    const selected = cards.find(c => c.maxStacks) || cards[0]; r.chooseReward(selected.id);
  }
  assert.equal(r.snapshot().phase, 'between'); assert.equal(r.snapshot().progress.bossKills, 180);
});
test('reward choice actually changes aggregate effect spec, cannot choose stale/missing cards or mutate state', () => {
  const r = run(); r.startEncounter(); const cards = r.clearEncounter();
  assert.throws(() => r.chooseReward('not-offered'), /current 3/);
  const chosen = cards[0]; const before = r.getBuild(); const applied = r.chooseReward(chosen.id);
  assert.notDeepEqual(applied.build, before); assert.equal(applied.build.stacks[chosen.id], 1);
  assert.equal(applied.chosen.stat, chosen.stat); assert.equal(applied.chosen.scope, 'team');
  assert.throws(() => r.chooseReward(chosen.id), /pending/);
  applied.build.stacks[chosen.id] = 1000; assert.equal(r.getBuild().stacks[chosen.id], 1);
});
test('effective HP damage only: clamps overkill, deduplicates event, no corpse credit, correct actor attribution', () => {
  const r = run(); r.startEncounter(); r.registerEnemy({ id: 'e', maxHp: 10 });
  assert.equal(damage(r, 'x', 'h1', 'e', 10, -999).credited, 10);
  assert.equal(damage(r, 'x', 'h1', 'e', 10, -999).credited, 0);
  assert.equal(damage(r, 'y', 'h0', 'e', 0, -999).credited, 0);
  assert.equal(stats(r, 'h1').damage, 10); assert.equal(stats(r, 'h0').damage, 0);
});
test('hostile actual HP loss credits tank; shields and requested raw damage do not fabricate it', () => {
  const r = run(); r.startEncounter(); r.registerEnemy({ id: 'e', maxHp: 100 });
  assert.equal(damage(r, 'shielded', 'e', 'h1', 100, 100).credited, 0);
  assert.equal(damage(r, 'loss', 'e', 'h1', 100, 70).credited, 30);
  assert.equal(stats(r, 'h1').damageTaken, 30);
});
test('environment, self and friendly HP losses update ledger but do not credit awards or later healing farming', () => {
  const r = run(); r.startEncounter();
  damage(r, 'env', null, 'h1', 100, 80, 'environment');
  damage(r, 'self', 'h1', 'h1', 80, 60);
  damage(r, 'friendly', 'h0', 'h1', 60, 40);
  assert.equal(stats(r, 'h1').damageTaken, 0); assert.equal(stats(r, 'h0').damage, 0);
  const heal = r.recordHeal({ eventId: 'heal', sourceId: 'h2', targetId: 'h1', hpBefore: 40, hpAfter: 100 });
  assert.equal(heal.actual, 60); assert.equal(heal.credited, 0); assert.equal(stats(r, 'h2').healing, 0);
});
test('effective healing excludes overheal, wrong HP snapshots, dead targets and duplicate events', () => {
  const r = run(); r.startEncounter(); r.registerEnemy({ id: 'e', maxHp: 100 }); damage(r, 'hit', 'e', 'h1', 100, 60);
  assert.equal(r.recordHeal({ eventId: 'wrong', sourceId: 'h2', targetId: 'h1', hpBefore: 100, hpAfter: 999 }).credited, 0);
  const e = { eventId: 'heal', sourceId: 'h2', targetId: 'h1', hpBefore: 60, hpAfter: 999 };
  assert.deepEqual(r.recordHeal(e), { actual: 40, credited: 40 }); assert.equal(r.recordHeal(e).credited, 0);
  assert.equal(r.recordHeal({ ...e, eventId: 'over', hpBefore: 100 }).credited, 0);
  damage(r, 'kill', 'e', 'h1', 100, 0);
  assert.equal(r.recordHeal({ ...e, eventId: 'dead', hpBefore: 0, hpAfter: 50 }).credited, 0);
  assert.equal(stats(r, 'h2').healing, 40);
});
test('regen and wave heal consume hostile-heal debt without giving healing award', () => {
  const r = run(); r.startEncounter(); r.registerEnemy({ id: 'e', maxHp: 100 }); damage(r, 'hit', 'e', 'h1', 100, 40);
  assert.equal(r.recordHeal({ eventId: 'regen', sourceId: 'h1', targetId: 'h1', hpBefore: 40, hpAfter: 60, kind: 'regen' }).credited, 0);
  assert.equal(r.recordHeal({ eventId: 'cast', sourceId: 'h2', targetId: 'h1', hpBefore: 60, hpAfter: 100 }).credited, 40);
});
test('completed rescue requires real down token and living rescuer; repeated tokens fail, same-target farming is capped per wave', () => {
  const r = run(); r.startEncounter(); r.registerEnemy({ id: 'e', maxHp: 100 }); damage(r, 'kill', 'e', 'h1', 100, 0);
  const token = r.markDown('h1');
  assert.equal(r.recordRevive({ sourceId: 'h2', targetId: 'h1', token, hpAfter: 40, completed: false }).completed, false);
  const e = { sourceId: 'h2', targetId: 'h1', token, hpAfter: 40, completed: true };
  assert.deepEqual(r.recordRevive(e), { completed: true, credited: 1 }); assert.equal(r.recordRevive(e).completed, false);
  damage(r, 'kill-again', 'e', 'h1', 40, 0); const token2 = r.markDown('h1'); assert.notEqual(token, token2);
  assert.equal(r.recordRevive(e).completed, false);
  assert.deepEqual(r.recordRevive({ ...e, token: token2 }), { completed: true, credited: 0 });
  assert.equal(stats(r, 'h2').revives, 1); assert.equal(stats(r, 'h2').revivesCompleted, 2);
});
test('all-zero awards have no winners or MVP; ties are explicit, same AI can win multiple independent awards', () => {
  const zero = R.calculateAwards([row('player'), row('ai')]); assert.equal(zero.mvp, null);
  Object.values(zero.awards).forEach(a => assert.deepEqual(a.winners, []));
  const a = R.calculateAwards([row('player', { damage: 10 }), row('ai', { damage: 10, healing: 50, revives: 1, damageTaken: 20 })]);
  assert.deepEqual(a.awards.damage.winners, ['ai', 'player']); assert.deepEqual(a.awards.healing.winners, ['ai']);
  assert.deepEqual(a.awards.revives.winners, ['ai']); assert.deepEqual(a.awards.damageTaken.winners, ['ai']); assert.deepEqual(a.mvp.winners, ['ai']);
});
test('MVP weights active categories transparently; support can win and tank-only farming has capped weight', () => {
  const r = R.calculateAwards([row('dps', { damage: 100 }), row('support', { healing: 80, revives: 2 }), row('tank', { damageTaken: 1e9 })]);
  assert.deepEqual(r.mvp.winners, ['support']);
  const tank = r.mvp.scores.find(s => s.id === 'tank'); assert.equal(tank.score, .2);
  assert.ok(Math.abs(r.mvp.scores.reduce((s, v) => s + v.score, 0) - 1) < 1e-9);
  assert.deepEqual(R.calculateAwards([row('a', { damage: 1 }), row('b', { damage: 1 })]).mvp.winners, ['a', 'b']);
});
test('restart retains validated settings/team but resets seed, HP, stats, build, reward and Boss progress', () => {
  const r = run({ settings: { loops: 3, enemyHpMultiplier: 2, difficulty: 2 } }); killAndClear(r); r.syncHeroHP('h1', 2, 200); r.fail();
  const n = r.restart(); const s = n.snapshot(); assert.notEqual(s.seed, r.snapshot().seed);
  assert.deepEqual(s.settings, r.snapshot().settings); assert.equal(s.phase, 'ready'); assert.equal(s.team[1].hp, 100); assert.equal(s.team[1].maxHp, 100);
  assert.equal(s.progress.clearedWaves, 0); assert.equal(s.progress.bossKills, 0); assert.equal(s.rewardHistory.length, 0);
  s.team.forEach(h => Object.values(h.stats).forEach(v => assert.equal(v, 0))); Object.values(s.build.stacks).forEach(v => assert.equal(v, 0));
});
test('finite loops each end in Boss; final reward then victory stops new encounters and freezes settlement time', () => {
  let clock = 0; const r = run({ settings: { loops: 2 }, now: () => clock }); const bosses = [];
  for (let i = 0; i < 4; i++) { clock += 1000; bosses.push(killAndClear(r).boss); }
  assert.deepEqual(bosses, [false, true, false, true]); const s = r.settlement();
  assert.equal(s.result.outcome, 'victory'); assert.equal(s.progress.completedLoops, 2); assert.equal(s.progress.bossKills, 2); assert.equal(s.elapsedMs, 4000);
  clock = 999999; assert.equal(r.settlement().elapsedMs, 4000); assert.throws(() => r.startEncounter(), /settled/);
  assert.throws(() => r.syncHeroHP('h0', 100), /settled/); assert.equal(s.rewardHistory.length, 4);
});
test('failure snapshot contains full party/individual stats, rewards/build, progress, reason and elapsed', () => {
  let clock = 100; const r = run({ now: () => clock }); killAndClear(r); clock = 2100;
  const s = r.fail('team-wipe'); assert.equal(s.phase, 'lost'); assert.equal(s.result.outcome, 'defeat'); assert.equal(s.elapsedMs, 2000);
  assert.equal(s.team.length, 5); assert.equal(s.team[0].stats.damage, 10); assert.equal(s.rewardHistory.length, 1); assert.equal(s.totals.damage, 10);
  assert.equal(s.build.stacks[s.rewardHistory[0].chosen], 1); assert.throws(() => r.clearEncounter(), /settled/);
});
test('phase guards, living enemy gate and settlement precondition reject accidental double advance', () => {
  const r = run(); assert.throws(() => r.settlement(), /requires/); assert.throws(() => r.clearEncounter(), /outside/);
  r.startEncounter(); r.registerEnemy({ id: 'e', maxHp: 1 }); assert.throws(() => r.clearEncounter(), /living/); assert.throws(() => r.startEncounter(), /previous/);
  damage(r, 'k', 'h0', 'e', 1, 0); r.clearEncounter(); assert.throws(() => r.clearEncounter(), /outside/);
});

test('weapon capability changes affect applicable cards, but cannot invalidate a pending reward', () => {
  const r = run({ team: team().map(h => ({...h, canHeal:false})), settings:{endless:true} });
  r.startEncounter(); const a = r.clearEncounter(); assert.ok(a.every(c => c.id !== 'mercy'));
  assert.throws(() => r.setCanHeal('h2',true), /choosing/); r.chooseReward(a[0].id); r.setCanHeal('h2',true);
  let found = false;
  for(let i=0;i<20;i++){r.startEncounter();const cs=r.clearEncounter();found ||= cs.some(c=>c.id==='mercy');r.chooseReward(cs[0].id);}
  assert.equal(found,true); assert.throws(()=>r.getEnemyScales({index:0,cycleIndex:-1}),/invalid encounter/);
});


test('intermission regen consumes hostile debt after max-HP growth without awarding healing',()=>{const r=run();r.startEncounter();r.registerEnemy({id:'e',maxHp:10});damage(r,'wound','e','h0',100,70);r.syncHeroHP('h0',70,200);r.syncHeroHP('h0',80);const result=r.recordHeal({eventId:'heal-after-rest',sourceId:'h2',targetId:'h0',hpBefore:80,hpAfter:110});assert.equal(result.actual,30);assert.equal(result.credited,20);assert.equal(stats(r,'h2').healing,20);});
