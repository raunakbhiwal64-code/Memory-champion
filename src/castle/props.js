import * as THREE from 'three';
import { S, FACE_YAW } from './state.js';
import { mat, M } from './materials.js';
import { canvasTexture, glowTexture, rng } from './textures.js';

/* One distinct object per station, built from primitives with physically
   based materials. Local frame: stands on y=0, front faces +z.
   PROP_META: r = collision radius, cols = extra local collision circles,
   h = height of the floating number badge. */
export const PROP_META = {
  gate:{r:0.6, h:5.2}, fountain:{r:1.45, h:3.0}, tree:{r:0.7, h:5.4}, well:{r:1.1, h:3.0}, sundial:{r:0.6, h:2.2},
  hourglass:{r:0.75, h:3.6}, clock:{r:0.5, h:3.4}, staircase:{r:0, cols:[[-2.2,-0.2,1.4],[0,-0.2,1.4],[2.2,-0.2,1.4]], h:4.8},
  armour:{r:0.5, h:2.9}, knightportrait:{r:0.3, h:4.2}, harp:{r:0.6, h:2.8},
  longtable:{r:0, cols:[[-2.6,0,1.3],[0,0,1.3],[2.6,0,1.3]], h:2.4}, fireplace:{r:0, cols:[[0,-0.1,1.2]], h:4.4},
  lectern:{r:0.5, h:2.8}, throne:{r:1.0, h:4.3}, mirror:{r:0.3, h:4.0}, ladyportrait:{r:0.3, h:4.0}, tapestry:{r:0.2, h:5.0},
  vase:{r:0.6, h:2.7}, bust:{r:0.5, h:2.7}, bookshelf:{r:0, cols:[[-0.8,0,0.55],[0.8,0,0.55]], h:4.6},
  desk:{r:0.9, h:2.4}, chained:{r:0, cols:[[-0.8,0,0.55],[0.8,0,0.55]], h:4.4}, globe:{r:0.8, h:3.3}, armchair:{r:0.9, h:2.7},
  potions:{r:0.4, h:3.4}, cauldron:{r:1.0, h:2.9}, barrels:{r:1.1, h:3.0}, scales:{r:0.7, h:2.7}, cage:{r:0.9, h:3.3},
  trophies:{r:0.6, h:3.5}, shield:{r:0.3, h:4.0}, spears:{r:0.5, h:3.7}, chest:{r:0.7, h:2.0},
  cannon:{r:0, cols:[[0,0.4,0.9],[0,-0.7,0.7]], h:2.5}, telescope:{r:0.7, h:3.3}, starchart:{r:0.9, h:2.5},
  orrery:{r:1.0, h:3.5}, crystal:{r:0.5, h:2.6}, armillary:{r:0.7, h:3.3}
};

function box(w,h,d,m,x,y,z){ const o = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m); o.position.set(x||0,y||0,z||0); return o; }
function cyl(rt,rb,h,m,x,y,z,seg){ const o = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||16), m); o.position.set(x||0,y||0,z||0); return o; }
function sph(r,m,x,y,z,ws,hs){ const o = new THREE.Mesh(new THREE.SphereGeometry(r, ws||18, hs||14), m); o.position.set(x||0,y||0,z||0); return o; }
function cone(r,h,m,x,y,z,seg){ const o = new THREE.Mesh(new THREE.ConeGeometry(r,h,seg||16), m); o.position.set(x||0,y||0,z||0); return o; }
function torus(r,t,m,x,y,z,arc){ const o = new THREE.Mesh(new THREE.TorusGeometry(r,t,10,36,arc||Math.PI*2), m); o.position.set(x||0,y||0,z||0); return o; }
function group(...kids){ const g = new THREE.Group(); kids.forEach(k=>k && g.add(k)); return g; }
function rotX(o, a){ o.rotation.x = a; return o; }
function rotZ(o, a){ o.rotation.z = a; return o; }
export function glowSprite(rgba, size){
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(rgba), blending: THREE.AdditiveBlending, depthWrite:false, transparent:true }));
  sp.scale.set(size, size, 1); return sp;
}
export function flame(size){
  const g = group(cone(0.07*size, 0.22*size, M.glow(0xffa030, 4), 0, 0.11*size, 0, 8), glowSprite('rgba(255,170,70,1)', 0.9*size));
  g.children[1].position.y = 0.12*size;
  const phase = Math.random()*10;
  S.animated.push(t=>{ const f = 1 + Math.sin(t*13+phase)*0.08 + Math.sin(t*7.3+phase)*0.06; g.scale.set(f, f*1.05, f); });
  return g;
}
// An invisible marker telling the light pool there is a light here.
export function lightMarker(x, y, z, color, intensity, distance, kind, shadow){
  const o = new THREE.Object3D(); o.position.set(x, y, z);
  o.userData.light = { color, intensity, distance, kind, shadow: !!shadow };
  return o;
}

  function painting(w, h, draw){
    const tex = canvasTexture(256, (g,s)=>draw(g,s));
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.repeat.set(1,1);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex }));
    pic.position.z = 0.06;
    const frame = box(w+0.3, h+0.3, 0.1, M.gold(), 0, 0, 0);
    return group(frame, pic);
  }
  function books(w, h, seed){
    const r = rng(seed), g = new THREE.Group(), cols = [0x7a2a2a,0x2a4a7a,0x2f6a3a,0x8a6a2a,0x5a2a6a,0x3a3a3a,0x9a4a2a];
    let x = -w/2 + 0.05;
    while(x < w/2 - 0.12){
      const bw = 0.07 + r()*0.08, bh = h*(0.7 + r()*0.28);
      g.add(box(bw, bh, 0.28, mat(cols[Math.floor(r()*cols.length)]), x+bw/2, bh/2, 0));
      x += bw + 0.01;
    }
    return g;
  }
  function shelfUnit(w, h, levels, seed, chained){
    const g = group(box(w, h, 0.45, M.darkwood(), 0, h/2, -0.05));
    for(let i=0;i<levels;i++){
      const y = 0.15 + i*(h-0.3)/levels;
      g.add(box(w-0.1, 0.05, 0.42, M.wood(), 0, y, 0.0));
      const b = books(w-0.2, (h-0.3)/levels - 0.12, seed+i); b.position.set(0, y+0.03, 0.05); g.add(b);
    }
    if(chained){
      for(let i=0;i<3;i++){
        const y = 0.6 + i*1.1;
        for(let k=-4;k<=4;k++){ const l = torus(0.07, 0.018, mat(0x9a9aa2), k*0.13*(w/1.2), y, 0.28); l.rotation.y = (k%2) ? Math.PI/2 : 0; g.add(l); }
      }
      g.add(box(0.22, 0.26, 0.1, M.gold(), 0, 1.7, 0.32));
      g.add(torus(0.07, 0.02, M.gold(), 0, 1.86, 0.32, Math.PI));
    }
    return g;
  }
  function hourglass(color){
    const sand = M.glow(color);
    return group(
      box(0.5, 0.06, 0.5, M.gold(), 0, 0.03, 0), box(0.5, 0.06, 0.5, M.gold(), 0, 1.47, 0),
      cyl(0.03,0.03,1.44, M.gold(), 0.21, 0.75, 0.21, 6), cyl(0.03,0.03,1.44, M.gold(), -0.21, 0.75, -0.21, 6),
      cyl(0.03,0.03,1.44, M.gold(), 0.21, 0.75, -0.21, 6), cyl(0.03,0.03,1.44, M.gold(), -0.21, 0.75, 0.21, 6),
      cone(0.18, 0.6, mat(0xccddee, {transparent:true, opacity:0.35}), 0, 1.12, 0), rotX(cone(0.18, 0.6, mat(0xccddee, {transparent:true, opacity:0.35}), 0, 0.38, 0), Math.PI),
      cone(0.12, 0.25, sand, 0, 1.05, 0), cyl(0.17, 0.17, 0.22, sand, 0, 0.17, 0)
    );
  }
  function skeletonFigure(){
    const bone = mat(0xe8e2cc);
    const g = group(sph(0.16, bone, 0, 1.55, 0), cyl(0.04,0.04,0.6, bone, 0, 1.15, 0, 6));
    for(let i=0;i<4;i++) g.add(rotZ(torus(0.13, 0.02, bone, 0, 1.3 - i*0.11, 0), Math.PI/2));
    g.add(rotZ(cyl(0.025,0.025,0.55, bone, -0.22, 1.12, 0, 6), 0.3), rotZ(cyl(0.025,0.025,0.55, bone, 0.22, 1.12, 0, 6), -0.3));
    g.add(cyl(0.03,0.03,0.7, bone, -0.1, 0.5, 0, 6), cyl(0.03,0.03,0.7, bone, 0.1, 0.5, 0, 6), box(0.3, 0.1, 0.1, bone, 0, 0.85, 0));
    g.add(sph(0.035, M.glow(0x66ff99), -0.06, 1.57, 0.13), sph(0.035, M.glow(0x66ff99), 0.06, 1.57, 0.13));
    return g;
  }
  function spin(o, speed, axis){ S.animated.push((t,dt)=>{ o.rotation[axis||'y'] += dt*speed; }); return o; }
  function bob(o, amp, speed){ const y0 = o.position.y, ph = Math.random()*6; S.animated.push(t=>{ o.position.y = y0 + Math.sin(t*speed+ph)*amp; }); return o; }

  const PROPS = {
    gate(){
      const g = group(box(1, 5, 1, M.stone(), -2.5, 2.5, -0.4), box(1, 5, 1, M.stone(), 2.5, 2.5, -0.4), box(6, 0.8, 1, M.stone(), 0, 5.1, -0.4));
      for(let i=-4;i<=4;i++){ g.add(cyl(0.05,0.05,4.6, M.iron(), i*0.45, 2.3, -0.4, 6)); g.add(cone(0.09,0.25, M.iron(), i*0.45, 4.7, -0.4, 6)); }
      g.add(box(4, 0.12, 0.12, M.iron(), 0, 1.2, -0.4), box(4, 0.12, 0.12, M.iron(), 0, 3.4, -0.4));
      const crest = sph(0.35, M.gold(), 0, 5.7, -0.1); g.add(crest);
      return g;
    },
    fountain(){
      const water = mat(0x3d7fb8, { emissive:0x113355, transparent:true, opacity:0.85 });
      const g = group(cyl(1.4, 1.5, 0.6, M.stone(), 0, 0.3, 0, 24), cyl(1.25, 1.25, 0.05, water, 0, 0.55, 0, 24),
        cyl(0.2, 0.3, 1.6, M.stone(), 0, 1.2, 0), cyl(0.7, 0.3, 0.3, M.stone(), 0, 2.05, 0, 20), cyl(0.6, 0.6, 0.04, water, 0, 2.18, 0, 20));
      const spout = cone(0.12, 0.6, mat(0xa8d4ff, { emissive:0x3366aa, transparent:true, opacity:0.7 }), 0, 2.5, 0, 8);
      g.add(spout); S.animated.push(t=>{ spout.scale.y = 1 + Math.sin(t*6)*0.15; });
      return g;
    },
    tree(){
      const leaf = mat(0x2f5a2c), leaf2 = mat(0x3d6f35);
      const g = group(cyl(0.32, 0.5, 3.2, mat(0x4a3220), 0, 1.6, 0, 10),
        rotZ(cyl(0.12, 0.2, 1.6, mat(0x4a3220), 0.6, 2.8, 0, 8), -0.8), rotZ(cyl(0.12, 0.2, 1.6, mat(0x4a3220), -0.6, 3.0, 0.2, 8), 0.9),
        sph(1.6, leaf, 0, 4.2, 0, 12, 10), sph(1.1, leaf2, 1.2, 3.8, 0.4, 10, 8), sph(1.2, leaf2, -1.1, 4.0, -0.3, 10, 8), sph(1.0, leaf, 0.2, 5.0, 0.6, 10, 8));
      for(let i=0;i<5;i++) g.add(sph(0.12, mat(0xb03030), Math.cos(i*1.3)*1.4, 3.6+i*0.25, Math.sin(i*1.3)*1.2+0.4, 8, 6));
      return g;
    },
    well(){
      const g = group(cyl(1.0, 1.08, 0.95, M.stone(), 0, 0.47, 0, 24), cyl(0.84, 0.84, 0.04, mat(0x0c1218, { roughness: 0.04, metalness: 0.3 }), 0, 0.55, 0, 24),
        torus(0.96, 0.1, M.stone(), 0, 0.95, 0));
      g.children[2].rotation.x = Math.PI/2;
      for(const sx of [-0.88, 0.88]) g.add(box(0.14, 2.3, 0.14, M.darkwood(), sx, 1.15, 0));
      g.add(rotZ(box(1.4, 0.07, 1.5, M.wood(), -0.5, 2.45, 0), 0.62), rotZ(box(1.4, 0.07, 1.5, M.wood(), 0.5, 2.45, 0), -0.62));
      g.add(rotZ(cyl(0.09, 0.09, 1.8, M.wood(), 0, 1.85, 0, 10), Math.PI/2), box(0.05, 0.4, 0.05, M.iron(), 0.98, 1.68, 0.12));
      g.add(cyl(0.012, 0.012, 1.1, mat(0x8a7a5a), 0, 1.3, 0, 4), cyl(0.16, 0.13, 0.26, M.wood(), 0, 0.72, 0, 12), torus(0.155, 0.015, M.iron(), 0, 0.82, 0));
      g.children[g.children.length-1].rotation.x = Math.PI/2;
      return g;
    },
    sundial(){
      const dial = cyl(0.55, 0.55, 0.06, M.gold(), 0, 1.13, 0, 24);
      const g = group(cyl(0.25, 0.35, 1.1, M.stone(), 0, 0.55, 0, 10), dial);
      const gn = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.3, 0.02, 3), M.gold()); gn.rotation.set(Math.PI/2, 0, 0); gn.position.set(0, 1.3, 0); gn.scale.set(1, 1, 1.6);
      g.add(rotX(box(0.03, 0.4, 0.45, M.gold(), 0, 1.33, 0), -0.4));
      for(let i=0;i<12;i++) g.add(box(0.03, 0.02, 0.12, mat(0x3a2a10), Math.sin(i/12*Math.PI*2)*0.45, 1.17, Math.cos(i/12*Math.PI*2)*0.45));
      return g;
    },
    hourglass(){
      const g = group(cyl(0.55, 0.65, 0.9, M.stone(), 0, 0.45, 0, 16), cyl(0.62, 0.62, 0.08, M.gold(), 0, 0.92, 0, 16));
      const h = hourglass(0xe8c060); h.scale.setScalar(1.55); h.position.y = 0.96; g.add(h);
      const top = h.children[8], bottom = h.children[9];
      S.animated.push(t=>{ const k = (t*0.03)%1; top.scale.set(1-k*0.8, 1-k*0.9, 1-k*0.8); bottom.scale.set(1, 0.3+k*0.9, 1); });
      return g;
    },
    clock(){
      const g = group(box(0.9, 2.6, 0.5, M.darkwood(), 0, 1.3, -0.1), box(1.0, 0.25, 0.55, M.wood(), 0, 2.72, -0.1),
        cyl(0.36, 0.36, 0.05, mat(0xf1ead6), 0, 2.15, 0.17, 24), torus(0.36, 0.04, M.gold(), 0, 2.15, 0.17));
      g.children[2].rotation.x = Math.PI/2; g.children[3].rotation.x = 0;
      const hand1 = box(0.03, 0.28, 0.02, mat(0x111111), 0, 2.15, 0.21); hand1.geometry.translate(0, 0.14, 0); hand1.position.y = 2.15;
      const hand2 = box(0.04, 0.2, 0.02, mat(0x111111), 0, 2.15, 0.22); hand2.geometry.translate(0, 0.1, 0); hand2.position.y = 2.15;
      g.add(hand1, hand2); spin(hand1, -0.5, 'z'); spin(hand2, -0.05, 'z');
      const pend = group(cyl(0.015, 0.015, 0.9, M.gold(), 0, -0.45, 0, 6), cyl(0.14, 0.14, 0.04, M.gold(), 0, -0.9, 0, 16));
      pend.children[1].rotation.x = Math.PI/2; pend.position.set(0, 1.7, 0.17); g.add(pend);
      g.add(box(0.6, 1.2, 0.02, mat(0x1a120a), 0, 1.15, 0.16));
      S.animated.push(t=>{ pend.rotation.z = Math.sin(t*2.4)*0.3; });
      return g;
    },
    staircase(){
      const g = new THREE.Group(), steps = 9;
      for(let i=0;i<steps;i++){
        const h = (i+1)*0.38, d = 0.32;
        g.add(box(5.4, h, d, mat(i%2 ? 0x8b8172 : 0x948a7b), 0, h/2, 1.2 - i*d - d/2));
      }
      g.add(box(5.6, 0.12, 2.9, mat(0x6b1d22), 0, 3.48, -0.25)); // red runner on landing
      for(const sx of [-2.85, 2.85]){
        g.add(rotX(box(0.12, 0.12, 3.5, M.darkwood(), sx, 2.3, -0.3), -0.85));
        for(let i=0;i<5;i++) g.add(cyl(0.04, 0.04, 1.0, M.gold(), sx, 0.9 + i*0.62, 1.0 - i*0.62, 6));
        g.add(sph(0.16, M.gold(), sx, 1.25, 1.2));
      }
      return g;
    },
    armour(){
      const steel = mat(0xb8bcc4), dark = mat(0x5a5e66);
      const g = group(box(0.6, 0.15, 0.4, M.stone(), 0, 0.07, 0),
        cyl(0.09, 0.08, 0.85, steel, -0.13, 0.57, 0, 8), cyl(0.09, 0.08, 0.85, steel, 0.13, 0.57, 0, 8),
        box(0.5, 0.65, 0.3, steel, 0, 1.3, 0), cyl(0.27, 0.22, 0.25, dark, 0, 0.98, 0, 10),
        sph(0.16, steel, 0, 1.82, 0), box(0.18, 0.04, 0.05, mat(0x111111), 0, 1.84, 0.14), cone(0.05, 0.3, mat(0xb03030), 0, 2.05, -0.04, 6),
        sph(0.12, steel, -0.33, 1.55, 0), sph(0.12, steel, 0.33, 1.55, 0),
        cyl(0.06, 0.06, 0.6, steel, -0.34, 1.2, 0.05, 8), cyl(0.06, 0.06, 0.6, steel, 0.34, 1.2, 0.05, 8),
        cyl(0.025, 0.025, 2.5, M.darkwood(), 0.42, 1.3, 0.18, 6), rotZ(box(0.4, 0.3, 0.03, steel, 0.42, 2.45, 0.18), 0.0), cone(0.05, 0.3, steel, 0.42, 2.7, 0.18, 6));
      return g;
    },
    knightportrait(){
      const p = painting(1.7, 2.3, (g,s)=>{
        g.fillStyle = '#2b3b2a'; g.fillRect(0,0,s,s);
        g.fillStyle = '#5a3a1a'; g.fillRect(0, s*0.8, s, s*0.2);
        g.fillStyle = '#9aa0aa'; g.fillRect(s*0.36, s*0.32, s*0.28, s*0.4);
        g.beginPath(); g.arc(s*0.5, s*0.24, s*0.11, 0, Math.PI*2); g.fill();
        g.fillStyle = '#111'; g.fillRect(s*0.43, s*0.22, s*0.14, s*0.025);
        g.fillStyle = '#b02a2a'; g.fillRect(s*0.36, s*0.42, s*0.28, s*0.06);
        g.fillStyle = '#c9a23a'; g.fillRect(s*0.7, s*0.15, s*0.03, s*0.6); g.fillRect(s*0.64, s*0.3, s*0.15, s*0.03);
      });
      p.position.set(0, 3.0, -0.1);
      return group(p);
    },
    harp(){
      const gold = M.gold(), wood = mat(0x9a6230, { roughness: 0.45, tex: 'beam' });
      const g = group(box(0.8, 0.12, 0.5, M.darkwood(), 0.05, 0.06, 0));
      g.add(cyl(0.05, 0.075, 1.95, gold, -0.32, 1.05, 0, 10));
      const sb = box(0.24, 2.0, 0.2, wood, 0.28, 1.02, 0); sb.rotation.z = -0.3; g.add(sb);
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.32, 2.0, 0), new THREE.Vector3(-0.08, 2.2, 0), new THREE.Vector3(0.25, 1.98, 0), new THREE.Vector3(0.6, 1.98, 0)]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.06, 8), gold));
      for(let i=0;i<13;i++){
        const x = -0.24 + i*0.065, yTop = 2.02 + Math.sin((x+0.32)/0.92*Math.PI)*0.12, yBot = 0.25 + (x+0.3)*1.05;
        g.add(cyl(0.005, 0.005, yTop - yBot, mat(0xe8dcc0, { metalness: 0.6, roughness: 0.3 }), x, (yTop+yBot)/2, 0, 4));
      }
      return g;
    },
    longtable(){
      const g = group(box(7, 0.14, 1.6, M.wood(), 0, 0.85, 0));
      for(const lx of [-3.2, 0, 3.2]) for(const lz of [-0.65, 0.65]) g.add(box(0.14, 0.8, 0.14, M.darkwood(), lx, 0.4, lz));
      for(const bz of [-1.2, 1.2]) g.add(box(6.8, 0.1, 0.4, M.darkwood(), 0, 0.5, bz), box(0.1, 0.45, 0.3, M.darkwood(), -3, 0.22, bz), box(0.1, 0.45, 0.3, M.darkwood(), 3, 0.22, bz));
      for(let i=0;i<7;i++){
        const x = -3 + i;
        for(const z of [-0.45, 0.45]){
          g.add(cyl(0.18, 0.18, 0.02, mat(0xd6d0c0), x, 0.93, z, 16));
          g.add(group(cyl(0.06, 0.03, 0.12, M.gold(), x+0.25, 1.0, z, 8), cyl(0.015, 0.015, 0.1, M.gold(), x+0.25, 0.97, z, 6), cyl(0.07, 0.07, 0.01, M.gold(), x+0.25, 0.925, z, 8)));
        }
      }
      g.add(sph(0.3, mat(0xc87a2a), 0, 1.1, 0), sph(0.2, mat(0xb03030), -1.5, 1.05, 0), sph(0.2, mat(0x6aa040), 1.5, 1.05, 0));
      return g;
    },
    fireplace(){
      const g = group(box(3, 0.4, 0.9, M.stone(), 0, 0.2, -0.2), box(0.6, 2.6, 0.9, M.stone(), -1.2, 1.3, -0.2), box(0.6, 2.6, 0.9, M.stone(), 1.2, 1.3, -0.2),
        box(3.4, 0.4, 1.1, mat(0x9a9284), 0, 2.75, -0.15), box(1.8, 2.2, 0.1, mat(0x1a1410), 0, 1.4, -0.6), box(2.4, 3.6, 0.6, mat(0x7e786c), 0, 4.75, -0.35));
      for(let i=0;i<3;i++) g.add(rotZ(cyl(0.1, 0.1, 1.2, mat(0x4a3220), 0, 0.55, -0.25 + i*0.12, 8), Math.PI/2 + (i-1)*0.3));
      for(let i=0;i<5;i++){ const f = flame(2.2 + (i%2)*0.8); f.position.set(-0.6 + i*0.3, 0.55, -0.2); g.add(f); }
      const glow = glowSprite('rgba(255,140,40,1)', 3.2); glow.position.set(0, 1.0, 0.1); g.add(glow);
      for(let i=0;i<3;i++) g.add(cyl(0.12, 0.1, 0.35, mat([0x2a4a8a, 0x8a2a2a, 0x2f6a3a][i]), -0.9 + i*0.9, 3.12, -0.1, 10));
      g.add(lightMarker(0, 1.2, 0.9, 0xff8a3a, 60, 16, 'fire', true));
      return g;
    },
    lectern(){
      const gold = M.gold();
      const g = group(cyl(0.35, 0.45, 0.2, M.stone(), 0, 0.1, 0, 12), cyl(0.1, 0.14, 1.1, gold, 0, 0.75, 0, 10), sph(0.28, gold, 0, 1.25, 0, 12, 10));
      const body = sph(0.32, gold, 0, 1.62, 0, 14, 12); body.scale.set(0.9, 1.25, 0.8); g.add(body);
      g.add(sph(0.17, gold, 0, 2.05, 0.1, 14, 12), rotX(cone(0.06, 0.2, gold, 0, 2.02, 0.28, 8), Math.PI/2.4));
      g.add(sph(0.03, mat(0x111111, { roughness: 0.2 }), -0.08, 2.1, 0.22, 6, 4), sph(0.03, mat(0x111111, { roughness: 0.2 }), 0.08, 2.1, 0.22, 6, 4));
      for(const sx of [-1, 1]){
        const wing = box(0.75, 0.06, 0.45, gold, sx*0.42, 1.88, -0.02); wing.rotation.z = sx*0.35; g.add(wing);
        for(let k=0;k<4;k++){ const f = box(0.16, 0.04, 0.12, gold, sx*(0.72+k*0.04), 1.98 + k*0.02, -0.18 + k*0.11); f.rotation.z = sx*0.5; g.add(f); }
      }
      const page = mat(0xf2ead6);
      g.add(rotZ(box(0.42, 0.03, 0.5, page, -0.22, 2.05, 0), 0.25), rotZ(box(0.42, 0.03, 0.5, page, 0.22, 2.05, 0), -0.25), box(0.04, 0.05, 0.52, mat(0x5a1a1a), 0, 2.0, 0));
      return g;
    },
    throne(){
      const velvet = mat(0x7a1a22), gold = M.gold();
      return group(box(2.4, 0.3, 2.2, M.stone(), 0, 0.15, -0.5), box(2.6, 0.06, 2.4, mat(0x6b1d22), 0, 0.31, -0.5),
        box(1.1, 0.5, 0.9, gold, 0, 0.6, -0.4), box(1.0, 0.15, 0.85, velvet, 0, 0.92, -0.38),
        box(1.1, 2.6, 0.18, gold, 0, 2.1, -0.9), box(0.85, 2.2, 0.06, velvet, 0, 2.0, -0.8),
        box(0.14, 0.5, 0.9, gold, -0.55, 1.15, -0.4), box(0.14, 0.5, 0.9, gold, 0.55, 1.15, -0.4),
        sph(0.12, gold, -0.55, 3.45, -0.9), sph(0.12, gold, 0.55, 3.45, -0.9), cone(0.2, 0.5, gold, 0, 3.6, -0.9, 4), sph(0.1, M.glow(0xff4060), 0, 3.0, -0.78));
    },
    mirror(){
      const glass = mat(0x9fc6e8, { emissive:0x284a6a });
      const g = group(box(1.3, 2.9, 0.14, M.gold(), 0, 1.75, -0.15), box(1.05, 2.6, 0.02, glass, 0, 1.75, -0.07),
        sph(0.18, M.gold(), 0, 3.3, -0.15), box(1.5, 0.14, 0.3, M.gold(), 0, 0.3, -0.1));
      g.children[0].geometry = new THREE.BoxGeometry(1.3, 2.9, 0.14);
      const shimmer = glowSprite('rgba(170,210,255,1)', 1.2); shimmer.position.set(0, 2.0, 0); g.add(shimmer);
      S.animated.push(t=>{ shimmer.material.opacity = 0.35 + Math.sin(t*1.5)*0.25; });
      return g;
    },
    ladyportrait(){
      const p = painting(1.6, 2.1, (g,s)=>{
        g.fillStyle = '#3a2a4a'; g.fillRect(0,0,s,s);
        g.fillStyle = '#6a2a5a'; g.beginPath(); g.moveTo(s*0.25, s); g.lineTo(s*0.5, s*0.42); g.lineTo(s*0.75, s); g.fill();
        g.fillStyle = '#e8c8a8'; g.beginPath(); g.arc(s*0.5, s*0.33, s*0.1, 0, Math.PI*2); g.fill();
        g.fillStyle = '#7a4a1a'; g.beginPath(); g.arc(s*0.5, s*0.29, s*0.12, Math.PI, 0); g.fill();
        g.fillStyle = '#e8d070'; for(let i=0;i<7;i++){ g.beginPath(); g.arc(s*0.4 + i*s*0.033, s*0.46, s*0.012, 0, Math.PI*2); g.fill(); }
      });
      p.position.set(0, 2.9, -0.1);
      return group(p);
    },
    tapestry(){
      const tex = canvasTexture(256, (g,s)=>{
        g.fillStyle = '#20402a'; g.fillRect(0,0,s,s);
        g.strokeStyle = '#c9a23a'; g.lineWidth = 6; g.strokeRect(8,8,s-16,s-16);
        g.fillStyle = '#b02a2a';
        g.beginPath(); g.moveTo(s*0.2, s*0.7); g.quadraticCurveTo(s*0.35, s*0.35, s*0.6, s*0.45); g.quadraticCurveTo(s*0.8, s*0.3, s*0.78, s*0.2);
        g.lineTo(s*0.85, s*0.28); g.quadraticCurveTo(s*0.75, s*0.55, s*0.55, s*0.6); g.quadraticCurveTo(s*0.4, s*0.75, s*0.2, s*0.7); g.fill();
        g.beginPath(); g.moveTo(s*0.45, s*0.48); g.lineTo(s*0.3, s*0.22); g.lineTo(s*0.6, s*0.42); g.fill();
        g.fillStyle = '#f0a030'; g.beginPath(); g.moveTo(s*0.85, s*0.24); g.lineTo(s*0.95, s*0.18); g.lineTo(s*0.92, s*0.3); g.fill();
      });
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.4, 6, 6), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide }));
      cloth.position.set(0, 3.2, -0.05);
      const pos = cloth.geometry.attributes.position; const base = pos.array.slice();
      S.animated.push(t=>{ for(let i=0;i<pos.count;i++){ const y = base[i*3+1]; pos.array[i*3+2] = base[i*3+2] + Math.sin(t*1.2 + base[i*3]*2)*0.05*(1.7-y)/3.4; } pos.needsUpdate = true; });
      return group(cloth, cyl(0.05, 0.05, 2.6, M.gold(), 0, 4.95, 0, 8));
    },
    vase(){
      const blue = mat(0x2a5aa8), white = mat(0xe8e8f0);
      const v = new THREE.Mesh(new THREE.LatheGeometry([[0.2,0],[0.42,0.25],[0.5,0.6],[0.38,1.0],[0.18,1.25],[0.22,1.45]].map(p=>new THREE.Vector2(p[0],p[1])), 20), blue);
      v.position.y = 0.9;
      return group(box(0.8, 0.9, 0.8, mat(0xd8d2c4), 0, 0.45, 0), v, torus(0.47, 0.03, white, 0, 1.5, 0), torus(0.4, 0.025, white, 0, 1.85, 0));
    },
    bust(){
      const marble = mat(0xece8e0);
      const g = group(cyl(0.3, 0.35, 1.2, mat(0x9a948a), 0, 0.6, 0, 12), box(0.75, 0.1, 0.75, mat(0x9a948a), 0, 1.25, 0),
        box(0.6, 0.45, 0.35, marble, 0, 1.52, 0), sph(0.22, marble, 0, 1.98, 0.02), cyl(0.09, 0.1, 0.18, marble, 0, 1.78, 0, 10));
      g.children[3].scale.set(0.9, 1.15, 1);
      for(let i=0;i<6;i++) g.add(sph(0.06, marble, Math.cos(i)*0.18, 2.12, Math.sin(i)*0.15 - 0.02));
      g.add(box(0.25, 0.04, 0.02, M.gold(), 0, 1.35, 0.18));
      return g;
    },
    bookshelf(){ return shelfUnit(2.4, 4, 6, 41); },
    chained(){
      const s = shelfUnit(2.4, 3.8, 5, 71, true);
      s.children.forEach(c=>{ if(c.isGroup) c.children.forEach(b=>{ if(b.material && b.material.color) b.material = mat(0x2a1a2a); }); });
      return s;
    },
    desk(){
      const g = group(box(1.8, 0.1, 0.9, M.wood(), 0, 0.85, 0));
      for(const lx of [-0.8,0.8]) for(const lz of [-0.38,0.38]) g.add(box(0.08, 0.8, 0.08, M.darkwood(), lx, 0.4, lz));
      const page = mat(0xf2ead6);
      g.add(rotZ(box(0.4, 0.02, 0.55, page, -0.2, 0.93, 0.05), 0.1), rotZ(box(0.4, 0.02, 0.55, page, 0.2, 0.93, 0.05), -0.1), box(0.06, 0.04, 0.56, mat(0x5a2a1a), 0, 0.91, 0.05));
      g.add(cyl(0.05, 0.06, 0.25, mat(0xf0e8d0), 0.65, 1.02, -0.2, 8));
      const f = flame(0.8); f.position.set(0.65, 1.15, -0.2); g.add(f);
      g.add(cyl(0.02, 0.0, 0.35, mat(0xeeeeee), -0.6, 1.05, -0.25, 6), cyl(0.07, 0.07, 0.1, mat(0x1a1a2a), -0.6, 0.95, -0.25, 8));
      g.add(box(0.6, 0.08, 0.6, M.darkwood(), 0, 0.5, -0.9), box(0.6, 0.9, 0.08, M.darkwood(), 0, 0.95, -1.18));
      g.add(lightMarker(0.65, 1.4, -0.2, 0xffb060, 6, 5, 'candle'));
      return g;
    },
    globe(){
      const tex = canvasTexture(256, (g,s)=>{
        g.fillStyle = '#2a5a8a'; g.fillRect(0,0,s,s);
        g.fillStyle = '#c8b070'; const r = rng(31);
        for(let i=0;i<9;i++){ g.beginPath(); const cx = r()*s, cy = s*0.2 + r()*s*0.6; g.ellipse(cx, cy, 15+r()*30, 10+r()*25, r()*3, 0, Math.PI*2); g.fill(); }
        g.strokeStyle = 'rgba(255,255,255,.25)'; for(let i=1;i<6;i++){ g.beginPath(); g.moveTo(0, i*s/6); g.lineTo(s, i*s/6); g.stroke(); }
      });
      tex.repeat.set(1,1);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 16), new THREE.MeshStandardMaterial({ map: tex }));
      ball.position.y = 2.0; ball.rotation.z = 0.4; spin(ball, 0.25);
      return group(cyl(0.45, 0.6, 0.15, M.darkwood(), 0, 0.08, 0, 12), cyl(0.08, 0.12, 1.1, M.wood(), 0, 0.7, 0, 10), torus(0.85, 0.04, M.gold(), 0, 2.0, 0), ball);
    },
    armchair(){
      const red = mat(0x8a2a2a);
      const g = group(box(1.2, 0.5, 1.0, red, 0, 0.45, 0), box(1.2, 1.1, 0.25, red, 0, 1.1, -0.42), box(0.22, 0.75, 1.0, red, -0.6, 0.65, 0), box(0.22, 0.75, 1.0, red, 0.6, 0.65, 0),
        box(1.0, 0.12, 0.8, mat(0xa83a3a), 0, 0.75, 0.05));
      for(const lx of [-0.5,0.5]) for(const lz of [-0.4,0.4]) g.add(cyl(0.05, 0.04, 0.2, M.darkwood(), lx, 0.1, lz, 6));
      g.add(cyl(0.03, 0.03, 1.9, M.gold(), 1.1, 0.95, -0.3, 6), cyl(0.2, 0.25, 0.05, M.gold(), 1.1, 0.03, -0.3, 10), cone(0.32, 0.4, mat(0xe8d6a0, { emissive:0x6a5020 }), 1.1, 1.95, -0.3, 12));
      const glow = glowSprite('rgba(255,220,150,1)', 1.6); glow.position.set(1.1, 1.85, -0.3); g.add(glow);
      g.add(lightMarker(1.1, 1.8, -0.3, 0xffd09a, 14, 7, 'lamp'));
      return g;
    },
    potions(){
      const g = group(box(2.6, 2.6, 0.45, M.darkwood(), 0, 1.3, -0.1)), r = rng(51);
      const cols = [0x40ff80, 0xff4080, 0x40a0ff, 0xffd040, 0xb060ff, 0xff8040];
      for(let lvl=0; lvl<3; lvl++){
        const y = 0.35 + lvl*0.8;
        g.add(box(2.5, 0.05, 0.45, M.wood(), 0, y, 0.0));
        for(let i=0;i<7;i++){
          const c = cols[Math.floor(r()*cols.length)], h = 0.2 + r()*0.25;
          const bottle = group(cyl(0.08, 0.1, h, mat(c, { emissive:c, emissiveIntensity:0.6, transparent:true, opacity:0.85 }), 0, h/2, 0, 8), cyl(0.03, 0.03, 0.1, mat(0xddddcc), 0, h+0.05, 0, 6));
          bottle.position.set(-1.05 + i*0.35, y+0.03, 0.05); g.add(bottle);
        }
      }
      return g;
    },
    cauldron(){
      const brew = M.glow(0x3aff6a);
      const pot = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 14, 0, Math.PI*2, Math.PI*0.25, Math.PI*0.75), mat(0x1c1c20, { side: THREE.DoubleSide }));
      pot.position.y = 0.95;
      const g = group(pot, torus(0.62, 0.07, mat(0x2a2a30), 0, 1.55, 0), cyl(0.6, 0.6, 0.05, brew, 0, 1.45, 0, 20));
      g.children[1].rotation.x = Math.PI/2;
      for(let i=0;i<3;i++){ const a = i/3*Math.PI*2; g.add(rotZ(cyl(0.06, 0.04, 0.5, mat(0x1c1c20), Math.cos(a)*0.55, 0.2, Math.sin(a)*0.55, 6), 0.2)); }
      for(let i=0;i<6;i++){
        const b = sph(0.06 + Math.random()*0.05, brew, (Math.random()-0.5)*0.8, 1.5, (Math.random()-0.5)*0.8, 8, 6);
        const ph = Math.random()*3; g.add(b);
        S.animated.push(t=>{ const k = ((t*0.8+ph)%1.6)/1.6; b.position.y = 1.47 + k*0.9; b.scale.setScalar(1-k); });
      }
      const glow = glowSprite('rgba(80,255,130,1)', 3); glow.position.y = 1.8; g.add(glow);
      const fire = flame(2.2); fire.position.y = 0.0; g.add(fire);
      g.add(lightMarker(0, 2.0, 0, 0x4dff7a, 22, 9, 'magic'));
      return g;
    },
    barrels(){
      const g = new THREE.Group();
      [[-0.55,0,0],[0.55,0,0],[0,0.95,0]].forEach(([x,y,z])=>{
        const b = group(cyl(0.48, 0.48, 0.95, mat(0x7a4a26), 0, 0.47, 0, 14), torus(0.49, 0.03, M.iron(), 0, 0.2, 0), torus(0.49, 0.03, M.iron(), 0, 0.75, 0));
        b.children[1].rotation.x = b.children[2].rotation.x = Math.PI/2;
        b.position.set(x, y, z); g.add(b);
      });
      g.add(box(0.2, 0.25, 0.02, mat(0xe8dcb8), 0.55, 0.55, 0.49));
      return g;
    },
    scales(){
      const brass = mat(0xc89a3a);
      const g = group(box(2.0, 0.12, 0.9, M.wood(), 0, 0.9, -0.05));
      for(const lx of [-0.9,0.9]) for(const lz of [-0.4,0.3]) g.add(box(0.1, 0.85, 0.1, M.darkwood(), lx, 0.43, lz));
      g.add(cyl(0.15, 0.2, 0.06, brass, 0, 0.99, 0, 12), cyl(0.03, 0.03, 0.9, brass, 0, 1.45, 0, 8));
      const beam = group(box(1.0, 0.04, 0.04, brass, 0, 0, 0));
      for(const sx of [-0.48, 0.48]){ beam.add(cyl(0.005, 0.005, 0.45, brass, sx, -0.22, 0, 4), cyl(0.18, 0.12, 0.05, brass, sx, -0.45, 0, 12)); }
      beam.position.y = 1.9; g.add(beam);
      S.animated.push(t=>{ beam.rotation.z = Math.sin(t*0.9)*0.12; });
      g.add(cyl(0.1, 0.1, 0.25, mat(0x6a9a6a, { transparent:true, opacity:0.7 }), -0.75, 1.08, 0.15, 8), cyl(0.08, 0.08, 0.2, mat(0x9a6a9a, { transparent:true, opacity:0.7 }), 0.75, 1.06, 0.15, 8));
      return g;
    },
    cage(){
      const g = group(cyl(0.9, 0.9, 0.1, M.iron(), 0, 0.05, 0, 16), cyl(0.9, 0.9, 0.1, M.iron(), 0, 2.5, 0, 16), cone(0.9, 0.6, M.iron(), 0, 2.85, 0, 16));
      for(let i=0;i<14;i++){ const a = i/14*Math.PI*2; g.add(cyl(0.03, 0.03, 2.4, M.iron(), Math.cos(a)*0.88, 1.25, Math.sin(a)*0.88, 5)); }
      const sk = skeletonFigure(); sk.position.y = 0.1; g.add(sk);
      g.add(cyl(0.03, 0.03, 4.0, M.iron(), 0, 5.1, 0, 5));
      return g;
    },
    trophies(){
      const glass = mat(0xbfdcef, { transparent:true, opacity:0.18 });
      const g = group(box(1.8, 0.3, 0.6, M.darkwood(), 0, 0.15, -0.05), box(1.8, 0.1, 0.6, M.darkwood(), 0, 2.55, -0.05), box(1.8, 2.2, 0.04, mat(0x2a1a10), 0, 1.4, -0.33), box(1.78, 2.2, 0.56, glass, 0, 1.4, -0.05));
      for(let lvl=0; lvl<2; lvl++){
        g.add(box(1.7, 0.04, 0.5, M.wood(), 0, 0.35 + lvl*1.05, -0.05));
        for(let i=0;i<3;i++){
          const cup = group(cyl(0.16, 0.06, 0.3, M.gold(), 0, 0.35, 0, 12), cyl(0.03, 0.03, 0.15, M.gold(), 0, 0.12, 0, 6), cyl(0.1, 0.1, 0.04, M.gold(), 0, 0.02, 0, 10),
            torus(0.08, 0.015, M.gold(), -0.17, 0.38, 0), torus(0.08, 0.015, M.gold(), 0.17, 0.38, 0));
          cup.position.set(-0.55 + i*0.55, 0.37 + lvl*1.05, -0.05); g.add(cup);
        }
      }
      return g;
    },
    shield(){
      const g = new THREE.Group();
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 3), mat(0x8a2a2a));
      sh.rotation.set(Math.PI/2, 0, Math.PI); sh.scale.set(1, 1, 1.25); sh.position.set(0, 3.0, -0.2);
      const boss = sph(0.18, M.gold(), 0, 3.15, -0.12);
      const band = box(0.14, 1.3, 0.04, M.gold(), 0, 3.0, -0.13);
      g.add(sh, boss, band);
      for(const s of [-1,1]){
        const sword = group(box(0.07, 2.0, 0.02, mat(0xd0d4dc), 0, 0, 0), box(0.4, 0.06, 0.05, M.gold(), 0, -0.95, 0), cyl(0.03, 0.03, 0.35, mat(0x4a2a1a), 0, -1.15, 0, 6), sph(0.05, M.gold(), 0, -1.35, 0));
        sword.position.set(0, 3.0, -0.25); sword.rotation.z = s*0.7 + Math.PI; g.add(sword);
      }
      return g;
    },
    spears(){
      const g = group(box(2.0, 0.12, 0.35, M.wood(), 0, 0.3, -0.1), box(2.0, 0.12, 0.25, M.wood(), 0, 2.2, -0.2), box(0.12, 2.3, 0.15, M.darkwood(), -0.95, 1.15, -0.25), box(0.12, 2.3, 0.15, M.darkwood(), 0.95, 1.15, -0.25));
      for(let i=0;i<5;i++){
        const sp = group(cyl(0.03, 0.03, 3.0, M.wood(), 0, 1.5, 0, 6), cone(0.07, 0.4, mat(0xd0d4dc), 0, 3.2, 0, 6), box(0.12, 0.25, 0.01, mat(0x2a4a8a), 0.08, 2.8, 0));
        sp.position.set(-0.7 + i*0.35, 0.2, -0.1); sp.rotation.z = (i-2)*0.03; g.add(sp);
      }
      return g;
    },
    chest(){
      const g = group(box(1.2, 0.6, 0.75, mat(0x6b3a1a), 0, 0.3, 0), box(1.24, 0.06, 0.08, M.gold(), 0, 0.15, 0.35), box(1.24, 0.06, 0.08, M.gold(), 0, 0.5, 0.35), box(0.15, 0.2, 0.05, M.gold(), 0, 0.48, 0.39));
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.375, 0.375, 1.2, 14, 1, false, 0, Math.PI), mat(0x6b3a1a));
      lid.rotation.z = Math.PI/2; lid.position.set(0, 0.6, -0.1); lid.rotation.x = -0.9; g.add(lid);
      for(let i=0;i<14;i++) g.add(cyl(0.06, 0.06, 0.02, M.gold(), (Math.random()-0.5)*1.0, 0.62 + Math.random()*0.05, (Math.random()-0.5)*0.55, 10));
      g.add(sph(0.08, M.glow(0x40e0ff), 0.25, 0.7, 0.05), sph(0.07, M.glow(0xff3060), -0.3, 0.7, -0.1));
      const glow = glowSprite('rgba(255,210,90,1)', 1.8); glow.position.y = 0.9; g.add(glow);
      g.add(lightMarker(0, 1.0, 0.2, 0xffc860, 4, 3.5, 'glow'));
      return g;
    },
    cannon(){
      const bronze = mat(0xa8763a);
      const barrel = group(cyl(0.22, 0.3, 2.2, bronze, 0, 0, 0, 14), torus(0.24, 0.05, bronze, 0, 1.0, 0), torus(0.31, 0.05, bronze, 0, -0.9, 0), sph(0.25, bronze, 0, -1.15, 0));
      barrel.rotation.x = Math.PI/2 - 0.2; barrel.position.set(0, 0.85, 0.1);
      const g = group(box(0.8, 0.35, 1.6, M.darkwood(), 0, 0.45, -0.3), barrel);
      for(const sx of [-0.5, 0.5]) for(const sz of [0.2, -0.9]){ const w = cyl(0.32, 0.32, 0.12, M.wood(), sx, 0.32, sz, 12); w.rotation.z = Math.PI/2; g.add(w); }
      for(let i=0;i<3;i++) g.add(sph(0.14, M.iron(), -0.25 + i*0.25, 0.14, 1.0));
      return g;
    },
    telescope(){
      const brass = mat(0xc89a3a);
      const g = new THREE.Group();
      for(let i=0;i<3;i++){ const a = i/3*Math.PI*2; g.add(rotZ(cyl(0.04, 0.04, 1.6, M.darkwood(), Math.cos(a)*0.3, 0.75, Math.sin(a)*0.3, 6), Math.cos(a)*-0.2)); }
      const tube = group(cyl(0.12, 0.18, 2.2, brass, 0, 0, 0, 14), torus(0.19, 0.03, M.gold(), 0, -1.0, 0), torus(0.14, 0.02, M.gold(), 0, 0.6, 0));
      tube.position.set(0, 1.7, 0); tube.rotation.x = -0.9; g.add(tube);
      S.animated.push(t=>{ tube.rotation.y = Math.sin(t*0.2)*0.4; });
      return g;
    },
    starchart(){
      const tex = canvasTexture(256, (g,s)=>{
        g.fillStyle = '#121a3a'; g.fillRect(0,0,s,s);
        const r = rng(61); g.fillStyle = '#fff6d0';
        const pts = []; for(let i=0;i<40;i++){ const p = [r()*s, r()*s]; pts.push(p); g.beginPath(); g.arc(p[0], p[1], 1+r()*2.5, 0, Math.PI*2); g.fill(); }
        g.strokeStyle = 'rgba(201,162,58,.7)'; g.lineWidth = 1.5;
        for(let i=0;i<10;i++){ g.beginPath(); g.moveTo(...pts[i]); g.lineTo(...pts[i+1]); g.stroke(); }
        g.strokeStyle = 'rgba(201,162,58,.5)'; g.beginPath(); g.arc(s/2, s/2, s*0.42, 0, Math.PI*2); g.stroke();
      });
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      const chart = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshStandardMaterial({ map: tex, emissive: 0x111a33 }));
      chart.rotation.x = -Math.PI/2 + 0.25; chart.position.set(0, 1.0, 0);
      const g = group(box(1.9, 0.08, 1.2, M.wood(), 0, 0.85, 0), chart);
      for(const lx of [-0.85,0.85]) for(const lz of [-0.5,0.5]) g.add(box(0.08, 0.85, 0.08, M.darkwood(), lx, 0.42, lz));
      g.add(cyl(0.02, 0.02, 0.3, M.gold(), 0.6, 1.05, 0.3, 6), cyl(0.05, 0.05, 0.6, mat(0xe8dcb8), -0.6, 0.95, -0.4, 10));
      return g;
    },
    orrery(){
      const g = group(cyl(0.5, 0.7, 0.2, M.darkwood(), 0, 0.1, 0, 14), cyl(0.06, 0.08, 1.6, M.gold(), 0, 0.9, 0, 8));
      const sun = sph(0.35, M.glow(0xffc040, 1.2), 0, 1.9, 0); g.add(sun);
      const sunGlow = glowSprite('rgba(255,200,80,0.6)', 1.6); sunGlow.position.y = 1.9; g.add(sunGlow);
      [[0.8, 0.09, 0x9a9aa0, 1.4],[1.2, 0.13, 0xd0a060, 0.9],[1.6, 0.14, 0x3a7ad0, 0.6],[2.0, 0.11, 0xc0503a, 0.4]].forEach(([rad, size, col, speed])=>{
        const arm = group(box(rad, 0.02, 0.02, M.gold(), rad/2, 0, 0), sph(size, mat(col, { emissive: col, emissiveIntensity:0.25 }), rad, 0, 0));
        arm.position.y = 1.9; arm.rotation.y = Math.random()*6; g.add(arm); spin(arm, speed);
      });
      return g;
    },
    crystal(){
      const ball = sph(0.32, mat(0xb8a0ff, { emissive:0x5a3aa8, transparent:true, opacity:0.75 }), 0, 1.45, 0, 20, 16);
      const g = group(cyl(0.3, 0.45, 0.25, M.darkwood(), 0, 0.12, 0, 10), cyl(0.08, 0.12, 0.85, mat(0x3a2a4a), 0, 0.65, 0, 8),
        cyl(0.25, 0.15, 0.12, M.gold(), 0, 1.12, 0, 10), ball);
      const swirl = sph(0.18, M.glow(0xffffff), 0, 1.45, 0, 8, 6); swirl.material = new THREE.MeshBasicMaterial({ color:0xe8deff, transparent:true, opacity:0.5 });
      g.add(swirl); spin(swirl, 1.5);
      const glow = glowSprite('rgba(180,140,255,1)', 1.6); glow.position.y = 1.45; g.add(glow);
      S.animated.push(t=>{ swirl.scale.setScalar(0.7 + Math.sin(t*2)*0.25); });
      g.add(lightMarker(0, 1.5, 0, 0xb08cff, 6, 5, 'magic'));
      return g;
    },
    armillary(){
      const g = group(cyl(0.35, 0.5, 0.15, M.darkwood(), 0, 0.08, 0, 12), cyl(0.06, 0.1, 1.3, M.gold(), 0, 0.75, 0, 8), sph(0.12, M.glow(0x88aaff), 0, 2.15, 0));
      const rings = new THREE.Group(); rings.position.y = 2.15;
      [[0.75,0,0],[0.68,Math.PI/2,0],[0.6,Math.PI/2,Math.PI/2],[0.52,0.4,0.9]].forEach(([r,a,b])=>{ const tr = torus(r, 0.025, M.gold()); tr.rotation.set(a, b, 0); rings.add(tr); });
      g.add(rings); spin(rings, 0.35); spin(rings.children[3], 0.9, 'x');
      return g;
    }
  };


export function placeProp(s, room){
  const g = PROPS[s.prop]();
  g.position.set(s.x, 0, s.z);
  g.rotation.y = FACE_YAW[s.face];
  S.scene.add(g);
  g.updateMatrixWorld(true);
  g.traverse(o=>{
    if(o.isMesh && !(o.material && o.material.blending === THREE.AdditiveBlending)){ o.castShadow = true; o.receiveShadow = true; }
    if(o.userData.light){
      const p = new THREE.Vector3(); o.getWorldPosition(p);
      S.lightSources.push(Object.assign({ x:p.x, y:p.y, z:p.z, room }, o.userData.light));
    }
  });
  const meta = PROP_META[s.prop] || {};
  if(meta.r) S.colliders.push({ x:s.x, z:s.z, r:meta.r });
  (meta.cols||[]).forEach(([lx,lz,r])=>{
    const a = FACE_YAW[s.face], c = Math.cos(a), sn = Math.sin(a);
    S.colliders.push({ x: s.x + lx*c + lz*sn, z: s.z - lx*sn + lz*c, r });
  });
  return g;
}
export { PROPS, shelfUnit, books, painting };
