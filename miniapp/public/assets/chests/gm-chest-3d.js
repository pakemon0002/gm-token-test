/* GM TOKEN – procedural low-poly 3D treasure chests.
   Real WebGL meshes: body, curved hinged lid, corner reinforcements, lock and handle.
   No dependencies or external 3D downloads. SVG remains fallback for unsupported WebGL. */
(function(){
"use strict";
const TAU=Math.PI*2;
const variants={
 bronze:{metal:[.85,.50,.29],edge:[1,.85,.64],wood:[.32,.33,.38],trim:[.50,.37,.33],gem:[1,.73,.42]},
 silver:{metal:[.73,.82,.94],edge:[1,.99,1],wood:[.28,.32,.41],trim:[.47,.57,.74],gem:[.55,.83,1]},
 gold:{metal:[.95,.75,.34],edge:[1,.95,.72],wood:[.32,.30,.40],trim:[.56,.39,.44],gem:[.89,.58,1]}
};
function shape(){
 const vertices=[];const parts=[];
 function tri(v,a,b,c){
  const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],w=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
  let n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];
  const l=Math.hypot(...n)||1;n=n.map(x=>x/l);
  for(const p of [a,b,c])v.push(...p,...n);
 }
 function quad(v,a,b,c,d){tri(v,a,b,c);tri(v,a,c,d)}
 function prism(x,y,z,w,h,d,key,lid=false){
  const L=x-w/2,R=x+w/2,B=y-h/2,T=y+h/2,N=z-d/2,F=z+d/2,v=[];
  quad(v,[L,B,F],[R,B,F],[R,T,F],[L,T,F]);
  quad(v,[R,B,N],[L,B,N],[L,T,N],[R,T,N]);
  quad(v,[R,B,F],[R,B,N],[R,T,N],[R,T,F]);
  quad(v,[L,B,N],[L,B,F],[L,T,F],[L,T,N]);
  quad(v,[L,T,F],[R,T,F],[R,T,N],[L,T,N]);
  quad(v,[L,B,N],[R,B,N],[R,B,F],[L,B,F]);
  parts.push({key,lid,vertexData:v});
 }
 // Layered silhouette: graphite body, stepped polished frame, raised corner bands.
 const cx=0,baseTop=.99;
 prism(cx,.53,0,2.22,1.02,1.35,"wood");
 prism(cx,.14,0,2.39,.19,1.50,"trim");
 prism(cx,.94,0,2.42,.18,1.53,"metal");
 prism(cx,.83,.70,2.27,.085,.105,"edge");
 prism(cx,.27,.72,2.27,.055,.11,"trim");
 prism(cx,.12,.75,2.43,.075,.07,"edge");
 for(const x of [-.91,.91]){
  prism(x,.52,.72,.19,.94,.18,"metal");
  prism(x,.52,-.72,.19,.94,.18,"metal");
  prism(x,.48,.827,.075,.62,.04,"edge");
  prism(x,.29,.835,.25,.095,.06,"edge");
 }
 // Slatted front, polished plate and inset central lock.
 for(const y of [.30,.52,.74]){
  prism(0,y,.716,1.67,.028,.055,"trim");
 }
 for(const x of [-.66,.66]){
  prism(x,.53,.784,.036,.69,.05,"edge");
 }
 prism(0,.53,.767,.93,.68,.10,"metal");
 prism(0,.53,.838,.80,.56,.06,"trim");
 prism(0,.53,.888,.62,.43,.06,"wood");
 // Faceted circular GM lock, genuinely attached to the rotating 3D body.
 function disc(x,y,z,r,key,steps=20){
  const verts=[];
  for(let i=0;i<steps;i++){
   const a=TAU*i/steps,b=TAU*(i+1)/steps;
   tri(verts,[x,y,z],[x+r*Math.cos(a),y+r*Math.sin(a),z],[x+r*Math.cos(b),y+r*Math.sin(b),z]);
  }
  parts.push({key,lid:false,vertexData:verts});
 }
 disc(0,.55,.954,.250,"edge");
 disc(0,.55,.964,.205,"metal");
 disc(0,.55,.975,.151,"trim");
 disc(0,.55,.988,.108,"gem");
 prism(0,.35,.937,.18,.07,.10,"edge");
 for(const x of [-.78,.78]){
  prism(x,.055,.59,.25,.21,.31,"metal");
  prism(x,.055,-.59,.25,.21,.31,"trim");
 }
 // Distinct rivets, surface joints and decorative reinforced feet.
 for(const x of [-1.055,-.82,.82,1.055]){
  for(const y of [.25,.77]){
   disc(x,y,.855,.033,"edge",10);
   disc(x,y,.86,.015,"trim",10);
  }
 }
 for(const x of [-.59,.59]){
  prism(x,.055,.27,.24,.18,.36,"trim");
 }
 // The lid is an extruded arched shell, independent from the body.
 const lidFront=.78,lidBack=-.78,top=baseTop+.18,steps=20,d=lidFront-lidBack;
 const height=z=>top+.50*(1-Math.pow((z-(lidBack+lidFront)/2)/(d/2),2));
 let v=[];
 for(let i=0;i<steps;i++){
  const a=lidBack+d*i/steps,b=lidBack+d*(i+1)/steps;
  quad(v,[-1.17,height(a),a],[1.17,height(a),a],[1.17,height(b),b],[-1.17,height(b),b]);
 }
 quad(v,[-1.17,baseTop,lidFront],[1.17,baseTop,lidFront],[1.17,height(lidFront),lidFront],[-1.17,height(lidFront),lidFront]);
 quad(v,[1.17,baseTop,lidBack],[-1.17,baseTop,lidBack],[-1.17,height(lidBack),lidBack],[1.17,height(lidBack),lidBack]);
 quad(v,[-1.17,baseTop,lidBack],[1.17,baseTop,lidBack],[1.17,baseTop,lidFront],[-1.17,baseTop,lidFront]);
 for(let i=0;i<steps;i++){
  const a=lidBack+d*i/steps,b=lidBack+d*(i+1)/steps;
  quad(v,[1.17,baseTop,a],[1.17,baseTop,b],[1.17,height(b),b],[1.17,height(a),a]);
  quad(v,[-1.17,baseTop,b],[-1.17,baseTop,a],[-1.17,height(a),a],[-1.17,height(b),b]);
 }
 parts.push({key:"wood",lid:true,vertexData:v});
 for(const x of [-.95,-.55,.55,.95]){
  let band=[];
  for(let i=0;i<steps;i++){
   const a=lidBack+d*i/steps,b=lidBack+d*(i+1)/steps;
   const half=Math.abs(x)>.8?.095:.035;
   quad(band,[x-half,height(a)+.018,a],[x+half,height(a)+.018,a],[x+half,height(b)+.018,b],[x-half,height(b)+.018,b]);
  }
  parts.push({key:"metal",lid:true,vertexData:band});
  if(Math.abs(x)>.8)prism(x,1.115,.805,.26,.31,.18,"edge",true);
 }
 // Bright lip under the curved lid makes the hinge and depth unmistakable.
 prism(0,1.065,.79,2.36,.14,.11,"metal",true);
 prism(0,1.20,.804,.73,.31,.13,"edge",true);
 prism(0,1.20,.885,.46,.18,.11,"gem",true);
 // Lid side handles and back hinges.
 for(const x of [-.84,.84]){
  prism(x,1.07,-.83,.23,.33,.16,"trim",true);
  prism(x,1.085,.835,.080,.13,.055,"gem",true);
 }
 for(const x of [-.61,.61])prism(x,.49,.91,.07,.45,.05,"edge");
 return parts;
}
const meshes=shape();
const vert=`attribute vec3 aPos;attribute vec3 aNormal;
uniform float uYaw,uPitch,uLid,uIsLid,uSize;
varying vec3 vNormal;varying vec3 vPos;
void main(){
 vec3 p=aPos,n=aNormal;
 if(uIsLid>0.5){
   p-=vec3(0.0,0.88,-0.71);
   float a=uLid;float c=cos(a),s=sin(a);
   p=vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);
   n=vec3(n.x,c*n.y-s*n.z,s*n.y+c*n.z);
   p+=vec3(0.0,0.88,-0.71);
 }
 float cy=cos(uYaw),sy=sin(uYaw),cp=cos(uPitch),sp=sin(uPitch);
 p=vec3(cy*p.x+sy*p.z,p.y,-sy*p.x+cy*p.z);
 n=vec3(cy*n.x+sy*n.z,n.y,-sy*n.x+cy*n.z);
 p=vec3(p.x,cp*p.y-sp*p.z,sp*p.y+cp*p.z);
 n=vec3(n.x,cp*n.y-sp*n.z,sp*n.y+cp*n.z);
 vNormal=n;vPos=p;
 // Larger hero presentation, retaining headroom for an animated opened lid.
 float w=3.56-p.z;
 gl_Position=vec4(uSize*p.x*1.94,uSize*(p.y-.78)*2.62,p.z*.12+1.4,w);
}`;
const frag=`precision mediump float;
uniform vec3 uColor;uniform float uMetal;
varying vec3 vNormal;varying vec3 vPos;
void main(){
 vec3 normal=normalize(vNormal);
 // Warm key + cool fill lighting with strong but controlled metal reflection.
 vec3 key=normalize(vec3(-.48,.95,1.20));
 vec3 fill=normalize(vec3(.88,.30,-.40));
 float diffuse=max(dot(normal,key),0.0);
 float bounce=max(dot(normal,fill),0.0);
 float shade=.58+.71*diffuse+.21*bounce;
 vec3 viewDir=normalize(vec3(.12,.25,1.0));
 float gleam=pow(max(dot(reflect(-key,normal),viewDir),0.0),15.0);
 float chrome=pow(max(dot(reflect(-fill,normal),viewDir),0.0),32.0);
 float rim=pow(1.0-abs(dot(normal,viewDir)),2.1);
 vec3 c=uColor*shade+vec3(1.0,.93,.78)*gleam*uMetal*.63
  +vec3(.72,.85,1.0)*chrome*uMetal*.51
  +vec3(.24,.37,.58)*rim*uMetal*.37;
 gl_FragColor=vec4(pow(clamp(c,0.0,1.0),vec3(.80)),1.0);
}`;
function createShader(gl,type,source){
 const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
 if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error("Chest shader: "+gl.getShaderInfoLog(shader));
 return shader;
}
function scene(canvas){
 if(canvas.dataset.gm3dReady)return()=>{};
 const kind=canvas.dataset.gmChest||"silver",palette=variants[kind]||variants.silver;
 const gl=canvas.getContext("webgl",{alpha:true,antialias:true,depth:true,preserveDrawingBuffer:false,premultipliedAlpha:false});
 if(!gl)return null;
 const program=gl.createProgram();
 gl.attachShader(program,createShader(gl,gl.VERTEX_SHADER,vert));
 gl.attachShader(program,createShader(gl,gl.FRAGMENT_SHADER,frag));
 gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error("Chest 3D link failed");
 gl.useProgram(program);
 const attrPos=gl.getAttribLocation(program,"aPos"),attrNorm=gl.getAttribLocation(program,"aNormal");
 const uniforms={};for(const n of ["uYaw","uPitch","uLid","uIsLid","uSize","uColor","uMetal"])uniforms[n]=gl.getUniformLocation(program,n);
 const uploaded=meshes.map(item=>{
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(item.vertexData),gl.STATIC_DRAW);
  return {...item,buf,n:item.vertexData.length/6};
 });
 canvas.dataset.gm3dReady="1";canvas.parentElement&&canvas.parentElement.classList.add("gm-chest-rendered");
 let active=true,visible=true,frame=0,last=0,drag=null,yaw=-.42,openAt=performance.now();
 let resizeObserver=null,intersection=null;
 const isOpen=canvas.dataset.gmChestOpen==="true";
 const reducedMotion=!!window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function draw(t){
  if(!active)return;
  frame=requestAnimationFrame(draw);
  if(t-last<32||!visible||document.hidden)return;
  last=t;const dpr=Math.min(window.devicePixelRatio||1,1.75);
  const w=Math.max(1,Math.floor(canvas.clientWidth*dpr)),h=Math.max(1,Math.floor(canvas.clientHeight*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
  const orbit=yaw+(drag||reducedMotion?0:Math.sin(t*.00039)*.13);
  const lid=isOpen?(reducedMotion?-1.78:-1.78*Math.min(1,Math.pow(Math.min(1,(t-openAt)/1350),.78))):0;
  gl.uniform1f(uniforms.uYaw,orbit);gl.uniform1f(uniforms.uPitch,-.23);
  gl.uniform1f(uniforms.uLid,lid);gl.uniform1f(uniforms.uSize,Math.min(1.12,canvas.clientHeight/210));
  for(const item of uploaded){
   gl.bindBuffer(gl.ARRAY_BUFFER,item.buf);
   gl.enableVertexAttribArray(attrPos);gl.vertexAttribPointer(attrPos,3,gl.FLOAT,false,24,0);
   gl.enableVertexAttribArray(attrNorm);gl.vertexAttribPointer(attrNorm,3,gl.FLOAT,false,24,12);
   gl.uniform1f(uniforms.uIsLid,item.lid?1:0);
   gl.uniform1f(uniforms.uMetal,item.key==="wood"?.15:.8);
   gl.uniform3fv(uniforms.uColor,new Float32Array(palette[item.key]||palette.metal));
   gl.drawArrays(gl.TRIANGLES,0,item.n);
  }
 }
 const down=e=>{drag={x:e.clientX,yaw};try{canvas.setPointerCapture(e.pointerId)}catch{}};
 const move=e=>{if(drag)yaw=Math.max(-1.2,Math.min(1.2,drag.yaw+(e.clientX-drag.x)/140))};
 const up=()=>drag=null;
 canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",move);
 canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",up);
 if(window.IntersectionObserver){intersection=new IntersectionObserver(es=>{visible=es.some(e=>e.isIntersecting)},{threshold:.01});intersection.observe(canvas)}
 frame=requestAnimationFrame(draw);
 return ()=>{active=false;cancelAnimationFrame(frame);intersection&&intersection.disconnect();
  canvas.removeEventListener("pointerdown",down);canvas.removeEventListener("pointermove",move);
  canvas.removeEventListener("pointerup",up);canvas.removeEventListener("pointercancel",up);
  for(const item of uploaded)gl.deleteBuffer(item.buf);
  gl.deleteProgram(program);delete canvas.dataset.gm3dReady;canvas.parentElement&&canvas.parentElement.classList.remove("gm-chest-rendered");
 };
}
window.GMChest3D={
 mountAll:function(){
  const cleanup=[];document.querySelectorAll("canvas[data-gm-chest]").forEach(c=>{
   try{const stop=scene(c);if(stop)cleanup.push(stop)}catch(e){/* visible SVG fallback */console.warn("3D chest fallback enabled")}
  });
  return ()=>cleanup.forEach(fn=>fn());
 }
};
})();