"""Compose actual browser frame crops; no artwork generation or retouching."""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
O=ROOT/'screens/v11.3';R=O/'raw'
F=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',16)
def make(name,keys,title):
 w=286;h=221;pad=8;label=28
 out=Image.new('RGB',(len(keys)*(w+pad)+pad,52+4*(h+label+pad)),'#211c18');d=ImageDraw.Draw(out)
 d.text((8,8),title,font=F,fill='#f2d8a2')
 for row,direction in enumerate(['right','left','down','up']):
  for col,key in enumerate(keys):
   p=R/(direction+'-'+key+'.png');im=Image.open(p).convert('RGB').crop((80,200,520,540)).resize((w,h));x=pad+col*(w+pad);y=52+row*(h+label+pad);out.paste(im,(x,y));d.text((x,y+h+3),direction+' '+key,font=F,fill='#eee2cb')
 out.save(O/name)
make('run-cycle-four-directions.png',['idle','f0-0','f1-1','f2-2','f3-3','f0-4'],'v11.3 t137 · 四向完整跑步周期 f0→1→2→3→0；固定同一只手，手在棍上（1024×600触屏模拟）')
make('stop-start-mirror-dodge.png',['idle','restart','dodge','stop'],'v11.3 t137 · 待机→起跑→闪避→停步；右/左镜像与正/背面斜持；无新画替换')
