"""Read-only production asset gate; never creates or replaces an artist's files."""
from pathlib import Path
from PIL import Image
import json,sys
root=Path(__file__).resolve().parent.parent
ids=['nezha','erlang','change','tangseng','wukong','bajie','shaseng','bailong'];errors=[]
for key in ids:
 d=root/'assets/approved-v6'/key
 for view in ['front','back','side','weapon']:
  p=d/(view+'.png')
  if not p.exists():errors.append(str(p.relative_to(root)));continue
  im=Image.open(p)
  if im.size!=(512,512):errors.append(f'{key}/{view}: expected 512x512, got {im.size}')
  if im.mode!='RGBA' or im.getextrema()[3][0]!=0:errors.append(f'{key}/{view}: no transparent alpha')
 p=d/'manifest.json'
 if not p.exists():errors.append(str(p.relative_to(root)))
 else:
  try:
   m=json.loads(p.read_text())
   for view in ['front','back','side']:
    a=m['views'][view]['handAnchor']
    if not all(isinstance(a[z],(float,int)) and 0<a[z]<1 for z in ['x','y']):errors.append(f'{key}/{view}: invalid normalized hand anchor')
   g=m['weapon']['grip']
   if not all(isinstance(g[z],(float,int)) and 0<g[z]<1 for z in ['x','y']):errors.append(f'{key}: invalid weapon grip')
   wp=d/'weapon.png'
   if wp.exists() and Image.open(wp).getpixel((round(g['x']*512),round(g['y']*512)))[3]<128:errors.append(f'{key}: weapon grip is transparent, not in handle')
   if m.get('sideFaces') not in ['left','right']:errors.append(f'{key}: invalid sideFaces')
  except Exception as e:errors.append(f'{key}/manifest: {e}')
if errors:
 print('BLOCKED: approved-v6 production handoff incomplete/invalid:\n'+'\n'.join(errors));sys.exit(1)
print('PASS: all 32 transparent 512px production PNGs and 8 JSON manifests exist. This does not certify drawing quality or anchors.')
