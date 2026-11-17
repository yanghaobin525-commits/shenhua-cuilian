# 40张人物PNG alpha第二轮专项检查（v8）

2026-11-17 14:25 Asia/Shanghai已写回生产。

## 范围与实际改动

40/40已逐格看图：8选角、24战斗方向、8独立武器；深黑、暗青、洋红、浅底合成，8张角色原尺寸五图页与6处2倍像素对比。

**实际修改26张，14张无需修改，后者保持字节完全不变。**

修改：哪吒/二郎神/嫦娥/悟空/八戒/沙僧各自选角及3向（24张），加白龙马选角（1张）、嫦娥独立团扇（1张）。团扇只清19个孤立浅色像素，无改扇面/金属高光。

无需修改：唐僧全部5张；哪吒/二郎神/悟空/八戒/沙僧/白龙马的独立武器6张；白龙马3战斗方向，共14张。已看图，未造修改。

## 发现和处理

- 黑色发髻、碎毛外沿仍有细纸白复描带/针点，局部邻近暗墨估计alpha并去底色。不是强腐蚀描边；原黑发/碎毛的暗墨线保留。
- 嫦娥发髻外侧整段白带与发环内剩余小纸底用明确局部连通区mask清理。保留白色发饰和衣袖。
- 八戒/二郎神/白龙马脚边残留浅纸底阴影线局部清理，人物黑靴/银靴、剑刃不改。
- 哪吒红绫、臂腰等此前13处大洞没有复发，无需重新挖洞或改造型。其他武器未发现需重做的大白底，不能为凑数全删白。

## 数值验证

- 40张画布尺寸不变；8份manifest SHA256不变，脚底/握点配置未动。
- **全部2682582个可见暗墨像素（RGB平均<110）RGBA逐像素一致**，含抗锯齿细线，不把模糊/腐蚀当修复。
- 11组固有白色采样RGBA完全不变：皮肤、眼白、白袖、白发、白鳞、牙齿、银刃等。
- 额外区域检查：沙僧耳肤1640像素、哪吒左右莲瓣5729个可见暖色像素完全不变。
- 旧13处透明孔alpha仍0；嫦娥新增8个发髻/发环局部探针alpha均0，前后值详见verified-probes.json。
- 新变透明3311像素、降低alpha7002像素；小于等于3像素的独立浅色连通块从40处到0处。此规则仅检查独立点，不把整片白发/眼白当噪点。

## 交付与缓存

- `DELIVERY-before-after-dark40.jpg`：同位暗底总览，左清理前右清理后。
- `after-{black,teal,magenta,light}-all40.jpg`：四底色全量检查。
- `before-native-*.jpg / after-native-*.jpg`：每位选角+3向+武器，实际尺寸排版。
- `detail-0..5-{black,magenta,light}.jpg`：左旧右新；发髻、碎毛、阴影放大。
- `updated-files.txt / unchanged-files.txt`：精确生产文件清单。
- `production-hashes.json`：40张最后PNG SHA256，供整合方做缓存键/发布后核验。哈希清单本身SHA256：`fd25c67442050404e41c4afafd4fdf6a4d368d65352c40050c751c71a9c8fd9d`。
- `verified-probes.json`：数值探针与统计；`candidate-report.json`：每文件处理量及前后摘要。
- `backup/assets/`：本轮开始时的40张不可变备份，未覆盖角色定稿JPG。

## 真实边界

保留了原画浅灰阴影、合法浅色高光和细丝；它们不是能全局抹掉的背景。原生JPG/AI细线有少量灰色微粒和断续笔触，不声称每个亮点都必须消失，更不把白发/肤色删成洞。当前4底总览与原尺寸逐格未见大块不透明背景白底，重点发髻白带明显消失；还需整合方在实际放大渲染/iPad截图检查。没有更换角色设计，没有重生成。

未动代码、manifest、run-system、场景或git。上述为美术生产侧交付记录；最终整合、缓存版本和公开部署另由运行时代码/浏览器验收确认。

### 实际更新文件
```
assets/selection-v6/nezha.png
assets/approved-v6/nezha/front.png
assets/approved-v6/nezha/back.png
assets/approved-v6/nezha/side.png
assets/selection-v6/erlang.png
assets/approved-v6/erlang/front.png
assets/approved-v6/erlang/back.png
assets/approved-v6/erlang/side.png
assets/selection-v6/change.png
assets/approved-v6/change/front.png
assets/approved-v6/change/back.png
assets/approved-v6/change/side.png
assets/approved-v6/change/weapon.png
assets/selection-v6/wukong.png
assets/approved-v6/wukong/front.png
assets/approved-v6/wukong/back.png
assets/approved-v6/wukong/side.png
assets/selection-v6/bajie.png
assets/approved-v6/bajie/front.png
assets/approved-v6/bajie/back.png
assets/approved-v6/bajie/side.png
assets/selection-v6/shaseng.png
assets/approved-v6/shaseng/front.png
assets/approved-v6/shaseng/back.png
assets/approved-v6/shaseng/side.png
assets/selection-v6/bailong.png
```

### 检查无需更新文件
```
assets/approved-v6/nezha/weapon.png
assets/approved-v6/erlang/weapon.png
assets/selection-v6/tangseng.png
assets/approved-v6/tangseng/front.png
assets/approved-v6/tangseng/back.png
assets/approved-v6/tangseng/side.png
assets/approved-v6/tangseng/weapon.png
assets/approved-v6/wukong/weapon.png
assets/approved-v6/bajie/weapon.png
assets/approved-v6/shaseng/weapon.png
assets/approved-v6/bailong/front.png
assets/approved-v6/bailong/back.png
assets/approved-v6/bailong/side.png
assets/approved-v6/bailong/weapon.png
```
