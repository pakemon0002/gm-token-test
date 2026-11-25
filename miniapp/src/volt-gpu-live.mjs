import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function blueColor(raw){const color=new THREE.Color(...raw);const hsl={};color.getHSL(hsl);if(hsl.s>.18&&hsl.h>.64&&hsl.h<.94)color.setHSL(.57,Math.min(.95,hsl.s*.95),hsl.l);return color;}
async function mount(canvas,id,{active=false}={}){
 const abort=new AbortController();let renderer,scene,room,env,pmrem,observer,frame=0,disposed=false,running=active,angle=0,last=0,dirty=true,drag=null;
 const fans=[],geometries=[],materials=[];const gltfGroup=new THREE.Group();
 const controller={setActive(v){running=!!v;dirty=true;canvas.dataset.running=String(running)},dispose(){if(disposed)return;disposed=true;abort.abort();cancelAnimationFrame(frame);observer?.disconnect();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();env?.dispose();room?.dispose();pmrem?.dispose();renderer?.dispose();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);}};
 let yaw=0,pitch=0;
 function down(e){if(e.pointerType==='mouse'&&e.button!==0)return;drag=[e.clientX,e.clientY];canvas.setPointerCapture?.(e.pointerId)}
 function move(e){if(!drag)return;yaw+=(e.clientX-drag[0])*.012;pitch=clamp(pitch+(e.clientY-drag[1])*.009,-.45,.65);drag=[e.clientX,e.clientY];gltfGroup.rotation.y=yaw;gltfGroup.rotation.x=pitch;dirty=true}
 function up(){drag=null}
 try{
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.setClearColor(0x000000,0);
  scene=new THREE.Scene();pmrem=new THREE.PMREMGenerator(renderer);room=new RoomEnvironment();env=pmrem.fromScene(room,.04);scene.environment=env.texture;scene.environmentIntensity=.9;
  scene.add(new THREE.HemisphereLight(0xc6e6ff,0x263346,2.1));const key=new THREE.DirectionalLight(0xe4f2ff,3.6);key.position.set(-3,6,5);scene.add(key);const rim=new THREE.DirectionalLight(0x38b5ff,4);rim.position.set(3,1,-4);scene.add(rim);const fill=new THREE.DirectionalLight(0x8badcc,1.8);fill.position.set(4,-1,3);scene.add(fill);
  const response=await fetch('/volt-gpu-models/'+id+'.bin',{signal:abort.signal});if(!response.ok)throw Error('GPU asset '+response.status);const buf=await response.arrayBuffer(),length=new DataView(buf).getUint32(0,true),offset=4+((length+3)&~3),meta=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,4,length))),data=new Float32Array(buf,offset);
  if(disposed)return controller;const body=new THREE.Group();gltfGroup.add(body);scene.add(gltfGroup);const fanGroups=new Map();
  for(const part of meta){const {count,color,fan,pivot,glow}=part;if(!count)continue;const geometry=new THREE.BufferGeometry(),positions=new Float32Array(count*3),normals=new Float32Array(count*3);for(let i=0;i<count;i++){const k=part.offset+i*6;positions.set(data.subarray(k,k+3),i*3);normals.set(data.subarray(k+3,k+6),i*3)}geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometries.push(geometry);const base=blueColor(color),material=new THREE.MeshStandardMaterial({color:base,metalness:glow?.12:.62,roughness:glow?.32:.37,emissive:glow?base:0x000000,emissiveIntensity:glow?.65:0,side:THREE.DoubleSide});materials.push(material);const mesh=new THREE.Mesh(geometry,material);
   if(fan){const k=String(fan)+':'+pivot.join(',');let group=fanGroups.get(k);if(!group){group=new THREE.Group();group.position.fromArray(pivot);fanGroups.set(k,group);fans.push(group);body.add(group)}group.add(mesh)}else{mesh.position.fromArray(pivot);body.add(mesh)}
  }
  if(!fans.length)throw Error('No movable fans');const bounds=new THREE.Box3().setFromObject(body),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());body.position.sub(center);const max=Math.max(size.x,size.y,size.z);gltfGroup.scale.setScalar(3.1/max);
  const camera=new THREE.OrthographicCamera(-2,2,1.2,-1.2,.1,30);camera.position.set(2.4,1.9,7.8);camera.lookAt(0,0,0);
  const resize=()=>{const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);renderer.setSize(w,h,false);const aspect=w/h;const half=Math.max(1.10,1.84/aspect);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();dirty=true};resize();observer=new ResizeObserver(resize);observer.observe(canvas);
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');const draw=t=>{if(disposed)return;frame=requestAnimationFrame(draw);const dt=last?Math.min((t-last)/1000,.08):0;last=t;if(document.hidden)return;if(running&&!reduced?.matches){angle=(angle+dt*10)%(Math.PI*2);for(let i=0;i<fans.length;i++)fans[i].rotation.z=angle*(i%2?-1:1);dirty=true;}if(!dirty)return;dirty=false;renderer.render(scene,camera);canvas.dataset.angle=angle.toFixed(4);};renderer.render(scene,camera);canvas.dataset.renderer='webgl3d';canvas.dataset.fanCount=String(fans.length);controller.setActive(active);frame=requestAnimationFrame(draw);
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);return controller;
 }catch(e){controller.dispose();throw e}
}
window.VoltGpu3D={mount};
