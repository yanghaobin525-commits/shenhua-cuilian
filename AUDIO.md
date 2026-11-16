# 音频模块接入说明（本地待整合，未发布）

## 设计
- 原创固定 16 小节 D 羽调式配乐，八分音符旋律具有反复/应答/收束，不是随机选音。
- 拨弦式短包络三角波旋律 + 低音持续根音 + 下滑低鼓 + 极轻噪声打击 + 非整数泛音钟磬。
- 普通竞技场 88 BPM；Boss 104 BPM，并加鼓点和低拨弦。每次模式切换只有一条调度器；取消旧配乐节点后从第 1 小节开始。
- 十类合成音效：hit/hurt/skill/heal/pickup/wave/boss/bossPhase/victory/defeat。
- Master/music/sfx 三路音量，压缩器限制叠加峰值；命中 85ms、受伤 220ms 等节流，最多 64 个 voice，AI 音效衰减。
- 不含下载音频/商业素材/联网请求；噪声打击使用固定种子，主旋律严格固定。

## API（不创建任何 UI）
```js
const a = window.ShenhuaAudio;
// 必须在 pointerdown/keydown/可信确认按钮事件内立即调用，不要先 await 其他工作。
a.unlock();
a.setMode('arena'); // 'boss' 或 'silent'
a.play('skill', {ai:false});
a.setMuted(true);
a.setVolume(0.42); // 总音量 0..1
a.setMusicVolume(0.48);
a.setSfxVolume(0.5);
a.pause('manual'); a.resume('manual'); // 按原因计数，hidden/manual 不相互覆盖
a.getState(); // 无敏感信息，返回 context、voices、暂停原因和错误状态
```

音量初始参数在 `config.js` 的 `audio`。不持久化到 localStorage（避免隐私存储、跨版状态混乱）；未来音量 UI 可自行选择保存偏好。

## 已挂接
- `<script>` 顺序：config.js → audio.js → game.js。
- 确认出战解锁；第一次可信 pointerdown/keydown 也可解锁，便于调试直达战斗。
- Battle 创建播放 arena；Boss 出现切 boss；二阶段提示；伤害/技能/治疗/拾取/开波/胜负事件。
- 暂停菜单、后台切换、pagehide/pageshow 暂停/恢复；不恢复遗漏的音符队列，不追补爆音。
- 结算停止 BGM 播放结算短句；重选静音；重开复用同一个 AudioContext。

## 验证与待验
- `node --check audio.js` / config.js / game.js 通过。
- `node test/audio-system.test.cjs`（文件在原本忽略的 test/ 下）：模拟 Web Audio API，验证延迟解锁、84 秒谱面调度、单实例、全部音效、声部上限、清理、前后台和手动暂停叠加。没有驱动浏览器。
- **尚未人工试听，也未运行真实 Safari/AudioContext 播放测试。** 需要父会话通过 computerUse 在 iPad Safari 点确认出战、试听 16 小节、Boss 切换、检查后台返回、静音与音量。旋律悦耳程度、动态范围和设备扬声器实听都待验证。
- `dist/shenhua-cuilian.html` 和 `build_single.py` 尚未更新：旧单文件版本仍无本模块；未来打包时必须把 audio.js 内联在 config 和 game 之间。当前不重建、不部署、不 push。
- 此次不添加音量 UI，不改任何英雄美术或 UI 布局。
