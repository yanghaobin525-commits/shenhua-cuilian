/* =====================================================================
 * 《神话·淬炼》 数值配置文件
 * 想调平衡只改这个文件即可，改完刷新页面生效。
 * 单位约定：
 *   - 距离/范围/尺寸：世界像素（竞技场默认 2000 x 1400）
 *   - 速度：世界像素 / 秒
 *   - 冷却 / 持续时间：秒
 *   - 伤害、治疗、血量：整数点数
 *   - armor（减伤）：0~1 之间，0.25 表示受到伤害减少 25%
 *   - threat（仇恨系数）：越大越容易被怪物盯上（肉盾应最大）
 * ===================================================================== */
window.GAME_CONFIG = {
  title: '神话·淬炼',            // 游戏名（标题画面、结算界面使用）
  fontFamily: '"Noto Sans SC","PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif',

  maxPixelRatio: 2,             // 渲染清晰度上限（视网膜屏=2 最清晰；老设备卡顿可改 1.5 或 1）

  arena: {
    width: 2000,                 // 竞技场宽
    height: 1400,                // 竞技场高
    viewWidth: 1250,             // 屏幕上大约能看到的世界宽度（越小镜头越近）
  },

  /* ---------------- 队伍 ----------------
   * teamSize：选人界面顶部的队伍槽位数（玩家 1 人 + AI 补位）。
   * allowDuplicateHeroes：英雄池不够时是否允许重复英雄补位；false 时多出的槽位显示「虚位以待」。
   * 以后新增英雄只需在下面 heroes 里加一项（并放一张 assets/sprites/xxx.png）。
   */
  teamSize: 5,
  allowDuplicateHeroes: false,

  /* ---------------- 英雄（只带被动天赋，不带攻击方式） ----------------
   * 职业定位 = 英雄天赋 + 当前装备的武器。
   * 例：哪吒(铁壁天赋)+火尖枪 = 肉盾；二郎神(天眼天赋)+神弓 = 远程物理输出；
   *     嫦娥(广寒天赋)+月华杖 = 远程治疗；任何英雄拿三尖两刃刀 = 近战输出。
   * 天赋字段：
   *   hp 最大生命 / speed 移速 / armor 减伤 / threat 仇恨系数
   *   damageMul 伤害倍率 / critChance 暴击率 / critMul 暴击倍率
   *   healMul 治疗倍率 / regen 每秒自动回血
   *   weapon 开局默认武器（对应下方 weapons 的键名）
   */
  heroes: {
    nezha: {
      name: '哪吒', title: '三坛海会大神', tags: ['肉盾', '近战'], sprite: 'hero_nezha', size: 112, weapon: 'spear',
      talent: { name: '莲花铁壁', desc: '莲藕真身：生命高、减伤 25%，仇恨翻倍，最适合顶在前面。' },
      hp: 950, speed: 235, armor: 0.25, threat: 2.6,
      damageMul: 1.0, critChance: 0.05, critMul: 1.6, healMul: 1.0, regen: 3,
    },
    erlang: {
      name: '二郎神', title: '清源妙道真君', tags: ['物理输出', '远程'], sprite: 'hero_erlang', size: 112, weapon: 'bow',
      talent: { name: '天眼洞察', desc: '天眼识破弱点：伤害 +20%，暴击率 25%。' },
      hp: 620, speed: 245, armor: 0.1, threat: 1.0,
      damageMul: 1.2, critChance: 0.25, critMul: 1.8, healMul: 1.0, regen: 0,
    },
    change: {
      name: '嫦娥', title: '广寒仙子', tags: ['治疗', '魔法'], sprite: 'hero_change', size: 112, weapon: 'staff',
      talent: { name: '广寒清辉', desc: '月华加持：治疗效果 +40%，每秒自动回血。' },
      hp: 560, speed: 240, armor: 0.05, threat: 0.8,
      damageMul: 1.0, critChance: 0.05, critMul: 1.6, healMul: 1.4, regen: 5,
    },
  },

  /* ---------------- 武器（普攻 + 两个技能都来自武器） ----------------
   * role 决定 AI 拿到这把武器时的打法：tank 顶前拉怪 / melee 近战输出 / ranged 远程输出 / healer 治疗
   * attack.kind：melee 扇形近战（range 距离, arc 角度）/ projectile 飞行物（projSpeed 飞行速度）
   * skill.kind：
   *   dash 冲刺穿过敌人 / taunt 范围伤害+嘲讽+护盾 / spin 原地旋斩 / cleave 前方直线重劈
   *   pierce 贯穿飞刃 / volley 扇形齐射 / heal 范围治疗 / frost 指定区域伤害+减速
   */
  weapons: {
    spear: {
      name: '火尖枪', role: 'tank', color: 0xd4502a,
      attack: { kind: 'melee', damage: 40, range: 100, arc: 110, cooldown: 0.55 },
      skill1: { kind: 'dash',  name: '风火突', damage: 95, distance: 280, cooldown: 6 },
      skill2: { kind: 'taunt', name: '混天绫', damage: 45, radius: 210, tauntTime: 4, shieldTime: 4, shieldReduce: 0.5, cooldown: 12 },
    },
    blade: {
      name: '三尖两刃刀', role: 'melee', color: 0xb8c4c8,
      attack: { kind: 'melee', damage: 55, range: 120, arc: 130, cooldown: 0.65 },
      skill1: { kind: 'spin',   name: '回风斩', damage: 110, radius: 170, cooldown: 6 },
      skill2: { kind: 'cleave', name: '劈山',   damage: 200, length: 360, width: 110, cooldown: 11 },
    },
    bow: {
      name: '神弓', role: 'ranged', color: 0x6fa3a0,
      attack: { kind: 'projectile', damage: 32, range: 440, cooldown: 0.5, projSpeed: 860, tex: 'arrow' },
      skill1: { kind: 'pierce', name: '穿云箭',   damage: 120, range: 650, projSpeed: 760, cooldown: 7 },
      skill2: { kind: 'volley', name: '天眼箭雨', arrows: 7, spread: 55, damage: 38, cooldown: 10 },
    },
    staff: {
      name: '月华杖', role: 'healer', color: 0xb9b2e0,
      attack: { kind: 'projectile', damage: 26, range: 420, cooldown: 0.7, projSpeed: 620, tex: 'moon' },
      skill1: { kind: 'heal',  name: '月光', heal: 230, radius: 340, cooldown: 8 },
      skill2: { kind: 'frost', name: '寒月', damage: 75, radius: 160, range: 460, slow: 0.45, slowTime: 3, cooldown: 9 },
    },
  },
  dropsPerWave: 1,               // 每波结束后在场上掉落几把武器（走过去自动拾取，原武器会留在原地）

  /* ---------------- 小怪（取材山海经，原创造型） ---------------- */
  enemies: {
    imp:    { name: '九婴小妖', sprite: 'mob_imp',    size: 64, hp: 95,  speed: 150, damage: 12, range: 48, cooldown: 1.0, type: 'melee', nativeFacing: -1 },
    zheng:  { name: '狰',       sprite: 'mob_zheng',  size: 92, hp: 250, speed: 185, damage: 22, range: 62, cooldown: 1.1, type: 'melee' },
    gudiao: { name: '蛊雕',     sprite: 'mob_gudiao', size: 96, hp: 175, speed: 150, damage: 18, range: 380, keepDistance: 300, cooldown: 1.6, projSpeed: 430, type: 'ranged' },
  },

  /* ---------------- Boss：九婴（两阶段） ---------------- */
  boss: {
    name: '九婴', sprite: 'boss_jiuying',
    size: 300, hp: 6500, speed: 85, armor: 0,
    biteDamage: 45, biteCooldown: 1.6,          // 近身撕咬
    phase2At: 0.5,                              // 血量低于 50% 进入二阶段（暴怒）
    phase2SpeedMul: 1.35,                       // 二阶段移速倍率
    phase2CooldownMul: 0.7,                     // 二阶段技能冷却倍率（越小放技能越勤）
    breath: { name: '水火吐息', damage: 85, length: 460, angle: 60, windup: 1.0, cooldown: 5, waterSlow: 0.5, waterSlowTime: 2.5 }, // 扇形，火/水交替，水会减速
    sweep:  { name: '摆尾横扫', damage: 75, radius: 240, windup: 0.8, cooldown: 7, knockback: 160 },  // 以自身为中心的圆形
    howl:   { name: '九首齐啸', bullets: 18, damage: 30, projSpeed: 330, windup: 0.7, cooldown: 10, summonImps: 3 }, // 仅二阶段：环形弹幕+召唤小妖
  },

  /* ---------------- 波次 ---------------- */
  waves: [
    { name: '第一波 · 小妖出洞', spawn: { imp: 6, zheng: 2 } },
    { name: '第二波 · 狰群夜袭', spawn: { imp: 4, zheng: 4, gudiao: 2 } },
    { name: '第三波 · 蛊雕盘旋', spawn: { imp: 6, zheng: 4, gudiao: 4 } },
    { name: '最终波 · 九婴现身', boss: true, spawn: { imp: 4 } },
  ],
  firstWaveDelay: 2.5,           // 开局多少秒后出第一波
  waveBreak: 4,                  // 波次之间休息秒数
  spawnInterval: 0.35,           // 同一波内每只怪的出场间隔
  reviveHpRatio: 0.5,            // 波次结束时阵亡英雄以多少比例血量复活
  waveClearHealRatio: 0.2,       // 波次结束时存活英雄回复最大生命的比例

  /* ---------------- 队友 AI ---------------- */
  ai: {
    rangedKeep: 290,             // 远程英雄与敌人保持的距离
    healerKeep: 320,             // 治疗与敌人保持的距离
    healThreshold: 0.65,         // 有队友血量低于该比例时治疗优先放月光
    followDistance: 140,         // 无敌人时跟随玩家的距离
  },
};
