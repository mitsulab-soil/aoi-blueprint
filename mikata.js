/* 碧のミカタ／世界のミカタ（2026-10-08）
   世界の側 ⇄ 受けとる側（同じ欅の下）／受けとるまで（七つの段を 3D の流れで）／試す（六つの感じ方）／結び。
   文と台本の正は _dev/script.py（data/script.js）。表示名は names.json。粒・線・木の形は模式。 */
import * as THREE from "three";

const S = window.SCRIPT, NM = S.names, VOICE = window.VOICE || {};
const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const MOBILE = () => innerWidth <= 760;
const LOWP = Math.min(innerWidth, innerHeight) < 700;
window.__mk = { ready: false };

/* ---------------------------------------------------------------- 名前（names.json の一か所から） */
const titleHTML = `<span>${NM.app}</span><span class="sl">／</span><span class="pair">${NM.app_pair}</span>`;
$("ttl").innerHTML = titleHTML; $("subt").textContent = NM.sub;
$("h1").innerHTML = `<span>${NM.app}</span><span class="sl">／</span><br><span class="pair">${NM.app_pair}</span>`;
$("ssub").textContent = NM.sub;
document.title = `${NM.title} ── ${NM.sub}`;
$("fW").textContent = NM.side_world; $("fR").textContent = NM.side_recv;

/* ---------------------------------------------------------------- 段の並び */
const CH = [
  { id: "world", name: NM.ch_world }, { id: "path", name: NM.ch_path }, { id: "try", name: NM.ch_try }, { id: "end", name: NM.ch_end },
];
const STEPS = [
  { ch: "world", id: "world", name: NM.side_world },
  { ch: "world", id: "recv", name: NM.side_recv },
  ...S.stages.map((s, i) => ({ ch: "path", id: s.id, name: s.name, stage: i })),
  ...S.trials.map(t => ({ ch: "try", id: t.id, name: `${t.sense}・${t.name}`, trial: t })),
  { ch: "end", id: "end", name: NM.ch_end },
];
let si = 0, cur = STEPS[0];

/* ---------------------------------------------------------------- 描く道具 */
const cv = $("cv");
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const PR_CAP = Math.min(devicePixelRatio || 1, 1.5), PR_MIN = LOWP ? .7 : .8;
let PR = PR_CAP;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x03070d, .028);
const camera = new THREE.PerspectiveCamera(40, 1, .05, 120);
scene.add(new THREE.HemisphereLight(0xdfeaff, 0x1a2230, 1.15));
const sun = new THREE.DirectionalLight(0xfff4e0, 2.1); sun.position.set(-3, 6, 3); scene.add(sun);
const rim = new THREE.DirectionalLight(0x9bdcf0, 1.1); rim.position.set(2, 2, -3); scene.add(rim);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const COL = { aoi: 0x5cc8e0, pale: 0xbfeef8, uv: 0xa98cff, ir: 0xc0504a, leaf: 0x8fe3b0, warm: 0xf0c27a, chem: 0x9fd486, vib: 0xe0b060, mag: 0xdfe6f2, dim: 0x3f9fc0, gray: 0x6b7686 };
const addMat = (c, o = 1) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
let dotTex = null;
function dot() {
  if (dotTex) return dotTex; const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d");
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.4, "rgba(255,255,255,.85)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return dotTex = new THREE.CanvasTexture(c);
}
function ringPts(r, n = 64, y = 0) { const a = []; for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2; a.push(V3(Math.cos(t) * r, y, Math.sin(t) * r)); } return a; }
function lineOf(pts, c, o = 1) { return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), addMat(c, o)); }
let rnd = (() => { let s = 20261008; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })();

/* ---------------------------------------------------------------- 欅の下（世界の場所） */
const world = new THREE.Group(); scene.add(world);
const TREE = V3(-2.3, 0, -1.8);
/* 地面：遠くへ薄れる格子 */
{
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `varying vec2 vP;
      float gl(vec2 p, float s){ vec2 g = abs(fract(p/s - .5) - .5) / fwidth(p/s); return 1.0 - min(min(g.x, g.y), 1.0); }
      void main(){ float d = length(vP); float a = (gl(vP, .5) * .5 + gl(vP, 2.5) * .5) * smoothstep(9.0, 1.5, d);
        gl_FragColor = vec4(vec3(.36,.72,.86) * a, a * .55); }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), mat); m.rotation.x = -Math.PI / 2; world.add(m);
}
/* 欅（模式）：ほうき形に枝分かれする線と、枝先の葉の粒 */
const tree = new THREE.Group(); tree.position.copy(TREE); world.add(tree);
const leafPts = [];
{
  const segs = [];
  const grow = (p, dir, len, depth) => {
    const q = p.clone().addScaledVector(dir, len); segs.push(p, q);
    if (depth === 0) { for (let i = 0; i < 9; i++) leafPts.push(q.clone().add(V3((rnd() - .5) * .7, (rnd() - .3) * .5, (rnd() - .5) * .7))); return; }
    const n = depth > 3 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 1.2, spread = .32 + rnd() * .2;
      const d = V3(dir.x + Math.cos(a) * spread, dir.y, dir.z + Math.sin(a) * spread).normalize();
      grow(q, d, len * (.72 + rnd() * .1), depth - 1);
    }
  };
  segs.push(V3(0, 0, 0), V3(0, 1.6, 0));
  grow(V3(0, 1.6, 0), V3(0, 1, 0), 1.0, 5);
  const trunk = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segs), new THREE.LineBasicMaterial({ color: 0x9bb8c8, transparent: true, opacity: .8 }));
  tree.add(trunk);
  const lg = new THREE.BufferGeometry().setFromPoints(leafPts);
  const leaves = new THREE.Points(lg, new THREE.PointsMaterial({ color: COL.leaf, size: LOWP ? 5 : 6, sizeAttenuation: false, map: dot(), transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }));
  tree.add(leaves);
  /* 根もと：土の層（地面の下の線） */
  for (let k = 1; k <= 3; k++) { const l = lineOf(ringPts(.5 + k * .35, 48, -k * .12), 0x8a6a48, .35 - k * .07); tree.add(l); }
}
/* 小鳥（模式）：枝先にとまる */
function birdShape(sc = 1) {
  const g = new THREE.Group();
  const body = []; for (let i = 0; i <= 24; i++) { const t = i / 24 * Math.PI * 2; body.push(V3(Math.cos(t) * .11 * sc, Math.sin(t) * .065 * sc, 0)); }
  g.add(lineOf(body, COL.pale, .95));
  g.add(lineOf([V3(.1 * sc, .05 * sc, 0), V3(.14 * sc, .09 * sc, 0), V3(.17 * sc, .08 * sc, 0), V3(.2 * sc, .07 * sc, 0), V3(.17 * sc, .055 * sc, 0), V3(.1 * sc, .03 * sc, 0)], COL.pale, .95));   /* 頭とくちばし */
  g.add(lineOf([V3(-.1 * sc, .01 * sc, 0), V3(-.22 * sc, .05 * sc, 0), V3(-.21 * sc, -.01 * sc, 0), V3(-.1 * sc, -.02 * sc, 0)], COL.pale, .8));   /* 尾 */
  g.add(lineOf([V3(-.03 * sc, .03 * sc, 0), V3(.04 * sc, .045 * sc, 0), V3(-.07 * sc, -.02 * sc, 0)], COL.pale, .7));   /* 翼 */
  g.add(lineOf([V3(0, -.065 * sc, 0), V3(-.01 * sc, -.11 * sc, 0)], COL.pale, .7)); g.add(lineOf([V3(.03 * sc, -.06 * sc, 0), V3(.03 * sc, -.11 * sc, 0)], COL.pale, .7));
  return g;
}
const BIRD = V3(-1.25, 3.05, -1.2);
const bird = birdShape(2.2); bird.position.copy(BIRD); world.add(bird);
/* 石（日なた） */
const STONE = V3(1.55, .2, .5);
const stone = new THREE.Group(); stone.position.copy(STONE); world.add(stone);
{
  const geo = new THREE.IcosahedronGeometry(.36, 1); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * 1.25, p.getY(i) * .62, p.getZ(i));
  stone.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x5e6a76, roughness: .9, flatShading: true })));
  stone.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), new THREE.LineBasicMaterial({ color: 0x9fb4c6, transparent: true, opacity: .45 })));
}
/* 茂み（変化の見落としの試しに使う） */
const BUSH = V3(2.5, .32, -1.3);
const bush = new THREE.Group(); bush.position.copy(BUSH); world.add(bush);
{
  const pts = []; for (let i = 0; i < 260; i++) { const u = rnd() * Math.PI * 2, v = Math.acos(2 * rnd() - 1), r = .45 * Math.cbrt(rnd()); pts.push(V3(Math.sin(v) * Math.cos(u) * r * 1.3, Math.abs(Math.cos(v)) * r, Math.sin(v) * Math.sin(u) * r)); }
  bush.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts), new THREE.PointsMaterial({ color: 0x7fd09a, size: 7, sizeAttenuation: false, map: dot(), transparent: true, opacity: .8, depthWrite: false })));
}
/* 水たまり（聴く試しの水のしずく） */
const POOL = V3(1.0, .01, 1.7);
const pool = lineOf(ringPts(.42, 40), 0x6fb8d8, .5); pool.position.copy(POOL); world.add(pool);

/* ---- 物理の層（世界の側）。human＝人の感覚が受けとるか ---- */
const LAYERS = [];
function layer(id, name, human, note, anchor) { const g = new THREE.Group(); world.add(g); const L = { id, name, human, note, anchor, g, k: 1, mats: [] }; LAYERS.push(L); return L; }
const track = (L, m) => { m.userData.base = m.opacity; L.mats.push(m); return m; };
/* 光（見える・紫外・赤外）：斜めに降る線 */
const SUNDIR = V3(.35, -1, -.18).normalize();
function rays(L, n, colorFn, dash) {
  const pos = new Float32Array(n * 6), col = new Float32Array(n * 6), seeds = [];
  for (let i = 0; i < n; i++) {
    seeds.push({ x: (rnd() - .5) * 9 - .5, z: (rnd() - .5) * 7 - .5, ph: rnd(), sp: .55 + rnd() * .3 });
    const c = new THREE.Color(colorFn(i)); for (let k = 0; k < 2; k++) { col[i * 6 + k * 3] = c.r * (k ? .2 : 1); col[i * 6 + k * 3 + 1] = c.g * (k ? .2 : 1); col[i * 6 + k * 3 + 2] = c.b * (k ? .2 : 1); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const m = track(L, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: dash ? .55 : .75, blending: THREE.AdditiveBlending, depthWrite: false }));
  L.g.add(new THREE.LineSegments(geo, m));
  L.tick = t => {
    for (let i = 0; i < n; i++) {
      const s = seeds[i], u = ((t * s.sp * .18 + s.ph) % 1), h = 6.5 * (1 - u), len = dash ? .25 : .5;
      const x = s.x - SUNDIR.x * (6.5 - h) * .9, z = s.z - SUNDIR.z * (6.5 - h) * .9;
      pos[i * 6] = x; pos[i * 6 + 1] = h + len; pos[i * 6 + 2] = z;
      pos[i * 6 + 3] = x + SUNDIR.x * len; pos[i * 6 + 4] = h + len + SUNDIR.y * len; pos[i * 6 + 5] = z + SUNDIR.z * len;
    }
    geo.attributes.position.needsUpdate = true;
  };
}
const Lvis = layer("vis", "見える光", true, "およそ 400〜700 nm", V3(-.2, 5.2, .6));
rays(Lvis, LOWP ? 80 : 130, () => new THREE.Color().setHSL(rnd() * .72, .85, .62));
const Luv = layer("uv", "紫外線", false, "400 nm より短い", V3(.9, 4.6, -.6));
rays(Luv, LOWP ? 26 : 40, () => COL.uv, true);
const Lir = layer("ir", "赤外線", false, "700 nm より長い（肌は温かさとして）", V3(-3.6, 4.1, .4));
rays(Lir, LOWP ? 26 : 40, () => COL.ir, true);
/* 音：鳥の声（聞こえる）・とても低い音・とても高い音 */
function rings(L, center, n, maxR, period, col, op, dashed, vertical) {
  const items = [];
  for (let i = 0; i < n; i++) {
    const pts = ringPts(1, 56); const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const m = track(L, dashed ? new THREE.LineDashedMaterial({ color: col, dashSize: .05, gapSize: .07, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })
      : new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
    const l = new THREE.Line(geo, m); if (dashed) l.computeLineDistances(); l.position.copy(center); if (vertical) l.rotation.x = Math.PI / 2; L.g.add(l); items.push({ l, m, ph: i / n });
  }
  L.tick = t => { for (const it of items) { const u = (t / period + it.ph) % 1; it.l.scale.setScalar(.05 + u * maxR); it.m.opacity = it.m.userData.base * (1 - u) * L.k; } };
  L.ringItems = items;
}
const Laud = layer("aud", "鳥の声", true, "数 kHz の帯", V3(BIRD.x + .2, BIRD.y + .5, BIRD.z));
rings(Laud, BIRD, 4, 2.6, 2.2, COL.aoi, .8, false, true);
const Linf = layer("inf", "とても低い音", false, "20 Hz より低い・聞こえにくい", V3(TREE.x - 1.6, 5.8, TREE.z));
rings(Linf, V3(TREE.x, 4.3, TREE.z), 3, 7.5, 7, 0x7f9fc8, .5, true, false);
const Lult = layer("ult", "とても高い音", false, "20 kHz より高い", V3(2.2, 1.0, -.2));
rings(Lult, V3(1.9, .25, -.4), 5, .9, .7, 0x9fc0e8, .6, true, true);
/* におい：土と落ち葉から立ちのぼる分子 */
const Lchem = layer("chem", "土のにおい", true, "ゲオスミンほか", V3(TREE.x + 1.2, 1.1, TREE.z + 1.6));
{
  const n = LOWP ? 70 : 120, pos = new Float32Array(n * 3), seeds = [];
  for (let i = 0; i < n; i++) seeds.push({ x: TREE.x + (rnd() - .5) * 3, z: TREE.z + 1 + (rnd() - .5) * 3, ph: rnd(), w: rnd() * 6 });
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const m = track(Lchem, new THREE.PointsMaterial({ color: COL.chem, size: 5, sizeAttenuation: false, map: dot(), transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending }));
  Lchem.g.add(new THREE.Points(geo, m));
  Lchem.tick = t => { for (let i = 0; i < n; i++) { const s = seeds[i], u = (t * .06 + s.ph) % 1; pos[i * 3] = s.x + Math.sin(t * .7 + s.w) * .25; pos[i * 3 + 1] = u * 2.6; pos[i * 3 + 2] = s.z + Math.cos(t * .6 + s.w) * .25; } geo.attributes.position.needsUpdate = true; };
}
/* 熱：日なたの石から立つゆらぎ（肌は温かさとして受けとる） */
const Lheat = layer("heat", "日なたの石の熱", true, "肌が温かさとして", V3(STONE.x + .2, 1.25, STONE.z));
{
  const items = [];
  for (let i = 0; i < 5; i++) {
    const pts = []; for (let k = 0; k <= 20; k++) pts.push(V3((i - 2) * .12, k * .045, 0));
    const geo = new THREE.BufferGeometry().setFromPoints(pts); const m = track(Lheat, addMat(COL.warm, .7)); const l = new THREE.Line(geo, m); l.position.copy(STONE).add(V3(0, .2, 0)); Lheat.g.add(l); items.push({ geo, i });
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot(), color: 0xf09a50, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(1.4, 1, 1); glow.position.copy(STONE).add(V3(0, .15, 0)); track(Lheat, glow.material); Lheat.g.add(glow);
  Lheat.tick = t => { for (const it of items) { const p = it.geo.attributes.position; for (let k = 0; k <= 20; k++) p.setX(k, (it.i - 2) * .12 + Math.sin(t * 2 + k * .5 + it.i) * .03 * (k / 20)); p.needsUpdate = true; } };
}
/* ふるえ：足音から広がる地面の波 */
const Lvib = layer("vib", "足もとのふるえ", true, "足の裏が受けとる", V3(.4, .45, 2.4));
rings(Lvib, V3(.2, .02, 2.2), 4, 2.4, 1.6, COL.vib, .7, false, false);
/* 磁場：場所を貫く大きな弧（人は受けとらない） */
const Lmag = layer("mag", "地球の磁場", false, "渡り鳥の手がかり", V3(-4.2, 2.6, 2.4));
{
  const ls = [];
  for (let i = 0; i < 6; i++) {
    const pts = []; const r = 5 + i * .7; for (let k = 0; k <= 60; k++) { const a = Math.PI * (k / 60); pts.push(V3(Math.cos(a) * r, Math.sin(a) * r * .45 - .6, -2 + i * .9)); }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const m = track(Lmag, new THREE.LineDashedMaterial({ color: COL.mag, dashSize: .12, gapSize: .2, transparent: true, opacity: .32, depthWrite: false })); const l = new THREE.Line(geo, m); l.computeLineDistances(); l.rotation.y = .5; Lmag.g.add(l); ls.push(m);
  }
}

/* ---------------------------------------------------------------- 碧 */
let vrm = null, NECK = null;
const aoiRoot = new THREE.Group(); world.add(aoiRoot);
aoiRoot.rotation.y = -.42;     /* 欅のほうへ少し向く */
const lookT = new THREE.Object3D(); scene.add(lookT); lookT.position.set(0, 1.5, 3);
const N = n => vrm?.humanoid?.getNormalizedBoneNode(n);
function pose(t) {
  if (!vrm) return;
  const br = RM ? 0 : Math.sin(t * 2 * Math.PI / 4.6);
  const set = (n, x, y, z) => { const b = N(n); if (b) b.rotation.set(x, y, z); };
  /* 腕の休め＝02_開発中/01_碧/02_碧の身体/aoi_pose.js の写し（前腕 Y：左は負・右は正） */
  set("leftUpperArm", -.12, 0, -1.28); set("rightUpperArm", -.12, 0, 1.28);
  set("leftLowerArm", 0, -.28, 0); set("rightLowerArm", 0, .28, 0);
  set("spine", -.006 * br, 0, 0); set("chest", -.012 * br, 0, 0); set("upperChest", -.01 * br, 0, 0);
}
let blinkT = 2.5, blinkU = -1, eyesClosed = 0, eyesGoal = 0;
function blink(dt) {
  if (!vrm) return; let v = 0;
  if (!RM) {
    if (blinkU < 0) { blinkT -= dt; if (blinkT <= 0) blinkU = 0; }
    else { blinkU += dt; const u = blinkU; v = u < .09 ? u / .09 : u < .12 ? 1 : u < .26 ? 1 - (u - .12) / .14 : 0; if (u >= .26) { blinkU = -1; blinkT = 3.5 + Math.random() * 4.5; } }
  }
  eyesClosed += (eyesGoal - eyesClosed) * Math.min(1, dt * 4);
  vrm.expressionManager?.setValue("blink", Math.max(v * v * (3 - 2 * v), eyesClosed));
}
const partAnch = {};
async function loadAoi() {
  const [V, G, MO, buf] = await Promise.all([
    import("@pixiv/three-vrm"), import("three/addons/loaders/GLTFLoader.js"), import("three/addons/libs/meshopt_decoder.module.js"),
    fetch("assets/aoi.vrm").then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.arrayBuffer(); }),
  ]);
  const ld = new G.GLTFLoader(); ld.setMeshoptDecoder(MO.MeshoptDecoder); ld.register(p => new V.VRMLoaderPlugin(p));
  const g = await ld.parseAsync(buf, "");
  const v = g.userData.vrm; if (!v) throw new Error("VRM ではない");
  V.VRMUtils.removeUnnecessaryVertices(g.scene); (V.VRMUtils.combineSkeletons ?? V.VRMUtils.removeUnnecessaryJoints)?.(g.scene); V.VRMUtils.rotateVRM0(v);
  vrm = v; aoiRoot.add(v.scene); v.scene.traverse(o => { o.frustumCulled = false; });
  pose(0); v.update(0); v.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(v.scene), h = box.max.y - box.min.y, sc = Math.abs(h - 1.67) / 1.67 > .02 ? 1.67 / h : 1;
  v.scene.scale.setScalar(sc); v.scene.position.y = -box.min.y * sc; v.scene.updateMatrixWorld(true);
  if (v.lookAt) v.lookAt.target = lookT;
  /* 部位の印（碧の側）：骨に付けた点 */
  const raw = n => v.humanoid?.getRawBoneNode(n);
  const att = (id, bone, off) => { const b = raw(bone); if (!b) return; const o = new THREE.Object3D(); o.position.copy(off); aoiRoot.updateMatrixWorld(true); scene.add(o); o.position.copy(wposOf(b).add(off)); b.attach(o); partAnch[id] = o; };
  att("ear", "head", V3(.09, .1, 0)); att("eye", "head", V3(-.04, .07, .09)); att("mind", "head", V3(0, .2, .02));
  att("chest", "upperChest", V3(0, .02, .12)); att("back", "upperChest", V3(0, .02, -.14)); att("hand", "rightHand", V3(.05, -.02, 0));
  att("foot", "leftFoot", V3(0, -.05, .06));
  NECK = raw("neck");
}
const wposOf = o => o.getWorldPosition(new THREE.Vector3());

/* ---------------------------------------------------------------- 受けとるまで（流れ） */
const PZ = -42, GX = [-9, -6, -3, 0, 3, 6, 9];
const path = new THREE.Group(); path.position.set(0, 0, PZ); scene.add(path);
const PY = 1.5;
const R0 = [1.35, 1.2, 1.0, .3, .55, .6, .5];   /* 各段の流れの太さ */
function radAt(x) {
  if (x <= GX[0]) return R0[0];
  for (let i = 0; i < GX.length - 1; i++) if (x <= GX[i + 1]) { const u = (x - GX[i]) / (GX[i + 1] - GX[i]); return R0[i] + (R0[i + 1] - R0[i]) * (u * u * (3 - 2 * u)); }
  return R0[R0.length - 1];
}
/* 門 */
const gates = [];
{
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(30, 8), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `varying vec2 vP; float gl(vec2 p, float s){ vec2 g = abs(fract(p/s - .5) - .5) / fwidth(p/s); return 1.0 - min(min(g.x, g.y), 1.0); }
      void main(){ float a = gl(vP, .5) * smoothstep(4.0, 1.0, abs(vP.y)) * smoothstep(15.0, 11.0, abs(vP.x)); gl_FragColor = vec4(vec3(.36,.72,.86) * a, a * .35); }`,
  }));
  fl.rotation.x = -Math.PI / 2; path.add(fl);
  for (let i = 0; i < GX.length; i++) {
    const g = new THREE.Group(); g.position.set(GX[i], PY, 0); path.add(g);
    const r = (R0[i] + (i < 6 ? R0[i + 1] : R0[i])) / 2 + .15;
    if (i > 0) {
      const ring = lineOf(ringPts(r, 80).map(p => V3(0, p.x, p.z)), COL.aoi, .6); g.add(ring);
      const tick = []; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; tick.push(V3(0, Math.cos(a) * r, Math.sin(a) * r), V3(0, Math.cos(a) * (r + .06), Math.sin(a) * (r + .06))); }
      g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tick), addMat(COL.aoi, .5)));
    }
    gates.push({ g, r, x: GX[i] });
  }
  /* 1 感覚器：受けとる帯（弧の一部だけ明るい） */
  {
    const g = gates[1].g, r = gates[1].r + .14, band = [], out = [];
    for (let k = 0; k <= 60; k++) { const a = -Math.PI * .1 + k / 60 * Math.PI * 1.2; (k > 18 && k < 42 ? band : out).push(V3(0, Math.cos(a) * r, Math.sin(a) * r)); }
    g.add(lineOf(band, COL.leaf, .95)); g.add(lineOf(out, COL.gray, .4));
  }
  /* 2 信号：線維の束（太い入口から細い出口へ） */
  {
    const segs = []; const n = LOWP ? 36 : 60;
    for (let k = 0; k < n; k++) {
      const a = rnd() * Math.PI * 2, r1 = Math.sqrt(rnd()) * 1.0, r2 = Math.sqrt(rnd()) * .28;
      let prev = null;
      for (let s = 0; s <= 12; s++) { const u = s / 12, uu = u * u * (3 - 2 * u), r = r1 + (r2 - r1) * uu; const p = V3(GX[2] + u * (GX[3] - GX[2]), PY + Math.cos(a + u * .6) * r, Math.sin(a + u * .6) * r); if (prev) segs.push(prev, p); prev = p; }
    }
    path.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segs), addMat(0x3f9fc0, .22)));
  }
  /* 4 記憶：型（鳥の点線のかたち） */
  const tpl = birdShape(7); tpl.position.set(GX[4] + 1.5, PY + .25, 0); tpl.rotation.y = -Math.PI / 2 + .25;
  tpl.traverse(o => { if (o.material) { o.material = new THREE.LineDashedMaterial({ color: COL.warm, dashSize: .05, gapSize: .05, transparent: true, opacity: .55, depthWrite: false }); o.computeLineDistances?.(); } });
  path.add(tpl); gates[4].tpl = tpl;
  /* 5 容量：とどめておける四つの場所 */
  gates[5].slots = [];
  for (let k = 0; k < 4; k++) {
    const y = PY + (k < 2 ? .45 : -.45), z = (k % 2 ? .45 : -.45);
    const ring = lineOf(ringPts(.26, 40).map(p => V3(0, p.x, p.z)), COL.pale, .5); ring.position.set(GX[5] + .6, y, z); path.add(ring);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot(), color: COL.aoi, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); core.scale.setScalar(.3); core.position.copy(ring.position); path.add(core);
    gates[5].slots.push({ ring, core, v: 0, kind: null });
  }
  /* 6 意味：組み立てた場面（小さな欅と鳥と風） */
  {
    const g = new THREE.Group(); g.position.set(GX[6] + 1.6, PY - .9, 0); g.rotation.y = -Math.PI / 2; path.add(g);
    const segs = [];
    const lp = [];
    const grow = (p, dir, len, d) => { const q = p.clone().addScaledVector(dir, len); segs.push(p, q); if (!d) { for (let k = 0; k < 5; k++) lp.push(q.clone().add(V3((rnd() - .5) * .25, (rnd() - .3) * .2, 0))); return; } for (let k = 0; k < 2; k++) { const a = (k ? 1 : -1) * (.45 + rnd() * .35); grow(q, V3(dir.x + a, dir.y, 0).normalize(), len * .74, d - 1); } };
    segs.push(V3(-.5, 0, 0), V3(-.5, .75, 0)); grow(V3(-.5, .75, 0), V3(0, 1, 0), .42, 5);
    g.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(lp), new THREE.PointsMaterial({ color: COL.leaf, size: 5, sizeAttenuation: false, map: dot(), transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending })));
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segs), addMat(COL.leaf, .8)));
    const b = birdShape(1.6); b.position.set(.35, 1.35, 0); g.add(b);
    for (let k = 0; k < 3; k++) { const pts = []; for (let s = 0; s <= 30; s++) pts.push(V3(-1.2 + s * .08, .5 + k * .3 + Math.sin(s * .4 + k) * .06, 0)); g.add(lineOf(pts, COL.pale, .35)); }
    gates[6].scene = g;
  }
}
/* 上から下への流れ（予測）：記憶の段から、前の段へもどる弧 */
const predict = [];
for (let k = 1; k <= 3; k++) {
  const a = V3(GX[4], PY + 1.0, 0), b = V3(GX[k] + .2, PY + gates[k].r + .1, 0), mid = a.clone().lerp(b, .5).add(V3(0, 1.0 + (4 - k) * .25, 0));
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const m = new THREE.LineDashedMaterial({ color: COL.warm, dashSize: .1, gapSize: .1, transparent: true, opacity: .0, depthWrite: false });
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)), m); l.computeLineDistances(); path.add(l);
  const dots = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot(), color: COL.warm, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); dots.scale.setScalar(.18); path.add(dots);
  predict.push({ curve, m, dots, ph: k * .3 });
}

/* 粒（模式。数は実際の量ではない） */
const TYPES = [
  { id: "vis", w: 26, human: true, col: null }, { id: "uv", w: 8, human: false, col: COL.uv }, { id: "ir", w: 8, human: false, col: COL.ir },
  { id: "aud", w: 16, human: true, col: COL.aoi }, { id: "inf", w: 5, human: false, col: 0x7f9fc8 }, { id: "ult", w: 5, human: false, col: 0x9fc0e8 },
  { id: "chem", w: 12, human: true, col: COL.chem }, { id: "heat", w: 6, human: true, col: COL.warm }, { id: "vib", w: 9, human: true, col: COL.vib }, { id: "mag", w: 5, human: false, col: COL.mag },
];
const TW = TYPES.reduce((a, t) => a + t.w, 0);
const NP = LOWP ? 1300 : 2400;
const P = [];
const pPos = new Float32Array(NP * 3), pCol = new Float32Array(NP * 3), pSize = new Float32Array(NP), pA = new Float32Array(NP);
let attn = "aud";
const count = { in: 0, out: 0, tIn: [], tOut: [] };
function spawn(p, init) {
  let r = rnd() * TW, T = TYPES[0]; for (const t of TYPES) { r -= t.w; if (r <= 0) { T = t; break; } }
  p.t = T; p.x = GX[0] - 1.2 - rnd() * 2.2 + (init ? rnd() * 20 : 0); p.a = rnd() * Math.PI * 2; p.rr = Math.sqrt(rnd()); p.sp = .9 + rnd() * .5;
  p.i = rnd(); p.dead = -1; p.fade = 0; p.slot = -1;
  const c = T.col != null ? new THREE.Color(T.col) : new THREE.Color().setHSL(rnd() * .72, .85, .62); p.c = c;
  /* どこで落ちるか */
  p.fate = !T.human || p.i < .22 ? 1 : rnd() < .55 ? 2 : 3;   /* 3＝注意の門で、そのときの注意しだい */
  p.dec = false;
  p.tpl = Math.floor(rnd() * 1e6);
  if (init) { if (p.x > GX[1] && p.fate <= 1) p.x = GX[0] + rnd() * 2; if (p.x > GX[2] && p.fate <= 2) p.x = GX[1] + rnd() * 2; if (p.x > GX[3] && p.fate === 3) { if (p.t.id === attn) { p.dec = true; p.fate = 9; } else p.x = GX[2] + rnd() * 2; } }
}
for (let i = 0; i < NP; i++) { const p = {}; spawn(p, true); P.push(p); }
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
pGeo.setAttribute("size", new THREE.BufferAttribute(pSize, 1)); pGeo.setAttribute("alpha", new THREE.BufferAttribute(pA, 1));
const pMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTex: { value: dot() }, uPR: { value: 1 } },
  vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA;
    void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = size * uPR * (6.0 / -mv.z); }`.replace("void main", "uniform float uPR; void main"),
  fragmentShader: `uniform sampler2D uTex; varying vec3 vC; varying float vA; void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vC * t.a, t.a * vA); }`,
});
const pts = new THREE.Points(pGeo, pMat); pts.frustumCulled = false; path.add(pts);
/* 横切るもの（注意の外）：白い蝶のかたちの粒 */
const cross = new THREE.Group(); path.add(cross);
{
  const ps = []; for (let i = 0; i < 70; i++) { const a = rnd() * Math.PI * 2, s = Math.abs(Math.sin(2 * a)); ps.push(V3(0, Math.sin(a) * s * .32, Math.cos(a) * s * .42)); }
  cross.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(ps), new THREE.PointsMaterial({ color: 0xffffff, size: 6, sizeAttenuation: false, map: dot(), transparent: true, opacity: .85, depthWrite: false, blending: THREE.AdditiveBlending })));
}
const TPL = (() => { const out = []; gates[4].tpl.updateMatrixWorld(true); gates[4].tpl.traverse(o => { if (o.isLine) { const p = o.geometry.attributes.position; for (let k = 0; k < p.count; k++) out.push(V3(p.getX(k), p.getY(k), p.getZ(k)).applyMatrix4(o.matrix).applyMatrix4(gates[4].tpl.matrix)); } }); return out; })();

function stepParticles(dt, t) {
  const slow = RM ? .35 : 1;
  for (let i = 0; i < NP; i++) {
    const p = P[i];
    if (p.dead >= 0) {
      p.dead += dt; p.x += dt * .4 * slow; p.rr += dt * .5;
      if (p.dead > 1.4) { spawn(p, false); count.in++; }
    } else {
      p.x += dt * 1.5 * p.sp * slow;
      if (p.fate === 3 && !p.dec && p.x >= GX[3]) { p.dec = true; p.fate = p.t.id === attn ? 9 : rnd() < .06 ? 3.5 : 3; }
      const gateHit = p.fate === 1 ? GX[1] : p.fate === 2 ? GX[2] + .4 : (p.fate === 3 && p.dec) ? GX[3] : 99;
      if (p.x >= gateHit) p.dead = 0;
      if (p.x > GX[6] + .8) { count.out++; spawn(p, false); count.in++; }
    }
    const R = radAt(p.x);
    let x = p.x, y = PY + Math.cos(p.a + p.x * .25) * p.rr * R, z = Math.sin(p.a + p.x * .25) * p.rr * R;
    /* 記憶：型の点へ寄せる／容量：四つの場所へ */
    if (p.dead < 0 && p.x > GX[4] - .2) {
      const q = TPL[p.tpl % TPL.length], u = Math.min(1, (p.x - (GX[4] - .2)) / 1.4);
      if (p.x < GX[5]) { y += (q.y - y) * u; z += (q.z - z) * u; x += (q.x - x) * u * .4; }
      else {
        const s = gates[5].slots[p.tpl % 4].ring.position, w = Math.min(1, (p.x - GX[5]) / .5);
        x = x + (s.x - x) * w * .6; y = y + (s.y - y) * w; z = z + (s.z - z) * w;
        if (w >= 1 && p.slot < 0) { p.slot = p.tpl % 4; const sl = gates[5].slots[p.slot]; sl.v = 1; sl.kind = p.t.id; }
      }
    }
    if (p.dead >= 0) { y += -p.dead * .25; z += Math.sin(p.a) * p.dead * .4; }
    pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
    /* 色：信号の段からは碧色へ寄る。落ちたものは灰へ */
    let c = p.c, k = Math.min(1, Math.max(0, (p.x - GX[2]) / 1.5)), a = 1, s = 5.5 + p.i * 4;
    let r = c.r + (.45 - c.r) * k * .6, g = c.g + (.85 - c.g) * k * .6, b = c.b + (.95 - c.b) * k * .6;
    if (p.x > GX[2]) s *= .75;
    if (p.fate === 3.5 && p.x > GX[3]) a *= .25;
    if (p.dead >= 0) { const f = Math.max(0, 1 - p.dead / 1.4); a *= f * .55; r = g = b = .5; }
    if (p.x < GX[0] - 2.6) a *= Math.max(0, 1 - (GX[0] - 2.6 - p.x) / 1.0);
    pCol[i * 3] = r; pCol[i * 3 + 1] = g; pCol[i * 3 + 2] = b; pSize[i] = s; pA[i] = Math.min(1, a * (.6 + p.i * .5));
  }
  pGeo.attributes.position.needsUpdate = pGeo.attributes.color.needsUpdate = pGeo.attributes.size.needsUpdate = pGeo.attributes.alpha.needsUpdate = true;
  for (const sl of gates[5].slots) { sl.v = Math.max(0, sl.v - dt * .35); sl.core.material.opacity = sl.v * .45; sl.ring.material.opacity = .35 + sl.v * .5; }
  /* 横切るもの：9 秒に一度、信号と注意のあいだを下から上へ */
  const u = (t % 9) / 9; cross.visible = u < .32; cross.position.set(GX[2] + 1.6, PY - 2 + (u / .32) * 4, .3); cross.scale.y = .8 + Math.abs(Math.sin(t * 9)) * .4;
  /* 予測の弧（記憶の段から見えはじめる） */
  const on = cur.stage >= 4 ? 1 : 0;
  for (const pr of predict) { pr.m.opacity += (on * .55 - pr.m.opacity) * Math.min(1, dt * 2); const w = ((t * .35 + pr.ph) % 1); pr.dots.position.copy(pr.curve.getPoint(w)); pr.dots.material.opacity = pr.m.opacity * 1.4 * Math.sin(w * Math.PI); }
  /* 意味の場面：ゆっくり明るく */
  const sc = gates[6].scene; sc.traverse(o => { if (o.material) o.material.opacity = (o.userData.b ??= o.material.opacity) * (.6 + .4 * Math.sin(t * .8)); });
}

/* ---------------------------------------------------------------- ラベル（HTML） */
const labelsEl = $("labels");
const LB = [];
function mkLabel(html, cls, anchorFn, onClick) {
  const el = document.createElement(onClick ? "button" : "div"); el.className = "lb " + (cls || ""); el.innerHTML = html; labelsEl.appendChild(el);
  if (onClick) { el.addEventListener("click", onClick); el.style.pointerEvents = "auto"; }
  const L = { el, anchorFn, show: true }; LB.push(L); return L;
}
for (const L of LAYERS) { L.label = mkLabel(`<b>${L.name}</b><i>${L.note}</i>`, "", () => L.anchor, null); L.label.grp = "world"; }
const gateLabels = S.stages.map((s, i) => { const L = mkLabel(`<span style="font-family:var(--mono);color:var(--ink-3);margin-right:6px">${s.no}</span>${s.name}`, "gate", () => V3(GX[i], PY - (gates[i].r || 1.4) - .35, PZ), () => go(STEPS.findIndex(x => x.id === s.id))); L.grp = "path"; return L; });
const partBtns = S.parts.map(p => {
  const el = document.createElement("button"); el.className = "pt"; el.textContent = `${p.name.replace("（ことば）", "")}　${p.does}`; el.setAttribute("aria-label", `${p.name}：${p.does}`);
  el.addEventListener("click", e => { e.stopPropagation(); openPart(p.id); }); labelsEl.appendChild(el);
  return { el, id: p.id };
});
const _v = new THREE.Vector3();
function toScreen(v, W, H) { _v.copy(v).project(camera); return [(_v.x * .5 + .5) * W, (-_v.y * .5 + .5) * H, _v.z < 1 && _v.z > -1]; }
function updateLabels() {
  const W = innerWidth, H = innerHeight;
  const inWorld = cur.ch === "world" || cur.ch === "end";
  const cr = card.classList.contains("hide") ? null : card.getBoundingClientRect();
  for (const L of LB) {
    const vis = (L.grp === "world" && inWorld && cur.id !== "end") || (L.grp === "path" && cur.ch === "path");
    if (!vis) { if (L.el.style.display !== "none") L.el.style.display = "none"; continue; }
    const [x, y, ok] = toScreen(L.anchorFn(), W, H);
    const hw = L.grp === "path" ? 50 : 90;
    if (!ok || x < hw || x > W - hw || y < (MOBILE() ? 215 : 110) || y > H - 120 || (cr && x + hw > cr.left && y > cr.top - 10 && y < cr.bottom + 30)) { L.el.style.display = "none"; continue; }
    L.el.style.display = ""; L.el.style.transform = `translate(${x}px,${y}px) translate(-50%,${L.grp === "path" ? "0" : "-100%"})`;
  }
  for (const L of LAYERS) L.label.el.classList.toggle("off", flipK > .5 && !L.human);
  for (let i = 0; i < gateLabels.length; i++) gateLabels[i].el.classList.toggle("cur", cur.stage === i);
  const showParts = cur.id === "recv" && vrm;
  for (const b of partBtns) {
    const a = partAnch[b.id];
    if (!showParts || !a) { b.el.style.display = "none"; continue; }
    const [x, y, ok] = toScreen(wposOf(a), W, H);
    if (!ok) { b.el.style.display = "none"; continue; }
    b.el.style.display = ""; const side = (b.id === "ear" || b.id === "hand" || b.id === "back") ? 1 : -1;
    b.el.style.transform = `translate(${x}px,${y}px) translate(${side > 0 ? "8px" : "calc(-100% - 8px)"},-50%)`;
    b.el.classList.toggle("on", openPartId === b.id);
    if (b.id === "back" && partAnch.chest) b.el.style.opacity = wposOf(a).distanceTo(camera.position) > wposOf(partAnch.chest).distanceTo(camera.position) ? ".6" : "1";
  }
}

/* ---------------------------------------------------------------- カメラ */
const camPos = V3(0, 2, 8), camTgt = V3(0, 1.4, 0);
let goalPos = camPos.clone(), goalTgt = camTgt.clone(), orbit = { yaw: 0, pitch: 0, gy: 0, gp: 0 };
function view(id) {
  const m = MOBILE(), asp = innerWidth / innerHeight;
  const far = asp < .75 ? 1.55 : 1;
  switch (id) {
    case "world": return [V3(3.6 * far, 2.5 * far, 6.4 * far), V3(-.9, 1.7, -.7)];
    case "recv": return [V3(.55, 1.45, 2.7 * (m ? 1.25 : 1)), V3(-.05, 1.12, 0)];
    case "change": return [V3(2.2 * far, 2.2, 6.6 * far), V3(-.2, 1.2, -.6)];
    case "hear": return [V3(2.8 * far, 2.3, 6.2 * far), V3(-.6, 1.6, -.6)];
    case "face": return m ? [V3(.32, 1.45, 1.75), V3(-.02, 1.38, 0)] : [V3(.5, 1.5, 2.1), V3(-.05, 1.38, 0)];
    case "body": return [V3(.9, 1.3, 2.4 * (m ? 1.3 : 1)), V3(0, 1.05, 0)];
    case "end": return [V3(4.6 * far, 3.2 * far, 8.4 * far), V3(-.6, 1.6, -.8)];
  }
  if (id.startsWith("stage")) {
    const i = +id.slice(5), x = GX[i];
    if (asp < .75) {   /* 縦長：流れの奥へ向かって見る（いまの門が手前、次の段が奥に） */
      const tx = i === 0 ? x - 1.2 : x;
      return [V3(tx - 3.6, PY + 1.25, PZ + 2.6), V3(tx + 1.4, PY - .1, PZ)];
    }
    const d = asp < 1.2 ? 6.0 : 5.0;
    const tx = i === 0 ? x - 1.4 : x + .35;
    return [V3(tx - 1.8, PY + 1.3, PZ + d), V3(tx, PY, PZ)];
  }
  return [V3(0, 2, 8), V3(0, 1.4, 0)];
}
let camJump = true;
function setView(id) { const [p, t] = view(id); goalPos.copy(p); goalTgt.copy(t); orbit.gy = orbit.gp = 0; if (RM) camJump = true; }
function placeCam(dt) {
  const k = camJump ? 1 : 1 - Math.exp(-dt * 2.2); camJump = false;
  camPos.lerp(goalPos, k); camTgt.lerp(goalTgt, k);
  orbit.yaw += (orbit.gy - orbit.yaw) * Math.min(1, dt * 6); orbit.pitch += (orbit.gp - orbit.pitch) * Math.min(1, dt * 6);
  const off = camPos.clone().sub(camTgt); const sph = new THREE.Spherical().setFromVector3(off);
  sph.theta += orbit.yaw; sph.phi = Math.min(Math.PI * .48, Math.max(.25, sph.phi + orbit.pitch));
  camera.position.copy(camTgt).add(new THREE.Vector3().setFromSpherical(sph)); camera.lookAt(camTgt);
}
/* 札で隠れる分、写す範囲をずらして見どころを空いた側へ */
function applyOffset() {
  const W = innerWidth, H = innerHeight;
  let ox = 0, oy = 0;
  if (!MOBILE()) { const cw = $("card").classList.contains("hide") ? 0 : $("card").offsetWidth + 16; ox = cw / 2; }
  else { const ch = $("card").classList.contains("hide") ? 0 : $("card").offsetHeight; oy = (ch - 150) / 2 * .8; }
  camera.setViewOffset(W, H, ox, oy, W, H);
}
function resize() {
  const W = innerWidth, H = innerHeight;
  PR = Math.min(PR, PR_CAP); renderer.setPixelRatio(PR); renderer.setSize(W, H, false);
  camera.aspect = W / H; camera.fov = W / H < .75 ? 50 : 40; camera.updateProjectionMatrix(); applyOffset();
  pMat.uniforms.uPR.value = PR * (H / 900);
  setView(viewOf(cur)); camJump = true;
}
addEventListener("resize", resize);

/* 見回す（ドラッグ）／押す */
let drag = null;
cv.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, y0: orbit.gy, p0: orbit.gp, moved: false }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener("pointermove", e => {
  if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.hypot(dx, dy) > 6) drag.moved = true;
  if (drag.moved) { orbit.gy = Math.max(-.7, Math.min(.7, drag.y0 - dx * .005)); orbit.gp = Math.max(-.3, Math.min(.3, drag.p0 - dy * .003)); }
});
cv.addEventListener("pointerup", e => { const d = drag; drag = null; if (d && !d.moved) onTap(e); });
cv.addEventListener("pointercancel", () => { drag = null; });
const ray = new THREE.Raycaster();
function onTap(e) {
  if (cur.id === "t_change" && change.on) {
    const W = innerWidth, H = innerHeight; const [x, y] = toScreen(wposOf(change.target).add(V3(0, change.target === bird ? 0 : .15, 0)), W, H);
    if (Math.hypot(e.clientX - x, e.clientY - y) < (MOBILE() ? 70 : 90)) changeFound(true); else ripple(e.clientX, e.clientY);
    return;
  }
  if (cur.id === "world") { setSide(1); return; }
  if (cur.ch === "path") {
    /* 押した所に近い門へ */
    const W = innerWidth; let best = -1, bd = 1e9;
    for (let i = 0; i < GX.length; i++) { const [x] = toScreen(V3(GX[i], PY, PZ), W, innerHeight); const d = Math.abs(x - e.clientX); if (d < bd) { bd = d; best = i; } }
    if (best >= 0 && bd < 120 && best !== cur.stage) go(STEPS.findIndex(s => s.stage === best));
  }
}
function ripple(x, y) { const d = document.createElement("div"); d.style.cssText = `position:fixed;left:${x - 18}px;top:${y - 18}px;width:36px;height:36px;border:1px solid #a6e4f2;border-radius:50%;z-index:7;pointer-events:none;transition:all .6s;opacity:.9`; document.body.appendChild(d); requestAnimationFrame(() => { d.style.transform = "scale(2)"; d.style.opacity = "0"; }); setTimeout(() => d.remove(), 700); }

/* ---------------------------------------------------------------- 表と裏 */
let flipK = 0, flipGoal = 0;
function setSide(s) {
  if (cur.ch !== "world") return;
  const id = s ? "recv" : "world"; if (cur.id !== id) go(STEPS.findIndex(x => x.id === id));
}
function updateLayers(t, dt) {
  flipK += (flipGoal - flipK) * (RM ? 1 : Math.min(1, dt * 2.4));
  const pathOnly = cur.ch === "path";
  for (const L of LAYERS) {
    const k = L.human ? 1 : 1 - .9 * flipK; L.k = k;
    for (const m of L.mats) if (!L.ringItems) m.opacity = m.userData.base * k;
    L.tick?.(RM ? t * .3 : t);
    L.g.visible = !pathOnly && !(cur.id === "t_change") && !(cur.ch === "try" && ["t_touch", "t_smell", "t_taste", "t_body", "t_blind"].includes(cur.id) && L.id !== "chem");
  }
  if (cur.id === "t_smell") Lchem.g.visible = true;
  if (cur.id === "t_hear") for (const L of LAYERS) L.g.visible = L.id === "aud";
}

/* ---------------------------------------------------------------- 碧の声と字幕 */
let voiceOn = true, sayTok = 0, audio = null;
const sayEl = $("say"), subEl = $("sub");
window.__voiceSrc = null;
function say(lines, done) {
  const tok = ++sayTok; stopAudio();
  let i = 0;
  const nextLine = () => {
    if (tok !== sayTok) return;
    if (i >= lines.length) { subEl.classList.remove("talk"); done?.(); return; }
    const t = lines[i++]; sayEl.textContent = t; subEl.classList.add("talk");
    const v = VOICE[t];
    if (voiceOn && v) {
      audio = new Audio(v.f); window.__voiceSrc = v.f;
      audio.onended = () => setTimeout(nextLine, 380);
      audio.onerror = () => setTimeout(nextLine, est(t));
      audio.play().catch(() => setTimeout(nextLine, est(t)));
    } else { window.__voiceSrc = null; setTimeout(nextLine, est(t)); }
  };
  nextLine();
}
const est = t => 900 + t.length * 140;
function stopAudio() { if (audio) { audio.onended = audio.onerror = null; audio.pause(); audio = null; } }
$("bVoice").addEventListener("click", () => { voiceOn = !voiceOn; $("bVoice").setAttribute("aria-pressed", voiceOn); $("bVoice").textContent = voiceOn ? "声" : "声なし"; if (!voiceOn) stopAudio(); });
$("again").addEventListener("click", () => enter(true));

/* ---------------------------------------------------------------- 札（カード） */
const cardIn = $("cardIn"), card = $("card");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function srcList(keys) { if (!keys?.length) return ""; return `<details><summary>典拠</summary><ol>${keys.map(k => `<li>${esc(S.refs[k])}</li>`).join("")}</ol></details>`; }
function linksOf(ids) { if (!ids?.length) return ""; return `<div class="links">${ids.map(k => `<a href="${S.links[k][1]}" target="_blank" rel="noopener">${esc(S.links[k][0])} ↗</a>`).join("")}</div>`; }
function setCard(html) { cardIn.innerHTML = html; card.classList.remove("hide"); card.scrollTop = 0; setMin(MOBILE()); requestAnimationFrame(() => { document.documentElement.style.setProperty("--cardh", card.offsetHeight + 8 + "px"); applyOffset(); }); }
function setMin(on) { card.classList.toggle("min", on); $("cardT").setAttribute("aria-expanded", !on); $("cardT").textContent = on ? "くわしく" : "たたむ"; requestAnimationFrame(() => { document.documentElement.style.setProperty("--cardh", card.offsetHeight + 8 + "px"); applyOffset(); }); }
$("cardT").addEventListener("click", () => setMin(!card.classList.contains("min")));
function cardWorld(w, side) {
  return `<div class="ck">${esc(NM.ch_world)}・${side ? "裏" : "表"}</div><h2>${esc(w.name)}</h2><p class="lead">${esc(w.card.lead)}</p>
    <div class="full"><ul>${w.card.body.map(b => `<li>${esc(b)}</li>`).join("")}</ul></div><div class="q">${esc(w.card.q)}</div><div class="full">${srcList(w.card.src)}</div>`;
}
function cardStage(s) {
  return `<div class="ck">${esc(NM.ch_path)}・${s.no}／6</div><h2>${esc(s.name)}</h2>
    <div class="full"><div class="row"><span class="k">人では</span>${esc(s.hito)}</div><div class="row aoi"><span class="k">碧では</span>${esc(s.aoi)}</div></div>
    <div class="q">${esc(s.q)}</div><div class="full">${srcList(s.src)}</div>`;
}
function cardTrial(t) {
  return `<div class="ck">${esc(NM.ch_try)}・${esc(t.sense)}</div><h2>${esc(t.name)}</h2><div class="full"><p class="lead">${esc(t.hito)}</p></div>
    <div class="q">${esc(t.q)}</div><div class="full">${srcList(t.src)}</div>`;
}
let openPartId = null;
function openPart(id) {
  const p = S.parts.find(x => x.id === id); if (!p) return; openPartId = id;
  setCard(`<button class="back" id="pBack">← ${esc(NM.side_recv)}へ</button><div class="ck">碧の${esc(p.name)}・${esc(p.q)}</div><h2>${esc(p.does)}</h2>
    <p class="lead">${esc(p.act)}</p><div class="full"><div class="row aoi"><span class="k">技術</span>${esc(p.tech)}</div>
    <div class="row"><span class="k">移せないもの</span>${esc(p.cannot)}</div>${linksOf(p.links)}${srcList(p.src)}</div>`);
  setMin(false);
  $("pBack").addEventListener("click", () => { openPartId = null; enter(false); });
  const a = partAnch[id];
  if (a) { const w = wposOf(a); goalTgt.copy(w); goalPos.copy(w).add(V3(.25, .1, MOBILE() ? 1.6 : 1.2)); }
  say(p.lines);
}

/* ---------------------------------------------------------------- 試すところ */
const trialEl = $("trial"), ctl = $("ctl");
let actx = null;
function ac() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { } } if (actx?.state === "suspended") actx.resume(); return actx; }
let trialStop = [];
function clearTrial() { for (const f of trialStop) try { f(); } catch { } trialStop = []; trialEl.className = ""; trialEl.innerHTML = ""; document.body.classList.remove("trialOn"); $("blank").classList.remove("on"); eyesGoal = 0; change.on = false; resetChange(); }
function ctlSet(html) { ctl.innerHTML = html; ctl.classList.toggle("show", !!html); }

/* 見る 1：盲点 */
function trialBlind() {
  trialEl.className = "show"; document.body.classList.add("trialOn");
  trialEl.innerHTML = `<div class="tt">左目を閉じ、右目で ＋ を見たまま、画面に近づく・遠ざかる</div><canvas id="bc" height="200"></canvas><div class="note">スマホは横向きにすると、見つけやすくなります。</div>`;
  const c = $("bc"), g = c.getContext("2d");
  const draw = () => {
    const w = c.clientWidth, h = MOBILE() ? 150 : 200, d = Math.min(devicePixelRatio || 1, 2); c.width = w * d; c.height = h * d; c.style.height = h + "px"; g.scale(d, d);
    for (let x = 0; x < w; x += 8) { g.fillStyle = (x / 8) % 2 ? "#2c5a6c" : "#7fb6c6"; g.fillRect(x, 0, 8, h); }
    const cx = w * .14, cy = h / 2, dx = w * .78;
    g.fillStyle = "#0a1520"; g.fillRect(cx - 16, cy - 16, 32, 32); g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 10, cy); g.lineTo(cx + 10, cy); g.moveTo(cx, cy - 10); g.lineTo(cx, cy + 10); g.stroke();
    g.fillStyle = "#e9573f"; g.beginPath(); g.arc(dx, cy, 13, 0, Math.PI * 2); g.fill();
  };
  requestAnimationFrame(draw); const onR = () => draw(); addEventListener("resize", onR); trialStop.push(() => removeEventListener("resize", onR));
}
/* 見る 2：変化の見落とし（ちらつき法） */
const change = { on: false, target: null, t: 0, found: false };
function resetChange() { bird.visible = stone.visible = bush.visible = true; }
function trialChange(t) {
  const cands = [stone, bush, bird]; change.target = cands[Math.floor(Math.random() * cands.length)]; change.found = false; change.t = 0; change.on = false;
  ctlSet(`<button class="go" id="cGo">ちらつきを始める</button>`);
  $("cGo").addEventListener("click", () => {
    change.on = true; change.t = 0; ctlSet(`<button id="cRev">答えを見る</button>`);
    $("cRev").addEventListener("click", () => changeFound(false));
  });
}
function tickChange(dt) {
  if (!change.on) return; change.t += dt * 1000;
  const ph = change.t % 640;   /* 240 ms の景色・80 ms の空白（Rensink ほか 1997 の型） */
  $("blank").classList.toggle("on", (ph >= 240 && ph < 320) || ph >= 560);
  change.target.visible = ph < 320;
}
function changeFound(found) {
  if (!change.on && !found) { /* まだ始めていない */ }
  change.on = false; $("blank").classList.remove("on"); change.target.visible = true; change.found = true;
  const t = S.trials.find(x => x.id === "t_change");
  ctlSet(`<button id="cAgain">もう一度</button>`); $("cAgain").addEventListener("click", () => { resetChange(); trialChange(t); });
  /* 違ったものを光る輪で示す */
  const ring = lineOf(ringPts(.55, 48).map(p => V3(p.x, p.z, 0)), COL.warm, .95); ring.position.copy(wposOf(change.target)).add(V3(0, change.target === bird ? 0 : .2, 0)); ring.lookAt(camera.position); scene.add(ring);
  trialStop.push(() => scene.remove(ring)); setTimeout(() => scene.remove(ring), 6000);
  say(found ? t.found : t.reveal);
}
/* 聴く：数えているあいだに（その場で作る音） */
function trialHear(t) {
  ctlSet(`<button class="go" id="hGo">数えはじめる（15 秒）</button>`);
  $("hGo").addEventListener("click", () => {
    const a = ac(); if (!a) return; stopAudio(); sayTok++; sayEl.textContent = "鳥のような声だけを、数えてください。";
    const t0 = a.currentTime + .3, DUR = 15, out = a.createGain(); out.gain.value = .9; out.connect(a.destination);
    const pan = v => { const p = a.createStereoPanner ? a.createStereoPanner() : a.createGain(); if (p.pan) p.pan.value = v; p.connect(out); return p; };
    const pB = pan(-.55), pD = pan(.6), pW = pan(0), pL = pan(-.15);
    /* 風：ゆっくり揺れる帯の雑音 */
    const nb = a.createBuffer(1, a.sampleRate * 2, a.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const ns = a.createBufferSource(); ns.buffer = nb; ns.loop = true; const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 500; bp.Q.value = .6;
    const wg = a.createGain(); wg.gain.setValueAtTime(0, t0); wg.gain.linearRampToValueAtTime(.16, t0 + 1.5); wg.gain.setValueAtTime(.16, t0 + DUR - 1); wg.gain.linearRampToValueAtTime(0, t0 + DUR);
    const lfo = a.createOscillator(); lfo.frequency.value = .23; const lg = a.createGain(); lg.gain.value = .07; lfo.connect(lg); lg.connect(wg.gain);
    ns.connect(bp); bp.connect(wg); wg.connect(pW); ns.start(t0); ns.stop(t0 + DUR); lfo.start(t0); lfo.stop(t0 + DUR);
    const tone = (time, f0, f1, d, gmax, dest, type = "sine") => { const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, time); o.frequency.exponentialRampToValueAtTime(f1, time + d); const g = a.createGain(); g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(gmax, time + .01); g.gain.exponentialRampToValueAtTime(.0005, time + d); o.connect(g); g.connect(dest); o.start(time); o.stop(time + d + .02); };
    /* 鳥のような声：6〜9 回 */
    const nBird = 6 + Math.floor(Math.random() * 4), times = []; let tt = .8;
    for (let k = 0; k < nBird; k++) { times.push(tt); tt += (DUR - 2) / nBird * (.75 + Math.random() * .5); }
    for (const s of times) { const T = t0 + s; tone(T, 2600, 4300, .11, .22, pB); tone(T + .14, 3800, 2900, .09, .18, pB); tone(T + .26, 2700, 4100, .1, .16, pB); }
    /* 水のしずく */
    for (let s = .4; s < DUR - .5; s += .45 + Math.random() * .7) tone(t0 + s, 1500 + Math.random() * 400, 700, .07, .12, pD);
    /* 鈴のような音：3 回（画面には出さない） */
    for (const s of [4.3, 8.6, 12.4]) { tone(t0 + s, 1318, 1318, 1.4, .07, pL); tone(t0 + s, 2637, 2637, .9, .025, pL); }
    /* 画面：鳥・しずく・風の輪（鈴は出さない） */
    hearViz.on = true; hearViz.t0 = performance.now(); hearViz.times = times; hearViz.dur = DUR;
    ctlSet(`<span class="lab">数えています…</span>`);
    const tid = setTimeout(() => {
      hearViz.on = false;
      trialEl.className = "show"; trialEl.innerHTML = `<div class="big">鳥のような声は ${nBird} 回でした</div><div class="note">数えているあいだに鳴っていた音は、ほかにもありました。</div>`;
      ctlSet(`<button id="hAgain">もう一度</button><button id="hBell">鈴のような音を聴く</button>`);
      $("hAgain").addEventListener("click", () => { trialEl.className = ""; trialHear(t); });
      $("hBell").addEventListener("click", () => { const a2 = ac(); const o2 = a2.createGain(); o2.connect(a2.destination); tone(a2.currentTime + .05, 1318, 1318, 1.4, .07, o2); tone(a2.currentTime + .05, 2637, 2637, .9, .025, o2); });
      say(t.post);
    }, (DUR + .6) * 1000);
    trialStop.push(() => { clearTimeout(tid); hearViz.on = false; try { out.disconnect(); } catch { } });
  });
}
const hearViz = { on: false, t0: 0, times: [], dur: 15 };
function tickHear() {
  if (!(cur.id === "t_hear")) return;
  /* 鳥の輪は声に合わせて、それ以外のときは静か */
  const el = (performance.now() - hearViz.t0) / 1000;
  const near = hearViz.on && hearViz.times.some(s => el >= s && el < s + .5);
  for (const it of Laud.ringItems) it.m.opacity = near ? .8 : .08;
}
/* ふれる：二点の幅 */
function trialTouch() {
  trialEl.className = "show"; document.body.classList.add("trialOn");
  trialEl.innerHTML = `<div class="tt">二点の幅：<b id="tw">10</b> mm</div><input type="range" id="tr" min="1" max="60" value="10" aria-label="二点の幅（ミリ）">
    <div class="two"><div class="cell"><div class="nm">指先</div><canvas id="tc1" height="90"></canvas><div class="vv" id="tv1"></div></div>
    <div class="cell"><div class="nm">背中</div><canvas id="tc2" height="90"></canvas><div class="vv" id="tv2"></div></div></div>
    <div class="note">目安：指先はおよそ 2〜5 mm、背中はおよそ 3〜5 cm（測り方と人で幅があります）。</div>`;
  const TH = { f: [2, 5], b: [30, 50] };
  const draw = () => {
    const w = +$("tr").value; $("tw").textContent = w;
    for (const [id, th, vid, scale] of [["tc1", TH.f, "tv1", 6], ["tc2", TH.b, "tv2", 1.1]]) {
      const c = $(id), g = c.getContext("2d"), W = c.clientWidth, H = 90, d = Math.min(devicePixelRatio || 1, 2); c.width = W * d; c.height = H * d; c.style.height = H + "px"; g.setTransform(d, 0, 0, d, 0, 0);
      g.fillStyle = "#0b1a26"; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(240,194,122,.35)"; g.lineWidth = 1; const lo = th[0] * scale, hi = th[1] * scale; g.setLineDash([3, 3]);
      g.beginPath(); g.arc(W / 2, H / 2, lo / 2, 0, 7); g.stroke(); g.beginPath(); g.arc(W / 2, H / 2, Math.min(hi / 2, W), 0, 7); g.stroke(); g.setLineDash([]);
      const px = w * scale; g.fillStyle = "#a6e4f2";
      for (const s of [-1, 1]) { const x = W / 2 + s * px / 2; if (x > -10 && x < W + 10) { g.beginPath(); g.arc(x, H / 2, 4, 0, 7); g.fill(); } }
      $(vid).textContent = w < th[0] ? "一つに感じる" : w > th[1] ? "二つに感じる" : "人によって分かれる";
    }
  };
  $("tr").addEventListener("input", draw); requestAnimationFrame(draw);
  const onR = () => draw(); addEventListener("resize", onR); trialStop.push(() => removeEventListener("resize", onR));
}
/* 嗅ぐ：順応（時間を縮めて見せる） */
function trialSmell() {
  trialEl.className = "show"; document.body.classList.add("trialOn");
  trialEl.innerHTML = `<div class="meter"><div class="lb2"><span>届いているにおいの分子</span><span>変わらない</span></div><div class="bar w"><i id="sm1" style="width:80%"></i></div></div>
    <div class="meter"><div class="lb2"><span>受けとりの強さ</span><span id="smv"></span></div><div class="bar"><i id="sm2" style="width:100%"></i></div></div>
    <div class="note">時間を縮めて見せています（実際の順応は、においと濃さで速さが変わります）。</div>`;
  ctlSet(`<button class="go" id="smR">外の空気を吸って、もどる</button>`);
  let t0 = performance.now(), iv = setInterval(() => {
    const s = (performance.now() - t0) / 1000, v = .22 + .78 * Math.exp(-s / 6); const e = $("sm2"); if (!e) return; e.style.width = (v * 100).toFixed(0) + "%"; $("smv").textContent = v > .7 ? "はっきり" : v > .4 ? "うすれてきた" : "ほとんど気づかない";
  }, 250);
  $("smR").addEventListener("click", () => { t0 = performance.now(); });
  trialStop.push(() => clearInterval(iv));
}
/* 味わう：鼻をつまむ */
function trialTaste() {
  trialEl.className = "show"; document.body.classList.add("trialOn");
  trialEl.innerHTML = `<div class="meter"><div class="lb2"><span>舌が受けとる味（甘い・すっぱい）</span></div><div class="bar w"><i id="ta1" style="width:80%"></i></div></div>
    <div class="meter"><div class="lb2"><span>口から鼻の奥へ回る香り</span><span id="tav">とどく</span></div><div class="bar"><i id="ta2" style="width:85%"></i></div></div>
    <div class="note">模式です。香りがどれだけ減るかは、食べものと人で違います。</div>`;
  ctlSet(`<button id="taP" aria-pressed="false">鼻をつまむ</button>`);
  $("taP").addEventListener("click", e => { const on = e.currentTarget.getAttribute("aria-pressed") !== "true"; e.currentTarget.setAttribute("aria-pressed", on); e.currentTarget.textContent = on ? "指を離す" : "鼻をつまむ"; $("ta2").style.width = on ? "8%" : "85%"; $("tav").textContent = on ? "ほとんど回らない" : "とどく"; });
}
/* 体の内側：20 秒 */
function trialBody(t) {
  ctlSet(`<button class="go" id="bGo">20 秒をはかる</button>`);
  $("bGo").addEventListener("click", () => {
    stopAudio(); sayTok++; sayEl.textContent = "脈にふれずに、心臓の拍を数えてください。"; eyesGoal = 1;
    trialEl.className = "show"; trialEl.innerHTML = `<svg id="ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="rgba(140,190,230,.18)" stroke-width="6"/><circle id="rc" cx="60" cy="60" r="52" fill="none" stroke="#a6e4f2" stroke-width="6" stroke-linecap="round" transform="rotate(-90 60 60)" stroke-dasharray="326.7" stroke-dashoffset="0"/><text id="rt" x="60" y="68" text-anchor="middle" fill="#eef6fb" font-size="26" font-family="IBM Plex Mono">20</text></svg>`;
    ctlSet(""); const t0 = performance.now();
    const iv = setInterval(() => {
      const s = (performance.now() - t0) / 1000, left = Math.max(0, 20 - s); const rc = $("rc"); if (!rc) return;
      rc.setAttribute("stroke-dashoffset", (326.7 * (1 - left / 20)).toFixed(1)); $("rt").textContent = Math.ceil(left);
      if (left <= 0) { clearInterval(iv); eyesGoal = 0; trialEl.innerHTML = `<div class="big">20 秒たちました</div>`; ctlSet(`<button id="bAgain">もう一度</button>`); $("bAgain").addEventListener("click", () => { trialEl.className = ""; trialBody(t); }); say(t.post); }
    }, 200);
    trialStop.push(() => { clearInterval(iv); eyesGoal = 0; });
  });
}

/* ---------------------------------------------------------------- 段へ入る */
function viewOf(s) {
  if (s.ch === "world") return s.id;
  if (s.ch === "path") return "stage" + s.stage;
  if (s.ch === "end") return "end";
  return { t_blind: "face", t_change: "change", t_hear: "hear", t_touch: "body", t_smell: "face", t_taste: "face", t_body: "body" }[s.id] || "recv";
}
function enter(speak = true) {
  clearTrial(); ctlSet(""); openPartId = null;
  const s = cur;
  flipGoal = s.id === "recv" ? 1 : 0;
  $("flip").classList.toggle("show", s.ch === "world");
  $("fW").setAttribute("aria-pressed", s.id === "world"); $("fR").setAttribute("aria-pressed", s.id === "recv");
  $("hud").classList.toggle("show", s.ch === "path");
  for (const b of $("tabs").children) b.setAttribute("aria-selected", b.dataset.ch === s.ch);
  $("where").innerHTML = `<span class="n">${String(si + 1).padStart(2, "0")}／${STEPS.length}</span>${esc(s.name)}`;
  $("prev").disabled = si === 0; $("next").disabled = si === STEPS.length - 1;
  setView(viewOf(s));
  let lines = [];
  if (s.id === "world") { setCard(cardWorld(S.world, 0)); lines = (firstWorld && started && speak ? S.intro : []).concat(S.world.lines); if (started && speak) firstWorld = false; }
  else if (s.id === "recv") { setCard(cardWorld(S.recv, 1)); lines = S.recv.lines; }
  else if (s.ch === "path") {
    const st = S.stages[s.stage]; setCard(cardStage(st)); lines = st.lines;
    if (s.stage === 3) { ctlSet(`<span class="lab">注意を向ける</span>` + S.attn.map(a => `<button data-a="${a.id}" aria-pressed="${a.id === attn}">${esc(a.name)}</button>`).join(""));
      for (const b of ctl.querySelectorAll("button")) b.addEventListener("click", () => { attn = b.dataset.a; for (const x of ctl.querySelectorAll("button")) x.setAttribute("aria-pressed", x.dataset.a === attn); }); }
    if (s.stage === 6) { ctlSet(`<button class="go" id="toW">${esc(NM.side_world)}へもどる</button>`); $("toW").addEventListener("click", () => go(0)); }
  } else if (s.ch === "try") {
    const t = s.trial; setCard(cardTrial(t)); lines = t.lines;
    ({ blind: trialBlind, change: trialChange, hear: trialHear, touch: trialTouch, smell: trialSmell, taste: trialTaste, body: trialBody })[t.kind](t);
  } else if (s.ch === "end") {
    setCard(`<div class="ck">${esc(NM.ch_end)}</div><h2>${esc(NM.app_pair)}は、一つではない</h2><div class="full"><p class="lead">${S.end.lines.map(esc).join("<br>")}</p></div>
      <div class="q">${esc(S.end.lines[S.end.lines.length - 1])}</div>${linksOf(["hikawa", "shinra", "hp"])}<div class="full" style="margin-top:12px"><button class="back" id="eRefs">典拠とつくり</button></div><p style="font-size:11px;color:var(--ink-3);margin:10px 0 0;line-height:1.6">© 2026 mitsulab. All rights reserved.　<a href="https://mitsulab.jp/terms/#ai" target="_blank" rel="noopener">利用規約</a></p>`);
    $("eRefs")?.addEventListener("click", openRefs); lines = S.end.lines;
  }
  if (speak && started) say(lines); else if (!started) sayEl.textContent = "";
  try { history.replaceState(null, "", "#" + s.id); } catch { }
  window.__mk.step = s.id;
}
let firstWorld = true, started = false;
function go(i) { if (i < 0 || i >= STEPS.length) return; si = i; cur = STEPS[i]; enter(true); }
$("prev").addEventListener("click", () => go(si - 1));
$("next").addEventListener("click", () => go(si + 1));
$("fW").addEventListener("click", () => setSide(0)); $("fR").addEventListener("click", () => setSide(1));
for (const c of CH) { const b = document.createElement("button"); b.role = "tab"; b.dataset.ch = c.id; b.textContent = c.name; b.addEventListener("click", () => go(STEPS.findIndex(s => s.ch === c.id))); $("tabs").appendChild(b); }
addEventListener("keydown", e => {
  if ($("refs").classList.contains("show")) { if (e.key === "Escape") closeRefs(); return; }
  if (!started) return;
  if (e.target.tagName === "INPUT") return;
  if (e.key === "ArrowRight") go(si + 1); else if (e.key === "ArrowLeft") go(si - 1);
  else if (/^[1-4]$/.test(e.key)) go(STEPS.findIndex(s => s.ch === CH[+e.key - 1].id));
  else if (e.key === "Escape" && openPartId) { openPartId = null; enter(false); }
});

/* 典拠とつくり */
function openRefs() {
  const used = new Set(); const add = ks => (ks || []).forEach(k => used.add(k));
  add(S.world.card.src); add(S.recv.card.src); S.stages.forEach(s => add(s.src)); S.trials.forEach(t => add(t.src)); S.parts.forEach(p => add(p.src));
  $("refsIn").innerHTML = `<h3>典拠</h3><ol>${[...used].map(k => `<li>${esc(S.refs[k])}</li>`).join("")}</ol>
    <h3>見せ方</h3><p>粒・線・木・鳥・脳へ向かう流れの形は、模式です。粒の数は実際の量ではありません。数は教科書・総説の目安で、幅のあるものは幅のまま書いています。予測としての知覚は、有力な説として紹介しています。</p>
    <h3>つくり</h3><p>碧の声：VOICEVOX:冥鳴ひまり。試すところの音は、その場で作る音です。碧の 3D の姿は © mitsulab。three.js（MIT）・three-vrm（MIT）。記録は保存しません。</p>
    <p>${esc(NM.title)} ── mitsulab　<a href="https://mitsulab.jp/" target="_blank" rel="noopener">mitsulab.jp ↗</a></p>
    <h3>著作権</h3><p>© 2026 mitsulab. All rights reserved. この作品の文章・画像・音声・3D・プログラムの著作権は、別に示した他者の素材を除き mitsulab にあります。無断の複製・転載・改変と、AI の学習・生成への利用はお断りします（テキスト・データマイニングの権利を留保します）。　<a href="https://mitsulab.jp/terms/#ai" target="_blank" rel="noopener">利用規約 ↗</a></p>
    <p lang="en">© 2026 mitsulab. All rights reserved. Copyright in the text, images, audio, 3D and software of this work belongs to mitsulab, except third-party materials credited separately. Copying, reposting or modifying them without permission, and using them for AI training or generation, are not permitted. Text and data mining rights are reserved.　<a href="https://mitsulab.jp/terms/#ai-en" target="_blank" rel="noopener">Terms ↗</a></p>`;
  $("refs").classList.add("show"); $("refsX").focus();
}
function closeRefs() { $("refs").classList.remove("show"); }
$("bRefs").addEventListener("click", openRefs); $("refsX").addEventListener("click", closeRefs);
$("refs").addEventListener("click", e => { if (e.target.id === "refs") closeRefs(); });

/* ---------------------------------------------------------------- まわす */
const clock = new THREE.Clock();
let raf = 0, slowN = 0, fastN = 0, T = 0;
function adapt(dt) {
  if (dt > .024) { slowN++; fastN = 0; } else if (dt < .014) { fastN++; slowN = 0; }
  if (slowN > 40 && PR > PR_MIN) { PR = Math.max(PR_MIN, PR - .15); slowN = 0; resize(); }
  if (fastN > 240 && PR < PR_CAP) { PR = Math.min(PR_CAP, PR + .1); fastN = 0; resize(); }
}
function loop() {
  raf = requestAnimationFrame(loop);
  const dt = Math.min(.05, clock.getDelta()); T += dt; adapt(dt);
  placeCam(dt);
  updateLayers(T, dt);
  if (cur.ch === "path") { stepParticles(dt, T); updHud(dt); }
  tickChange(dt); tickHear();
  if (vrm) {
    pose(T); blink(dt);
    lookT.position.lerp(cur.id === "world" ? V3(BIRD.x, BIRD.y, BIRD.z) : camera.position, Math.min(1, dt * 3));
    vrm.update(dt);
  }
  bird.rotation.z = Math.sin(T * 3) * .04;
  world.visible = cur.ch !== "path" || camera.position.z > PZ / 2;
  path.visible = cur.ch === "path" || camera.position.z < PZ / 2;
  renderer.render(scene, camera);
  updateLabels();
}
let hudT = 0;
function updHud(dt) {
  hudT += dt; if (hudT < .5) return; hudT = 0;
  const now = performance.now(); count.tIn.push([now, count.in]); count.tOut.push([now, count.out]);
  while (count.tIn.length && now - count.tIn[0][0] > 4000) count.tIn.shift(); while (count.tOut.length && now - count.tOut[0][0] > 4000) count.tOut.shift();
  const rate = a => a.length > 1 ? (a[a.length - 1][1] - a[0][1]) / ((a[a.length - 1][0] - a[0][0]) / 1000) : 0;
  $("hud").innerHTML = `模式の粒（1 秒あたり）<br>届いた <b>${rate(count.tIn).toFixed(0)}</b> → 意味まで <b>${rate(count.tOut).toFixed(0)}</b>`;
}
document.addEventListener("visibilitychange", () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; stopAudio(); } else if (!raf) { clock.getDelta(); loop(); } });

/* ---------------------------------------------------------------- はじめ */
const hashStep = location.hash.slice(1); const hi = STEPS.findIndex(s => s.id === hashStep);
if (hi > 0) { si = hi; cur = STEPS[hi]; firstWorld = false; }
resize(); enter(false); loop();
function begin(withVoice) {
  started = true; voiceOn = withVoice; $("bVoice").setAttribute("aria-pressed", voiceOn); $("bVoice").textContent = voiceOn ? "声" : "声なし";
  ac(); $("start").classList.add("gone"); setTimeout(() => $("start").remove(), 700);
  enter(true);
}
$("go").addEventListener("click", () => begin(true)); $("goQ").addEventListener("click", () => begin(false));
const enable = () => { if ($("go")) $("go").disabled = $("goQ").disabled = false; };
loadAoi().then(() => { $("ld").textContent = ""; enable(); window.__mk.ready = true; window.__aoi = vrm; })
  .catch(err => { console.warn("碧の姿を読みこめなかった", err); $("ld").textContent = ""; enable(); window.__mk.ready = true; });
setTimeout(enable, 12000);
window.__mk.go = go; window.__mk.STEPS = STEPS; window.__mk.state = () => ({ step: cur.id, flip: flipK, attn, voice: voiceOn });
