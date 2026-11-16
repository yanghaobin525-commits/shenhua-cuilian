# 神话·淬炼

中国神话单机竞技场，适配 iPad Safari 横屏触屏。

左侧摇杆移动，右下按住普攻，武器单主动按钮显示冷却。波次间走近武器即可拾取替换。

英雄只有被动天赋，普攻与技能由当前武器决定。数值与中文说明见 config.js。

Phaser 3.90.0 本地打包，MIT 许可证见 lib/PHASER-LICENSE.md。其他代码及游戏图像为本项目原创。无付费、无个人信息收集。


## approved-v6 接入与验收

- 选角使用 `assets/selection-v6`，源文件追溯在其 manifest；哪吒沿用获批原稿，悟空/八戒沿用 v5，另五人 v6。只去纸底，不用于战斗。
- 战斗专用 `assets/approved-v6/{hero}/{front,back,side,weapon}.png`。512 方形、透明、脚底约 0.92；目录由美术维护。
- 每人 `manifest.json` 支持下面的标准结构（全部坐标 normalized）：

```json
{"footY":0.92,"sideFaces":"right","views":{"front":{"handAnchor":{"x":0.3,"y":0.55}},"back":{"handAnchor":{"x":0.7,"y":0.55}},"side":{"handAnchor":{"x":0.65,"y":0.55}}},"weapon":{"grip":{"x":0.5,"y":0.7},"rotation":0}}
```

也兼容顶层 `handAnchor: {front,back,side}`；必须提供真实握点，不能用默认假坐标糊弄。

- `combat-art.js` 是图像局部网格形变，**不是骨骼分件**：呼吸、左右腿交替、手臂区域普攻挥动/施法上举；独立武器跟随同一手锚，背向压在身体后面，正面以空手真实像素盖过握杆。视觉表现及手机性能仍须真实素材测评。
- 保留五人 AI、波次/Boss、碰撞伤害系统；AI 与玩家均只用武器 skill1。UI 是红心血环 + 武器/衣/鞋三个槽；衣鞋目前仅展示基础装备，尚未实现衣鞋替换，不能宣称支持换衣鞋。
- Boot 对缺失/缺握点素材直接显示阻塞，不降级成旧图。

### 验证

```sh
npm test                  # 音频和 mocked renderer 契约，不是实际美术验收
npm run test:v6           # 生产资产门禁 + 真正 headless iPad 横屏触控/八人/朝向/换武器/命中/Boss 测试
node test/v6-browser.cjs https://yanghaobin525-commits.github.io/shenhua-cuilian/
```

本地测试需在 8787 端口启动 HTTP 静态服务。截图保存 `screens/v6-*.png`，结果 `screens/v6-test-report.json`。
发布仅在生产门禁及实际浏览器测试通过、Read 截图检查后普通 commit/push；不提交 art-direction、art-reference 等参考大目录，不强推。


### 已知边界

- 战斗素材是新绘的空手三向图，实际约 2.2–2.5 头身；与选角立绘用途不同。局部网格动画不是独立骨骼、不是逐帧重绘。
- 正背图的持手解剖侧别有个别不连续，按各视图真实手心挂点绘制；不承诺完整三维旋转或左右非对称装备始终同侧。
- 接入视觉核对修正了二郎神落在透明像素的武器握点，以及八戒/沙僧/白龙实际左向侧图被误标 right、手点偏离掌心的问题。
- 八戒战斗用耙偏钢灰，非选角青绿色；极小尺寸下毛发布线与细纹会合并。部分透明图边缘仍有浅色抠图残边，未抹掉原手绘笔触。
- 衣鞋槽当前只展示基础装备；换武器与单主动同步，衣鞋换装尚未实现。
- 自动触屏检查运行在 headless Chromium 的 iPad 横屏尺寸/多触点环境，不等同于真实 iPad Safari 硬件验收。

唐僧最终局部修正：侧面朝右、袈裟远侧左肩，锡杖九环已补成 3+3+3；接入握点改为 (318,224)/512。橙袍仍有轻微金格残留。
