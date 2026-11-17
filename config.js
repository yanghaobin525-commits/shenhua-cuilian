/* =====================================================================
 * 《神话·淬炼》 数值配置文件
 * 想调平衡只改这个文件即可，改完刷新页面生效。
 * 单位约定：
 *   - 距离/范围/尺寸：世界像素（竞技场默认 1400 x 1000）
 *   - 速度：世界像素 / 秒
 *   - 冷却 / 持续时间：秒
 *   - 伤害、治疗、血量：整数点数
 *   - armor（减伤）：0~1 之间，0.25 表示受到伤害减少 25%
 *   - threat（仇恨系数）：越大越容易被怪物盯上（肉盾应最大）
 * ===================================================================== */
window.GAME_CONFIG = {
  title: '神话·淬炼',            // 游戏名（标题画面、结算界面使用）
  fontFamily: '"Noto Sans SC","PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif',

  /* ---------------- 音频（原创 Web Audio 合成，无外链音频） ----------------
   * master / music / sfx: 0~1，音量克制；节拍 bpm 可调整。
   * UI 可调用 ShenhuaAudio.setMuted(true)、setVolume(0.4) 等 API。
   */
  audio: {
    enabled: true, master: 0.42, music: 0.48, sfx: 0.5,
    bpm: 88, bossBpm: 104,       // 16 小节固定旋律，Boss 加快低鼓与拨弦
    maxVoices: 64,              // 同时发声上限，命中/治疗按事件节流防止爆音
    lookAhead: 0.14, timerMs: 25 // 音频时钟预排，不跟随帧率、不堆叠多条 BGM
  },

  releaseId: 'solo-wukong-v11.2-20261117',
  artVersion: 'approved-v6',
  presentation:{maxNumbers:24,numberRise:90,numberLifetime:700,trailInterval:.035},
  motion: { stride:84, startSmooth:.12, stopSmooth:.10, maxFootTravel:14, footLift:9, bodyBounce:1.8, torsoSway:8, attackTwist:.11 },
  attackMotion: { spear:{kind:"thrust",windup:.18,active:.08,recovery:.24,reach:62,arc:.20}, blade:{kind:"slash",windup:.22,active:.09,recovery:.25,reach:44,arc:1.4}, fan:{kind:"ranged",windup:.18,active:.07,recovery:.23,reach:28,arc:.28}, monkstaff:{kind:"ranged",windup:.22,active:.08,recovery:.28,reach:32,arc:.35}, cudgel:{kind:"overhead",windup:.22,active:.08,recovery:.25,reach:48,arc:1.5}, rake:{kind:"overhead",windup:.24,active:.10,recovery:.30,reach:42,arc:1.25}, crescent:{kind:"slash",windup:.22,active:.09,recovery:.26,reach:46,arc:1.35}, sword:{kind:"slash",windup:.16,active:.07,recovery:.22,reach:44,arc:1.5} },
  combatArt: { canvasSize: 512, footY: 0.92, fps: 24, attackDuration: 0.36, castDuration: 0.65, handRadius: 0.043 },
  maxPixelRatio: 2,             // 渲染清晰度上限（视网膜屏=2 最清晰；老设备卡顿可改 1.5 或 1）

  runDefaults: { enemyHpMultiplier: 1, difficulty: 1, loops: 1, endless: false },
  combatWindows: { attack: {windup:.14,active:.08,recovery:.20,moveScale:.12}, cast: {windup:.28,active:.12,recovery:.28,moveScale:.05}, lightStun:.10, heavyStun:.23, hitGuard:.32, heavyThreshold:90 },
  rescue: { radius:125, seconds:2.4, bleedOut:24, hpRatio:.35 },
  view25d: { zoomScale:2.3, fixedCamera:true,inkWash:true, propScale:.48, islandRadius:710, parallax:{far:.025,mid:.08,near:.13,farYaw:.03,midYaw:.08,nearYaw:.12,farOverscan:1.3,midOverscan:1.45,cloudDrift:32,cloudSpeed:.09,nearAlpha:.22}, rotateStep:Math.PI/4, rotateSmooth:.14, cliffHeight:95, yScale: 0.42, shear: 0, marginX: 220, marginY: 300, bottomMargin: 220, cameraLift: 105, viewWidth: 1650, viewHeight: 1150 },
  arena: {
    width: 1400,                 // 竞技场宽
    height: 1400, radius:620,                // 竞技场高
    viewWidth: 1250,             // 屏幕上大约能看到的世界宽度（越小镜头越近）
  },

  /* ---------------- 队伍 ----------------
   * teamSize：选人界面顶部的队伍槽位数（玩家 1 人 + AI 补位）。
   * allowDuplicateHeroes：英雄池不够时是否允许重复英雄补位；false 时多出的槽位显示「虚位以待」。
   * 以后新增英雄只需在下面 heroes 里加一项（并放一张 assets/sprites/xxx.png）。
   */
  teamSize: 1,   // v10：单人 Roguelike（五人模式代码保留但不开放）
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
      name: '二郎神', title: '清源妙道真君', tags: ['物理输出', '近战'], sprite: 'hero_erlang', size: 112, weapon: 'blade',
      talent: { name: '天眼洞察', desc: '天眼识破弱点：伤害 +20%，暴击率 25%。' },
      hp: 620, speed: 245, armor: 0.1, threat: 1.0,
      damageMul: 1.2, critChance: 0.25, critMul: 1.8, healMul: 1.0, regen: 0,
    },
    change: {
      name: '嫦娥', title: '广寒仙子', tags: ['治疗', '魔法'], sprite: 'hero_change', size: 112, weapon: 'fan',
      talent: { name: '广寒清辉', desc: '月华加持：治疗效果 +40%，每秒自动回血。' },
      hp: 560, speed: 240, armor: 0.05, threat: 0.8,
      damageMul: 1.0, critChance: 0.05, critMul: 1.6, healMul: 1.4, regen: 5,
    },
    tangseng: {
      name: '唐僧', title: '旃檀功德佛', tags: ['治疗', '佛法'], sprite: 'hero_tangseng', size: 112, weapon: 'monkstaff',
      talent: { name: '佛光护佑', desc: '慈悲护持：治疗提高 30%，每秒回复生命。' },
      hp: 700, speed: 225, armor: 0.15, threat: 0.9, damageMul: 1, critChance: 0.05, critMul: 1.6, healMul: 1.3, regen: 5,
    },
    wukong: {
      name: '孙悟空', title: '齐天大圣', tags: ['近战', '暴击'], sprite: 'hero_wukong', size: 112, weapon: 'cudgel',
      talent: { name: '火眼金睛', desc: '身法敏捷：移速较高，暴击率 25%。' },
      hp: 720, speed: 270, armor: 0.12, threat: 1.3, damageMul: 1.15, critChance: 0.25, critMul: 1.8, healMul: 1, regen: 1,
    },
    bajie: {
      name: '猪八戒', title: '净坛使者', tags: ['肉盾', '近战'], sprite: 'hero_bajie', size: 112, weapon: 'rake',
      talent: { name: '天蓬厚甲', desc: '皮糙肉厚：高生命、减伤 20%，持续回复生命。' },
      hp: 1100, speed: 210, armor: 0.2, threat: 2.2, damageMul: 1, critChance: 0.05, critMul: 1.6, healMul: 1, regen: 4,
    },
    shaseng: {
      name: '沙僧', title: '金身罗汉', tags: ['肉盾', '近战'], sprite: 'hero_shaseng', size: 112, weapon: 'crescent',
      talent: { name: '流沙镇守', desc: '沉稳守护：减伤 22%，较高生命与仇恨。' },
      hp: 980, speed: 220, armor: 0.22, threat: 2.4, damageMul: 1.05, critChance: 0.05, critMul: 1.6, healMul: 1, regen: 2,
    },
    bailong: {
      name: '白龙马', title: '八部天龙', tags: ['近战', '迅捷'], sprite: 'hero_bailong', size: 112, weapon: 'sword',
      talent: { name: '龙鳞护体', desc: '龙鳞防护：减伤 18%，身手迅捷。' },
      hp: 760, speed: 265, armor: 0.18, threat: 1.2, damageMul: 1.1, critChance: 0.15, critMul: 1.7, healMul: 1, regen: 2,
    },
  },

  /* ---------------- 武器（普攻 + 单主动来自武器） ----------------
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
    zheng:  { nativeFacing:-1, pounce:{range:330,distance:210,radius:72,windup:.48,flight:.30,recovery:.40,cooldown:5.5,damageMul:1.3,height:28}, name: '狰',       sprite: 'mob_zheng',  size: 92, hp: 250, speed: 185, damage: 22, range: 62, cooldown: 1.1, type: 'melee' },
    gudiao: { name: '蛊雕',     sprite: 'mob_gudiao', size: 96, hp: 175, speed: 150, damage: 18, range: 380, keepDistance: 300, cooldown: 1.6, projSpeed: 430, type: 'ranged' },
  },

  /* ---------------- Boss：九婴（两阶段） ---------------- */
  /* v10 Boss：白啸狰王（原创，复用本作狰的原创图做放大+局部网格动作；动作节奏参考父会话转述的狼王可见姿态，数值为原创） */
  boss: {
    name: '白啸狰王', sprite: 'mob_zheng', nativeFacing: -1, tint: 0xe2ebff,
    size: 230, hp: 2600, speed: 165, armor: 0, phase2At: 0.5, phase2SpeedMul: 1.25, phase2CooldownMul: 0.7,
    claw:  { name: '裂爪', damage: 24, radius: 150, arc: 120, windup: 0.40, gap: 0.24, recovery: 0.45, cooldown: 1.9 },
    lunge: { name: '伏身扑咬', damage: 38, length: 380, width: 86, windup: 0.66, dash: 0.24, recovery: 0.6, cooldown: 4.4 },
    leap:  { name: '跃扑', damage: 46, radius: 125, windup: 0.55, flight: 0.46, height: 95, recovery: 0.72, cooldown: 6.4, maxRange: 560 },
    howl:  { name: '啸月', windup: 0.8, recovery: 0.45, summonImps: 2 },
  },
  bossJiuying: {
    name: '九婴', sprite: 'boss_jiuying',
    size: 300, hp: 6500, speed: 85, armor: 0,
    biteWindup:.24,biteRadius:75,biteDamage: 45, biteCooldown: 1.6,          // 近身撕咬
    phase2At: 0.5,                              // 血量低于 50% 进入二阶段（暴怒）
    phase2SpeedMul: 1.35,                       // 二阶段移速倍率
    phase2CooldownMul: 0.7,                     // 二阶段技能冷却倍率（越小放技能越勤）
    breath: { name: '水火吐息', damage: 85, length: 460, angle: 60, windup: 1.0, cooldown: 5, waterSlow: 0.5, waterSlowTime: 2.5 }, // 扇形，火/水交替，水会减速
    sweep:  { name: '摆尾横扫', damage: 75, radius: 240, windup: 0.8, cooldown: 7, knockback: 160 },  // 以自身为中心的圆形
    howl:   { name: '九首齐啸', bullets: 18, damage: 30, projSpeed: 330, windup: 0.7, cooldown: 10, summonImps: 3 }, // 仅二阶段：环形弹幕+召唤小妖
  },

  /* ---------------- 波次 ---------------- */
  waves: [   // v10：房间。每间清怪 → 三选一祝福 → 下一间；末间 Boss
    { name: '第一间 · 断崖哨口', spawn: { imp: 4, zheng: 1 } },
    { name: '第二间 · 云栈石桥', spawn: { imp: 3, zheng: 2, gudiao: 1 } },
    { name: '第三间 · 枯松祭坛', spawn: { imp: 4, zheng: 2, gudiao: 2 } },
    { name: '第四间 · 墨云峰顶', spawn: { imp: 3, zheng: 3, gudiao: 2 } },
    { name: '首领间 · 白啸狰王', boss: true, spawn: { imp: 0 } },
  ],
  firstWaveDelay: 2.5,           // 开局多少秒后出第一波
  waveBreak: 2.2,                  // 波次之间休息秒数
  spawnInterval: 0.35,           // 同一波内每只怪的出场间隔
  reviveHpRatio: 0.5,            // 波次结束时阵亡英雄以多少比例血量复活
  waveClearHealRatio: 0.2,       // 波次结束时存活英雄回复最大生命的比例

  /* ---------------- 队友 AI ---------------- */
  ai: {
    allySpacingMul:1.10,         // 同队脚底分离半径，减少五人挤成一团
    rangedKeep: 290,             // 远程英雄与敌人保持的距离
    healerKeep: 320,             // 治疗与敌人保持的距离
    healThreshold: 0.65,         // 有队友血量低于该比例时治疗优先放月光
    followDistance: 140,         // 无敌人时跟随玩家的距离
  },
};

// 武器独立外观来源；保留旧弓/杖数值作为可选平衡模板，不进入掉落池。
Object.assign(window.GAME_CONFIG.weapons, {
  fan: { name:'桂月团扇', role:'healer', color:0x86b7b1, attack:{kind:'projectile',damage:26,range:420,cooldown:0.7,projSpeed:620,tex:'moon'}, skill1:{kind:'heal',name:'月光',heal:230,radius:340,cooldown:8} },
  monkstaff: { name:'九环锡杖',role:'healer',color:0xd2aa50,attack:{kind:'projectile',damage:30,range:400,cooldown:0.75,projSpeed:600,tex:'moon'},skill1:{kind:'heal',name:'佛光',heal:210,radius:320,cooldown:8} },
  cudgel: {name:'金箍棒',role:'melee',color:0xdcae43,attack:{kind:'melee',damage:50,range:118,arc:135,cooldown:0.32},skill1:{kind:'spin',name:'横扫千军',damage:115,radius:180,cooldown:6}},
  rake: {name:'九齿钉耙',role:'tank',color:0x83a5a3,attack:{kind:'melee',damage:48,range:120,arc:125,cooldown:0.68},skill1:{kind:'taunt',name:'天蓬怒吼',damage:50,radius:210,tauntTime:4,shieldTime:4,shieldReduce:0.5,cooldown:10}},
  crescent: {name:'降妖宝杖',role:'tank',color:0xa7b5c2,attack:{kind:'melee',damage:52,range:120,arc:130,cooldown:0.65},skill1:{kind:'spin',name:'流沙旋斩',damage:110,radius:175,cooldown:7}},
  sword: {name:'龙纹剑',role:'melee',color:0xa9daee,attack:{kind:'melee',damage:44,range:110,arc:105,cooldown:0.48},skill1:{kind:'cleave',name:'破浪',damage:175,length:330,width:100,cooldown:8}}
});
window.GAME_CONFIG.weaponArt = {spear:'nezha',blade:'erlang',fan:'change',monkstaff:'tangseng',cudgel:'wukong',rake:'bajie',crescent:'shaseng',sword:'bailong'};
window.GAME_CONFIG.dropWeapons = Object.keys(window.GAME_CONFIG.weaponArt);
window.GAME_CONFIG.weaponVisualScale = { fan: 0.62 }; // 团扇小于头部；只调外观不改范围/伤害

// Original three-stage trajectories. Damage stays at the equipped basic-attack value.
window.GAME_CONFIG.combo={buffer:.24,chainWindow:.45,profiles:{
 spear:[{label:'探海刺',kind:'thrust',reach:58,windup:.18,active:.08,recovery:.22},{label:'挑云',kind:'rise',reach:40,raise:52,windup:.20,active:.08,recovery:.24},{label:'破阵重刺',kind:'thrust',reach:82,twistMul:1.3,windup:.25,active:.10,recovery:.32}],
 blade:[{label:'横断',kind:'slash',sweepSign:1,windup:.20,active:.08,recovery:.23},{label:'回锋',kind:'slash',sweepSign:-1,twistMul:-1,windup:.17,active:.08,recovery:.24},{label:'劈山收势',kind:'overhead',reach:62,windup:.28,active:.10,recovery:.34}],
 cudgel:[{label:'轻击·快戳',kind:'thrust',poseStage:'light',reach:58,arc:.2,windup:.09,active:.06,recovery:.16,damageMul:.8,rangeMul:1.05,arcDeg:60,hitstop:.035,shakeMul:.6},{label:'普通击·挥扫',kind:'slash',poseStage:'normal',sweepSign:1,windup:.15,active:.09,recovery:.22,damageMul:1,rangeMul:1.12,arcDeg:150,hitstop:.055,shakeMul:1},{label:'重击·跃起下砸',kind:'overhead',poseStage:'heavy',jump:true,reach:66,windup:.30,active:.10,recovery:.36,damageMul:1.7,rangeMul:1.3,arcDeg:130,hitstop:.10,shakeMul:2.6}],
 rake:[{label:'探锋',kind:'thrust',reach:54,windup:.23,active:.10,recovery:.26},{label:'倒卷',kind:'rise',reach:32,raise:42,twistMul:-1,windup:.22,active:.09,recovery:.26},{label:'震地落耙',kind:'overhead',reach:58,windup:.30,active:.12,recovery:.35}],
 crescent:[{label:'斜月',kind:'slash',sweepSign:1,windup:.20,active:.08,recovery:.23},{label:'回月',kind:'slash',sweepSign:-1,twistMul:-1,windup:.18,active:.08,recovery:.23},{label:'断潮',kind:'rise',reach:68,raise:37,windup:.27,active:.10,recovery:.33}],
 sword:[{label:'斜斩',kind:'slash',sweepSign:1,windup:.16,active:.07,recovery:.20},{label:'反斩',kind:'slash',sweepSign:-1,twistMul:-1,windup:.15,active:.07,recovery:.20},{label:'贯浪突刺',kind:'thrust',reach:76,windup:.23,active:.09,recovery:.31}],
 fan:[{label:'拂月',kind:'ranged',sweepSign:1,reach:28,raise:8,windup:.18,active:.07,recovery:.21},{label:'反手摘星',kind:'ranged',sweepSign:-1,twistMul:-1,reach:18,raise:38,windup:.17,active:.07,recovery:.23},{label:'双袖送月',kind:'ranged',reach:49,raise:18,twistMul:1.3,windup:.24,active:.09,recovery:.32}],
 monkstaff:[{label:'点金',kind:'ranged',reach:27,windup:.20,active:.08,recovery:.24},{label:'举莲',kind:'ranged',reach:12,raise:62,twistMul:-.6,windup:.22,active:.08,recovery:.25},{label:'镇心推杖',kind:'ranged',reach:51,raise:22,twistMul:1.3,windup:.27,active:.10,recovery:.34}]
}};

// v10 单人孙悟空：闪避与三技能（原创数值，可调）
window.GAME_CONFIG.solo={hero:'wukong',roster:['wukong'],dodge:{distance:200,duration:.2,iframes:.30,cooldown:.55,afterimages:4}};
Object.assign(window.GAME_CONFIG.weapons.cudgel,{
  skill2:{kind:'slam',name:'擎天一棍',damage:150,radius:145,reach:135,lockRange:360,stun:.55,cooldown:8},
  skill3:{kind:'freeze',name:'定身法',damage:30,radius:270,stun:2.0,bossStun:.7,cooldown:15}
});
window.GAME_CONFIG.dropsPerWave=0;
window.GAME_CONFIG.feel={hitstop:.05,hitstopFinisher:.09,hitstopSkill:.07,shake:.0025,weaponGhostInterval:.028,
  slash:[{color:0xffffff,ghost:0xfff4cf,reach:.95,arcMul:1.0,thick:.22,sweep:55,life:140},{color:0xfff3d0,ghost:0xffd27a,reach:1.12,arcMul:1.1,thick:.36,sweep:65,life:200},{color:0xffe6a0,ghost:0xffb15a,reach:1.4,arcMul:1.0,thick:.56,sweep:85,life:300}]};
window.GAME_CONFIG.solo.lock={range:420,meleeAssist:60,meleeCone:55,meleeSnap:.75};
window.GAME_CONFIG.poseArt={wukong:{dir:'assets/wukong-poses-v10/',stages:['light','normal','heavy'],views:['front','back','side'],holdUntil:.7}};

// ---------- v11：游丝重描姿势全集 + 新金箍棒（长度/弯曲可调）+ 打击手感 ----------
// 姿势为原创静态关键帧（非骨骼）；跑动为4帧循环，按移动距离换帧。
window.GAME_CONFIG.poseArtV11={wukong:{dir:'assets/wukong-poses-v11/',ext:'.webp',
  scale:1.1662,                      // manifest gameScaleToV10：v11 头身比与 v10 屏幕尺寸对齐
  attack:{light:'light',normal:'normal',heavy:'heavy'},
  dodge:'dodge',
  skills:{spin:'skill-spin',slam:'skill-slam',freeze:'skill-seal'},
  run:{front:'run-front',side:'run-side',back:'run-back',frames:['f0','f1','f2','f3'],stride:26,minSpeed:20},
  heavyJumpPx:90,                    // 重击起跳高度（美术单位，512框）
  holdUntil:.7}};
// 金箍棒：长度=基础长×段倍率；出手时伸长、收招回缩；弯曲在出手峰值最大、命中后回直。
window.GAME_CONFIG.staff={wukong:{file:'assets/wukong-poses-v11/staff.webp',
  baseLen:101,thick:8.5,segments:14,gripV:.5,          // 世界像素；gripV=握点距棍尾比例
  idle:{len:1.0,gripV:.5},
  stages:{light:{len:1.0,bend:.07,gripV:.32},normal:{len:1.3,bend:.13,gripV:.3},heavy:{len:1.7,bend:.24,gripV:.26}},
  skills:{spin:{len:1.3,bend:.06,gripV:.5},slam:{len:1.7,bend:.0,gripV:.14},freeze:{len:1.0,bend:0,gripV:.55}},
  extendEase:.6,       // 前摇后段伸长占比
  bendSign:-1,         // 弯曲方向：-1 = 棍梢滞后于挥舞方向（鞭梢感）
  rangeFromLength:true // 普攻判定距离 = 基础距离 + (len-1)×棍梢外伸长度
}};
// 普攻自动锁定/转向 + 每段小步前冲（重击为向前跃起一步）
Object.assign(window.GAME_CONFIG.solo.lock,{meleeAssist:150,meleeCone:70,meleeSnap:1});
window.GAME_CONFIG.solo.attackStep={light:{dist:14,dur:.08},normal:{dist:24,dur:.12},heavy:{dist:52,dur:.26},closeGap:60,stopShort:26};
// 怪物受击僵直（按段）与受击抖动
window.GAME_CONFIG.solo.hitStun={light:.18,normal:.26,heavy:.45,skill:.3,bossMul:.25,shake:6};
// 普攻残影：保留原色的半透明副本（逐段增强）；闪避：浅白虚影（按轮廓填色、无方框）
window.GAME_CONFIG.feel.attackGhost={light:{count:1,alpha:.24,life:150},normal:{count:2,alpha:.3,life:190},heavy:{count:3,alpha:.38,life:240}};
window.GAME_CONFIG.feel.dodgeGhost={tint:0xeef4ff,alpha:.42,life:260};
window.GAME_CONFIG.feel.slash.forEach(s=>s.reach=1.0); // 月牙光半径=实际棍梢距离（随棍长变化）
// BGM 接口：选定授权曲目后填 {url,loop:true,volume,credit,license,source}；未填时使用原创合成曲。
window.GAME_CONFIG.audio=Object.assign(window.GAME_CONFIG.audio||{},{bgm:{menu:null,arena:null,boss:null}});

// v11 手感修复（t109）：闪避可随时取消普攻/技能收招；闪避后段可被普攻取消并立即接招；hitstop 缩短且闪避可打断。
Object.assign(window.GAME_CONFIG.solo.dodge,{cooldown:.3,attackCancel:.55,resetAttackCd:true});
window.GAME_CONFIG.combo.buffer=.3;
window.GAME_CONFIG.combo.profiles.cudgel.forEach((p,i)=>p.hitstop=[.025,.04,.07][i]);
Object.assign(window.GAME_CONFIG.feel,{hitstop:.03,hitstopFinisher:.06,hitstopSkill:.05,hitstopBreakOnDodge:true});
// 死亡演出：阴影色→扭曲倒地→黑色星光飘散（Graphics 星形粒子，无贴图方框）
window.GAME_CONFIG.feel.death={dur:.85,bossDur:1.7,shadow:0x2a2236,stars:16,bossStars:48,starColor:0x0d0a12,rewardDelay:.8};
// 魂灵掉落：落地停顿后沿曲线飞向悟空，命中回血（基础1 + 摄魂祝福）
window.GAME_CONFIG.soul={heal:1,bossCount:6,popTime:.32,rest:.38,fly:.5,curve:.45,color:0x9fe8ff,core:0xf4fffb,ink:0x0d0a12};
// 授权BGM（t109 默认采用）：Samurai Nights by Majadroid，CC-BY 4.0（OpenGameArt）。
const SN={credit:'Samurai Nights — Majadroid (Maik Hoffmann)',license:'CC-BY 4.0 / CC-BY 3.0 / OGA-BY 3.0',source:'https://opengameart.org/content/samurai-nights'},DA={credit:'Dark Ambience Loop — Iwan Gabovitch (qubodup)',license:'CC-BY 3.0',source:'https://opengameart.org/content/dark-ambience-loop'};
window.GAME_CONFIG.audio.bgm={
  menu:{fade:1.0,layers:[{url:'assets/audio/samurai-nights-erhu-menu-majadroid.mp3',volume:.8,...SN}]},   // 选角/开局：二胡+笛分轨
  arena:null,                                                                                              // 普通房间：无BGM（只保留音效）
  boss:{fade:1.6,synth:'drums',layers:[{url:'assets/audio/samurai-nights-majadroid.mp3',volume:.62,...SN},{url:'assets/audio/dark-ambience-loop-qubodup.mp3',volume:.55,...DA}]}}; // 首领：战斗曲+原创紧张鼓点+暗黑氛围
window.GAME_CONFIG.audio.credits=[SN,DA,{credit:'挥棍/施法/命中音效、首领鼓点：原创 Web Audio 合成',license:'original',source:''}];
Object.assign(window.GAME_CONFIG.soul,{frames:['assets/wukong-poses-v11/soul-0.png','assets/wukong-poses-v11/soul-1.png','assets/wukong-poses-v11/soul-2.png'],fps:9,size:30,z:22});
Object.assign(window.GAME_CONFIG.poseArtV11.wukong,{spinCycle:{step:.07,sway:9,swayEase:18}}); // 横扫千军：每面停留秒数、横移幅度(屏幕px)
// t113：金箍棒只用一张 staff 贴图；粗细/长短/弯曲全部由代码分段网格实时变形（以下参数可调）
(()=>{const S=window.GAME_CONFIG.staff.wukong;S.taper=.12;S.idle.thick=1;S.stages.light.thick=1.0;S.stages.normal.thick=1.12;S.stages.heavy.thick=1.3;S.skills.spin.thick=1.1;S.skills.slam.thick=1.45;S.skills.freeze.thick=1;})();
// t114：挥击锥度——握持端细、远端粗，出手峰值最强、逐段增强、收招恢复（flare=远端加粗比例）
(()=>{const S=window.GAME_CONFIG.staff.wukong;S.taper=0;S.stages.light.flare=.35;S.stages.normal.flare=.6;S.stages.heavy.flare=1.0;S.skills.spin.flare=.4;S.skills.slam.flare=.9;S.skills.freeze.flare=0;})();
// t115：通用纯色剪影着色层（tintFill 按贴图 alpha 着色，跟随实时贴图；无方框）。预设颜色/透明度/持续秒数可调。
window.GAME_CONFIG.feel.silhouette={white:{color:0xffffff,alpha:.85,dur:.09},black:{color:0x0d0a12,alpha:.75,dur:.6},blue:{color:0x6fb8ff,alpha:.55,dur:.45},red:{color:0xff3b2f,alpha:.6,dur:.22},
  use:{enemyHit:'white',heroHurt:'red',freezeCast:'blue',frozen:'blue',death:'black'}};
// t116：小怪受击反向轻退 + 僵直（连续命中刷新僵直=连续打断；受击取消前摇/出招并关闭伤害判定）。首领霸体：不被普攻打断/击退，只受击闪色。
Object.assign(window.GAME_CONFIG.solo.hitStun,{light:.45,normal:.72,heavy:.75,skill:.5,bossSuperArmor:true,refresh:true,
  knockback:{light:{dist:10,dur:.08},normal:{dist:16,dur:.1},heavy:{dist:30,dur:.14},skill:{dist:22,dur:.12}}});
// t118/t119：单人 HUD 布局（参考动作手游的布局思路，全部原创绘制）。数值为 1024×600 基准像素，运行时乘 UI 缩放 u。
// safe：iPad 横屏安全区内边距；左半屏留给浮动摇杆。头顶血条：悟空与小怪不显示，仅首领在屏幕顶部居中显示血条。
window.GAME_CONFIG.hud={
  safe:{left:28,top:20,right:28,bottom:22},
  worldBars:{hero:false,minion:false},
  stats:{w:178,timerSize:30,rowH:38,icon:24,font:19,bg:0x0b0807,bgAlpha:.52,radius:14,rows:['hp','soul','room','foes']},
  attack:{dx:132,dy:128,r:80},
  ring:{radius:180,startDeg:178,endDeg:276,r:42,order:['dodge','s1','s2','s3']},
  topRight:{r:28,gap:14},
  boss:{w:520,h:16,top:30},
  joystick:{x:170,y:160,r:92,knob:40},
  title:{top:14,size:20,subSize:14}
};
// t120/t121：悟空血条（左上细长横条，长度∝最大血量，上限横跨顶边）；首领血条（进入首领战时从底部中间向两侧缓缓展开，横跨底边）。
Object.assign(window.GAME_CONFIG.hud,{
  hpBar:{pxPerHp:.42,h:11,maxLen:'full',minLen:120,grow:2.2,lowAt:.25,color:0xb3301f,low:0xff5a3c},
  boss:{h:15,bottom:10,unfold:1.6,ease:'Cubic.Out',color:0xa8321e,phase2:0xe0531f,nameSize:34},
  stats:{w:168,timerSize:28,rowH:34,icon:22,font:18,bg:0x0b0807,bgAlpha:.55,radius:0,rows:['hp','soul','room','foes'],gap:8}
});
// t122/t123：草书标题字体（OFL，本地子集化打包）：Liu Jian Mao Cao 为主，Ma Shan Zheng 补字与易读场合。正文仍用 fontFamily。
window.GAME_CONFIG.calliFont='"LiuJianMaoCao","MaShanZheng",cursive';
window.GAME_CONFIG.calliFontReadable='"MaShanZheng","LiuJianMaoCao",cursive';
window.GAME_CONFIG.fontCredits=['草书字体 Liu Jian Mao Cao — The Liu Jian Mao Cao Project Authors · SIL OFL 1.1','楷体字体 Ma Shan Zheng — The Ma Shan Zheng Project Authors · SIL OFL 1.1'];
// t124/t125：刀光内叠加毛笔笔痕游丝（单独图层可换色）。每段：条数、粗细范围[min,max]、透明度；笔触：起笔顿压比例、出锋指数、飞白干笔概率、干笔丝数、墨晕。
window.GAME_CONFIG.feel.slashInk={color:0x15100c,layerDepth:.06,fade:260,startK:.35,
  stages:[{count:3,width:[2,5],alpha:.55},{count:5,width:[3,8],alpha:.68},{count:8,width:[4,13],alpha:.82}],
  skill:{count:6,width:[3,10],alpha:.7},
  radial:[.5,1.0],press:.14,tip:1.7,dry:.38,dryFrom:.28,hairs:5,halo:.2,jitter:2.2};

// ===== v11.2（t126–t129 iPad 实机反馈）=====
// 待机改用 v11 同管线绘制的待机姿势（与跑动/普攻同一眼宽归一化 → 同一身体比例）；重击换成双手合握举过头顶的新姿势（512×720 帧）。
Object.assign(window.GAME_CONFIG.poseArtV11.wukong,{
  idle:'idle',                       // 待机姿势组（正/背/侧）
  idleBreath:{amp:.012,hz:.9},       // 待机呼吸：纵向起伏比例、频率
  setScale:{},                       // 个别姿势组的额外缩放（默认全部=1，已按眼宽统一）
  gripFist:{},                       // 指定握棍拳头索引，如 {'light-front':1}；缺省自动取朝向攻击方向的那只拳
  attack:{light:'light',normal:'normal',heavy:'heavy2'}
});
window.GAME_CONFIG.poseArtV11.wukong.run.cycleStride=150; // 跑动：每 4 帧一个完整步态循环对应的移动距离(世界px)，帧随实际位移推进，防止滑步
window.GAME_CONFIG.combatArt.handOverlay={rx:27,ry:29,enabled:true}; // 手部覆盖层：在姿势帧像素坐标中围绕每个拳心截取的椭圆，叠在金箍棒上面
// 金箍棒朝向：攻击时 = 攻击方向 + 各段扫动偏移(弧度，右侧挥为顺时针；朝左时自动镜像)。start→end 与刀光同向扫过，结束时指向目标。
window.GAME_CONFIG.staff.wukong.aim={
  sideDead:.08, verticalSide:1,
  stages:{
    light: {start:-.55,end:.08, antic:.45,ease:2.4,hold:.5},   // 轻击·快戳：略抬后直戳
    normal:{start:-1.45,end:1.25,antic:.5, ease:2.2,hold:.45}, // 普通击·挥扫：上→目标方向→下，150°左右
    heavy: {start:-2.65,end:.42, antic:.6, ease:2.6,hold:.55}  // 重击：棍举过头顶（背后）→ 越顶砸向目标前下方
  },
  slam:{up:0,end:.25,antic:.55},     // 擎天一棍：双拳上举时棍竖直向上，再沿出手侧砸下
  carry:{                            // 待机/跑动握持：0=竖直向上；侧面为“棍梢朝身后上方”（自动随朝向镜像）
    idle:{side:-.5,front:-.42,back:.42},
    run: {side:-.45,front:-.45,back:.45}
  }
};
// 施法霸体：施法期间不被打断、不击退、不僵直（伤害照常结算）
window.GAME_CONFIG.solo.castSuperArmor={enabled:true};
// 悟空受伤反馈：白闪→红剪影、短震屏、短无敌；不再僵直打断玩家动作，只有轻微抖动
window.GAME_CONFIG.solo.heroHurt={stun:false,iframe:.45,flinch:.14,flinchPx:3,shake:{ms:150,amp:.006},flashWhite:.06};
// 闪避输入缓冲：冷却/僵直中按下的闪避在窗口内保留，一可用立即执行（不再被吞）
window.GAME_CONFIG.solo.dodge.buffer=.25;
// t127/t129：草书在 iPad 上难认 → 标题/房间名/角色名/菜单统一改用较好认的毛笔楷（Ma Shan Zheng），草书仅作缺字后备。
window.GAME_CONFIG.calliFontCursive='"LiuJianMaoCao","MaShanZheng",cursive';
window.GAME_CONFIG.calliFont='"MaShanZheng","LiuJianMaoCao",cursive';
// t129：小怪行走（程序化步态：每步弹跳/左右摆/落地压扁，帧随实际位移推进）；首领跃扑真实跳跃（蹲伏蓄力→抛物线腾空拉伸+影子缩小→落地压扁+尘墨爆开→收招）
window.GAME_CONFIG.enemyWalk={default:{bounce:4,tilt:5,squash:.07},imp:{bounce:5,tilt:6,squash:.08},zheng:{bounce:4,tilt:3,squash:.06},gudiao:{bounce:2,tilt:3,squash:.03},boss:{bounce:5,tilt:2.5,squash:.05}};
window.GAME_CONFIG.enemyLeapFx={crouch:.14,stretch:.16,landSquash:.24,landDur:.2,shadowShrink:.5};
// v11.2 重击：起跳蓄力用双手合握举过头顶姿势，砸中瞬间切到前伸收势姿势（静态关键帧切换，非骨骼）；挥击段握点更靠棍尾，减少棍尾穿身
window.GAME_CONFIG.poseArtV11.wukong.followThrough={heavy:{set:'normal',at:.35}};
(()=>{const S=window.GAME_CONFIG.staff.wukong.stages;S.light.gripV=.2;S.normal.gripV=.16;S.heavy.gripV=.12;window.GAME_CONFIG.staff.wukong.aim.stages.heavy.end=.8;})();
window.GAME_CONFIG.boss.leap.height=135;window.GAME_CONFIG.enemyLeapFx.tilt=14; // 跃扑腾空高度(世界px)、空中抬头/俯冲倾角(度)
// t130/t131 配乐（用户指定）：选角=开场二胡曲 Samurai Nights；首领=原创合成鼓点(主导) + Dark Ambience Loop(低音量氛围底)，去掉 Samurai Nights；
// 普通房间静音；结算(胜/败)=开场二胡曲中按拍切出的 32 拍(15.14s)循环片段，尾部 0.3s 等功率交叉淡入开头，m4a 优先、mp3 后备。
(()=>{const A=window.GAME_CONFIG.audio,SN=A.credits[0],DA=A.credits[1];
  A.bgm.boss={fade:2.2,synth:'drums',drumLevel:1.1,drumFade:2.2,layers:[{url:'assets/audio/dark-ambience-loop-qubodup.mp3',volume:.3,...DA}]};
  A.bgm.result={fade:1.8,layers:[{url:'assets/audio/samurai-nights-erhu-result-loop.mp3',m4a:'assets/audio/samurai-nights-erhu-result-loop.m4a',loopSec:15.14,volume:.7,...SN}]};
  A.resultDelay=1.1; // 胜负提示音后多久淡入结算曲(秒)
})();
// t132/t133：用户要求以出场(=待机)时的大小为基准。v11.1 实测：出场/待机 94.8px，跑动 132px（+39%）。
// v11.2：所有 v11 姿势按逐帧 fit 缩放（manifest frames[].fit），直立帧(跑动/轻击/定身法)站高 = 待机 435 美术单位；举手/下蹲/跳跃帧用同一头部比例。
// 新画的待机/重击/选角立绘等待用户确认，暂不启用（art-direction/wukong-v11-preview/pending-v11.2/）。
Object.assign(window.GAME_CONFIG.poseArtV11.wukong,{idle:null,attack:{light:'light',normal:'normal',heavy:'heavy'}});

// Spawn-reference alpha height normalization covers attacks, dodge and all casts too.
window.GAME_CONFIG.poseArtV11.wukong.normalizeAllHeights=true;
