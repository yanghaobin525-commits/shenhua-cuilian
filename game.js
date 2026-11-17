/* 《神话·淬炼》 —— 中国神话竞技场 MVP
 * 引擎：Phaser 3（lib/phaser.min.js，MIT 协议，https://phaser.io）
 * 本文件全部为原创代码。数值全部在 config.js。
 */
(function () {
'use strict';
const C = window.GAME_CONFIG;
const FONT = C.fontFamily;
const R=window.ShenhuaRunSystem;
// 可独立移除音频模块；界面改版只需复用相同 API。
const AUD = window.ShenhuaAudio || { unlock(){}, play(){}, setMode(){}, pause(){}, resume(){} };
const DPR = Math.min(window.devicePixelRatio || 1, C.maxPixelRatio || 2);
const ROLE_LABEL = { tank: '肉盾', melee: '近战输出', ranged: '远程输出', healer: '治疗' };
const PM = Phaser.Math;
const QS = new URLSearchParams(location.search);   // 调试参数：?hero=erlang&wave=4&god=1
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const angDiff = (a, b) => Math.abs(PM.Angle.Wrap(a - b));
function viewSize() { return { w: Math.round(window.innerWidth * DPR), h: Math.round(window.innerHeight * DPR) }; }
function U(scene) { return Math.min(scene.scale.width / 1180, scene.scale.height / 820); }
function txt(scene, x, y, s, size, color, extra) {
  return scene.add.text(x, y, s, Object.assign({ fontFamily: FONT, fontSize: Math.round(size) + 'px', color: color || '#efe3c8' }, extra || {}));
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
function autoTeam(playerKey) {
  if (C.solo) return [C.solo.hero];
  const all = Object.keys(C.heroes);
  const team = [playerKey];
  const rest = shuffle(all.filter(k => k !== playerKey));
  for (let i = 1; i < C.teamSize; i++) {
    if (rest.length) team.push(rest.shift());
    else if (C.allowDuplicateHeroes) team.push(all[(Math.random() * all.length) | 0]);
    else team.push(null);
  }
  return team;
}

/* ======================= Boot：加载 + 程序化纹理 ======================= */
class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    window.CombatArt.preload(this);for(const [key,file]of [['mountain-far','far-panorama'],['mountain-mid','mid-ridge'],['mountain-top','top-stone']])this.load.image(key,'assets/scenery-mountain-v8/'+file+'.png?v='+C.releaseId);
    ['mob_zheng', 'mob_gudiao', 'mob_imp', 'boss_jiuying'].forEach(k => this.load.image(k, 'assets/sprites/' + k + '.png'));
    this.load.image('ground', 'assets/sprites/ground.jpg');
    const W = this.scale.width, H = this.scale.height, u = U(this);
    const bar = this.add.graphics();
    txt(this, W / 2, H / 2 - 40 * u, '《' + C.title + '》 载入中…', 30 * u).setOrigin(0.5);
    this.load.on('progress', p => { bar.clear(); bar.fillStyle(0xc0392b, 1).fillRect(W * 0.3, H / 2, W * 0.4 * p, 8 * u); });
  }
  create() {
    const missing = window.CombatArt.validate(this);
    if (missing.length) { this.children.removeAll(true); window.__artBlocked = missing; txt(this, this.scale.width/2, this.scale.height/2, '定稿战斗素材尚未齐备，未使用旧图替代。\n缺失或待核对 ' + missing.length + ' 项；素材齐备后再开放试玩。', 18*U(this), '#efe3c8', {wordWrap:{width:this.scale.width*.8}}).setOrigin(.5); return; }
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.clear(); g.lineStyle(4, 0x1a1210).lineBetween(2, 8, 40, 8); g.fillStyle(0xe8dcc0).fillTriangle(40, 2, 52, 8, 40, 14); g.lineStyle(2, 0x1a1210).strokeTriangle(40, 2, 52, 8, 40, 14);
    g.fillStyle(0xc0392b).fillTriangle(0, 3, 10, 8, 0, 13); g.generateTexture('arrow', 54, 16);
    g.clear(); g.fillStyle(0x9fb8ff, 0.35).fillCircle(16, 16, 16); g.fillStyle(0xe9f0ff).fillCircle(16, 16, 9); g.lineStyle(3, 0x1a1210).strokeCircle(16, 16, 9); g.generateTexture('moon', 32, 32);
    g.clear(); g.fillStyle(0xdfe6ea).fillTriangle(0, 6, 70, 14, 0, 22); g.fillStyle(0xf5c542).fillTriangle(0, 10, 30, 14, 0, 18); g.lineStyle(3, 0x1a1210).strokeTriangle(0, 6, 70, 14, 0, 22); g.generateTexture('blade', 72, 28);
    g.clear(); g.fillStyle(0x4a4f78).fillEllipse(16, 8, 30, 12); g.lineStyle(3, 0x120d0b).strokeEllipse(16, 8, 30, 12); g.generateTexture('feather', 34, 18);
    g.clear(); g.fillStyle(0xff7a2a).fillCircle(14, 14, 12); g.fillStyle(0xffe08a).fillCircle(12, 12, 5); g.lineStyle(3, 0x1a1210).strokeCircle(14, 14, 12); g.generateTexture('fireball', 28, 28);
    g.clear(); g.fillStyle(0xffffff).fillCircle(6, 6, 6); g.generateTexture('spark', 12, 12);
    const icon = (key, draw) => { g.clear(); g.fillStyle(0xf3e2b0, 0.25).fillCircle(40, 40, 38); g.lineStyle(4, 0x1a1210).strokeCircle(40, 40, 38); draw(); g.generateTexture(key, 80, 80); };
    icon('w_spear', () => { g.lineStyle(6, 0x1a1210).lineBetween(16, 64, 60, 20); g.lineStyle(3, 0x8b4513).lineBetween(16, 64, 60, 20); g.fillStyle(0xd4502a).fillTriangle(56, 14, 68, 12, 66, 24); g.lineStyle(2, 0x1a1210).strokeTriangle(56, 14, 68, 12, 66, 24); });
    icon('w_blade', () => { g.lineStyle(6, 0x1a1210).lineBetween(18, 62, 52, 28); g.lineStyle(3, 0x6b4a2a).lineBetween(18, 62, 52, 28); g.fillStyle(0xd8dee2).fillTriangle(46, 22, 66, 10, 58, 34); g.fillTriangle(48, 26, 60, 18, 62, 30); g.lineStyle(2, 0x1a1210).strokeTriangle(46, 22, 66, 10, 58, 34); });
    icon('w_bow', () => { g.lineStyle(7, 0x1a1210); g.beginPath(); g.arc(30, 40, 26, -1.2, 1.2); g.strokePath(); g.lineStyle(4, 0x6fa3a0); g.beginPath(); g.arc(30, 40, 26, -1.2, 1.2); g.strokePath(); g.lineStyle(2, 0x1a1210).lineBetween(39, 16, 39, 64); g.lineBetween(20, 40, 64, 40); });
    icon('w_staff', () => { g.lineStyle(6, 0x1a1210).lineBetween(26, 68, 46, 28); g.lineStyle(3, 0x3a2a40).lineBetween(26, 68, 46, 28); g.fillStyle(0xf1e6a8).fillCircle(50, 22, 13); g.fillStyle(0x3a3050).fillCircle(56, 18, 10); g.lineStyle(2, 0x1a1210).strokeCircle(50, 22, 13); });
    const cv = this.textures.createCanvas('vignette', 512, 512); const ctx = cv.getContext();
    const grd = ctx.createRadialGradient(256, 256, 120, 256, 256, 362);
    grd.addColorStop(0, 'rgba(10,6,4,0)'); grd.addColorStop(1, 'rgba(10,6,4,0.75)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 512, 512); cv.refresh();
    g.destroy();
    if (QS.get('hero') && C.heroes[QS.get('hero')]) { const k=C.solo?C.solo.hero:QS.get('hero'); this.scene.start('Battle', { hero: k, team: autoTeam(k).filter(Boolean) }); }
    else this.scene.start('Select');
  }
}

/* ======================= 选人界面（王者式横屏布局） ======================= */
class Select extends Phaser.Scene {
  constructor() { super('Select'); }
  create() {
    this.keys = C.solo ? C.solo.roster.slice() : Object.keys(C.heroes);
    this.sel = this.registry.get('lastHero') || this.keys[0]; if (!this.keys.includes(this.sel)) this.sel = this.keys[0];
    this.locked = false;
    this.build();
    this.scale.on('resize', this.build, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.build, this));
  }
  build() {
    this.children.removeAll(true); this.tweens.killAll(); this.input.removeAllListeners();
    const W = this.scale.width, H = this.scale.height, u = U(this);
    this.u = u;
    this.cameras.main.setSize(W, H);
    this.add.tileSprite(0, 0, W, H, 'ground').setOrigin(0).setTileScale(u * 1.4).setTint(0x8a7a6a);
    this.add.rectangle(0, 0, W, H, 0x120c0a, 0.55).setOrigin(0);
    this.add.image(W / 2, H / 2, 'vignette').setDisplaySize(W * 1.15, H * 1.25);
    txt(this, 28 * u, 18 * u, '《' + C.title + '》', 40 * u, '#f3e2b0', { stroke: '#1a1210', strokeThickness: 8 * u, fontStyle: 'bold' });
    txt(this, 32 * u, 76 * u, C.solo ? '单人试炼 · 当前开放孙悟空（其余英雄后续开放）' : '选择你的英雄 · 其余队友由 AI 补位', 17 * u, '#cbb994');
    // 顶部队伍槽位
    this.slotObjs = [];
    const n = C.teamSize, sw = 80 * u, gap = 14 * u, sx = W - 40 * u - n * sw - (n - 1) * gap + sw / 2, sy = 54 * u;
    for (let i = 0; i < n; i++) {
      const x = sx + i * (sw + gap);
      const bg = this.add.rectangle(x, sy, sw, sw, 0x1d1512, 0.9).setStrokeStyle(4 * u, i === 0 ? 0xf5c542 : 0x5a4a3a);
      const img = this.add.image(x, sy, 'select_nezha').setVisible(false);
      const lab = txt(this, x, sy + sw / 2 + 13 * u, i === 0 ? '你' : 'AI', 15 * u, i === 0 ? '#f5c542' : '#9c8c74').setOrigin(0.5);
      const q = txt(this, x, sy, i === 0 ? '' : '?', 30 * u, '#5a4a3a').setOrigin(0.5);
      this.slotObjs.push({ bg, img, lab, q, x, y: sy, sw });
    }
    // 中间大立绘
    this.splash = this.add.graphics();
    this.portrait = this.add.image(W * 0.3, H * 0.5, 'select_'+this.sel);
    // 右侧信息面板
    const px = W * 0.55, py = H * 0.2, pw = W * 0.42;
    this.add.rectangle(px - 18 * u, py - 14 * u, pw, 430 * u, 0x140e0c, 0.75).setOrigin(0).setStrokeStyle(3 * u, 0x3d2f25);
    const wrap = { wordWrap: { width: pw - 44 * u, useAdvancedWrap: true }, lineSpacing: 6 * u };
    this.info = {
      name: txt(this, px, py, '', 46 * u, '#f3e2b0', { stroke: '#1a1210', strokeThickness: 6 * u, fontStyle: 'bold' }),
      title: txt(this, px, py + 62 * u, '', 19 * u, '#cbb994'),
      tags: this.add.container(px, py + 104 * u),
      talent: txt(this, px, py + 146 * u, '', 18 * u, '#efe3c8', wrap),
      weapon: txt(this, px, py + 236 * u, '', 18 * u, '#efe3c8', wrap),
      stats: this.add.graphics(), statsTxt: [], px, py, pw,
    };
    // 底部英雄头像卡（可横向滑动）
    const ch = 124 * u, cw = 116 * u, stripY = H - ch / 2 - 22 * u, stripX0 = 30 * u, stripW = W - 380 * u;
    this.add.rectangle(stripX0 - 10 * u, stripY - ch / 2 - 12 * u, stripW + 20 * u, ch + 24 * u, 0x0e0a08, 0.75).setOrigin(0).setStrokeStyle(2 * u, 0x3d2f25);
    this.strip = this.add.container(stripX0, stripY);
    const mg = this.make.graphics({ add: false }); mg.fillStyle(0xffffff).fillRect(stripX0 - 8 * u, stripY - ch / 2 - 12 * u, stripW + 16 * u, ch + 24 * u);
    this.strip.setMask(mg.createGeometryMask());
    this.cards = {}; this.cw = cw;
    this.keys.forEach((k, i) => {
      const c = this.add.container(cw / 2 + 6 * u + i * (cw + 16 * u), 0);
      const bg = this.add.rectangle(0, 0, cw, ch, 0x241a15).setStrokeStyle(4 * u, 0x5a4a3a);
      const im = this.add.image(0, -10 * u, 'select_'+k); im.setScale((ch * 0.72) / im.height);
      const nm = txt(this, 0, ch / 2 - 17 * u, C.heroes[k].name, 18 * u, '#efe3c8', { stroke: '#000', strokeThickness: 4 * u }).setOrigin(0.5);
      c.add([bg, im, nm]); c.bg = bg;
      this.strip.add(c); this.cards[k] = c;
    });
    this.stripBase = stripX0;
    this.stripMin = Math.min(0, stripW - (this.keys.length * (cw + 16 * u) + 12 * u));
    const zone = this.add.zone(stripX0, stripY - ch / 2 - 10 * u, stripW, ch + 20 * u).setOrigin(0).setInteractive();
    let down = null;
    zone.on('pointerdown', p => { down = { id: p.id, x: p.x, sx: this.strip.x, moved: false }; });
    this.input.on('pointermove', p => { if (!down || p.id !== down.id) return; const dx = p.x - down.x; if (Math.abs(dx) > 12 * u) down.moved = true; if (down.moved) this.strip.x = PM.Clamp(down.sx + dx, this.stripBase + this.stripMin, this.stripBase); });
    this.input.on('pointerup', p => {
      if (down && p.id === down.id && !down.moved) {
        const lx = p.x - this.strip.x, ly = p.y - stripY;
        if (Math.abs(ly) < ch / 2 + 10 * u) for (const k of this.keys) if (Math.abs(lx - this.cards[k].x) < cw / 2 + 6 * u) this.pick(k);
      }
      down = null;
    });
    // 右下「确认出战」
    const bx = W - 175 * u, by = H - 84 * u;
    const btn = this.add.container(bx, by);
    const bbg = this.add.rectangle(0, 0, 300 * u, 112 * u, 0xa8321e).setStrokeStyle(6 * u, 0x1a1210);
    const bdeco = this.add.rectangle(0, 0, 278 * u, 90 * u).setStrokeStyle(2 * u, 0xf5c542, 0.8);
    this.btnTxt = txt(this, 0, 0, '开局设置', 38 * u, '#fff4d6', { stroke: '#1a1210', strokeThickness: 6 * u, fontStyle: 'bold' }).setOrigin(0.5);
    btn.add([bbg, bdeco, this.btnTxt]); btn.setSize(300 * u, 112 * u).setInteractive();
    btn.on('pointerdown', () => btn.setScale(0.94));
    btn.on('pointerout', () => btn.setScale(1));
    btn.on('pointerup', () => { btn.setScale(1); this.confirm(); });
    this.tweens.add({ targets: bdeco, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });
    this.pick(this.sel, true);
    this.input.keyboard.removeAllListeners();
    this.input.keyboard.on('keydown-ENTER', () => this.confirm());
    this.input.keyboard.on('keydown-SPACE', () => this.confirm());
    this.input.keyboard.on('keydown-RIGHT', () => this.pick(this.keys[(this.keys.indexOf(this.sel) + 1) % this.keys.length]));
    this.input.keyboard.on('keydown-LEFT', () => this.pick(this.keys[(this.keys.indexOf(this.sel) + this.keys.length - 1) % this.keys.length]));
  }
  pick(k, instant) {
    if (this.locked) return;
    this.sel = k;
    const u = this.u, W = this.scale.width, H = this.scale.height, h = C.heroes[k], w = C.weapons[h.weapon];
    for (const kk of this.keys) {
      const c = this.cards[kk], on = kk === k;
      c.bg.setStrokeStyle((on ? 7 : 4) * u, on ? 0xf5c542 : 0x5a4a3a).setFillStyle(on ? 0x5a2a18 : 0x241a15);
      this.tweens.add({ targets: c, scale: on ? 1.1 : 1, duration: 180, ease: 'Back.Out' });
    }
    const cx = W * 0.3, cy = H * 0.5;
    this.portrait.setTexture('select_'+k);
    const target = (H * 0.56) / this.portrait.height;
    this.tweens.killTweensOf(this.portrait);
    this.portrait.setScale(target * 0.8).setAlpha(0.2).setPosition(cx, cy);
    this.tweens.add({ targets: this.portrait, scale: target, alpha: 1, duration: instant ? 1 : 280, ease: 'Back.Out' });
    this.tweens.add({ targets: this.portrait, y: cy - 10 * u, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 300 });
    this.splash.clear();
    this.splash.fillStyle(w.color, 0.2).fillCircle(cx, cy, H * 0.3);
    this.splash.fillStyle(0x0a0605, 0.35).fillCircle(cx + 22 * u, cy + 24 * u, H * 0.24);
    this.splash.lineStyle(7 * u, 0x1a1210, 0.85).strokeCircle(cx, cy, H * 0.3);
    this.splash.lineStyle(2 * u, 0xf5c542, 0.5).strokeCircle(cx, cy, H * 0.3 - 10 * u);
    const I = this.info;
    I.name.setText(h.name); I.title.setText('称号 · ' + h.title);
    I.tags.removeAll(true);
    let tx = 0;
    h.tags.concat(['武器：' + ROLE_LABEL[w.role]]).forEach((t, i) => {
      const tt = txt(this, tx + 12 * u, 0, t, 16 * u, '#fff4d6');
      const r = this.add.rectangle(tx, -4 * u, tt.width + 24 * u, 30 * u, i < h.tags.length ? 0x8c2a1a : 0x2f4a48).setOrigin(0).setStrokeStyle(2 * u, 0x1a1210);
      I.tags.add([r, tt]); tx += tt.width + 34 * u;
    });
    I.talent.setText('【被动天赋 · ' + h.talent.name + '】\n' + h.talent.desc);
    I.weapon.setText(C.solo ? '【' + w.name + '】三段普攻 · 闪避（无敌帧）\n技能：' + [w.skill1,w.skill2,w.skill3].filter(Boolean).map(x=>x.name).join(' / ') + '\n逐间清怪，三选一祝福，末间首领' : '【初始武器 · ' + w.name + '】\n普攻 / ' + w.skill1.name + '\n波次间会掉落新武器，拾取即可改变定位');
    I.stats.clear(); I.statsTxt.forEach(t => t.destroy()); I.statsTxt = [];
    [['生命', h.hp / 1000], ['移速', h.speed / 280], ['减伤', h.armor / 0.3], ['输出', h.damageMul * (1 + h.critChance) / 1.6]].forEach((s, i) => {
      const y = I.py + 362 * u + Math.floor(i / 2) * 30 * u, x = I.px + (i % 2) * (I.pw / 2 - 10 * u), bw = I.pw / 2 - 100 * u;
      I.statsTxt.push(txt(this, x, y - 11 * u, s[0], 15 * u, '#cbb994'));
      I.stats.fillStyle(0x2a201a).fillRect(x + 44 * u, y - 4 * u, bw, 10 * u);
      I.stats.fillStyle(0xc9a227).fillRect(x + 44 * u, y - 4 * u, bw * PM.Clamp(s[1], 0.08, 1), 10 * u);
    });
    this.setSlot(0, k);
  }
  setSlot(i, k) {
    const s = this.slotObjs[i]; if (!s) return;
    if (k) { s.img.setTexture('select_'+k).setVisible(true); s.img.setScale((s.sw * 0.9) / s.img.height); s.q.setText(''); }
    else { s.img.setVisible(false); s.q.setText(i === 0 ? '' : '虚位').setFontSize(Math.round(18 * this.u)); }
  }
  confirm(){if(this.locked)return;window.RunUI.openSettings(settings=>this.launchRun(settings));}
  launchRun(settings) {
    if (this.locked) return; this.locked = true;
    AUD.unlock(); // Safari：在确认按钮/回车的用户手势内同步解锁
    AUD.play('pickup');
    this.registry.set('lastHero', this.sel);
    const team = autoTeam(this.sel);
    if (C.solo) { this.btnTxt.setText('入阵…'); this.time.delayedCall(350, () => this.scene.start('Battle', { hero: this.sel, team, settings })); return; }
    this.btnTxt.setText('AI 补位中…').setFontSize(Math.round(30 * this.u));
    team.forEach((k, i) => {
      if (i === 0) return;
      this.time.delayedCall(240 * i, () => {
        this.setSlot(i, k);
        const s = this.slotObjs[i];
        s.lab.setText(k ? 'AI·' + C.heroes[k].name : '虚位以待');
        s.bg.setStrokeStyle(4 * this.u, k ? 0x6fa3a0 : 0x3a2e26);
        this.tweens.add({ targets: [s.bg, s.img], scaleX: '*=1.15', scaleY: '*=1.15', duration: 120, yoyo: true });
      });
    });
    this.time.delayedCall(240 * team.length + 800, () => this.scene.start('Battle', { hero: this.sel, team: team.filter(Boolean), settings }));
  }
}

/* ======================= 战斗场景 ======================= */
class Battle extends Phaser.Scene {
  constructor() { super('Battle'); }
  create(data) {
    AUD.resume('manual');AUD.resume('reward');this.time.paused=false; AUD.setMode('arena');
    const A = C.arena;
    this.bus = new Phaser.Events.EventEmitter();
    this.heroKey = data.hero; this.teamKeys = data.team && data.team.length ? data.team : autoTeam(data.hero).filter(Boolean);
    this.god = QS.get('god') === '1';
    this.heroes = []; this.enemies = []; this.projs = []; this.teles = []; this.timers = []; this.drops = []; this.floats = [];this.viewFx=[];
    this.boss = null; this.over = false; this.elapsed = 0;this.ledgerMismatches=0;this.absoluteWave=0;this.settlement=null;
    this.stats = { kills: 0, dmg: 0, heal: 0, evades: 0, dodges: 0, finishers: 0 };this.hitstopT=0;this.lockG=null;this.lockTarget=null;this.ghostKeys=new Set();this.ghostSeq=0;
    this.ctrl = { mx: 0, my: 0, atk: false, s1: false, s2: false, s3: false, dodge: false, rescue: false };
    this.view = new window.ArenaView(C.view25d, A);
    this.view.build(this);
    this.teleG = this.add.graphics().setDepth(2);
    this.footG = this.add.graphics().setDepth(3);
    this.barG = this.add.graphics().setDepth(900000);
    const P = (tint, extra) => {
      let emissionZ=0;const emitter=this.add.particles(0,0,'spark',Object.assign({speed:{min:40,max:220},scale:{start:1.4,end:0},lifespan:500,tint,emitting:false,emitCallback:p=>{p.worldZ=emissionZ;const v=this.view.vector(p.velocityX,p.velocityY);p.velocityX=v.x;p.velocityY=v.y;}},extra||{})).setDepth(700000);
      const burst=emitter.explode.bind(emitter);emitter.explode=(n,x,y,z=0)=>{emissionZ=z;const p=this.view.project(x,y,z);burst(n,p.x,p.y);return emitter;};return emitter;
    };
    this.pInk = P(0x150f0d, { speed: { min: 60, max: 260 } });
    this.pFire = P([0xff5a1f, 0xffb43a, 0xc0392b], { blendMode: 'ADD', lifespan: 450 });
    this.pMoon=P([0x9ac8c3,0x9fb8d2,0xd4dfc9],{blendMode:'ADD',lifespan:650,speed:{min:25,max:110},scale:{start:.55,end:0}});
    this.pWater = P([0x4aa3df, 0x9ad0f5]);
    this.pDust=P([0xcfc4a8,0x8f8670,0xe6dcc4],{lifespan:620,speed:{min:40,max:170},scale:{start:1.1,end:0},alpha:{start:.75,end:0}});
    this.pTrail=P([0xc8d9e8,0xf2e8c9],{lifespan:160,scale:{start:.28,end:0},speed:{min:0,max:16},blendMode:'ADD'});
    const cx = A.width / 2, cy = A.height / 2 - 80;
    this.teamKeys.forEach((k, i) => {
      const a = (i / this.teamKeys.length) * Math.PI * 2 + Math.PI / 2;
      this.heroes.push(this.makeHero(k, cx + Math.cos(a) * 90, cy + Math.sin(a) * 60, i === 0));
    });
    this.player = this.heroes[0];
    const initialFoot=this.view.project(this.player.x,this.player.y);
    this.camTarget = this.add.zone(initialFoot.x,initialFoot.y-C.view25d.cameraLift,1,1);
    const cam = this.cameras.main;
    cam.setBounds(0,0,this.view.width,this.view.height); cam.startFollow(this.camTarget, true, 0.12, 0.12);
    this.fitCam();
    this.scale.on('resize', this.fitCam, this);
    this.events.once('shutdown', () => { for(const k of this.ghostKeys)if(this.textures.exists(k))this.textures.remove(k);this.scale.off('resize', this.fitCam, this); this.bus.removeAllListeners(); this.input.keyboard.removeAllListeners(); });
    // 键盘（调试用）：WASD/方向键移动，J/空格 普攻，K 主动，Q/E 左右转镜头，R 按住救助
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,J,K,L,U,I,Q,E,R,SPACE,SHIFT');
    this.input.keyboard.removeAllListeners();
    this.input.keyboard.on('keydown-J',()=>this.player.combo.request(this.elapsed));this.input.keyboard.on('keydown-SPACE',()=>this.player.combo.request(this.elapsed));
    this.input.keyboard.on('keydown-K',()=>this.ctrl.s1=true);this.input.keyboard.on('keydown-U',()=>this.ctrl.s2=true);this.input.keyboard.on('keydown-I',()=>this.ctrl.s3=true);this.input.keyboard.on('keydown-L',()=>this.ctrl.dodge=true);this.input.keyboard.on('keydown-SHIFT',()=>this.ctrl.dodge=true);

    this.settings=R.normalizeSettings(data.settings||window.RunUI.loadSettings());this.enemySequence=0;this.eventSequence=0;this.runActive=false;
    this.heroes.forEach((h,i)=>h.runId='hero-'+i);
    this.debugWaveOffset=QS.has('wave')?PM.Clamp((parseInt(QS.get('wave'),10)||1)-1,0,C.waves.length-1):0;
    this.run=R.createRun({settings:this.settings,waves:C.waves.slice(this.debugWaveOffset),team:this.heroes.map(h=>({id:h.runId,heroId:h.key,name:h.def.name,isPlayer:h.isPlayer,maxHp:h.maxHp,canHeal:C.weapons[h.weapon].role==='healer'})),now:()=>this.elapsed*1000,...(QS.has('seed')&&!data.restart?{seed:QS.get('seed')}:{})});
    this.buildStats=this.run.getBuild();
    this.waveIdx = QS.get('wave') ? PM.Clamp(parseInt(QS.get('wave'), 10) - 2, -1, C.waves.length - 2) : -1;
    this.phase = 'break'; this.breakT = C.firstWaveDelay; this.spawnQ = []; this.spawnT = 0;
    this.scene.launch('HUD');
    window.__battle = this;
  }
  fitCam() {
    const cam = this.cameras.main; cam.setSize(this.scale.width, this.scale.height);
    cam.setZoom(Math.min(this.scale.width/C.view25d.viewWidth,this.scale.height/C.view25d.viewHeight)*(C.view25d.zoomScale||1));
  }
  rotateCamera(sign){if(C.view25d.fixedCamera)return;if(!this.over&&this.phase!=='reward')this.view.turn(sign);}
  screenToWorld(x,y) { const p=this.cameras.main.getWorldPoint(x,y);return this.view.unproject(p.x,p.y); }
  worldToScreen(x,y,z=0) {const p=this.view.project(x,y,z),c=this.cameras.main;const q=c.matrix.transformPoint(p.x,p.y),co=Math.cos(c.rotation),si=Math.sin(c.rotation);return {x:q.x-(c.scrollX*co-c.scrollY*si)*c.zoomX,y:q.y-(c.scrollX*si+c.scrollY*co)*c.zoomY};}
  /* ---------- 单位 ---------- */
  makeUnit(def, team, x, y) {
    const tex = this.textures.get(def.sprite).getSourceImage();
    const base = def.size / tex.height;
    const foot=this.view.project(x,y);
    const shadow=this.add.graphics().setDepth(1.5).setPosition(foot.x,foot.y);shadow.fillStyle(0x0c1512,.34).fillPoints(this.view.circle(0,0,def.size*.35,def.size*.35).map(p=>({x:p.x-this.view.ox,y:p.y-this.view.oy})),true);
    const spr = this.add.image(foot.x, foot.y, def.sprite).setOrigin(0.5, 0.92).setScale(base);
    return { def, team, x, y, spr, shadow, base, r: def.size * 0.3, hp: def.hp, maxHp: def.hp, faceAng: 0, native: def.nativeFacing || 1, t: Math.random() * 10,
      moving: false, slowT: 0, slowMul: 1, flashT: 0, popT: 0, dead: false, cd: { attack: 0, skill1: 0, skill2: 0, skill3: 0, dodge: 0 }, tauntT: 0, tauntBy: null, shieldT: 0, target: null, retargetT: 0, kb: null };
  }
  makeHero(key, x, y, isPlayer) {
    const h = this.makeUnit(Object.assign({}, C.heroes[key], {sprite:'v6_'+key+'_front'}), 'hero', x, y);
    h.key = key; h.isPlayer = isPlayer; h.weapon = C.heroes[key].weapon;   // 攻击方式完全来自武器
    if(isPlayer)h.combo=new window.PlayerCombo(C.combo);h.art = new window.CombatArt(this,h);
    return h;
  }
  makeEnemy(key, x, y) {
    const e = this.makeUnit(this.run?this.run.scaleEnemy(C.enemies[key]):C.enemies[key], 'enemy', x, y);e.runId='enemy-'+(++this.enemySequence);if(this.runActive)this.run.registerEnemy({id:e.runId,maxHp:e.maxHp});
    e.key=key;e.enemyArt=new window.EnemyArt(this,e);e.cd.attack=Math.random();e.pounceCD=2+Math.random();
    e.spr.setScale(0.01); this.tweens.add({ targets: e.spr, scale: e.base, duration: 300, ease: 'Back.Out' });
    this.pInk.explode(14, x, y);
    this.enemies.push(e); return e;
  }
  spawnBoss() {
    const A = C.arena;
    const b = this.makeUnit(this.run?this.run.scaleEnemy(C.boss):C.boss, 'enemy', A.width / 2, A.height / 2 - 300);b.runId='enemy-'+(++this.enemySequence);if(this.runActive)this.run.registerEnemy({id:b.runId,maxHp:b.maxHp});
    b.key=C.boss.sprite==='boss_jiuying'?'boss':'zheng';b.isBoss=true;b.enemyArt=new window.EnemyArt(this,b); b.r = C.boss.size * 0.30; b.phase = 1;
    b.cdClaw = .8; b.cdLunge = 2.2; b.cdLeap = 4; b.casting = 0;
    this.enemies.push(b); this.boss = b;
    AUD.setMode('boss'); AUD.play('boss');
    this.cameras.main.shake(500, 0.008);
    this.bus.emit('banner', C.boss.name + '现身！', '伏身即扑：看准红色预警，闪避穿过');
  }
  W(h) {const w=C.weapons[h.weapon],m=this.buildStats?.cooldownMultiplier||1;if(m===1)return w;const o={...w,attack:{...w.attack,cooldown:w.attack.cooldown*m}};for(const k of['skill1','skill2','skill3'])if(w[k])o[k]={...w[k],cooldown:w[k].cooldown*m};return o;}
  applyRunBuild(build,sync=true){this.buildStats=build;for(const h of this.heroes){const base=C.heroes[h.key];h.def={...base,sprite:'v6_'+h.key+'_front',damageMul:base.damageMul*build.damageMultiplier,healMul:base.healMul*build.healingMultiplier,speed:base.speed*build.speedMultiplier,armor:Math.min(.8,base.armor+build.armorAdd),regen:base.regen+build.regenAdd,critChance:Math.min(.95,base.critChance+build.critChanceAdd)};h.maxHp=Math.round(base.hp*build.maxHpMultiplier);h.hp=Math.min(h.maxHp,h.hp);if(sync)this.run.syncHeroHP(h.runId,h.hp,h.maxHp);}}
  recordDamage(src,t,amount){if(!this.runActive||!t.runId)return;const response=this.run.recordDamage({eventId:'event-'+(++this.eventSequence),sourceId:src?.runId,targetId:t.runId,hpBefore:t.hp+amount,hpAfter:t.hp});if(Math.abs(response.actual-amount)>1e-5)this.ledgerMismatches=(this.ledgerMismatches||0)+1;}
  recordHeal(src,t,amount,kind='combat'){if(!t.runId)return;if(!this.runActive){if(this.run&&!this.over&&t.team==='hero')this.run.syncHeroHP(t.runId,t.hp,t.maxHp);return;}const response=this.run.recordHeal({eventId:'event-'+(++this.eventSequence),sourceId:src?.runId,targetId:t.runId,hpBefore:t.hp-amount,hpAfter:t.hp,kind});if(Math.abs(response.actual-amount)>1e-5)this.ledgerMismatches=(this.ledgerMismatches||0)+1;}
  recordRescue(h,t){if(this.runActive)this.run.recordRevive({sourceId:h.runId,targetId:t.runId,token:t.downToken,hpAfter:t.hp,completed:true});}

  /* ---------- 帧循环 ---------- */
  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    this.view.update(dt);
    if(this.phase==='reward')return;
    if (this.over) { this.syncVisuals(dt); return; }
    if (this.hitstopT > 0) { this.hitstopT -= dt; this.syncVisuals(0); return; }
    this.elapsed += dt;
    this.updateDowned(dt);
    this.updatePlayer(dt);
    for (const h of this.heroes) if (!h.isPlayer) this.updateHeroAI(h, dt);
    for (const h of this.heroes) this.tickUnit(h, dt);
    for (const e of this.enemies) { this.tickUnit(e, dt); if (e.isBoss) this.updateBoss(e, dt); else this.updateEnemy(e, dt); }
    this.updateProjs(dt);
    this.updateTeles(dt);
    this.separate();
    this.updateDrops(dt);
    this.updateWaves(dt);
    this.syncVisuals(dt);
    this.checkEnd();
  }
  tickUnit(u, dt) {
    if (u.dead) return;
    u.stunT=Math.max(0,(u.stunT||0)-dt);u.iframeT=Math.max(0,(u.iframeT||0)-dt);u.hitGuardT=Math.max(0,(u.hitGuardT||0)-dt);
    if(u.clock&&!u.clock.done){const clock=u.clock;clock.update(dt);u.actionT=clock.remaining;u.actionPhase=clock.phase;}
    for (const k in u.cd) u.cd[k] = Math.max(0, u.cd[k] - dt);
    if (u.slowT > 0) { u.slowT -= dt; if (u.slowT <= 0) u.slowMul = 1; }
    if (u.tauntT > 0) u.tauntT -= dt;
    if (u.shieldT > 0) u.shieldT -= dt;
    if (u.flashT > 0) u.flashT -= dt;
    if (u.popT > 0) u.popT -= dt;
    if (u.actionT > 0&&!u.clock) u.actionT = Math.max(0,u.actionT-dt);
    if(u.team==='hero'&&u.def.regen&&u.hp<u.maxHp){const before=u.hp;u.hp=Math.min(u.maxHp,u.hp+u.def.regen*dt);this.recordHeal(null,u,u.hp-before,'regen');}
    if (u.kb) { u.x += u.kb.vx * dt; u.y += u.kb.vy * dt; u.kb.t -= dt; if (u.kb.t <= 0) u.kb = null; }
  }
  moveUnit(u, dx, dy, speed, dt) {
    if(u.stunT>0)return;
    if(u.clock&&!u.clock.done)speed*=u.clock.timing.moveScale;
    const l = Math.hypot(dx, dy); if (l < 0.001) return;
    const s = speed * (u.slowMul || 1) * dt * Math.min(1, l);
    u.x += dx / l * s; u.y += dy / l * s; u.moving = true; u.faceAng = Math.atan2(dy, dx);
  }
  alive(list) { return list.filter(u => !u.dead); }
  nearest(list, p, maxD) { let best = null, bd = maxD || 1e9; for (const u of list) { if (u.dead) continue; const d = dist(p, u) - u.r; if (d < bd) { bd = d; best = u; } } return best; }
  nearestDowned(h,r=C.rescue.radius){return this.heroes.filter(t=>t.downed&&t!==h&&dist(h,t)<=r).sort((a,b)=>dist(h,a)-dist(h,b))[0]||null;}
  updateDowned(dt){for(const h of this.heroes)if(h.downed){h.bleedT=Math.max(0,h.bleedT-dt);if(!h.rescueActive)h.rescueProgress=Math.max(0,(h.rescueProgress||0)-dt*.3);h.rescueActive=false;if(h.bleedT<=0){h.downed=false;h.rescueBy=null;}}}
  attemptRescue(h,t,dt){if(!t||!t.downed||h.dead||h.stunT>0||dist(h,t)>C.rescue.radius)return false;if(t.rescueBy&&t.rescueBy!==h.key&&this.elapsed-(t.lastRescueT||0)<.13)return false;this.cancelAction(h);h.rescuing=true;h.moving=false;t.rescueBy=h.key;t.lastRescueT=this.elapsed;t.rescueActive=true;t.rescueProgress=(t.rescueProgress||0)+dt;if(t.rescueProgress>=C.rescue.seconds){t.dead=false;t.downed=false;t.hp=t.maxHp*C.rescue.hpRatio;t.rescueProgress=0;t.spr.clearTint().setAlpha(1).setAngle(0);this.recordRescue?.(h,t);this.pMoon.explode(22,t.x,t.y,40);this.bus.emit('banner',h.def.name+' 救起 '+t.def.name,'救助完成 · 真实救援记入贡献');}return true;}
  /* ---------- 玩家操作 ---------- */
  updatePlayer(dt) {
    const h = this.player; h.moving = false;h.rescuing=false;
    if (h.dead) { this.ctrl.s1 = this.ctrl.s2 = this.ctrl.s3 = this.ctrl.dodge = false; return; }
    const k = this.keys; let mx = this.ctrl.mx, my = this.ctrl.my;
    if (k.A.isDown || k.LEFT.isDown) mx = -1; if (k.D.isDown || k.RIGHT.isDown) mx = 1;
    if (k.W.isDown || k.UP.isDown) my = -1; if (k.S.isDown || k.DOWN.isDown) my = 1;
    const input=this.view.input(mx,my);mx=input.x;my=input.y;
    this.ctrl.kx = mx; this.ctrl.ky = my;
    if(this.ctrl.dodge){this.ctrl.dodge=false;this.doDodge(h,mx,my);}
    this.updateLock(h);if(h.dodgeState){this.updateDodge(h,dt);return;}
    if(h.stunT>0)return;
    if(!C.solo&&(this.ctrl.rescue||k.R.isDown)&&this.attemptRescue(h,this.nearestDowned(h),dt))return;
    if (h.dash) this.updateDash(h, dt);
    else if (mx || my) this.moveUnit(h, mx, my, h.def.speed, dt);
    const w = this.W(h), want=['s1','s2','s3'].find(s=>this.ctrl[s]&&w['skill'+s[1]]&&h.cd['skill'+s[1]]<=0);
    if(want){if(!(h.clock&&!h.clock.done)){this.ctrl.s1=this.ctrl.s2=this.ctrl.s3=false;const sk='skill'+want[1],R=w[sk].lockRange;this.doSkill(h,sk,R?this.lockPick(h,R,this.inputDir()??h.faceAng):null);}}
    else{this.ctrl.s1=this.ctrl.s2=this.ctrl.s3=false;if(this.ctrl.atk||k.J.isDown||k.SPACE.isDown)h.combo.request(this.elapsed);if(h.combo.queued(this.elapsed)&&h.cd.attack<=0){const dir=this.inputDir()??h.faceAng,A=w.attack,t=A.kind==='melee'?this.lockPick(h,A.range+(C.solo?.lock?.meleeAssist??60),dir,PM.DegToRad(C.solo?.lock?.meleeCone??55)):this.lockPick(h,A.range,dir);let a=dir;if(t){const ta=ang(h,t);a=A.kind==='melee'?dir+PM.Angle.Wrap(ta-dir)*(C.solo?.lock?.meleeSnap??.75):ta;}this.doAttack(h,a);}}
    // Weapon afterimages ride the actual weapon sprite through the strike window.
    if(h.clock&&!h.clock.done&&h.action==='attack'){const c=h.clock,tm=c.timing;if(c.time>tm.windup*.5&&c.time<tm.windup+tm.active+.05&&(h.trailT=(h.trailT||0)-dt)<=0){h.trailT=C.feel.weaponGhostInterval;this.weaponGhost(h);}}
  }
  /* t100 目标锁定：范围内优先摇杆/朝向锥内的敌人（角度为主、距离为辅），锥内没有才取最近；防止远程/定点技能空放。 */
  lockPick(h,range,dir,cone=Math.PI*.42){let best=null,bs=1e9,near=null,nd=1e9;for(const e of this.enemies){if(e.dead)continue;const d=dist(h,e);if(d>range+e.r)continue;if(d<nd){nd=d;near=e;}if(dir!==undefined){const da=angDiff(ang(h,e),dir);if(da<=cone){const sc=da*260+d;if(sc<bs){bs=sc;best=e;}}}}return best||near;}
  inputDir(){const x=this.ctrl.kx,y=this.ctrl.ky;return (x||y)?Math.atan2(y,x):undefined;}
  updateLock(h){const w=this.W(h),R=C.solo?.lock,S=w.skill2;if(!R||h.dead){this.lockTarget=null;this.lockG?.setVisible(false);return;}const t=this.lockPick(h,R.range,this.inputDir()??h.faceAng);this.lockTarget=t;const g=this.lockG||(this.lockG=this.add.graphics());g.clear();if(!t){g.setVisible(false);return;}g.setVisible(true).setDepth(this.view.depth(t.x,t.y,40));const q=this.view.project(t.x,t.y,0),rx=t.r*1.15,ry=rx*C.view25d.yScale,sp=this.elapsed*3;g.clear();g.lineStyle(3,0xfff4cf,.9);for(let i=0;i<4;i++){const a0=sp+i*Math.PI/2,pts=[];for(let k=0;k<=8;k++){const a=a0+k*.09;pts.push({x:q.x+Math.cos(a)*rx,y:q.y+Math.sin(a)*ry});}g.strokePoints(pts,false);}const top=this.view.project(t.x,t.y,t.def.size*.95+6*Math.sin(this.elapsed*6));g.fillStyle(0xfff4cf,.95).fillTriangle(top.x-8,top.y-12,top.x+8,top.y-12,top.x,top.y).lineStyle(2,0x1a1210,.9).strokeTriangle(top.x-8,top.y-12,top.x+8,top.y-12,top.x,top.y);}
  doDodge(h,mx,my){const D=C.solo?.dodge;if(!D||h.dead||h.stunT>0||h.cd.dodge>0||h.dodgeState)return false;if(h.clock&&!h.clock.done)this.cancelAction(h);h.dash=null;const a=(mx||my)?Math.atan2(my,mx):h.faceAng;h.faceAng=a;h.dodgeState={a,t:0,dur:D.duration,speed:D.distance/D.duration,ghostT:0};h.iframeT=D.iframes;h.cd.dodge=D.cooldown;this.stats.dodges++;AUD.play('swing');return true;}
  updateDodge(h,dt){const S=h.dodgeState;S.t+=dt;const step=Math.min(dt,Math.max(0,S.dur-(S.t-dt)));h.x+=Math.cos(S.a)*S.speed*step;h.y+=Math.sin(S.a)*S.speed*step;h.moving=true;if((S.ghostT-=dt)<=0){S.ghostT=S.dur/C.solo.dodge.afterimages;this.ghost(h.spr,{snapshot:true,tint:0x9fd2ff,alpha:.5,duration:260});}if(S.t>=S.dur)h.dodgeState=null;}
  ghost(spr,o={}){if(!spr||!spr.active)return null;let key=spr.texture.key,tmp=null;if(o.snapshot){const src=spr.texture.getSourceImage(),cv=document.createElement('canvas');cv.width=src.width;cv.height=src.height;cv.getContext('2d').drawImage(src,0,0);tmp='ghost_'+(++this.ghostSeq);this.textures.addCanvas(tmp,cv);this.ghostKeys.add(tmp);key=tmp;}const g=this.add.image(spr.x,spr.y,key).setOrigin(spr.originX,spr.originY).setScale(spr.scaleX,spr.scaleY).setRotation(spr.rotation).setDepth(spr.depth-.05).setTintFill(o.tint||0xbfd6ff).setAlpha(o.alpha||.45).setBlendMode(Phaser.BlendModes.ADD);this.tweens.add({targets:g,alpha:0,duration:o.duration||220,onComplete:()=>{g.destroy();if(tmp){this.ghostKeys.delete(tmp);if(this.textures.exists(tmp))this.textures.remove(tmp);}}});return g;}
  weaponGhost(h){const w=h.art?.weapon;if(!w||!w.visible)return;const st=h.attackProfile?.step||1,S=C.feel.slash[st-1]||C.feel.slash[0];this.ghost(w,{tint:S.ghost,alpha:.5,duration:150});}
  /* ---------- 英雄 AI：打法由当前武器定位决定 ---------- */
  updateHeroAI(h, dt) {
    h.moving = false;h.rescuing=false;
    if (h.dead||h.stunT>0||(h.clock&&!h.clock.done)) return;
    const down=this.nearestDowned(h,500);if(down){const candidates=this.heroes.filter(a=>!a.dead&&!a.isPlayer&&!(a.stunT>0)).sort((a,b)=>dist(a,down)-dist(b,down));if(candidates[0]===h){if(dist(h,down)>C.rescue.radius*.85)this.moveUnit(h,down.x-h.x,down.y-h.y,h.def.speed,dt);else this.attemptRescue(h,down,dt);return;}}
    if (h.dash) { this.updateDash(h, dt); return; }
    const w = this.W(h), role = w.role, enemies = this.alive(this.enemies), allies = this.alive(this.heroes);
    for (const t of this.teles) if (t.team === 'enemy' && this.inTele(t, h)) { this.moveUnit(h, h.x - t.x, h.y - t.y, h.def.speed, dt); return; }   // 躲 Boss 预警
    const leader = this.player.dead ? allies[0] : this.player;
    if (!enemies.length) { if (leader && leader !== h && dist(h, leader) > C.ai.followDistance) this.moveUnit(h, leader.x - h.x, leader.y - h.y, h.def.speed, dt); return; }
    if (role === 'healer' && w.skill1.kind === 'heal' && h.cd.skill1 <= 0) {
      // 治疗：优先给最低血队友回血
      const low = allies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (low && low.hp / low.maxHp < C.ai.healThreshold) {
        if (dist(h, low) <= w.skill1.radius * 0.8) this.doSkill(h, 'skill1', low); else this.moveUnit(h, low.x - h.x, low.y - h.y, h.def.speed, dt);
        return;
      }
    }
    let target;
    if (role === 'tank') { const threat = enemies.filter(e => e.target && e.target !== h && !e.target.dead); target = this.nearest(threat.length ? threat : enemies, leader || h); }   // 肉盾：去拦追打队友的怪
    else target = this.nearest(enemies, h);
    if (!target) return;
    const d = dist(h, target) - target.r, A = w.attack;
    const near = enemies.filter(e => dist(e, h) < 230 + e.r).length;
    if (role === 'tank' || role === 'melee') {
      if (d > A.range * 0.8) this.moveUnit(h, target.x - h.x, target.y - h.y, h.def.speed, dt);
      for (const sk of ['skill1']) {
        const s = w[sk]; if (h.cd[sk] > 0) continue;
        if (s.kind === 'dash') { if (d > 140 && d < s.distance) this.doSkill(h, sk, target); }
        else if (s.kind === 'cleave') { if (d < s.length * 0.8) this.doSkill(h, sk, target); }
        else if ((near >= 2 || target.isBoss) && d < 150) this.doSkill(h, sk, target);
      }
    } else {
      const keep = role === 'healer' ? C.ai.healerKeep : C.ai.rangedKeep;
      if (d < keep - 70) this.moveUnit(h, h.x - target.x, h.y - target.y, h.def.speed, dt);
      else if (d > A.range - 30) this.moveUnit(h, target.x - h.x, target.y - h.y, h.def.speed, dt);
      else if (leader && leader !== h && dist(h, leader) > 450) this.moveUnit(h, leader.x - h.x, leader.y - h.y, h.def.speed * 0.6, dt);
      for (const sk of ['skill1']) {
        const s = w[sk]; if (h.cd[sk] > 0) continue;
        if (s.kind === 'heal') { if (allies.filter(a => a.hp / a.maxHp < 0.85 && dist(a, h) < s.radius).length >= 2) this.doSkill(h, sk, target); }
        else if (s.kind === 'frost') { if (d < s.range) this.doSkill(h, sk, this.clusterTarget(enemies, s.range, h) || target); }
        else if (s.kind === 'volley') { if (enemies.filter(e => dist(e, h) < 500).length >= 3 || target.isBoss) this.doSkill(h, sk, target); }
        else if (d < 520) this.doSkill(h, sk, target);
      }
    }
    if (h.cd.attack <= 0 && d <= A.range) this.doAttack(h, ang(h, target));
    if (!h.moving) h.faceAng = ang(h, target);
  }
  clusterTarget(enemies, range, from) {
    let best = null, bn = 0;
    for (const e of enemies) { if (dist(e, from) > range) continue; const n = enemies.filter(o => dist(o, e) < 160).length; if (n > bn) { bn = n; best = e; } }
    return best;
  }
  /* ---------- 普攻 / 技能（全部由武器定义） ---------- */
  cancelAction(h){if(h.motionAction?.kind==='pounce'){h.motionAction=null;h.leap=null;}if(h.combo)h.combo.reset();if(h.clock)h.clock.cancel();h.clock=null;h.actionT=0;h.actionPhase='idle';h.dash=null;}
  beginAction(h,kind,release){if(h.dead||h.stunT>0||(h.clock&&!h.clock.done))return false;const timing=kind==='attack'&&h.team==='hero'?{...C.combatWindows.attack,...(h.attackProfile||C.attackMotion[h.weapon])}:C.combatWindows[kind];h.action=kind==='attack'?'attack':'cast';h.clock=new window.ActionClock(kind,timing,()=>{if(!h.dead){if(h.art)h.art.update(0);release();}});h.actionDuration=h.clock.total;h.actionT=h.clock.total;h.actionPhase='windup';return true;}
  doAttack(h,a){
    if(h.cd.attack>0||h.clock&&!h.clock.done)return false;
    const w=this.W(h),A=w.attack,step=h.combo?h.combo.peek(this.elapsed,h.weapon):1,profile={...C.attackMotion[h.weapon],...(h.combo?C.combo.profiles[h.weapon][step-1]:{}),step,finisher:step===3};if(h.combo)profile.recovery=Math.max(profile.recovery,A.cooldown-profile.windup-profile.active);h.attackProfile=profile;
    if(!this.beginAction(h,'attack',()=>this.resolveAttack(h,h.faceAng,w)))return false;h.cd.attack=A.cooldown;h.faceAng=a;if(h.combo)h.combo.commit(this.elapsed,h.weapon,step,h.clock.total);AUD.play('swing',{ai:!h.isPlayer});return true;
  }
  resolveAttack(h,a,w){const A=w.attack;h.popT=.12;
    if (A.kind === 'melee') {
      const P=h.attackProfile||{},range=A.range*(P.rangeMul||1),arc=P.arcDeg||A.arc;let hits=0;for (const e of this.enemies) if (!e.dead && dist(h, e) <= range + e.r && angDiff(ang(h, e), a) <= PM.DegToRad(arc / 2) + 0.2) {this.hurt(e, A.damage*(P.damageMul||1), h);hits++;}
      if(hits&&h.isPlayer&&h.attackProfile?.finisher)this.stats.finishers++;
      this.weaponStrokeFx(h,a,range,arc,w.color);if(P.jump){this.cameras.main.shake(140,C.feel.shake*3);}
    } else this.fire(h, a, A.tex, A.projSpeed, A.damage, A.range, {});
  }
  doSkill(h,sk,target){if(!['skill1','skill2','skill3'].includes(sk)||!this.W(h)[sk])return;const w=this.W(h),S=w[sk];if(!this.beginAction(h,'cast',()=>this.resolveSkill(h,sk,target,w)))return;if(h.combo)h.combo.reset();h.cd[sk]=S.cooldown;if(target)h.faceAng=ang(h,target);}
  resolveSkill(h,sk,target,w){const S=w[sk];h.popT=.2;if(S.kind!=='heal')AUD.play('skill',{ai:!h.isPlayer});
    const aimT = target || (h.isPlayer&&C.solo?null:this.nearest(this.enemies, h, 700));
    const a = aimT ? ang(h, aimT) : h.faceAng;
    switch (S.kind) {
      case 'dash': {
        let da = a; if (h.isPlayer && (this.ctrl.kx || this.ctrl.ky)) da = Math.atan2(this.ctrl.ky, this.ctrl.kx);   // 玩家：按摇杆方向冲，否则冲向最近敌人
        h.dash = { a: da, t: 0.22, speed: S.distance / 0.22, hit: new Set(), dmg: S.damage }; h.faceAng = da; break;
      }
      case 'taunt': {
        for (const e of this.alive(this.enemies)) {
          const d = dist(h, e);
          if (d < S.radius + e.r) this.hurt(e, S.damage, h);
          if (d < S.radius * 1.6) { e.tauntT = S.tauntTime; e.tauntBy = h; e.target = h; }
        }
        h.shieldT = S.shieldTime; h.shieldReduce = S.shieldReduce;
        this.ringFx(h.x, h.y, S.radius, 0xc0392b); this.floatText(h.x, h.y, S.name + '！', '#ffcf6a', 30);
        break;
      }
      case 'spin': {
        for (const e of this.alive(this.enemies)) if (dist(h, e) < S.radius + e.r) this.hurt(e, S.damage, h,{skill:true});
        if(h.team==='hero'){for(let i=0;i<3;i++)this.time.delayedCall(i*45,()=>this.crescentFx(h.x,h.y,a+i*2.1,S.radius,300,{color:i===1?0xffd27a:0xffffff,thick:.28,life:240,sweep:110}));this.spinGhosts(h,S.radius);}
        else {this.ringFx(h.x, h.y, S.radius, 0xdfe6ea); this.slashFx(h.x, h.y, a, S.radius, 360, 0xdfe6ea);} break;
      }
      case 'slam': {
        const tgt=target&&!target.dead?target:null,reach=tgt?PM.Clamp(dist(h,tgt),60,S.lockRange||S.reach):S.reach,p={x:h.x+Math.cos(a)*reach,y:h.y+Math.sin(a)*reach};h.faceAng=a;
        for(const e of this.alive(this.enemies))if(dist(p,e)<S.radius+e.r){this.hurt(e,S.damage,h,{skill:true});if(!e.dead)e.stunT=Math.max(e.stunT||0,e.isBoss?.12:S.stun);}
        this.pillarFx(p.x,p.y);this.dustFx(p.x,p.y,S.radius*.8);this.crescentFx(p.x,p.y,a+Math.PI,S.radius*.75,150,{color:0xffffff,thick:.22,life:240,sweep:50,z:20});this.cameras.main.shake(220,.009);break;
      }
      case 'freeze': {
        for(const e of this.alive(this.enemies))if(dist(h,e)<S.radius+e.r){this.hurt(e,S.damage,h,{skill:true});if(!e.dead){e.stunT=Math.max(e.stunT||0,e.isBoss?S.bossStun:S.stun);e.frozenT=e.stunT;}}
        this.sealFx(h.x,h.y,S.radius);break;
      }
      case 'cleave': {
        const ca = Math.cos(a), sa = Math.sin(a); h.faceAng = a;
        for (const e of this.alive(this.enemies)) { const dx = e.x - h.x, dy = e.y - h.y, along = dx * ca + dy * sa, side = Math.abs(-dx * sa + dy * ca); if (along > -20 && along < S.length + e.r && side < S.width / 2 + e.r) this.hurt(e, S.damage, h); }
        const g=this.add.graphics().setDepth(3),origin={x:h.x,y:h.y},draw=()=>{const h=origin;g.clear().fillStyle(0xf5f0e0,.75);
        g.fillPoints([{ x: h.x - sa * S.width / 2, y: h.y + ca * S.width / 2 }, { x: h.x + ca * S.length - sa * 12, y: h.y + sa * S.length + ca * 12 }, { x: h.x + ca * S.length + sa * 12, y: h.y + sa * S.length - ca * 12 }, { x: h.x + sa * S.width / 2, y: h.y - ca * S.width / 2 }].map(p=>this.view.project(p.x,p.y)), true);
        g.lineStyle(5, 0x120c0a, 0.9).strokePoints([{ x: h.x - sa * S.width / 2, y: h.y + ca * S.width / 2 }, { x: h.x + ca * S.length, y: h.y + sa * S.length }, { x: h.x + sa * S.width / 2, y: h.y - ca * S.width / 2 }].map(p=>this.view.project(p.x,p.y)), false);
        };draw();this.viewFx.push({g,draw});this.tweens.add({ targets: g, alpha: 0, duration: 380, onComplete: () => g.destroy() }); this.cameras.main.shake(150, 0.004); break;
      }
      case 'pierce': this.fire(h, a, 'blade', S.projSpeed, S.damage, S.range, { pierce: true, scale: 1.4, r: 26 }); break;
      case 'volley': for (let i = 0; i < S.arrows; i++) this.fire(h, a + PM.DegToRad(-S.spread / 2 + S.spread * i / (S.arrows - 1)), 'arrow', 820, S.damage, 520, {}); break;
      case 'heal': {
        for (const al of this.alive(this.heroes)) if (dist(al, h) <= S.radius) this.healUnit(al, S.heal * (h.def.healMul || 1), h);
        this.healFieldFx(h.x,h.y,S.radius); this.pMoon.explode(40,h.x,h.y,40); break;
      }
      case 'frost': {
        const p = aimT && dist(h, aimT) < S.range ? { x: aimT.x, y: aimT.y } : { x: h.x + Math.cos(a) * 220, y: h.y + Math.sin(a) * 220 };
        for (const e of this.alive(this.enemies)) if (dist(p, e) < S.radius + e.r) this.hurt(e, S.damage, h, { slow: S.slow, slowTime: S.slowTime });
        this.ringFx(p.x, p.y, S.radius, 0x7fb6ff); this.pMoon.explode(30, p.x, p.y); break;
      }
    }
  }
  updateDash(h, dt) {
    const D = h.dash; D.t -= dt;
    h.x += Math.cos(D.a) * D.speed * dt; h.y += Math.sin(D.a) * D.speed * dt; h.moving = true;
    this.pFire.explode(3, h.x, h.y);
    for (const e of this.enemies) if (!e.dead && !D.hit.has(e) && dist(h, e) < h.r + e.r + 20) { D.hit.add(e); this.hurt(e, D.dmg, h); }
    if (D.t <= 0) h.dash = null;
  }
  fire(src, a, tex, speed, dmg, range, o) {
    const z=src.isBoss?src.def.size*.70:Math.max(38,src.def.size*.48),p=this.view.project(src.x,src.y,z),hand=src.art?.state?.hand||src.enemyArt?.muzzle,v=this.view.vector(Math.cos(a),Math.sin(a));
    const s=this.add.image(hand?hand.x:p.x,hand?hand.y:p.y,tex).setRotation(Math.atan2(v.y,v.x)).setDepth(this.view.depth(src.x,src.y,.3)).setScale(o.scale||1);
    const ground=this.view.project(src.x,src.y),shadow=this.add.graphics().setPosition(ground.x,ground.y).setDepth(1.7);shadow.fillStyle(0x15201a,.24).fillPoints(this.view.circle(0,0,9,9).map(p=>({x:p.x-this.view.ox,y:p.y-this.view.oy})),true);
    this.projs.push({s,shadow,muzzleT:.10,muzzleDX:hand?hand.x-p.x:0,muzzleDY:hand?hand.y-p.y:0,x:src.x,y:src.y,z,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,team:src.team,src,dmg,life:range/speed,pierce:!!o.pierce,hit:new Set(),r:o.r||18});
  }
  updateProjs(dt) {
    for(let i=this.projs.length-1;i>=0;i--){
      const p=this.projs[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
      const d=this.view.project(p.x,p.y,p.z),ground=this.view.project(p.x,p.y);p.muzzleT=Math.max(0,p.muzzleT-dt);p.s.setPosition(d.x+p.muzzleDX*p.muzzleT/.10,d.y+p.muzzleDY*p.muzzleT/.10).setDepth(this.view.depth(p.x,p.y,.3));p.s.setRotation(Math.atan2(this.view.vector(p.vx,p.vy).y,this.view.vector(p.vx,p.vy).x));p.shadow.setPosition(ground.x,ground.y);if((p.trailT=(p.trailT||0)-dt)<=0){p.trailT=C.presentation.trailInterval;this.pTrail.explode(1,p.x,p.y,p.z);}
      const targets=p.team==='hero'?this.enemies:this.heroes;let done=p.life<=0;
      for(const t of targets){if(done||t.dead||p.hit.has(t))continue;if(Math.hypot(t.x-p.x,t.y-p.y)<p.r+t.r){p.hit.add(t);this.hurt(t,p.dmg,p.src);if(!p.pierce)done=true;}}
      if(done){p.s.destroy();p.shadow.destroy();this.projs.splice(i,1);}
    }
  }
  hurt(t, amount, src, opt) {
    if (t.dead) return;
    if (t.team==='hero'&&t.iframeT>0) { if(this.elapsed-(t.lastEvadeT??-9)>.3){t.lastEvadeT=this.elapsed;if(t.isPlayer)this.stats.evades++;this.floatText(t.x,t.y,'闪','#bfe6ff',30,130);} return; }
    let crit = false;
    if (src && src.team === 'hero') { amount *= src.def.damageMul || 1; if (Math.random() < (src.def.critChance || 0)) { crit = true; amount *= src.def.critMul || 1.5; } }
    if (t.team === 'hero') { if (this.god && t.isPlayer) amount = 0; if (t.shieldT > 0) amount *= 1 - (t.shieldReduce || 0.5); if (t.dash) amount *= 0.3; }
    amount = Math.max(0, Math.round(amount * (1 - (t.def.armor || 0))));
    const before=t.hp,effective=Math.min(before,amount);t.hp=Math.max(0,before-amount);t.flashT=amount>0?.08:0;
    if(effective>0){if(src?.team==='hero')this.contactFx(t.x,t.y,t.def.size*.46,src.attackProfile?.finisher?1.45:1);this.recordDamage?.(src,t,effective);const heavy=amount>=C.combatWindows.heavyThreshold;if(!(t.hitGuardT>0)){t.hitGuardT=C.combatWindows.hitGuard;const stun=t.isBoss?(heavy?.045:0):(heavy?C.combatWindows.heavyStun:C.combatWindows.lightStun);if(stun>(t.stunT||0)){t.stunT=stun;if(!t.isBoss)this.cancelAction(t);}if(!t.isBoss&&src){const a=ang(src,t),speed=heavy?160:85;t.kb={vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,t:heavy?.14:.09};}if(heavy)AUD.play('heavy',{ai:!t.isPlayer});else if(t.def.armor>.15)AUD.play('armor',{ai:!t.isPlayer});}}
    if(effective>0&&src?.isPlayer&&t.team==='enemy'){const AP=src.action==='attack'?src.attackProfile:null,fin=AP?.finisher,F=C.feel;this.hitstopT=Math.max(this.hitstopT,opt?.skill?F.hitstopSkill:AP?.hitstop??(fin?F.hitstopFinisher:F.hitstop));this.cameras.main.shake(fin||opt?.skill?110:60,opt?.skill?F.shake*2:F.shake*(AP?.shakeMul??(fin?2:1)));this.pFire.explode(fin?10:5,t.x,t.y,t.def.size*.45);}
    if(effective>0&&t.isPlayer)this.cameras.main.shake(120,.004);
    if (amount > 0) { if (t.isPlayer) AUD.play('hurt'); else if (t.team === 'enemy' && src && src.team === 'hero') AUD.play('hit', { ai: !src.isPlayer }); }
    if (src && src.isPlayer) this.stats.dmg += effective;
    if (opt && opt.slow) { t.slowT = opt.slowTime; t.slowMul = opt.slow; }
    if(t.team==='enemy'&&src?.team==='hero')t.lastAttacker=src; // stable target until scheduled retarget or taunt
    if(effective>0)this.floatText(t.x+PM.Between(-14,14),t.y,(crit?'暴击 ':'')+window.BattlePresentation.format(effective),t.team==='hero'?'#ff6b5a':'#fff4d6',26,120,crit?'critical':effective>=C.combatWindows.heavyThreshold?'heavy':'damage');
    if (t.hp <= 0) this.kill(t, src);
  }
  healUnit(t, amount, src) {
    if(t.dead)return;amount=Math.min(t.maxHp-t.hp,Math.max(0,Math.round(Math.min(amount,t.maxHp-t.hp))));if(amount<=0)return;
    t.hp += amount; if(amount>0)this.recordHeal?.(src,t,amount);if (src && src.isPlayer) this.stats.heal += amount;
    if (amount > 0) AUD.play('heal', { ai: !(src && src.isPlayer) });
    if (amount > 0) this.floatText(t.x,t.y,'+'+window.BattlePresentation.format(amount),'#7dff9a',28,125,'heal');
  }
  kill(t, src) {
    t.dead = true; t.hp = 0;
    if (t.team === 'enemy') {
      if (src && src.isPlayer) this.stats.kills++;
      this.pInk.explode(t.isBoss?80:20,t.x,t.y,t.def.size*.4);
      this.tweens.add({ targets: [t.spr, t.shadow], alpha: 0, duration:t.isBoss?1500:550, onComplete: () => { t.spr.destroy(); t.shadow.destroy(); } });
      if (t.isBoss) { this.cameras.main.shake(800, 0.012); this.bus.emit('banner', C.boss.name + '伏诛！', ''); }
    } else {
      t.downToken=this.runActive?this.run.markDown(t.runId):null;t.downed=true;t.bleedT=C.rescue.bleedOut;t.rescueProgress=0;t.rescueBy=null;t.lifeGeneration=(t.lifeGeneration||0)+1;this.cancelAction(t);t.spr.setTint(0x555555).setAlpha(0.55); t.dash = null;
      if (t.isPlayer) this.bus.emit('banner', C.solo?'大圣倒下':'你已倒地', C.solo?'本局结束 · 可同设置换种子再战':'等待队友救助；全队倒地则本局结束');
    }
  }
  /* ---------- 怪物 AI（按仇恨系数选目标，肉盾更容易被盯上） ---------- */
  pickTarget(e) {
    if (e.tauntT > 0 && e.tauntBy && !e.tauntBy.dead) return e.tauntBy;
    let best = null, bs = 1e9;
    for (const h of this.heroes) { if (h.dead) continue; const s = dist(e, h) / (h.def.threat || 1) * (h === e.target ? 0.75 : 1); if (s < bs) { bs = s; best = h; } }
    return best;
  }
  updateEnemy(e, dt) {
    e.moving = false;
    if(e.dead||e.stunT>0)return;
    if(e.leap){const L=e.leap;L.t=Math.min(L.duration,L.t+dt);const p=L.t/L.duration;e.x=L.sx+(L.x-L.sx)*p;e.y=L.sy+(L.y-L.sy)*p;if(p>=1){e.leap=null;for(const h of this.alive(this.heroes))if(Math.hypot(h.x-L.x,h.y-L.y)<L.radius+h.r)this.hurt(h,e.def.damage*e.def.pounce.damageMul,e);this.pInk.explode(12,e.x,e.y,0);}return;}
    if(e.motionAction||e.clock&&!e.clock.done)return;
    e.pounceCD=Math.max(0,(e.pounceCD||0)-dt);
    e.retargetT -= dt;
    if (e.retargetT <= 0 || !e.target || e.target.dead || e.tauntT > 0) { e.target = this.pickTarget(e); e.retargetT = 0.6; }
    const t = e.target; if (!t) return;
    const d = dist(e, t) - t.r - e.r, D = e.def;
    if(D.pounce&&e.pounceCD<=0&&dist(e,t)<D.pounce.range&&dist(e,t)>100){const P=D.pounce,a=ang(e,t),r=Math.min(P.distance,dist(e,t)),x=e.x+Math.cos(a)*r,y=e.y+Math.sin(a)*r;e.faceAng=a;e.pounceCD=P.cooldown;const action=e.motionAction={kind:'pounce',time:0,windup:P.windup,active:P.flight,recovery:P.recovery};this.tele({type:'circle',x,y,r:P.radius,total:P.windup,team:'enemy',color:0xbf6537},()=>{if(e.dead||e.motionAction!==action)return;e.leap={sx:e.x,sy:e.y,x,y,t:0,duration:P.flight,radius:P.radius};this.tele({type:'circle',x,y,r:P.radius,total:P.flight,team:'enemy',color:0xd18245},()=>{});});return;}

    if (D.type === 'melee') {
      if (d > D.range * 0.6) this.moveUnit(e, t.x - e.x, t.y - e.y, D.speed, dt); else e.faceAng = ang(e, t);
      if (d <= D.range && e.cd.attack <= 0) { e.cd.attack=D.cooldown;e.faceAng=ang(e,t);this.beginAction(e,'attack',()=>{e.popT=.15;if(!t.dead&&dist(e,t)-e.r-t.r<=D.range+15)this.hurt(t,D.damage,e);}); }
    } else {
      if (d < D.keepDistance - 60) this.moveUnit(e, e.x - t.x, e.y - t.y, D.speed, dt);
      else if (d > D.range - 40) this.moveUnit(e, t.x - e.x, t.y - e.y, D.speed, dt);
      else e.faceAng = ang(e, t);
      if (d <= D.range && e.cd.attack <= 0) { e.cd.attack=D.cooldown;this.beginAction(e,'attack',()=>{e.popT=.15;if(!t.dead)this.fire(e,ang(e,t),'feather',D.projSpeed,D.damage,D.range+100,{});}); }
    }
  }
  /* ---------- Boss：九婴（一阶段：吐息/横扫/撕咬；二阶段：+九首齐啸、召唤、加速） ---------- */
  bossMotion(b,kind,windup,recovery,active=.12){b.motionAction={kind,time:0,windup,active,recovery};b.casting=windup+active+recovery;}
  /* 白啸狰王：伏身蓄力→低身扑咬（短残影）/ 蹲伏→跃扑→落地扬尘 / 两段裂爪 / 二阶段啸月 + 连续扑咬。全部原创数值。 */
  updateBoss(b, dt) {
    b.moving = false; if (b.dead) return;
    const B=b.def,p2=b.phase===2,cdm=p2?B.phase2CooldownMul:1,t=this.player;
    if(b.leap){const L=b.leap;L.t=Math.min(L.duration,L.t+dt);const q=L.t/L.duration;b.x=L.sx+(L.x-L.sx)*q;b.y=L.sy+(L.y-L.sy)*q;b.moving=true;if((L.ghostT=(L.ghostT||0)-dt)<=0){L.ghostT=.07;this.ghost(b.spr,{snapshot:true,alpha:.32,duration:240});}
      if(q>=1){b.leap=null;if(!t.dead&&Math.hypot(t.x-L.x,t.y-L.y)<L.radius+t.r)this.hurt(t,B.leap.damage,b);this.dustFx(L.x,L.y,L.radius);this.cameras.main.shake(220,.008);}return;}
    if(b.lunge){const L=b.lunge;L.t+=dt;const s=L.speed*Math.min(dt,Math.max(0,L.dur-(L.t-dt)));b.x+=Math.cos(L.a)*s;b.y+=Math.sin(L.a)*s;b.moving=true;if((L.ghostT-=dt)<=0){L.ghostT=.045;this.ghost(b.spr,{snapshot:true,alpha:.42,duration:220});}
      if(!L.hit&&!t.dead&&dist(b,t)<b.r+t.r+18){L.hit=true;this.hurt(t,B.lunge.damage,b);}
      if(L.t>=L.dur){b.lunge=null;this.pDust.explode(10,b.x,b.y);if(L.chain>0&&!t.dead)this.bossLunge(b,L.chain-1,.38);}return;}
    if(b.stunT>0)return;
    if(b.phase===1&&b.hp/b.maxHp<=B.phase2At&&!(b.casting>0)){b.phase=2;this.bossMotion(b,'howl',B.howl.windup,B.howl.recovery);AUD.play('bossPhase');this.cameras.main.shake(500,.01);this.bus.emit('banner',B.name+'暴怒！','二阶段：连续扑咬 · 啸月召妖');this.time.delayedCall(B.howl.windup*1000,()=>{if(b.dead||this.over)return;for(let i=0;i<B.howl.summonImps;i++){const a=Math.random()*Math.PI*2;this.makeEnemy('imp',b.x+Math.cos(a)*160,b.y+Math.sin(a)*160);}});}
    b.cdClaw-=dt;b.cdLunge-=dt;b.cdLeap-=dt;
    if(b.casting>0){b.casting-=dt;return;}
    if(!t||t.dead)return;
    const d=dist(b,t);
    if(b.cdLeap<=0&&d>220&&d<B.leap.maxRange){this.bossLeap(b,cdm);}
    else if(b.cdLunge<=0&&d>150&&d<B.lunge.length+60){b.cdLunge=B.lunge.cooldown*cdm;this.bossLunge(b,p2?2:0,B.lunge.windup);}
    else if(b.cdClaw<=0&&d<B.claw.radius+t.r){this.bossClaw(b,cdm);}
    else if(d>B.claw.radius*.7)this.moveUnit(b,t.x-b.x,t.y-b.y,B.speed*(p2?B.phase2SpeedMul:1),dt);else b.faceAng=ang(b,t);
  }
  clampArena(x,y,margin=60){const A=C.arena,cx=A.width/2,cy=A.height/2,dx=x-cx,dy=y-cy,l=Math.hypot(dx,dy),R=A.radius-margin;return l>R?{x:cx+dx/l*R,y:cy+dy/l*R}:{x,y};}
  bossLeap(b,cdm){const P=b.def.leap,t=this.player,a=ang(b,t),r=Math.min(P.maxRange,dist(b,t)),q=this.clampArena(b.x+Math.cos(a)*r,b.y+Math.sin(a)*r,P.radius*.5);b.faceAng=a;b.cdLeap=P.cooldown*cdm;this.bossMotion(b,'pounce',P.windup,P.recovery,P.flight);this.floatText(b.x,b.y,P.name,'#ffcf6a',28,260);
    this.tele({type:'circle',x:q.x,y:q.y,r:P.radius,total:P.windup,team:'enemy',color:0xc0392b},()=>{if(b.dead)return;b.leap={sx:b.x,sy:b.y,x:q.x,y:q.y,t:0,duration:P.flight,radius:P.radius,height:P.height};this.tele({type:'circle',x:q.x,y:q.y,r:P.radius,total:P.flight,team:'enemy',color:0xe0531f},()=>{});});}
  bossLunge(b,chain,windup){const P=b.def.lunge,t=this.player,a=ang(b,t);b.faceAng=a;this.bossMotion(b,'pounce',windup,P.recovery,P.dash);if(chain===(b.phase===2?2:0))this.floatText(b.x,b.y,P.name,'#ffcf6a',28,260);
    this.tele({type:'rect',x:b.x,y:b.y,a,len:P.length,w:P.width,total:windup,team:'enemy',color:0xc0392b},()=>{if(b.dead)return;b.lunge={a,t:0,dur:P.dash,speed:P.length/P.dash,hit:false,ghostT:0,chain};});}
  bossClaw(b,cdm){const P=b.def.claw,t=this.player,a=ang(b,t),arc=PM.DegToRad(P.arc);b.cdClaw=P.cooldown*cdm;b.faceAng=a;this.bossMotion(b,'claw',P.windup,P.recovery+P.gap,.1);
    const hit=a=>{for(const h of this.alive(this.heroes))if(dist(b,h)<P.radius+h.r&&angDiff(ang(b,h),a)<arc/2+.1)this.hurt(h,P.damage,b);this.crescentFx(b.x,b.y,a,P.radius,P.arc,{color:0xffd2c4,thick:.3,life:180,sweep:60,z:b.def.size*.25});};
    this.tele({type:'cone',x:b.x,y:b.y,a,len:P.radius,arc,total:P.windup,team:'enemy',color:0xa94e33},()=>{if(b.dead)return;hit(a);const a2=ang(b,t);b.faceAng=a2;this.tele({type:'cone',x:b.x,y:b.y,a:a2,len:P.radius,arc,total:P.gap,team:'enemy',color:0xd0663a},()=>{if(!b.dead)hit(a2);});});}
  tele(o, fn) { o.t = 0; o.fn = fn; this.teles.push(o); }
  inTele(t, u) {
    if (t.type === 'circle') return dist(t, u) < t.r + u.r + 20;
    return dist(t, u) < t.len + u.r + 20 && angDiff(ang(t, u), t.a) < t.arc / 2 + 0.25;
  }
  updateTeles(dt) {
    const g = this.teleG; g.clear();
    for (let i = this.teles.length - 1; i >= 0; i--) {
      const t = this.teles[i]; t.t += dt; const p = Math.min(1, t.t / t.total);
      if (t.follow && !t.follow.dead) { t.x = t.follow.x; t.y = t.follow.y; }
      g.fillStyle(t.color, 0.14); g.lineStyle(5, t.color, 0.85);
      const rect=L=>{const c=Math.cos(t.a),s=Math.sin(t.a),w=t.w/2;return [[-s*w,c*w],[c*L-s*w,s*L+c*w],[c*L+s*w,s*L-c*w],[s*w,-c*w]].map(([dx,dy])=>this.view.project(t.x+dx,t.y+dy));},shapeAt=k=>t.type==='circle'?this.view.circle(t.x,t.y,t.r*k):t.type==='rect'?rect(t.len*k):this.view.sector(t.x,t.y,t.len*k,t.a,t.arc),shape=shapeAt(1);this.view.groundShape(g,shape);g.fillStyle(t.color,.32);this.view.groundShape(g,shapeAt(p),true,false);t.projected=shape;
      if (p >= 1) { this.teles.splice(i, 1); if (!(this.boss && this.boss.dead)) t.fn(); }
    }
  }
  separate() {
    const all = this.heroes.concat(this.enemies).filter(u => !u.dead), A = C.arena;
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, min=(a.r+b.r)*(a.team==='hero'&&b.team==='hero'?C.ai.allySpacingMul:.8);
      if (d < min) { const push = (min - d) / 2, nx=d<.02?Math.cos(i*2.4+j):dx/d,ny=d<.02?Math.sin(i*2.4+j):dy/d, wa = a.isBoss ? 0.1 : 1, wb = b.isBoss ? 0.1 : 1; a.x -= nx * push * wa; a.y -= ny * push * wa; b.x += nx * push * wb; b.y += ny * push * wb; }
    }
    for(const u of all)for(const prop of this.view.props){if(prop.kind==='gate')continue;const r=(prop.kind==='rock'?48:36)*C.view25d.propScale+u.r*.75,dx=u.x-prop.x,dy=u.y-prop.y,d=Math.hypot(dx,dy);if(d<r&&d>0.001){u.x+=dx/d*(r-d);u.y+=dy/d*(r-d);}}
    for(const u of all){const dx=u.x-A.width/2,dy=u.y-A.height/2,d=Math.hypot(dx,dy),r=A.radius-u.r*.45;if(d>r){u.x=A.width/2+dx/d*r;u.y=A.height/2+dy/d*r;}}
  }
  /* ---------- 武器掉落与拾取 ---------- */
  dropWeapon(key, x, y, noPickT) {
    const w = C.weapons[key];
    const ground=this.view.project(x,y);
    const ring=this.add.graphics().setDepth(1.6);ring.fillStyle(w.color,.25).lineStyle(4,0xf5c542);this.view.groundShape(ring,this.view.circle(x,y,46).map(p=>({x:p.x-ground.x,y:p.y-ground.y})));ring.setPosition(ground.x,ground.y);
    const icon = this.add.image(ground.x, ground.y - 30, 'v6_' + C.weaponArt[key] + '_weapon').setDisplaySize(80,80).setDepth(this.view.depth(x,y,.05));
    const label = txt(this, ground.x, ground.y - 92, w.name, 16, '#ffe7a8', { stroke: '#120c0a', strokeThickness: 5 }).setOrigin(0.5).setDepth(900001).setResolution(2);
    // Bob follows display Z in updateDrops, never a stale projected absolute Y.
    this.tweens.add({ targets: ring, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });
    this.pMoon.explode(20, x, y);
    this.drops.push({ key, x, y, ring, icon, label, noPickT: noPickT || 0 });
  }
  updateDrops(dt) {
    const h = this.player;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]; d.noPickT -= dt;const q=this.view.project(d.x,d.y);d.ring.setPosition(q.x,q.y);d.icon.setPosition(q.x,q.y-40+Math.sin(this.elapsed*3)*5).setDepth(this.view.depth(d.x,d.y,.05));d.label.setPosition(q.x,q.y-75).setDepth(this.view.depth(d.x,d.y,.1));
      if (h.dead || d.noPickT > 0 || dist(h, d) > 62) continue;
      const old = h.weapon; this.cancelAction(h);h.weapon = d.key;if(this.runActive||this.phase==='break')this.run.setCanHeal(h.runId,C.weapons[h.weapon].role==='healer'); h.cd.attack = 0; h.cd.skill1 = Math.min(h.cd.skill1, 1); h.cd.skill2 = Math.min(h.cd.skill2, 1);
      d.ring.destroy(); d.icon.destroy(); d.label.destroy(); this.drops.splice(i, 1);
      this.dropWeapon(old, h.x + 70, h.y + 20, 2.5);   // 旧武器留在原地，可再换回
      AUD.play('pickup');
      const w = C.weapons[d.key];
      this.bus.emit('banner', '拾取 ' + w.name, '定位变为：' + ROLE_LABEL[w.role]);
      this.bus.emit('weapon');
      this.pMoon.explode(30,h.x,h.y,40);
    }
  }
  /* ---------- 波次 ---------- */
  updateWaves(dt) {
    if (this.phase === 'break') { this.breakT -= dt; if (this.breakT <= 0) this.startWave(this.waveIdx + 1); }
    else if (this.phase === 'fight') {
      if (this.spawnQ.length) { this.spawnT -= dt; if (this.spawnT <= 0) { this.spawnT = C.spawnInterval; const p = this.spawnPoint(); this.makeEnemy(this.spawnQ.shift(), p.x, p.y); } }
      else if (!this.alive(this.enemies).length) this.clearWave();
    }
  }
  spawnPoint() {
    const A = C.arena; let p;
    for (let i = 0; i < 10; i++) {
      const a=Math.random()*Math.PI*2;p={x:A.width/2+Math.cos(a)*(A.radius-35),y:A.height/2+Math.sin(a)*(A.radius-35)};
      if (dist(p, this.player) > 450) break;
    }
    return p;
  }
  startWave(i) {
    this.enemies=this.enemies.filter(e=>{if(!e.dead)return true;if(e.spr.active)e.spr.destroy();if(e.shadow.active)e.shadow.destroy();return false;});
    const w=this.run.startEncounter();this.encounter=w;this.runActive=true;this.waveIdx=w.waveIndex+this.debugWaveOffset;this.absoluteWave=w.index+1;this.phase='fight';
    if(!w.boss)AUD.play('wave');else AUD.setMode('boss');this.spawnQ=w.spawnOrder.slice();this.spawnT=w.boss?3:.3;
    if(w.boss)this.spawnBoss();else this.bus.emit('banner',w.name,'第 '+w.loopNumber+' 轮 · 本间 '+this.spawnQ.length+' 只妖物 · 遭遇随机');
  }
  clearWave() {
    if(this.phase!=='fight'||this.spawnQ.length||this.alive(this.enemies).length)return;
    const cards=this.run.clearEncounter();this.runActive=false;this.phase='reward';
    this.timers=[];this.teles=[];for(const p of this.projs){p.s.destroy();p.shadow.destroy();}this.projs=[];this.teleG.clear();
    for (const h of this.heroes){this.cancelAction(h);h.dodgeState=null;if(h.dead){h.dead=false;h.downed=false;h.rescueProgress=0;h.hp=h.maxHp*C.reviveHpRatio;h.spr.clearTint().setAlpha(1).setAngle(0);}else h.hp=Math.min(h.maxHp,h.hp+h.maxHp*C.waveClearHealRatio);this.run.syncHeroHP(h.runId,h.hp,h.maxHp);}
    const hud=this.scene.get('HUD');hud.releaseAll();hud.ctrlLayer.setVisible(false);this.tweens.pauseAll();this.time.paused=true;AUD.pause('reward');
    const p=this.run.snapshot().progress;window.RunUI.rewards(cards,`第 ${this.encounter.loopNumber} 轮 · 第 ${p.clearedWaves+1} / ${p.totalWaves} ${C.solo?'间':'波'}肃清`,id=>this.chooseRunReward(id));
  }
  chooseRunReward(id){if(this.phase!=='reward')return;const response=this.run.chooseReward(id);this.applyRunBuild(response.build,response.phase!=='won');this.tweens.resumeAll();this.time.paused=false;AUD.resume('reward');
    if(response.phase==='won'){this.finish(true);return;}
    this.phase='break';this.breakT=C.waveBreak;const hud=this.scene.get('HUD');hud.ctrlLayer.setVisible(true);
    if(!C.solo){const owned=new Set(this.heroes.map(h=>h.weapon).concat(this.drops.map(d=>d.key)));let pool=C.dropWeapons.filter(k=>!owned.has(k));if(!pool.length)pool=C.dropWeapons.filter(k=>k!==this.player.weapon);shuffle(pool);for(let i=0;i<Math.min(C.dropsPerWave,pool.length);i++)this.dropWeapon(pool[i],this.player.x+(i-.5)*180,PM.Clamp(this.player.y-170,200,C.arena.height-200));}
    if(C.solo){const cam=this.cameras.main,h=this.player;cam.fadeOut(220,8,8,10);cam.once('camerafadeoutcomplete',()=>{if(this.over)return;h.x=C.arena.width/2;h.y=C.arena.height/2+260;h.faceAng=-Math.PI/2;this.projs.forEach(p=>{p.s.destroy();p.shadow.destroy();});this.projs=[];cam.fadeIn(320,8,8,10);});}
    this.bus.emit('banner','获得祝福 · '+response.chosen.name,C.solo?'踏入下一间':'已实际作用于全队；附近新武器可拾取');
  }
  checkEnd() { if (!this.over && this.heroes.every(h => h.dead)) this.finish(false); }
  finish(win) {
    if (this.over) return;
    this.settlement=win?this.run.settlement():this.run.fail('team-wipe');this.runActive=false;this.over = true; AUD.setMode('silent'); AUD.play(win ? 'victory' : 'defeat');
    this.time.delayedCall(win ? 1500 : 1000, () => this.scene.launch('Result', { win, hero: this.heroKey, team: this.teamKeys, time: this.elapsed, wave:this.absoluteWave||0,stats:this.stats,settlement:this.settlement,settings:this.settings,weaponName:this.W(this.player).name,solo:!!C.solo,soloStats:{...this.stats},feedback:this.settlement.team.find(h=>h.isPlayer)?.stats.revives?'并肩重生：本局完成了真实救助。':win?'新的封印已成。保留经验，换一颗种子再试新构筑。':'调整走位与祝福搭配，再挑战新的遭遇。' }));
    this.bus.emit('over');
  }
  /* ---------- 表现：挤压/弹跳/翻转/受击闪白/血条 ---------- */
  syncVisuals(dt) {
    const g=this.barG,ground=this.footG;g.clear();ground.clear();
    for(const u of this.heroes.concat(this.enemies)){
      if(!u.spr.active)continue;u.t+=dt;const foot=this.view.project(u.x,u.y);let bob=0,sx=1,sy=1;
      if(!u.dead){if(!u.art&&!u.enemyArt&&u.moving){bob=Math.abs(Math.sin(u.t*12))*(u.isBoss?6:8);sy=1+Math.sin(u.t*24)*.04;sx=1-Math.sin(u.t*24)*.03;}else if(!u.art&&!u.enemyArt){sy=1+Math.sin(u.t*3)*.025;sx=1-Math.sin(u.t*3)*.015;}if(u.popT>0){sx*=1.12;sy*=.92;}
        const d=this.view.vector(Math.cos(u.faceAng),Math.sin(u.faceAng)),flip=d.x<-.15?-1:d.x>.15?1:(u.lastFlip||1);u.lastFlip=flip;u.spr.setScale(u.base*sx*flip*u.native,u.base*sy);
        if(u.flashT>0){if(u.team==='enemy'&&!u.isBoss)u.spr.setTintFill(0xffffff);else u.spr.setTintFill(0xfff1d8);}else if(u.stunT>.3&&u.team==='enemy')u.spr.setTint(0xffe08a);else if(u.isBoss&&u.phase===2)u.spr.setTint(0xffb0a0);else if(u.isBoss&&u.def.tint)u.spr.setTint(u.def.tint);else if(u.slowT>0)u.spr.setTint(0xa8c8ff);else u.spr.clearTint();
      }
      u.spr.setPosition(foot.x,foot.y-bob).setDepth(this.view.depth(u.x,u.y));u.shadow.setPosition(foot.x,foot.y);if(u.art)u.art.update(dt);if(u.enemyArt)u.enemyArt.update(dt);
      if(u.dead){if(u.team==='hero')u.spr.setAngle(80);continue;}
      if(!u.isBoss){const w=u.team==='hero'?80:Math.max(50,u.def.size*.7),y=foot.y-u.def.size*1.02-bob;g.fillStyle(0x120c0a,.9).fillRect(foot.x-w/2-3,y-3,w+6,14);g.fillStyle(u.team==='hero'?(u.isPlayer?0x6ad06a:0x4aa3df):0xc0392b).fillRect(foot.x-w/2,y,w*Math.max(0,u.hp/u.maxHp),8);}
      if(u.isPlayer){ground.lineStyle(4,0xf5c542,.9);this.view.groundShape(ground,this.view.circle(u.x,u.y,u.def.size*.4,u.def.size*.22),false,true);}
      if(u.shieldT>0){ground.lineStyle(5,0xc0392b,.6);this.view.groundShape(ground,this.view.circle(u.x,u.y,u.def.size*.6),false,true);}
    }
    this.viewFx=this.viewFx.filter(f=>f.g.active);for(const f of this.viewFx)f.draw();
    for(const t of this.floats)if(t.floatAnchor){const a=t.floatAnchor,p=this.view.project(a.x,a.y,a.z+(this.elapsed-a.start)*(a.rise||65));t.setPosition(p.x,p.y);}
    // Rotated view-foot Y orders both props and units. Tall covers fade only to retain player visibility.
    if(this.boss&&!this.boss.dead){const b=this.boss,bp=this.view.project(b.x,b.y),cover=this.heroes.some(h=>{const hp=this.view.project(h.x,h.y);return!h.dead&&this.view.depth(h.x,h.y)<this.view.depth(b.x,b.y)&&Math.abs(hp.x-bp.x)<C.boss.size*.5&&bp.y-hp.y<C.boss.size*.85;});b.spr.setAlpha(cover?.65:1);}
    const f=this.player.dead?(this.alive(this.heroes)[0]||this.player):this.player,p=this.view.project(f.x,f.y);this.camTarget.setPosition(p.x,p.y-C.view25d.cameraLift);
    for(const prop of this.view.props){const q=this.view.project(prop.x,prop.y);prop.image.setAlpha(this.view.depth(prop.x,prop.y)>this.view.depth(f.x,f.y)&&Math.abs(q.x-p.x)<90&&q.y-p.y<prop.height?.55:1);}
  }
  contactFx(x,y,z,scale=1){const g=this.add.graphics().setDepth(this.view.depth(x,y,.5)),draw=()=>{const q=this.view.project(x,y,z);g.clear().lineStyle(3,0xf3d48c,.95);for(let i=0;i<5;i++){const a=i*Math.PI*.4;g.lineBetween(q.x+Math.cos(a)*4*scale,q.y+Math.sin(a)*4*scale,q.x+Math.cos(a)*12*scale,q.y+Math.sin(a)*12*scale);}};draw();this.viewFx.push({g,draw});this.tweens.add({targets:g,alpha:0,duration:130,onComplete:()=>g.destroy()});}
  /* 主角普攻不再画地面红色扇形，改为白/金月牙轨迹光：每段颜色、长度、角度不同，判定仍由 resolveAttack 世界坐标计算。 */
  weaponStrokeFx(h,a,r,arcDeg,color){const P=h.attackProfile||{},st=P.step||1,S=C.feel.slash[st-1]||C.feel.slash[0];
    if(P.kind==='thrust')return this.thrustFx(h.x,h.y,a,r*S.reach,S);
    this.crescentFx(h.x,h.y,a,r*S.reach,arcDeg*S.arcMul,{...S,sign:P.sweepSign||1,drop:P.kind==='overhead'});
    if(P.kind==='overhead'){const p={x:h.x+Math.cos(a)*r*.7,y:h.y+Math.sin(a)*r*.7};this.dustFx(p.x,p.y,r*.55,true);}}
  crescentFx(x,y,a,R,arcDeg,o={}){const N=22,span=PM.DegToRad(arcDeg),sign=o.sign||1,thick=o.thick||.32,z0=o.z??52,g=this.add.graphics().setDepth(this.view.depth(x,y,60)),st={p:0,v:1};
    const pt=(i,inner)=>{const t=i/N,an=a+span*(.5-t)*sign,rr=R*(inner?1-thick*Math.sin(Math.PI*t):1),z=o.drop?z0+(1-t)*70-t*30:z0+Math.sin(Math.PI*t)*8;return this.view.project(x+Math.cos(an)*rr,y+Math.sin(an)*rr,Math.max(4,z));};
    const draw=()=>{const n=Math.max(2,Math.round(N*st.p)),outer=[],inner=[];for(let i=0;i<=n;i++){outer.push(pt(i,false));inner.push(pt(i,true));}const poly=outer.concat(inner.reverse());g.clear();g.lineStyle(7,0x0d0b09,.45*st.v).strokePoints(poly,true);g.fillStyle(o.color||0xffffff,.72*st.v).fillPoints(poly,true);const core=[];for(let i=0;i<=n;i++){const q=pt(i,false),w=pt(i,true);core.push({x:q.x*.72+w.x*.28,y:q.y*.72+w.y*.28});}g.lineStyle(3,0xffffff,.95*st.v).strokePoints(core,false);};
    draw();this.viewFx.push({g,draw});this.tweens.add({targets:st,p:1,duration:o.sweep||70,onComplete:()=>this.tweens.add({targets:st,v:0,duration:o.life||180,onComplete:()=>g.destroy()})});return g;}
  thrustFx(x,y,a,L,S){const g=this.add.graphics().setDepth(this.view.depth(x,y,60)),st={p:0,v:1},c=Math.cos(a),s=Math.sin(a),draw=()=>{const pts=[];for(let i=0;i<=12;i++){const t=i/12*st.p,w=18*Math.sin(Math.PI*t/Math.max(.01,st.p));pts.push(this.view.project(x+c*L*t-s*w,y+s*L*t+c*w,52));}for(let i=12;i>=0;i--){const t=i/12*st.p,w=18*Math.sin(Math.PI*t/Math.max(.01,st.p));pts.push(this.view.project(x+c*L*t+s*w,y+s*L*t-c*w,52));}g.clear().lineStyle(6,0x0d0b09,.4*st.v).strokePoints(pts,true).fillStyle(S.color,.75*st.v).fillPoints(pts,true);};draw();this.viewFx.push({g,draw});this.tweens.add({targets:st,p:1,duration:S.sweep,onComplete:()=>this.tweens.add({targets:st,v:0,duration:S.life,onComplete:()=>g.destroy()})});}
  spinGhosts(h){const w=h.art?.weapon;if(!w)return;for(let i=0;i<8;i++)this.time.delayedCall(i*28,()=>{if(!w.active)return;const g=this.ghost(w,{tint:i%2?0xffd27a:0xffffff,alpha:.55,duration:240});if(g)g.setRotation(w.rotation+i*Math.PI/4);});}
  dustFx(x,y,r,small){this.pDust.explode(small?10:26,x,y,4);const g=this.add.graphics().setDepth(3),o={v:.25};const draw=()=>{g.clear().lineStyle(small?3:5,0xd8cfb8,.7*(1-o.v*.6));this.view.groundShape(g,this.view.circle(x,y,r*o.v),false,true);};draw();this.viewFx.push({g,draw});this.tweens.add({targets:o,v:1,duration:small?220:380,ease:'Cubic.Out'});this.tweens.add({targets:g,alpha:0,duration:small?260:420,onComplete:()=>g.destroy()});}
  pillarFx(x,y){const g=this.add.graphics().setDepth(this.view.depth(x,y,5)),o={h:0,v:1},draw=()=>{const top=this.view.project(x,y,320),bot=this.view.project(x,y,320*(1-o.h));g.clear().fillStyle(0xf5c542,.85*o.v).fillRect(bot.x-11,top.y,22,bot.y-top.y).lineStyle(4,0x1a1210,.8*o.v).strokeRect(bot.x-11,top.y,22,bot.y-top.y).fillStyle(0xffffff,.7*o.v).fillRect(bot.x-3,top.y,6,bot.y-top.y);};draw();this.viewFx.push({g,draw});this.tweens.add({targets:o,h:1,duration:90,ease:'Quad.In',onComplete:()=>this.tweens.add({targets:o,v:0,duration:300,onComplete:()=>g.destroy()})});}
  sealFx(x,y,r){const g=this.add.graphics().setDepth(3),o={v:0};const draw=()=>{g.clear();for(const [k,c]of[[1,0xf5c542],[.72,0xfff1c4]]){g.lineStyle(4,c,.8*(1-Math.max(0,o.v-.6)/.4));this.view.groundShape(g,this.view.circle(x,y,r*k*Math.min(1,o.v*1.6)),false,true);}for(let i=0;i<8;i++){const a=i*Math.PI/4+o.v,p=this.view.project(x+Math.cos(a)*r*.86,y+Math.sin(a)*r*.86,4);g.fillStyle(0xf5c542,.8*(1-o.v)).fillCircle(p.x,p.y,5);}};draw();this.viewFx.push({g,draw});this.tweens.add({targets:o,v:1,duration:900,onComplete:()=>g.destroy()});this.floatText(x,y,'定','#ffe08a',40,150);}
  slashFx(x,y,a,r,arcDeg,color){const g=this.add.graphics().setDepth(3),draw=()=>{g.clear().fillStyle(color,.55).lineStyle(4,0x171c17,.85);this.view.groundShape(g,this.view.sector(x,y,r,a,PM.DegToRad(arcDeg)));};draw();this.viewFx.push({g,draw});this.tweens.add({targets:g,alpha:0,duration:200,onComplete:()=>g.destroy()});}
  healFieldFx(x,y,r){const g=this.add.graphics().setDepth(3),fade={v:1};const draw=()=>{g.clear().fillStyle(0x8ec7b4,.10*fade.v).lineStyle(3,0xc4efd6,.65*fade.v);this.view.groundShape(g,this.view.circle(x,y,r));for(let i=0;i<8;i++){const a=i*Math.PI/4,p=this.view.project(x+Math.cos(a)*r*.65,y+Math.sin(a)*r*.65);g.fillStyle(0xc4efd6,.6*fade.v).fillCircle(p.x,p.y,3*fade.v);}};draw();this.tweens.add({targets:fade,v:0,duration:1800,onUpdate:draw,onComplete:()=>g.destroy()});}
  ringFx(x,y,r,color){const g=this.add.graphics().setDepth(3),o={v:.3};const draw=()=>{g.clear().fillStyle(color,.18).lineStyle(6,color,.8);this.view.groundShape(g,this.view.circle(x,y,r*o.v));};draw();this.tweens.add({targets:o,v:1,duration:450,ease:'Cubic.Out',onUpdate:draw});this.tweens.add({targets:g,alpha:0,duration:450,onComplete:()=>g.destroy()});}
  floatText(x,y,value,color,size,z=100,kind='label'){if(this.floats.length>C.presentation.maxNumbers){const old=this.floats.shift();this.tweens.killTweensOf(old);old.destroy();}const style=window.BattlePresentation.numberStyle(kind),q=this.view.project(x,y,z),t=txt(this,q.x,q.y,String(value),style?.size||size||24,style?'#fff':color,{stroke:'#0b0c08',strokeThickness:style?.stroke||5,fontStyle:'bold'}).setOrigin(.5).setDepth(950000).setResolution(2);if(style){t.setTint(style.top,style.top,style.bottom,style.bottom).setAngle(style.angle).setScale(.74);this.tweens.add({targets:t,scaleX:1.14,scaleY:1.14,duration:90,ease:'Back.Out',onComplete:()=>this.tweens.add({targets:t,scaleX:1,scaleY:1,duration:120,ease:'Cubic.Out'})});}t.numberKind=kind;t.floatAnchor={x,y,z,start:this.elapsed,rise:style?C.presentation.numberRise:65};this.floats.push(t);this.tweens.add({targets:t,alpha:0,duration:style?C.presentation.numberLifetime:750,delay:style?100:0,onComplete:()=>{const i=this.floats.indexOf(t);if(i>=0)this.floats.splice(i,1);t.destroy();}});}


}

/* ======================= HUD：虚拟摇杆 + 按钮（多点触控） ======================= */
class HUD extends Phaser.Scene {
  constructor() { super('HUD'); }
  create() {
    this.B = this.scene.get('Battle');
    this.joy = { pid: null, cx: 0, cy: 0, dx: 0, dy: 0 };
    this.btns = {}; this.paused = false;
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('pointerupoutside', this.onUp, this);
    this.input.on('gameout', () => this.releaseAll());
    this.B.bus.on('banner', (a, b) => this.banner(a, b));
    this.B.bus.on('weapon', () => this.refreshLabels());
    this.B.bus.on('over', () => { this.releaseAll(); this.ctrlLayer.setVisible(false); });
    window.__hud = this;
  }
  layout() {
    this.children.removeAll(true); this.tweens.killAll();
    const W = this.scale.width, H = this.scale.height, u = U(this); this.u = u;
    this.cameras.main.setSize(W, H);
    this.add.image(W / 2, H / 2, 'vignette').setDisplaySize(W * 1.1, H * 1.2).setAlpha(0.8);
    this.ctrlLayer = this.add.container(0, 0);
    this.g = this.add.graphics(); this.ctrlLayer.add(this.g);
    this.joyHome = { x: 180 * u, y: H - 180 * u }; this.joyR = 96 * u;
    if (this.joy.pid === null) { this.joy.cx = this.joyHome.x; this.joy.cy = this.joyHome.y; }
    this.btnDefs = C.solo ? {
      atk: { x: W - 150 * u, y: H - 150 * u, r: 84 * u },
      dodge: { x: W - 312 * u, y: H - 78 * u, r: 54 * u },
      s1: { x: W - 336 * u, y: H - 214 * u, r: 50 * u },
      s2: { x: W - 262 * u, y: H - 322 * u, r: 50 * u },
      s3: { x: W - 132 * u, y: H - 342 * u, r: 50 * u },
    } : {
      atk: { x: W - 155 * u, y: H - 155 * u, r: 86 * u },
      s1: { x: W - 340 * u, y: H - 108 * u, r: 62 * u },
    };
    this.rescueZone={x:W*.5,y:H-80*u,w:210*u,h:62*u};
    this.rescueButton=this.add.container(this.rescueZone.x,this.rescueZone.y);this.rescueButton.add(this.add.rectangle(0,0,210*u,62*u,0x32534a,.95).setStrokeStyle(4*u,0xbba56b));this.rescueLabel=txt(this,0,0,'按住救助',21*u,'#fff2cf').setOrigin(.5);this.rescueButton.add(this.rescueLabel).setVisible(false);this.ctrlLayer.add(this.rescueButton);
    this.comboTxt=txt(this,W-150*u,H-36*u,'普攻三式',15*u,'#f2d18b',{stroke:'#10140d',strokeThickness:4*u}).setOrigin(.5);this.ctrlLayer.add(this.comboTxt);
    this.labels = {};
    for (const k in this.btnDefs) {
      const b = this.btnDefs[k];
      this.labels[k] = txt(this, b.x, b.y, '', (k === 'atk' ? 26 : 21) * u, '#fff4d6', { stroke: '#120c0a', strokeThickness: 5 * u, fontStyle: 'bold', align: 'center' }).setOrigin(0.5);
      this.labels[k + 'cd'] = txt(this, b.x, b.y, '', 36 * u, '#ffffff', { stroke: '#000', strokeThickness: 6 * u, fontStyle: 'bold' }).setOrigin(0.5);
      this.ctrlLayer.add([this.labels[k], this.labels[k + 'cd']]);
    }
    this.ctrlLayer.add(txt(this, this.joyHome.x, H - 36 * u, '拖动移动', 15 * u, '#cbb994').setOrigin(0.5));
    if(!C.solo)this.ctrlLayer.add(txt(this, W - 155 * u, H - 52 * u, '按住普攻', 14 * u, '#cbb994').setOrigin(0.5));
    // 左上：队伍
    this.teamUI = this.B.heroes.map((h, i) => {
      const x = 22 * u, y = 20 * u + i * 62 * u;
      this.add.rectangle(x, y, 290 * u, 54 * u, 0x120c0a, 0.7).setOrigin(0).setStrokeStyle(2 * u, h.isPlayer ? 0xf5c542 : 0x3d2f25);
      const im = this.add.image(x + 27 * u, y + 27 * u, 'select_'+h.key); im.setScale((48 * u) / im.height);
      return { h, x, y, im, nm: txt(this, x + 58 * u, y + 5 * u, '', 15 * u, h.isPlayer ? '#f5c542' : '#efe3c8') };
    });
    // 恰三槽。衣鞋显示本局对应祝福强化，不捏造额外装备栏。
    this.equipmentSlots = ['weapon','clothes','shoes'];
    this.equipX = W - 222*u; this.equipY = 160*u;
    this.equipIcon = this.add.image(this.equipX, this.equipY, 'v6_'+C.weaponArt[this.B.player.weapon]+'_weapon').setDisplaySize(54*u,54*u);
    this.equipWeapon = txt(this,this.equipX,this.equipY+40*u,'',13*u,'#efe3c8').setOrigin(.5);
    this.clothesLabel=txt(this,this.equipX+76*u,this.equipY+40*u,'衣服',13*u).setOrigin(.5);
    this.shoesLabel=txt(this,this.equipX+152*u,this.equipY+40*u,'鞋',13*u).setOrigin(.5);
    this.hpHeart = txt(this,this.equipX-104*u,this.equipY,'',15*u,'#ffe1cc',{align:'center',fontStyle:'bold'}).setOrigin(.5);
    this.waveTxt = txt(this, W / 2, 18 * u, '', 25 * u, '#f3e2b0', { stroke: '#120c0a', strokeThickness: 6 * u, fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.subTxt = txt(this, W / 2, 54 * u, '', 16 * u, '#cbb994', { stroke: '#120c0a', strokeThickness: 4 * u }).setOrigin(0.5, 0);
    this.bossTxt = txt(this, W / 2, 80 * u, '', 18 * u, '#ffcf6a', { stroke: '#120c0a', strokeThickness: 5 * u, fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.rotateButtons=C.view25d.fixedCamera?[]:[{x:W-240*u,y:52*u,r:34*u,dir:-1},{x:W-160*u,y:52*u,r:34*u,dir:1}];for(const b of this.rotateButtons){const ct=this.add.container(b.x,b.y);ct.add([this.add.circle(0,0,29*u,0x16211f,.9).setStrokeStyle(3*u,0xcbb994),txt(this,0,0,b.dir<0?'↶':'↷',29*u).setOrigin(.5)]);this.ctrlLayer.add(ct);}
    this.pauseBtn = { x: W - 60 * u, y: 52 * u, r: 44 * u };
    const pb = this.add.container(this.pauseBtn.x, this.pauseBtn.y);
    pb.add([this.add.circle(0, 0, 34 * u, 0x120c0a, 0.75).setStrokeStyle(3 * u, 0xcbb994), txt(this, 0, 0, 'Ⅱ', 26 * u, '#efe3c8', { fontStyle: 'bold' }).setOrigin(0.5)]);
    this.ctrlLayer.add(pb);
    this.bannerTxt = txt(this, W / 2, H * 0.3, '', 54 * u, '#f3e2b0', { stroke: '#120c0a', strokeThickness: 10 * u, fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0);
    this.bannerSub = txt(this, W / 2, H * 0.3 + 54 * u, '', 22 * u, '#efe3c8', { stroke: '#120c0a', strokeThickness: 6 * u }).setOrigin(0.5).setAlpha(0);
    if (this.B.over) this.ctrlLayer.setVisible(false);
    this.refreshLabels();
  }
  refreshLabels() {
    const w = C.weapons[this.B.player.weapon];
    const two = s => s.length > 2 ? s.slice(0, Math.ceil(s.length / 2)) + '\n' + s.slice(Math.ceil(s.length / 2)) : s;
    this.labels.atk.setText(w.name.length > 3 ? two(w.name) : w.name);
    this.labels.s1.setText(two(w.skill1.name));if(this.labels.s2)this.labels.s2.setText(two(w.skill2?.name||''));if(this.labels.s3)this.labels.s3.setText(two(w.skill3?.name||''));if(this.labels.dodge)this.labels.dodge.setText('闪避');
    if(this.equipWeapon) {this.equipWeapon.setText(w.name);const k=C.weaponArt[this.B.player.weapon];this.equipIcon.setTexture('v6_'+k+'_weapon');const im=this.equipIcon;const scale=54*this.u/Math.max(im.width,im.height);im.setScale(scale);}
  }
  banner(t, sub) {
    this.tweens.killTweensOf([this.bannerTxt, this.bannerSub]);
    this.bannerTxt.setText(t).setAlpha(0).setScale(0.6); this.bannerSub.setText(sub || '').setAlpha(0);
    this.tweens.add({ targets: this.bannerTxt, alpha: 1, scale: 1, duration: 260, ease: 'Back.Out' });
    this.tweens.add({ targets: this.bannerSub, alpha: 1, duration: 300, delay: 120 });
    this.tweens.add({ targets: [this.bannerTxt, this.bannerSub], alpha: 0, duration: 400, delay: 2100 });
  }
  hitBtn(x, y) { for (const k in this.btnDefs) { const b = this.btnDefs[k]; if (Math.hypot(x - b.x, y - b.y) < b.r * 1.15) return k; } return null; }
  onDown(p) {
    if (this.B.over || this.paused) return;
    if (Math.hypot(p.x - this.pauseBtn.x, p.y - this.pauseBtn.y) < this.pauseBtn.r) { this.togglePause(true); return; }
    for(const b of this.rotateButtons)if(Math.hypot(p.x-b.x,p.y-b.y)<b.r){this.B.rotateCamera(b.dir);return;}
    if(this.rescueButton.visible&&Math.abs(p.x-this.rescueZone.x)<this.rescueZone.w/2&&Math.abs(p.y-this.rescueZone.y)<this.rescueZone.h/2){this.btns.rescue=p.id;this.B.ctrl.rescue=true;return;}
    const k = this.hitBtn(p.x, p.y);
    if (k) { this.btns[k] = p.id; if(k==='atk'){this.B.ctrl.atk=true;this.B.player.combo.request(this.B.elapsed);} else this.B.ctrl[k] = true; return; }
    if(p.x>=this.scale.width*.5){this.B.pointerWorld=this.B.screenToWorld(p.x,p.y);return;}
    if (p.x < this.scale.width * 0.5 && this.joy.pid === null) { this.joy.pid = p.id; this.joy.cx = p.x; this.joy.cy = p.y; this.updJoy(p); }
  }
  onMove(p) { if (p.id === this.joy.pid) this.updJoy(p); }
  updJoy(p) {
    let dx = p.x - this.joy.cx, dy = p.y - this.joy.cy; const l = Math.hypot(dx, dy), R = this.joyR;
    if (l > R) { dx = dx / l * R; dy = dy / l * R; }
    this.joy.dx = dx; this.joy.dy = dy;
    if (Math.hypot(dx, dy) / R < 0.15) { this.B.ctrl.mx = 0; this.B.ctrl.my = 0; } else { this.B.ctrl.mx = dx / R; this.B.ctrl.my = dy / R; }
  }
  onUp(p) {
    if (p.id === this.joy.pid) { this.joy.pid = null; this.joy.dx = this.joy.dy = 0; this.joy.cx = this.joyHome.x; this.joy.cy = this.joyHome.y; this.B.ctrl.mx = this.B.ctrl.my = 0; }
    for (const k in this.btns) if (this.btns[k] === p.id) { delete this.btns[k]; if (k === 'atk') this.B.ctrl.atk = false;if(k==='rescue')this.B.ctrl.rescue=false; }
  }
  releaseAll() {
    this.joy.pid = null; this.joy.dx = this.joy.dy = 0; if (this.joyHome) { this.joy.cx = this.joyHome.x; this.joy.cy = this.joyHome.y; }
    this.btns = {}; if (this.B && this.B.ctrl) Object.assign(this.B.ctrl, { mx: 0, my: 0, atk: false, rescue:false });
  }
  togglePause(on) {
    const W = this.scale.width, H = this.scale.height, u = this.u;
    this.releaseAll(); this.paused = on;
    if (!on) return;
    this.scene.pause('Battle'); AUD.pause('manual');
    const L = this.add.container(0, 0);
    L.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive());
    L.add(txt(this, W / 2, H * 0.27, '暂停', 58 * u, '#f3e2b0', { stroke: '#120c0a', strokeThickness: 8 * u, fontStyle: 'bold' }).setOrigin(0.5));
    const mk = (y, s, fn) => { const c = this.add.container(W / 2, y); c.add([this.add.rectangle(0, 0, 320 * u, 84 * u, 0x6b2a1a).setStrokeStyle(5 * u, 0x120c0a), txt(this, 0, 0, s, 30 * u, '#fff4d6', { fontStyle: 'bold' }).setOrigin(0.5)]); c.setSize(320 * u, 84 * u).setInteractive(); c.on('pointerup', fn); L.add(c); };
    mk(H * 0.45, '继续战斗', () => { L.destroy(); this.paused = false; AUD.unlock(); AUD.resume('manual'); this.scene.resume('Battle'); });
    mk(H * 0.58, '重新开始', () => restartBattle(this, this.B.heroKey, this.B.teamKeys));
    mk(H * 0.71, '重选英雄', () => backToSelect(this));
  }
  update() {
    const B = this.B; if (!B || !B.player || !this.g) return;
    const g = this.g, u = this.u, j = this.joy; g.clear();
    g.fillStyle(0x120c0a, 0.45).fillCircle(j.cx, j.cy, this.joyR); g.lineStyle(5 * u, 0xcbb994, 0.6).strokeCircle(j.cx, j.cy, this.joyR);
    g.fillStyle(0xe8d9b5, j.pid !== null ? 0.95 : 0.6).fillCircle(j.cx + j.dx, j.cy + j.dy, 42 * u); g.lineStyle(5 * u, 0x120c0a).strokeCircle(j.cx + j.dx, j.cy + j.dy, 42 * u);
    const h = B.player, w = B.W(h),down=B.nearestDowned(h);this.rescueButton.setVisible(!!down&&!h.dead&&!this.paused&&!B.over);if(down)this.rescueLabel.setText('按住救助 '+Math.floor((down.rescueProgress||0)/C.rescue.seconds*100)+'%');
    if(this.comboTxt){const h=this.B.player,c=h.combo,active=h.clock&&!h.clock.done&&h.action==='attack';this.comboTxt.setText(active?'第'+c.step+'式 · '+h.attackProfile.label:c.step&&this.B.elapsed<c.deadline?'可接第'+(c.step%3+1)+'式':'普攻三式');}
    const ex=this.equipX,ey=this.equipY;
    const build=B.buildStats;this.clothesLabel.setText('衣服 +'+((build?.stacks.ward||0)+(build?.stacks.vitality||0)));this.shoesLabel.setText('鞋 +'+(build?.stacks.haste||0));
    this.hpHeart.setText(Math.ceil(Math.max(0,h.hp))+'\n/'+h.maxHp);
    const heart=[];for(let i=0;i<=80;i++){const a=i/80*Math.PI*2;heart.push(new Phaser.Math.Vector2(ex-104*u+Math.pow(Math.sin(a),3)*46*u,ey-(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))*3*u));}
    g.fillStyle(0x351319,.9).fillPoints(heart,true);g.lineStyle(7*u,0x170e0d).strokePoints(heart,true);
    const progress=heart.slice(0,Math.max(2,Math.ceil(81*Math.max(0,h.hp/h.maxHp))));g.lineStyle(4*u,h.hp/h.maxHp<.25?0xff594f:0xc83f42).strokePoints(progress,false);
    for(let i=0;i<3;i++){const x=ex+i*76*u;const pts=[{x:x-32*u,y:ey-33*u},{x:x+29*u,y:ey-35*u},{x:x+34*u,y:ey+29*u},{x:x-30*u,y:ey+33*u}];g.fillStyle(0x211915,.92).fillPoints(pts,true);g.lineStyle(5*u,0x100d0c).strokePoints(pts,true);g.lineStyle(1.5*u,i===0?0xb49b62:0x786c58).strokePoints(pts,true);}
    // 衣与鞋的原创简笔图标；三个热区不会侵占最大普攻按钮。
    g.lineStyle(3*u,0xc4b18d);g.beginPath();g.moveTo(ex+55*u,ey-18*u);g.lineTo(ex+66*u,ey-25*u);g.lineTo(ex+76*u,ey-16*u);g.lineTo(ex+86*u,ey-25*u);g.lineTo(ex+97*u,ey-18*u);g.lineTo(ex+101*u,ey-4*u);g.lineTo(ex+90*u,ey);g.lineTo(ex+90*u,ey+21*u);g.lineTo(ex+62*u,ey+21*u);g.lineTo(ex+62*u,ey);g.lineTo(ex+51*u,ey-4*u);g.closePath();g.strokePath();
    g.beginPath();g.moveTo(ex+143*u,ey-19*u);g.lineTo(ex+160*u,ey-19*u);g.lineTo(ex+160*u,ey+5*u);g.lineTo(ex+174*u,ey+12*u);g.lineTo(ex+174*u,ey+21*u);g.lineTo(ex+139*u,ey+21*u);g.closePath();g.strokePath();
    for (const k in this.btnDefs) {
      const b = this.btnDefs[k], pressed = this.btns[k] !== undefined, cdKey = {atk:'attack',s1:'skill1',s2:'skill2',s3:'skill3',dodge:'dodge'}[k];
      const total = k==='dodge'?C.solo.dodge.cooldown:w[cdKey].cooldown, cd = h.cd[cdKey], r = b.r * (pressed ? 0.92 : 1);
      g.fillStyle(0x000000, 0.35).fillCircle(b.x + 4 * u, b.y + 6 * u, b.r);
      g.fillStyle(k === 'atk' ? 0xa8321e : k==='dodge'?0x3d5a78:0x2f4a48, h.dead ? 0.35 : 0.92).fillCircle(b.x, b.y, r);
      if (pressed) g.fillStyle(0xffffff, 0.18).fillCircle(b.x, b.y, r);
      g.lineStyle(6 * u, 0x120c0a).strokeCircle(b.x, b.y, r); g.lineStyle(2 * u, 0xf5c542, 0.7).strokeCircle(b.x, b.y, r * 0.84);
      if (cd > 0 && k !== 'atk') {
        g.fillStyle(0x000000, 0.62); g.slice(b.x, b.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (cd / total), false); g.fillPath();
        this.labels[k + 'cd'].setText(cd >= 1 ? String(Math.ceil(cd)) : cd.toFixed(1)); this.labels[k].setAlpha(0.3);
      } else { this.labels[k + 'cd'].setText(''); this.labels[k].setAlpha(1); }
    }
    for (const t of this.teamUI) {
      const hh = t.h, bw = 220 * u;
      t.nm.setText(hh.def.name + (hh.isPlayer ? '（你）' : '·AI') + ' · ' + C.weapons[hh.weapon].name + (hh.downed?' · 倒地 '+Math.round((hh.rescueProgress||0)/C.rescue.seconds*100)+'%':hh.dead?' · 阵亡':''));
      g.fillStyle(0x2a201a).fillRect(t.x + 58 * u, t.y + 30 * u, bw, 14 * u);
      g.fillStyle(hh.dead ? 0x555555 : hh.isPlayer ? 0x6ad06a : 0x4aa3df).fillRect(t.x + 58 * u, t.y + 30 * u, bw * Math.max(0, hh.hp / hh.maxHp), 14 * u);
      t.im.setAlpha(hh.dead ? 0.35 : 1);
    }
    const wi = B.waveIdx, total = C.waves.length;
    const unit=C.solo?'间':'波';if(B.phase==='break'){this.waveTxt.setText(B.absoluteWave?'前往下一间':'准备战斗');this.subTxt.setText('第 '+((B.absoluteWave||0)+1)+' '+unit+' · '+Math.max(0,Math.ceil(B.breakT))+' 秒');}else if(B.encounter){this.waveTxt.setText((B.settings.loops>1?'第'+B.encounter.loopNumber+'轮 · ':'')+B.encounter.name);this.subTxt.setText('进度 '+B.absoluteWave+'/'+(B.settings.loops*(C.waves.length-B.debugWaveOffset))+' '+unit+' · 剩余妖物 '+(B.alive(B.enemies).length+B.spawnQ.length));}
    const bs = B.boss;
    if (bs && !bs.dead) {
      const bw = 560 * u, x = this.scale.width / 2 - bw / 2, y = 108 * u;
      this.bossTxt.setText(C.boss.name + (bs.phase === 2 ? ' · 暴怒' : ''));
      g.fillStyle(0x120c0a, 0.9).fillRect(x - 4 * u, y - 4 * u, bw + 8 * u, 26 * u);
      g.fillStyle(bs.phase === 2 ? 0xe0531f : 0xa8321e).fillRect(x, y, bw * bs.hp / bs.maxHp, 18 * u);
      g.lineStyle(3 * u, 0xf5c542).lineBetween(x + bw * C.boss.phase2At, y - 4 * u, x + bw * C.boss.phase2At, y + 22 * u);
    } else this.bossTxt.setText('');
  }
}
function restartBattle(scene, hero, team, settings) {
  settings=settings||scene.B?.settings||scene.d?.settings||scene.scene.get('Battle')?.settings;window.RunUI.close();AUD.resume('reward');
  const sm = scene.scene; sm.stop('Result'); sm.stop('HUD');
  sm.get('Battle').scene.restart({ hero, team,settings,restart:true });
}
function backToSelect(scene) {
  window.RunUI.close();AUD.resume('reward'); AUD.setMode('silent'); AUD.resume('manual'); const sm = scene.scene; sm.stop('Result'); sm.stop('HUD'); sm.stop('Battle'); sm.start('Select'); }

/* ======================= 结算 ======================= */
class Result extends Phaser.Scene {
  constructor(){super('Result');}
  create(d){this.d=d;window.RunUI.results(d,()=>restartBattle(this,d.hero,d.team,d.settings),()=>backToSelect(this));this.events.once('shutdown',()=>window.RunUI.close());}
}

/* ======================= 启动（按设备像素比渲染，保证 iPad 视网膜屏清晰） ======================= */
const s0 = viewSize();
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', backgroundColor: '#120e0c',
  width: s0.w, height: s0.h,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 6 },
  render: { antialias: true, powerPreference: 'high-performance' },
  fps: { target: 60 },
  scene: [Boot, Select, Battle, HUD, Result],
});
let rt = null;
function refit() { clearTimeout(rt); rt = setTimeout(() => { const s = viewSize(); if (s.w > 0 && s.h > 0 && (s.w !== game.scale.width || s.h !== game.scale.height)) game.scale.setGameSize(s.w, s.h); }, 150); }
window.addEventListener('resize', refit); window.addEventListener('orientationchange', refit);
document.addEventListener('visibilitychange', () => { const h = game.scene.getScene('HUD'); if (document.hidden && h && h.sys.isActive()) h.releaseAll(); });
window.__game = game;
})();
