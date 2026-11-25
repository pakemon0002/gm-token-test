'use strict';
(()=>{
// Animate only the photographed fan surfaces; preserve the original casing and lighting.
// Positions are measured against the actual 420px previews of the 512px source art.
const masks={
 '4060':[[198,209,43,-12,1,50],[300,181,36,-11,1,43]],
 '4070':[[201,206,43,-13,0,51],[300,179,37,-11,0,45]],
 '4080':[[174,216,36,-10,0,45],[252,194,31,-9,0,41],[320,176,27,-8,0,37]],
 '4090':[[174,216,36,-10,0,45],[251,194,31,-9,0,41],[319,175,27,-8,0,37]]
};
async function mount(canvas,id,{active=false}={}){
 const img=canvas.parentElement?.querySelector('.hero-gpu');
 if(!img||!masks[id])throw Error('GPU artwork unavailable');
 await img.decode();if(!img.naturalWidth||!img.naturalHeight)throw Error('GPU image unavailable');
 const w=img.naturalWidth,h=img.naturalHeight,ctx=canvas.getContext('2d',{alpha:true});
 if(!ctx)throw Error('Canvas unavailable');canvas.width=w;canvas.height=h;
 const source=document.createElement('canvas');source.width=w;source.height=h;source.getContext('2d').drawImage(img,0,0,w,h);
 const diskSize=160,r=diskSize/2;
 const fans=masks[id].map(([x,y,ux,uy,vx,vy],index)=>{
  const sx=w/420,sy=h/420,margin=.91;
  const a=ux*sx*margin,b=uy*sy*margin,c=vx*sx*margin,d=vy*sy*margin,e=x*sx,f=y*sy,det=a*d-b*c;
  const tile=document.createElement('canvas');tile.width=tile.height=diskSize;const t=tile.getContext('2d');
  // Inverse affine projection maps the angled fan into a circular, rotatable texture.
  const ia=r*d/det,ib=-r*b/det,ic=-r*c/det,id2=r*a/det;
  t.setTransform(ia,ib,ic,id2,r-ia*e-ic*f,r-ib*e-id2*f);t.drawImage(source,0,0);
  t.setTransform(1,0,0,1,0,0);t.globalCompositeOperation='destination-in';
  const gradient=t.createRadialGradient(r,r,r*.88,r,r,r);gradient.addColorStop(0,'rgba(0,0,0,1)');gradient.addColorStop(1,'rgba(0,0,0,0)');t.fillStyle=gradient;t.fillRect(0,0,diskSize,diskSize);
  return {tile,a,b,c,d,e,f,speed:index%2?-8.7:9.3};
 });
 let running=!!active,disposed=false,frame=0,angle=0,last=0,drawn=0;
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 function draw(){
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);ctx.drawImage(source,0,0);
  if(angle!==0)for(const fan of fans){
   ctx.save();ctx.setTransform(fan.a,fan.b,fan.c,fan.d,fan.e,fan.f);
   ctx.rotate(angle*fan.speed);ctx.drawImage(fan.tile,-1,-1,2,2);ctx.restore();
  }
  canvas.dataset.angle=angle.toFixed(4);
 }
 function tick(t){frame=0;if(disposed||!running||document.hidden||reduced?.matches){last=0;return}
  if(!last)last=t;angle+=(Math.min(t-last,100)/1000);last=t;
  if(t-drawn>=32){draw();drawn=t}frame=requestAnimationFrame(tick);
 }
 function schedule(){cancelAnimationFrame(frame);frame=0;last=0;if(running&&!disposed&&!document.hidden&&!reduced?.matches)frame=requestAnimationFrame(tick)}
 function setActive(v){running=!!v;canvas.dataset.running=String(running);schedule()}
 function changed(){schedule()}
 document.addEventListener('visibilitychange',changed);reduced?.addEventListener?.('change',changed);
 canvas.dataset.renderer='image-fans';canvas.dataset.fanCount=String(fans.length);draw();setActive(active);
 return {setActive,dispose(){disposed=true;cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',changed);reduced?.removeEventListener?.('change',changed)}};
}
window.VoltGpu3D={mount};
})();