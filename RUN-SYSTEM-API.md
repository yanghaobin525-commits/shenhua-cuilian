# 新增 Roguelike 模块接入说明

此文为独立模块的 API 契约；已在 v8 接入 game.js 与 run-ui.js，运行与验收见 V8-RELEASE.md。这是用户新增的单机 Roguelike 机制，不是原 Forge 规则复述。画风/alpha 资产不动。

## 加载与默认参数

浏览器在 game.js 之前加载 `run-system.js`，得到 `globalThis.ShenhuaRunSystem`。Node：`require('./run-system.js')`。无 Phaser/DOM/存储依赖。

```js
const R = window.ShenhuaRunSystem;
const checked = R.validateSettings({
  enemyHpMultiplier: Number(hpInput.value), // 0.25..5，默认1
  difficulty: Number(difficultyInput.value), // 0.5..3，默认1
  loops: Number(loopsInput.value),           // 1..10，向下取整，默认1
  endless: endlessCheckbox.checked          // 必须真正boolean，默认false
});
// checked = {settings, issues}; 建议UI展示issues而非静默改用户值。
let run = R.createRun({
  settings: checked.settings,
  waves: GAME_CONFIG.waves, // 每循环一整套波次，且仅最后一波boss:true
  team: selectedTeam.map((heroId, i) => ({
    id: 'hero-slot-' + i,    // 实例ID；不要用heroId当唯一ID（未来允许同英雄）
    heroId,
    name: GAME_CONFIG.heroes[heroId].name,
    isPlayer: i === 0,
    maxHp: GAME_CONFIG.heroes[heroId].hp, // 未叠构筑的基础生命
    canHeal: GAME_CONFIG.weapons[GAME_CONFIG.heroes[heroId].weapon].role === 'healer'
  }))
  // seed: 'replay-abc'，仅重放时指定；默认自动新seed
  // now: () => scene.elapsed * 1000，仅需主动战斗计时可注入单调游戏时钟
});
```

- 常量集中在 `DEFAULTS / LIMITS / REWARDS / AWARDS`，均深冻结。数值型字符串/NaN/Infinity/boolean 不当数字：恢复默认；数值超范围夹限。未知设置忽略。
- 推荐初次：血量1、难度1、循环1、无尽关。当前4波包含1个Boss；循环2 = 8波/2个Boss，而非每波重复2次。
- 无尽必须 `endless:true`，忽略有限终止点但保留loops设置，失败才结算；循环强化在第21轮后封顶，防指数溢出。默认绝不无限拖局。
- `restart()` 保留规范化设置/队伍身份/基础maxHp/波次模板；**新seed，HP/贡献/构筑/奖励/倒地令牌/Boss/波次/计时全部重置**。传 `{seed:'...'}` 才显式复用种子重放。
- 模块不写localStorage。返回选角/刷新页面后的设置保留由集成方仅持久化settings；不要复用上一局战斗实例、定时器或变异后的def。

## 核心 API / 状态机

`ready → fighting → reward → between → fighting … → reward → won`；任意未结算阶段 `fail(reason) → lost`。

| API | 返回/契约 |
|---|---|
| `createRun({settings,team,waves,seed?,now?})` | 1..5个不重复角色实例ID，至多1名玩家；游戏正常应传5人。每人必须有基础maxHp |
| `snapshot()` | 脱离内部引用的局内快照；包含seed/settings/phase/elapsedMs/队伍个人stats/HP/进度/构筑/奖励历史/待选卡/结果 |
| `encounterAt(index)` | 零起绝对遭遇号；纯查询，不推进RNG或状态，有限结束后查询也不会真的开战 |
| `startEncounter()` | 推进到当前遭遇，返回 `id,index,waveIndex,cycleIndex,loopNumber,name,boss,spawn,spawnOrder`；`index=已清波数`；**必须用返回spawnOrder代替原随机spawnQ** |
| `getEnemyScales(encounter?)` | `{hp,damage,speed}`；默认当前遭遇/下一遭遇 |
| `scaleEnemy(immutableBase, encounter?)` | 复制基础怪物/Boss定义，单次缩放；拒绝带`_runScale`的已缩放结果；原配置不变 |
| `registerEnemy({id,maxHp})` | 战斗期注册怪物实例，maxHp必须是最终缩放后值，初始HP=maxHp；不得与英雄ID重合；召唤物也注册 |
| `recordDamage(event)` / `recordHeal(event)` | `{actual,credited}`；下节事件契约；重复事件/失配前置HP不计 |
| `markDown(heroEntityId)` | 实际零血后获取当前倒地token；同次倒地重复调用返回同token |
| `recordRevive({sourceId,targetId,token,hpAfter,completed:true})` | `{completed,credited}`；救起必须真的完成，不是靠近/读条开始；同token不能重复计 |
| `syncHeroHP(id,hp,maxHp?)` | 无贡献的状态同步：波后自动复活/波后治疗/构筑上限变动；自动限制到0..maxHp；恢复正HP作废旧倒地token |
| `setCanHeal(id,boolean)` | 武器拾取/换装改变治疗能力时更新，影响后续适用奖励；选卡期间禁止改变能力使当前卡失效 |
| `clearEncounter()` | 检查已注册活怪为0，再给3张不重复适用卡；集成方还须保证spawnQ清空且Boss已真正生成/击杀，模块无法看见未注册怪 |
| `getRewardChoices()` | 复制当前3卡，反复读取不会换卡或改变随机流 |
| `chooseReward(cardId)` | 只能选当前卡且仅一次；返回 `{chosen,build,phase}`，实际累加构筑和奖励历史；Boss击杀/波次/循环进度在选卡完成后提交 |
| `getBuild()` | 累计构筑效果：详见下节；返回新对象，不暴露内部状态 |
| `fail(reason='team-wipe')` | 返回失败完整结算；随后所有变更API拒绝。失败时尚未选中的奖励不发放 |
| `settlement()` | 仅won/lost可调；快照+`awards,mvp,totals`；耗时冻结，反复读取不增加 |
| `restart({seed?,now?}={})` | 返回新run对象，不修改旧结算；集成方销毁旧场景/事件订阅再绑定新对象 |

同seed + 相同基础波次/设置/队伍治疗能力 + 相同选卡序列，可复现遭遇数量/顺序与奖励。**不声称Math.random驱动的AI、走位、碰撞和整个实时战斗也可重放。** 遭遇与奖励各用独立种子子流，查询次数不影响结果。

## 血量与难度只缩放一次

设当前循环零起 `c=min(cycleIndex,20)`：

- 怪物HP = `round(base.hp * enemyHpMultiplier * 1.12^c)`，至少1。
- 怪物伤害 = `baseDamage * difficulty * (1+0.10*c)`；适用于顶层`damage/biteDamage`及嵌套`breath.damage/sweep.damage/howl.damage`，不改变summonImps等数量。
- 怪物移速 = `base.speed * clamp(1+0.10*(difficulty-1),0.9,1.2)`。
- **difficulty不再乘HP；不得又在makeUnit/hurt里再乘一遍这些倍率。** Boss、小怪、Boss召唤物都从未缩放的配置调用一次`scaleEnemy`。
- 原`updateBoss`局部 `const B=C.boss`、Boss召唤和`C.boss.biteDamage`等直读必须由集成方使用**本Boss的scaled def**；仅在生成时改hp但技能继续读全局原配置会漏掉难度。

```js
const encounter = run.startEncounter();
scene.spawnQ = encounter.spawnOrder.slice();
// Boss生成仍由 encounter.boss 控制；waveIndex只索引基础4波，不能拿绝对index索引C.waves。
const def = run.scaleEnemy(GAME_CONFIG.enemies.imp, encounter);
const enemy = scene.makeUnit(def, 'enemy', x, y);
enemy.runId = 'enemy-' + (++scene.enemySequence);
run.registerEnemy({id: enemy.runId, maxHp: enemy.maxHp});
```

## 奖励必须应用，禁止只做UI假卡

3选1每波后出现，包含最后Boss波；最后选卡后才进入won结算。不允许skip绕过选卡/重复领取。3种普适增长（破军/莲生/回春）无层数上限供无尽持续选择；慈航仅队伍有canHeal时出现，其余有层数限制。卡片自带`id/name/description/stat/op/perStack/scope/stacksBefore/stacksAfter`（scope值为`team`）。

`chooseReward`真实更新模块构筑；**集成方必须在选中后用getBuild/返回build重算5人的实际战斗属性**。所有基于未变异基础值重建，不得把累计倍率再乘上一波已加成后的值。

| build字段 | 引擎实际应用 |
|---|---|
| damageMultiplier | `hero.def.damageMul = baseHero.damageMul * build.damageMultiplier` |
| maxHpMultiplier | `hero.maxHp = round(baseHero.hp * build.maxHpMultiplier)`；本卡不白送回血，保留当前HP并clamp，然后syncHeroHP |
| healingMultiplier | `hero.def.healMul = baseHero.healMul * build.healingMultiplier` |
| regenAdd | `hero.def.regen = baseHero.regen + build.regenAdd` |
| speedMultiplier | `hero.def.speed = baseHero.speed * build.speedMultiplier` |
| armorAdd | `hero.def.armor = min(0.80,baseHero.armor+build.armorAdd)` |
| cooldownMultiplier | 普攻/两技能每次读**当前武器基础cooldown**再乘此值；换武器同样生效，不改共享C.weapons |
| critChanceAdd | `hero.def.critChance = min(0.95,baseHero.critChance+build.critChanceAdd)` |

```js
const cards = run.clearEncounter(); // 引擎已确认spawnQ空+Boss/小怪全死
showThreeCards(cards, cardId => {
  const applied = run.chooseReward(cardId);
  applyBuildFromImmutableBasesToAllFive(applied.build); // 集成方实现，不能只关闭弹窗
  // 同步构筑后的maxHp；波后回血与自动复活另行同步，不计治疗/救助奖。
  for (const h of scene.heroes) run.syncHeroHP(h.runId, h.hp, h.maxHp);
  if (applied.phase === 'won') showSettlement(run.settlement());
  else scheduleNextEncounter();
});
```

## 贡献账本：实际HP，不是请求伤害/过量治疗

```js
// hurt内：先保存before，经护甲/护盾/无敌等实际结算后，HP钳至>=0再调用。
run.recordDamage({eventId:'combat-'+(++eventSeq), sourceId:src?.runId,
  targetId:t.runId, hpBefore:before, hpAfter:t.hp, kind:'combat'});
// source必须是原始伤害归属英雄/怪物，不是飞弹对象；DOT/召唤物可传其原主人。
// healUnit内：先真实clamp到maxHp；实际发生的治疗也记录，而非传技能请求amount。
run.recordHeal({eventId:'combat-'+(++eventSeq), sourceId:caster.runId,
  targetId:t.runId, hpBefore:before, hpAfter:t.hp, kind:'combat'});
```

- 每次伤害/治疗用唯一、至多128字符的eventId，伤害治疗共用序号；每波去重集合，10万事件/波安全门禁。重复eventId、失配账本hpBefore、死目标重复伤害均不记。
- 阵营来自已注册实体，不信任事件自称。英雄→敌人计来源英雄damage；敌人→英雄计目标英雄damageTaken。实际HP损失封顶于伤害前剩余HP；护盾吸收不算承伤。环境/自伤/友伤更新HP账本但无贡献。
- kind默认combat；`environment/self/friendly`用于伤害排除；`regen/wave/build/revive`等非combat治疗不计奖。未知来源也不计。
- 治疗为实际恢复HP，且最多补偿此前真实敌方HP损失产生的healDebt；环境/自伤/友伤不能先掉血再靠治疗刷分。自然回血/波后回血同样消耗或清空未治疗敌伤债务，但不给施疗奖。
- **所有生命变化都要接账本**：现有`tickUnit`自然回血也调用recordHeal(kind:'regen')；原波后clearWave自动回血/复活用syncHeroHP。漏记自然回血会让下一次hpBefore不匹配，模块拒绝伪造贡献，而非瞎补。
- 与真实引擎同步失败的事件返回0；建议开发期检查`actual`和实际HP变化差异。模块是离线诚实记账，不是防篡改服务器，不能判断玩家是否故意拖怪承伤。

### 救起、防重复与防无限刷救助

```js
const token = run.markDown(downed.runId); // hurt已把账本同步至0
// 实际救起读条完成、救助者活着、被救者仍是同次倒地：
const r = run.recordRevive({sourceId:rescuer.runId,targetId:downed.runId,
  token,hpAfter:restoredHP,completed:true});
if (r.completed) actuallyRestoreHero(downed, restoredHP);
```

无token、旧token、自救、救助者已死、目标未倒地、读条未完成都不计。一次倒地仅完成一次；每目标每波最多记1次**有效救助**（全队共享该目标门槛），防反复让同一个人倒地刷分。`stats.revivesCompleted`保存所有不同倒地事件真实完成救起次数，`stats.revives`是反刷后的有效救助次数，用于奖项/MVP；UI可同时展示两者并解释上限。第二次真实救起仍会正确恢复HP，只是该波不再加有效分。波后系统自动复活不冒充任何角色救助。

## 四奖与MVP

- damage/最佳输出、damageTaken/最佳承伤、healing/最佳治疗、revives/最佳救助**分别计算**；同一人可多奖，包括AI。正值并列全部列入`winners:[entityIds]`，按ID排序；误差容限1e-9。零值winners空，不硬颁奖。
- MVP各类队伍贡献份额：`0.30*个人输出/全队输出 + 0.20*个人承伤/全队承伤 + 0.30*个人有效治疗/全队有效治疗 + 0.20*个人有效救助/全队有效救助`；分母为0的类别剔除后按剩余权重归一化。
- 返回每人的`score/breakdown`，规则可解释，平分并列，全部零贡献则`mvp:null`。各类份额最高1，单纯无限拉高某一类不能获得超过该类权重的MVP分。玩家没有额外加权，坦奶救助能赢。
- 完整settlement包含seed/settings、队伍英雄ID与实例ID、个人stats、队伍totals、四奖/MVP、构筑与奖励历史、波次/Boss/循环、胜败与reason、冻结耗时。snapshot是只读展示/审计快照，**本版不提供从快照恢复整个实时战斗**。

## 已只读确认的接入点（基于当前文件，其他worker可能正改行号）

1. `BattleScene.create`组队时分配runId/createRun；清除旧stats/计时器/监听，restart持设置但不用旧场景状态。
2. `startWave/updateWaves`改由run.startEncounter返回spawnOrder、boss和waveIndex控制。只允许选卡结束后休整/下一波。
3. `makeEnemy/spawnBoss`与Boss二阶段召唤调用scaleEnemy+registerEnemy；Boss技能读scaled def而非C.boss原伤害。
4. `hurt`保存实际HP前后；`healUnit`/`tickUnit`自然回血记录有效变化；角色倒地时markDown，实际救助系统完成时recordRevive。旧版本只有波后自动复活，**新增真实读条/救助行为由集成方实现**，不能伪造救起战绩。
5. `clearWave`原来终Boss立即finish，需要改成全部波后选卡，chooseReward后的won才finish；clearWave系统回血/复活用syncHeroHP，无贡献。
6. `W()/普攻/技能cd`和所有英雄实际属性要读取累计构筑；共享配置保持不可变。每次拾取/更换武器后同步setCanHeal，不能用过期职业标签发不适用的治疗卡。
7. `finish/ResultScene`显示settlement，不再仅统计isPlayer伤害/治疗。再开run.restart；清理旧战斗队伍与订阅。

## 本地验证

命令：`node --check run-system.js && node --test test/run-system-unit.cjs`

原20项 + 集成增补2项（22项）纯Node测试实际通过（0失败），含动态武器治疗能力奖励过滤、浏览器全局加载、种子重现、参数边界、Boss嵌套伤害及HP/难度一次缩放、180波无尽奖励合法性、过量治疗/敌伤债务、伤害归属、救援去重、零值/并列/AI多奖、支持类MVP、重开全重置、有限循环Boss结算与耗时冻结，及最大生命增长后波间自然恢复正确消耗敌伤债务、最终祝福后引擎与冻结结算HP一致。模块接入与浏览器验收见根目录 V8-RELEASE.md。
