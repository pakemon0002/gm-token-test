/* GM TOKEN – procedural low-poly 3D treasure chests.
   Real WebGL meshes: body, curved hinged lid, corner reinforcements, lock and handle.
   No dependencies or external 3D downloads. SVG remains fallback for unsupported WebGL. */
(function(){
"use strict";
const TAU=Math.PI*2;
const variants={
 bronze:{metal:[.79,.47,.29],edge:[1,.78,.51],wood:[.21,.13,.12],trim:[.40,.22,.16],gem:[1,.55,.30]},
 silver:{metal:[.64,.73,.87],edge:[.94,.97,1],wood:[.15,.18,.25],trim:[.32,.39,.50],gem:[.46,.76,1]},
 gold:{metal:[.88,.70,.32],edge:[1,.95,.67],wood:[.23,.17,.22],trim:[.43,.26,.38],gem:[.79,.44,1]}
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
 const cx=0,baseTop=.88;
 prism(cx,.47,0,2.22,.93,1.35,"wood");
 prism(cx,.14,0,2.35,.2,1.48,"trim");
 prism(cx,.87,0,2.39,.15,1.49,"metal");
 for(const x of [-.91,.91]){
  prism(x,.53,.70,.19,.82,.15,"metal");
  prism(x,.53,-.70,.19,.82,.15,"metal");
 }
 prism(0,.45,.73,1.42,.08,.08,"trim");
 prism(0,.49,.75,.69,.44,.075,"metal");
 prism(0,.48,.82,.39,.29,.10,"trim");
 prism(0,.49,.886,.24,.20,.08,"gem");
 prism(0,.23,.78,.31,.12,.12,"edge");
 for(const x of [-.78,.78]){
  prism(x,.065,.54,.22,.20,.30,"trim");
  prism(x,.065,-.54,.22,.20,.30,"trim");
 }
 // The lid is an extruded arched shell, independent from the body.
 const lidFront=.76,lidBack=-.76,top=baseTop+.18,steps=14,d=lidFront-lidBack;
 const height=z=>top+.39*(1-Math.pow((z-(lidBack+lidFront)/2)/(d/2),2));
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
 for(const x of [-.87,.87]){
  let band=[];
  for(let i=0;i<steps;i++){
   const a=lidBack+d*i/steps,b=lidBack+d*(i+1)/steps;
   quad(band,[x-.115,height(a)+.013,a],[x+.115,height(a)+.013,a],[x+.115,height(b)+.013,b],[x-.115,height(b)+.013,b]);
  }
  parts.push({key:"metal",lid:true,vertexData:band});
  prism(x,1.02,.765,.23,.30,.13,"edge",true);
 }
 prism(0,1.055,.767,.66,.19,.09,"metal",true);
 prism(0,1.047,.835,.36,.15,.08,"gem",true);
 // ornamental silver inlays
 for(const x of [-.61,.61])prism(x,.49,.783,.08,.43,.045,"edge");
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
 float w=3.85-p.z;
 gl_Position=vec4(uSize*p.x*1.95,uSize*(p.y-.68)*1.9,p.z*.12+1.4,w);
}`;
const frag=`precision mediump float;
uniform vec3 uColor;uniform float uMetal;
varying vec3 vNormal;varying vec3 vPos;
void main(){
 vec3 normal=normalize(vNormal);
 vec3 light=normalize(vec3(-.48,.91,1.04));
 float diffuse=max(dot(normal,light),0.0);
 float shade=.30+.76*diffuse;
 float edge=pow(max(dot(reflect(-light,normal),normalize(vec3(.2,.5,1.0))),0.0),23.0);
 float rim=pow(1.0-abs(dot(normal,normalize(vec3(.1,.32,1.0)))),3.0);
 vec3 c=uColor*shade+vec3(1.0)*edge*uMetal*.7+vec3(.3,.42,.60)*rim*uMetal*.27;
 gl_FragColor=vec4(pow(clamp(c,0.0,1.0),vec3(.92)),1.0);
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
 let active=true,visible=true,frame=0,last=0,drag=null,yaw=-.25,openAt=performance.now();
 let resizeObserver=null,intersection=null;
 const isOpen=canvas.dataset.gmChestOpen==="true";
 function draw(t){
  if(!active)return;
  frame=requestAnimationFrame(draw);
  if(t-last<32||!visible)return;
  last=t;const dpr=Math.min(window.devicePixelRatio||1,1.75);
  const w=Math.max(1,Math.floor(canvas.clientWidth*dpr)),h=Math.max(1,Math.floor(canvas.clientHeight*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
  const orbit=yaw+(drag?0:Math.sin(t*.00039)*.13);
  const lid=isOpen?-1.78*Math.min(1,Math.pow(Math.min(1,(t-openAt)/1350),.78)):0;
  gl.uniform1f(uniforms.uYaw,orbit);gl.uniform1f(uniforms.uPitch,-.12);
  gl.uniform1f(uniforms.uLid,lid);gl.uniform1f(uniforms.uSize,Math.min(1,canvas.clientHeight/210));
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