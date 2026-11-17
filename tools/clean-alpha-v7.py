#!/usr/bin/env python3
"""Semantic-seeded cavity matte and localized white-paper edge decontamination.
Reads immutable backup; preserves image geometry and all manifests. No global white deletion.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from scipy import ndimage as ndi
import numpy as np,json,hashlib,argparse
ROOT=Path(__file__).resolve().parents[1];QA=ROOT/'art-direction/alpha-cleanup-v7';BACK=QA/'backup';CAND=QA/'candidate'
IDS=['nezha','erlang','change','tangseng','wukong','bajie','shaseng','bailong']
# All coordinates refer to the unscaled production PNG, after looking at its anatomy.
SEEDS={
 'selection-v6/nezha.png':[(145,340),(465,340),(155,480),(240,490),(200,610),(478,675),(451,614),(194,300),(403,267),(488,342),(449,323),(137,423),(141,509),(400,537),(428,422),(448,607)],
 'selection-v6/erlang.png':[(217,400),(448,389),(290,614),(329,926),(422,919)],
 'selection-v6/change.png':[(279,78),(338,104),(124,405),(397,402),(482,832),(364,203)],
 'selection-v6/wukong.png':[(280,544),(440,409),(277,633),(465,706)],
 'selection-v6/bajie.png':[(475,295),(471,579),(422,692),(285,845)],
 'selection-v6/tangseng.png':[(100,208),(35,217),(44,262),(88,278),(12,285),(30,285),(46,285),(126,282),(145,282),(162,282),(70,334),(85,334),(108,334)],
 'selection-v6/shaseng.png':[(247,889),(242,887)], 'selection-v6/bailong.png':[],
 'approved-v6/change/front.png':[(148,241),(335,249)],
 'approved-v6/change/back.png':[(217,305),(296,305)],
 'approved-v6/change/side.png':[(208,260)],
 'approved-v6/bajie/front.png':[(260,435),(359,346)],
 'approved-v6/bajie/back.png':[(256,440)],
 'approved-v6/bajie/side.png':[(256,450)],
 'approved-v6/bailong/front.png':[(256,430)],
 'approved-v6/bailong/back.png':[(256,430)],
 'approved-v6/bailong/side.png':[(256,450)],
}

def files():
 for id in IDS:
  yield Path('assets/selection-v6')/(id+'.png')
  for v in ['front','back','side','weapon']:yield Path('assets/approved-v6')/id/(v+'.png')

def paper(im):
 a=np.array(im);rgb=a[:,:,:3].astype(float);al=a[:,:,3]/255.
 # Existing exterior transparent pixel RGB preserves the original paper colour in portraits.
 old=rgb[(al==0)&(rgb.min(2)>175)]
 B=np.median(old,axis=0) if len(old)>100 else np.array([250.,248.,244.])
 return rgb,al,B

def mask_cavities(rgb,al,B,key):
 # Semantic seeds only. Light solid eyes, pale skin, sleeves, dragon scales are never selected globally.
 eligible=(rgb.min(2)>181)&((rgb.max(2)-rgb.min(2))<68)&(np.linalg.norm(rgb-B,axis=2)<105)&(al>.01)
 seed=np.zeros(al.shape,bool);used=[]
 for x,y in SEEDS.get(key,[]):
  if not(0<=x<al.shape[1] and 0<=y<al.shape[0]):continue
  if eligible[y,x]:seed[y,x]=True;used.append([x,y])
 # Gold khakkhara has no intrinsically white paint: only its explicitly bounded open crown/rings.
 if key=='selection-v6/tangseng.png':
  yy,xx=np.indices(al.shape);seed|=eligible&(xx<176)&(yy>120)&(yy<375)&(rgb.min(2)>218)
 if key=='selection-v6/bajie.png':
  yy,xx=np.indices(al.shape);seed|=eligible&(yy>880)
 if key=='approved-v6/tangseng/weapon.png':
  yy,xx=np.indices(al.shape);seed|=eligible&(yy<205)&(rgb.min(2)>218)
 # Rake is blue-green metal and dark wood, no intrinsically white areas.
 if key=='approved-v6/bajie/weapon.png':seed|=eligible&(rgb.min(2)>226)
 holes=ndi.binary_propagation(seed,mask=eligible)
 # Black-haired Sha's detached curls enclose paper. Protect the entire central face/ears,
 # leaving the white eyes and warm pale skin untouched. Keep all dark authored hair filaments.
 if key=='selection-v6/shaseng.png':
  yy,xx=np.indices(al.shape)
  hairROI=(yy<400)&(xx>150)&(xx<585)&~((xx>218)&(xx<490)&(yy>180))
  hairPaper=eligible&hairROI&(np.linalg.norm(rgb-B,axis=2)<65)
  hairSeeds=hairPaper&(rgb.min(2)>220)
  holes|=ndi.binary_propagation(hairSeeds,mask=hairPaper)
 lab,n=ndi.label(holes);regions=[]
 for i,sl in enumerate(ndi.find_objects(lab),1):
  ar=int((lab[sl]==i).sum());ys,xs=sl
  if ar>8:regions.append({'box':[xs.start,ys.start,xs.stop,ys.stop],'area':ar})
 return holes,used,regions

def clean(im,key):
 rgb,oldA,B=paper(im);holes,seeds,regions=mask_cavities(rgb,oldA,B,key)
 A=oldA.copy();A[holes]=0
 # Thin detached exterior paper slivers are not black flyaway ink. Semantic exceptions:
 # never apply this component rule to intrinsic-white dragon hair/scales or independent metal weapons.
 if not key.endswith('/weapon.png') and 'bailong' not in key:
  pa=(np.linalg.norm(rgb-B,axis=2)<14)&(rgb.min(2)>210)&(A>.01)
  labels,n=ndi.label(pa);sz=np.bincount(labels.ravel())
  outside=ndi.binary_dilation(A<.01)
  touch=np.unique(labels[outside&pa]);dt0=ndi.distance_transform_edt(A>.01)
  small=touch[(sz[touch]<180)&(sz[touch]>0)]
  sliver=np.isin(labels,small)&(dt0<=3.2)
  # Preserve the broad bright bevels of spear blades in selection art.
  yy,xx=np.indices(A.shape)
  if key=='selection-v6/nezha.png':sliver&=~((xx<85)&(yy<300))
  if key=='selection-v6/erlang.png':sliver&=~(((xx>365)&(yy>760))|((xx<90)&(yy>400)&(yy<495)))
  A[sliver]=0;holes|=sliver
 # Remove only disconnected paper-coloured pixels that border existing transparency.
 occupied=A>.015;dist=ndi.distance_transform_edt(occupied)
 # Reference colours from interior, not a global erosion of the delivered alpha.
 core=(A>.97)&(dist>1.6)
 if core.sum()<10:core=(A>.9)&(rgb.min(2)<160)
 dref,ix=ndi.distance_transform_edt(~core,return_indices=True)
 F=rgb[ix[0],ix[1]]
 band=occupied&(dist<=2.25)&(dref<5.1)
 # A bright leftover paper strip can itself be the nearest 2px core. Look for adjacent authored dark ink.
 dark=(oldA>.97)&(rgb.min(2)<145)&(~holes)
 if dark.any():
  dd,di=ndi.distance_transform_edt(~dark,return_indices=True)
  nearInk=band&(rgb.min(2)>185)&(F.min(2)>185)&(dd<2.25)
  F[nearInk]=rgb[di[0][nearInk],di[1][nearInk]]
 D=F-B;den=(D*D).sum(2)
 # Alpha from observed colour along the local foreground-to-paper line.
 t=np.divide(((rgb-B)*D).sum(2),den,out=np.ones_like(A),where=den>1)
 t=np.clip(t,0,1)
 # Bright genuine hair, skin highlights, sleeves: no matte inference from a similarly bright interior.
 reliable=band&(den>6000)&(F.min(2)<185)
 A[reliable]=np.minimum(A[reliable],t[reliable])
 # Decontaminate RGB, not merely making the white fringe translucent.
 demat=reliable&(t<.985)&(t>.035)
 outRGB=rgb.copy()
 un=(rgb-(1-t[:,:,None])*B)/np.maximum(t[:,:,None],.035)
 outRGB[demat]=np.clip(un[demat],0,255)
 # Near-paper isolated flecks remain distinguishable from authored dark flyaway hair.
 fleck=band&(t<.035)&(np.linalg.norm(rgb-B,axis=2)<68)
 A[fleck]=0
 A[A<.012]=0
 # Remove tiny detached low-opacity paper debris, preserve dark ink filaments.
 ll,n=ndi.label(A>.025);sizes=np.bincount(ll.ravel())
 if n:
  for idx in np.where((sizes<=3)&(sizes>0))[0]:
   if idx==0:continue
   m=ll==idx
   if rgb[m].mean()>185:A[m]=0
 # Straight-alpha PNG with edge-colour bleed into fully transparent texels.
 good=A>.1
 if good.any():
  dt,near=ndi.distance_transform_edt(~good,return_indices=True)
  zero=A==0;bleed=zero&(dt<=5);outRGB[bleed]=outRGB[near[0][bleed],near[1][bleed]]
  outRGB[zero&(dt>5)]=0
 arr=np.dstack([np.rint(np.clip(outRGB,0,255)).astype(np.uint8),np.rint(A*255).astype(np.uint8)])
 return Image.fromarray(arr,'RGBA'),{'paperColour':B.tolist(),'manualSeedsUsed':seeds,'cavityRegions':regions,'clearedOpaquePixels':int(((oldA>.5)&(A<.02)).sum()),'softEdgePixels':int(((A>0)&(A<.99)).sum()),'edgeRGBDecontaminated':int(demat.sum())}

def compose(im,bg):
 bg=bg.copy();bg.alpha_composite(im.convert('RGBA'));return bg.convert('RGB')
def background(size,kind):
 if kind=='black':return Image.new('RGBA',size,(10,12,17,255))
 if kind=='light':return Image.new('RGBA',size,(239,230,209,255))
 if kind=='brown':return Image.new('RGBA',size,(43,27,23,255))
 im=Image.new('RGBA',size);d=ImageDraw.Draw(im)
 for y in range(0,size[1],24):
  for x in range(0,size[0],24):d.rectangle((x,y,x+23,y+23),fill=((69,105,128,255) if (x//24+y//24)%2 else (144,87,106,255)))
 return im

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--apply',action='store_true');args=ap.parse_args();report=[]
 for rel in files():
  src=BACK/rel;im=Image.open(src).convert('RGBA');key=str(rel)[len('assets/'):]
  out,rec=clean(im,key);dest=CAND/rel;dest.parent.mkdir(parents=True,exist_ok=True);out.save(dest)
  if args.apply:out.save(ROOT/rel)
  rec.update({'file':str(rel),'size':im.size,'sourceBackupSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'resultSha256':hashlib.sha256(dest.read_bytes()).hexdigest()});report.append(rec)
  print(str(rel),'clear',rec['clearedOpaquePixels'],'demat',rec['edgeRGBDecontaminated'])
 (QA/'cleanup-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 # Requested combined contact: all 8 selections + all battle directions and independent weapon.
 font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',20,index=2)
 for kind in ['brown','black','checker','light']:
  sheet=background((1800,1920),kind);d=ImageDraw.Draw(sheet)
  for i,id in enumerate(IDS):
   for j,v in enumerate(['selection','front','back','side','weapon']):
    rel=Path('assets/selection-v6')/(id+'.png') if v=='selection' else Path('assets/approved-v6')/id/(v+'.png')
    im=Image.open(CAND/rel);im.thumbnail((340,210),Image.Resampling.LANCZOS);x=j*360+(360-im.width)//2;y=i*240+27
    sheet.alpha_composite(im,(x,y));d.text((j*360+5,i*240+4),id+' '+v,font=font,fill=(205,204,193,255) if kind!='light' else (38,28,22,255))
  sheet.convert('RGB').save(QA/f'after-{kind}-contact.jpg',quality=96)
 # Exact-size enlarged before/after evidence: original white eyes/skin/sleeves/hair stay.
 crops=[('assets/selection-v6/nezha.png',(70,245,285,630)),('assets/selection-v6/change.png',(75,10,440,470)),('assets/approved-v6/change/back.png',(160,240,340,338)),('assets/selection-v6/bailong.png',(170,100,500,430)),('assets/approved-v6/bajie/front.png',(190,380,325,478)),('assets/approved-v6/tangseng/weapon.png',(205,45,310,195))]
  # Separate panels avoid claiming a replacement drawing.
 for k,(rel,box) in enumerate(crops):
  old=Image.open(BACK/rel).crop(box).convert('RGBA');new=Image.open(CAND/rel).crop(box).convert('RGBA');s=2
  old=old.resize((old.width*s,old.height*s),Image.Resampling.NEAREST);new=new.resize(old.size,Image.Resampling.NEAREST)
  for kind in ['brown','checker']:
   pane=background((old.width*2,old.height),kind);pane.alpha_composite(old,(0,0));pane.alpha_composite(new,(old.width,0));pane.convert('RGB').save(QA/f'evidence-{k}-{kind}.jpg',quality=97)
 print('APPLIED' if args.apply else 'CANDIDATES ONLY')
if __name__=='__main__':main()
