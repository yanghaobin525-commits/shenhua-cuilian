# Original hand-drawn ink frames (9-slice) + feibai mask. Pure code, no external art.
import random,math
from PIL import Image,ImageDraw,ImageFilter
S=4  # supersample
def wob(d,x1,y1,x2,y2,w,col,R,jit=2.2,over=8):
    L=math.hypot(x2-x1,y2-y1);ux,uy=(x2-x1)/L,(y2-y1)/L;nx,ny=-uy,ux;n=max(4,int(L/6));o1=(R.random()-.5)*over;o2=(R.random()-.3)*over;ph=R.random()*6;ph2=R.random()*6
    pts=[]
    for i in range(n+1):
        t=i/n;s=-o1+(L+o1+o2)*t;j=(math.sin(t*3.1+ph)*.6+math.sin(t*8.3+ph2)*.4)*jit
        pts.append(((x1+ux*s+nx*j)*S,(y1+uy*s+ny*j)*S))
    for i in range(len(pts)-1):
        k=i/(len(pts)-1);ww=w*(0.75+0.5*math.sin(k*math.pi))  # brush pressure
        d.line([pts[i],pts[i+1]],fill=col,width=max(1,int(ww*S)))
def frame(name,fill,seed,size=192,band=44,accent=(201,168,90,255)):
    R=random.Random(seed);W=size;im=Image.new('RGBA',(W*S,W*S),(0,0,0,0));d=ImageDraw.Draw(im)
    m=10;j=lambda:R.uniform(-2,2)
    poly=[((m+j())*S,(m+j())*S),((W-m+j())*S,(m+j())*S),((W-m+j())*S,(W-m+j())*S),((m+j())*S,(W-m+j())*S)]
    d.polygon(poly,fill=fill)
    # cross hatching in border band
    hat=Image.new('RGBA',im.size,(0,0,0,0));hd=ImageDraw.Draw(hat)
    for ang,alpha,sp in ((0.8,120,5),(2.2,80,8)):
        ca,sa=math.cos(ang),math.sin(ang)
        for k in range(-W*2,W*2,sp):
            x0=W/2+(-sa)*k;y0=W/2+ca*k
            a=(x0-ca*W*1.5,y0-sa*W*1.5);b=(x0+ca*W*1.5,y0+sa*W*1.5)
            hd.line([(a[0]*S,a[1]*S),(b[0]*S,b[1]*S)],fill=(0,0,0,alpha),width=S)
    mask=Image.new('L',im.size,0);md=ImageDraw.Draw(mask);md.polygon(poly,fill=255);md.rectangle([(m+band*.42)*S,(m+band*.42)*S,(W-m-band*.42)*S,(W-m-band*.42)*S],fill=0)
    mask=mask.filter(ImageFilter.GaussianBlur(6*S))
    im.paste(Image.alpha_composite(im,hat),(0,0),mask)
    d=ImageDraw.Draw(im);ink=(14,9,7,255)
    sides=[(m,m,W-m,m),(W-m,m,W-m,W-m),(W-m,W-m,m,W-m),(m,W-m,m,m)]
    for (a,b,c,e) in sides: wob(d,a,b,c,e,4.2,ink,R)
    for (a,b,c,e) in sides: wob(d,a+R.uniform(-1.5,1.5),b+R.uniform(-1.5,1.5),c,e,1.6,ink,R,jit=3,over=12)
    for (a,b,c,e) in sides: wob(d,a,b,c,e,1.0,(20,12,8,200),R,jit=3.5,over=14)
    mm=m+7
    for (a,b,c,e) in [(mm,mm,W-mm,mm),(W-mm,mm,W-mm,W-mm),(W-mm,W-mm,mm,W-mm),(mm,W-mm,mm,mm)]: wob(d,a,b,c,e,1.1,accent,R,jit=1.5,over=4)
    im=im.resize((W,W),Image.LANCZOS);im.save('assets/ui-ink/'+name+'.png')
frame('panel',(22,17,13,236),1)
frame('card',(36,44,37,240),2)
frame('btn',(44,58,48,245),3)
frame('btn-primary',(126,42,26,245),4)
frame('medal',(48,42,30,240),5,accent=(214,180,96,255))
frame('row',(18,14,11,170),6,accent=(150,128,80,200))
# feibai (dry-brush) mask: opaque white with transparent dry streaks
R=random.Random(9);W,H=512,128;im=Image.new('L',(W*2,H*2),255);d=ImageDraw.Draw(im)
for i in range(70):
    y=R.uniform(0,H*2);x=R.uniform(-50,W*2);L=R.uniform(60,380);th=R.uniform(1,4.5);a=R.uniform(-.2,.05)
    pts=[(x+math.cos(a)*L*k/8,y+math.sin(a)*L*k/8+R.uniform(-1.5,1.5)) for k in range(9)]
    d.line(pts,fill=int(R.uniform(0,120)),width=int(th))
im=im.filter(ImageFilter.GaussianBlur(.6)).resize((W,H),Image.LANCZOS)
out=Image.new('RGBA',(W,H),(255,255,255,0));out.putalpha(im);out.save('assets/ui-ink/feibai-mask.png')
print('ok')
