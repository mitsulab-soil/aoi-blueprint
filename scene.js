/* 世界のミカタ／碧のミカタ：同じ場所（欅の下の小さな地形）を組む。2026-10-09
   ・地形：台地（奥・左）から湧き水の池のある低いところ（手前・右）へ下る 16 m × 12.5 m の切り出し。断面に土の層と地下水。
   ・草木と生きもの＝nature.js（環世界の庭の作り込みの写し）。石・樹皮・地面は CC0 の写真の質感（Poly Haven。台帳 M-0798〜）。
   ・見えない世界のレンズ：uv（紫外を紫に置きかえ）・ir（温度を色に置きかえ）・dusk（夕方・超音波の反響）・water（地下水）・air（大気）・life（土の中のつながり）。
   ・形・量・流れは模式。速さは何万倍にも早めている（画面に書く）。 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { buildNature, photoTex } from "./nature.js";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rnd = (() => { let s = 777; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const LOWP = Math.min(innerWidth, innerHeight) < 700;

/* ---------------------------------------------------------------- 地形（JS と GLSL で同じ式） */
export const BOX = { x0: -8, x1: 8, z0: -7, z1: 5.5, yb: -3.6 };
export const POND = { x: 4.3, z: 3.2, r: 1.05 };
export const TREE = V3(-2.3, 0, -1.8);
export const STONE = V3(1.55, .2, .5);
function regional(x, z) { const s = x * .55 + z * .83; return .95 * sm(1.5, 6.5, -s) - .75 * sm(1.0, 6.0, s); }
export function H(x, z) {
  const flat = sm(2.4, 4.6, Math.hypot(x - .2, z + .4));
  const n = .06 * Math.sin(x * 1.3 + z * .7) + .04 * Math.sin(x * 2.9 - z * 2.1);
  const pd = Math.hypot(x - POND.x, z - POND.z);
  return flat * (regional(x, z) + n) - .62 * (1 - sm(0, POND.r + .45, pd));
}
export function WT(x, z) { return -.85 + .42 * regional(x, z); }   /* 地下水面（模式）：地形をなだらかにしたかたちで、台地の下で高く、池で地表に出る */
const GLSL_H = `
float sm_(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
float regional_(float x, float z){ float s = x * .55 + z * .83; return .95 * sm_(1.5, 6.5, -s) - .75 * sm_(1.0, 6.0, s); }
float H_(float x, float z){
  float fl_ = sm_(2.4, 4.6, length(vec2(x - .2, z + .4)));
  float n = .06 * sin(x * 1.3 + z * .7) + .04 * sin(x * 2.9 - z * 2.1);
  float pd = length(vec2(x - ${POND.x.toFixed(2)}, z - ${POND.z.toFixed(2)}));
  return fl_ * (regional_(x, z) + n) - .62 * (1.0 - sm_(0.0, ${(POND.r + .45).toFixed(2)}, pd));
}
float WT_(float x, float z){ return -.85 + .42 * regional_(x, z); }
`;

/* ---------------------------------------------------------------- 材質（レンズで色の意味を置きかえる） */
export const G = {
  uMode: { value: 0 },            /* 0 ふつう・1 紫外・2 赤外（温度）・3 夕方（超音波の反響）・4 等高線（碧の足もと） */
  uMix: { value: 0 },             /* 0→1 で切りかえる */
  uEcho: { value: new THREE.Vector4(0, 0, 0, -9) }, uTime: { value: 0 },
};
const HEAD = `varying vec3 vWP; uniform int uMode; uniform float uMix, uUV, uTemp, uTime, uCont; uniform vec4 uEcho;
#ifdef HAS_UVMAP
uniform sampler2D uUVMap;
#endif
vec3 thermal(float t){ t = clamp(t, 0., 1.);
  vec3 c = mix(vec3(.02,.02,.12), vec3(.25,.05,.55), sm1(0., .25, t));
  c = mix(c, vec3(.85,.15,.25), sm1(.25, .5, t)); c = mix(c, vec3(1.,.62,.1), sm1(.5, .75, t)); return mix(c, vec3(1.,1.,.85), sm1(.75, 1., t)); }
`;
const SM1 = `float sm1(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }\n`;
const END = `
{
  vec3 base = gl_FragColor.rgb; vec3 alt = base;
  if (uMode == 1) { float r = uUV;
#ifdef HAS_UVMAP
    r *= texture2D(uUVMap, vMapUv).r;
#endif
    alt = vec3(.015, .01, .035) + vec3(.72, .52, 1.0) * r + base * .04; }
  else if (uMode == 2) { alt = thermal(uTemp); }
  else if (uMode == 3) { float d = distance(vWP, uEcho.xyz); float band = exp(-pow((d - uEcho.w) / .35, 2.0)); float k = band * (1.0 - smoothstep(4.0, 11.0, d));
    alt = base * .07 + vec3(.5, .8, 1.0) * k * .9; }
  else if (uMode == 4) { float c = abs(fract(vWP.y * 5.0) - .5) / fwidth(vWP.y * 5.0); alt = mix(base * .55, vec3(.65, .95, 1.0), (1.0 - min(c, 1.0)) * uCont); }
  gl_FragColor.rgb = mix(base, alt, uMix);
}
`;
function prep(m, o = {}) {
  m.userData.u = { uUV: { value: o.uv ?? .05 }, uTemp: { value: o.temp ?? .15 }, uUVMap: { value: o.uvMap || null }, uCont: { value: o.cont ? 1 : 0 } };
  if (o.uvMap) m.defines = { ...(m.defines || {}), HAS_UVMAP: 1 };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, G, m.userData.u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvec4 wp_ = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nwp_ = instanceMatrix * wp_;\n#endif\nvWP = (modelMatrix * wp_).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + SM1 + HEAD)
      .replace("#include <dithering_fragment>", END + "\n#include <dithering_fragment>");
  };
  m.customProgramCacheKey = () => "wm" + (o.uvMap ? 1 : 0) + m.type;
  return m;
}
export const MATS = [];
export function M(hex, o = {}) {
  const m = new (o.basic ? THREE.MeshBasicMaterial : THREE.MeshLambertMaterial)({ color: hex, map: o.map || null, side: o.side ?? THREE.FrontSide, transparent: !!o.transparent, alphaTest: o.alphaTest || 0, vertexColors: !!o.vc });
  prep(m, o); MATS.push(m); return m;
}
export function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
let dotT = null;
export function dot() { if (dotT) return dotT; dotT = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.4, "rgba(255,255,255,.8)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }, false); return dotT; }

/* ---------------------------------------------------------------- 組む */
export function buildScene(world) {
  const S = { world, layers: {} };
  const sonic = [];
  /* 地表 */
  {
    const nx = LOWP ? 96 : 128, nz = LOWP ? 76 : 100, w = BOX.x1 - BOX.x0, d = BOX.z1 - BOX.z0;
    const geo = new THREE.PlaneGeometry(w, d, nx, nz); geo.rotateX(-Math.PI / 2); geo.translate((BOX.x0 + BOX.x1) / 2, 0, (BOX.z0 + BOX.z1) / 2);
    const p = geo.attributes.position, col = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = H(x, z); p.setY(i, y);
      const e = .01, sx = (H(x + e, z) - H(x - e, z)) / (2 * e), sz = (H(x, z + e) - H(x, z - e)) / (2 * e), slope = Math.hypot(sx, sz);
      const wet = 1 - sm(0, 1.6, Math.hypot(x - POND.x, z - POND.z) - POND.r), under = 1 - sm(1.2, 3.2, Math.hypot(x - TREE.x, z - TREE.z));
      const k = .92 - slope * .25 - wet * .25; col.push(k * (1 - under * .25), k * (1 - under * .12), k * (1 - under * .3));
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
    const grassMap = photoTex("grass_ground.webp", 7, 6);
    const mat = M(0xffffff, { map: grassMap, vc: true, uv: .04, temp: .2, cont: true }); mat.transparent = true;
    S.surface = new THREE.Mesh(geo, mat); world.add(S.surface);
    /* 欅の下の落ち葉（写真の質感・まわりは透かす） */
    const litter = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), M(0xffffff, { map: photoTex("dry_leaves.webp", 2.5, 2.5), uv: .04, temp: .18 }));
    const am = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, "#fff"); gr.addColorStop(.6, "#bbb"); gr.addColorStop(1, "#000"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false);
    litter.material.alphaMap = am; litter.material.transparent = true; litter.material.depthWrite = false;
    { const lp = litter.geometry; lp.rotateX(-Math.PI / 2); const q = lp.attributes.position; for (let i = 0; i < q.count; i++) q.setY(i, H(q.getX(i) + TREE.x, q.getZ(i) + TREE.z) + .012); }
    litter.position.set(TREE.x, 0, TREE.z); world.add(litter); S.litter = litter;
  }
  /* 土の断面（四つの壁）：O 落ち葉の層・A 黒っぽい表土・B ローム・砂礫。地下水面より下は水で満ちる（色を青みに） */
  {
    const soilMap = photoTex("forest_ground.webp", 1, 1);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uMap: { value: soilMap }, uAlpha: { value: 1 }, uMode: G.uMode, uMix: G.uMix, uWater: { value: 0 }, uTime: G.uTime },
      vertexShader: "varying vec3 vWP; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: SM1 + GLSL_H + `
        varying vec3 vWP; uniform sampler2D uMap; uniform float uAlpha, uMix, uWater, uTime; uniform int uMode;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          float x = vWP.x, z = vWP.z, y = vWP.y, s = H_(x, z), d = s - y, wt = WT_(x, z);
          float along = x + z;
          float wob = .04 * sin(along * 3.1) + .03 * sin(along * 7.3);
          vec3 O = vec3(.20, .14, .09), A = vec3(.13, .10, .08), B = vec3(.50, .32, .19), C = vec3(.46, .42, .36);
          vec3 c = O;
          c = mix(c, A, step(.06 + wob * .3, d));
          c = mix(c, B, smoothstep(.40 + wob, .52 + wob, d));
          c = mix(c, C, smoothstep(1.85 + wob, 2.0 + wob, d));
          vec2 cell = floor(vec2(along, y) * 22.0); float pb = step(.86, hash(cell)) * step(1.9, d);
          c = mix(c, vec3(.7, .66, .58), pb * .7);
          vec3 t = texture2D(uMap, vec2(along * .35, y * .35)).rgb;
          c *= .55 + .9 * t;
          float sat = 1.0 - smoothstep(wt - .02, wt + .02, y);
          c = mix(c, c * vec3(.55, .75, 1.05) + vec3(.0, .03, .08), sat * (.55 + .45 * uWater));
          float line = 1.0 - smoothstep(0.0, .02, abs(y - wt));
          c = mix(c, vec3(.4, .8, 1.0), line * (.35 + .65 * uWater));
          if (uMode == 2) c = mix(c, mix(vec3(.25,.05,.55), vec3(.85,.15,.25), clamp(.6 - d * .1, 0., 1.)), uMix);
          else if (uMode == 1) c = mix(c, vec3(.02, .015, .04), uMix);
          else if (uMode == 3) c = mix(c, c * .08, uMix);
          gl_FragColor = vec4(c, uAlpha);
          #include <colorspace_fragment>
        }`,
    });
    const walls = [];
    const wall = (pts) => {   /* pts＝地表の縁の点（x, z）の列 */
      const pos = [], idx = [];
      pts.forEach(([x, z], i) => { pos.push(x, BOX.yb, z, x, H(x, z), z); if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
    };
    const N = 90, line = (ax, az, bx, bz) => Array.from({ length: N + 1 }, (_, i) => [ax + (bx - ax) * i / N, az + (bz - az) * i / N]);
    walls.push(wall(line(BOX.x0, BOX.z1, BOX.x1, BOX.z1)), wall(line(BOX.x1, BOX.z1, BOX.x1, BOX.z0)), wall(line(BOX.x1, BOX.z0, BOX.x0, BOX.z0)), wall(line(BOX.x0, BOX.z0, BOX.x0, BOX.z1)));
    const bottom = new THREE.PlaneGeometry(BOX.x1 - BOX.x0, BOX.z1 - BOX.z0).rotateX(Math.PI / 2).translate(0, BOX.yb, (BOX.z0 + BOX.z1) / 2);
    bottom.deleteAttribute("normal"); bottom.deleteAttribute("uv");
    S.soil = new THREE.Mesh(mergeGeometries([...walls, bottom.toNonIndexed()].map(g => g.index ? g.toNonIndexed() : g)), mat); mat.side = THREE.DoubleSide;
    world.add(S.soil); S.soilMat = mat;
  }
  /* 草木と生きもの */
  const NAT = buildNature({ M, canvasTex, garden: world, sonic, TREE, POND, H,
    avoidGrass: (x, z) => Math.hypot(x - POND.x, z - POND.z) < POND.r + .25 || Math.hypot(x, z) < .9 || Math.hypot(x - TREE.x, z - TREE.z) < .5 || (x > 2.4 && x < 5 && z > -1.5 && z < 1.6) || Math.hypot(x - STONE.x, z - STONE.z) < .55 });
  S.nat = NAT; S.bird = NAT.bird;
  /* 池の水面（湧き水）：地下水面の高さ */
  {
    const wy = WT(POND.x, POND.z) + .02;
    const w = new THREE.Mesh(new THREE.CircleGeometry(POND.r + .2, 40), M(0x3e6f7c, { uv: .12, temp: .05 })); w.material.transparent = true; w.material.opacity = .85;
    w.rotation.x = -Math.PI / 2; w.position.set(POND.x, wy, POND.z); world.add(w); S.pond = w; S.pondY = wy;
  }
  /* 日なたの石（地衣の付いた写真の質感・温かい） */
  {
    const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position, col = [];
    for (let i = 0; i < p.count; i++) { const v = V3(p.getX(i), p.getY(i), p.getZ(i)); const n = 1 + .16 * Math.sin(v.x * 3.1 + 1) * Math.sin(v.y * 2.3) * Math.sin(v.z * 2.7 + .5) + .05 * Math.sin(v.x * 9 + v.z * 7); v.multiplyScalar(n); v.y *= .58; p.setXYZ(i, v.x, v.y, v.z); const s = .85 + .15 * Math.sin(v.x * 5 + v.z * 3); col.push(s, s, s * .97); }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const stone = new THREE.Mesh(g, M(0xffffff, { map: photoTex("rock_surface.webp", 1.5, 1), vc: true, uv: .1, temp: .62 }));
    stone.scale.set(.5, .5, .4); stone.position.copy(STONE).setY(H(STONE.x, STONE.z) + .12); stone.rotation.y = .7; world.add(stone); S.stone = stone;
    const s2 = new THREE.Mesh(g, M(0xffffff, { map: photoTex("lichen_rock.webp", 1.2, 1), vc: true, uv: .1, temp: .3 })); s2.scale.set(.32, .3, .28); s2.position.set(-3.4, H(-3.4, .9) + .06, .9); s2.rotation.y = 2; world.add(s2);
  }
  /* 茂み（変化の見落としの試しで使う）：一枚ずつの葉を丸く */
  {
    const leafT = canvasTex(32, 64, (c, w, h) => { const p = new Path2D(); p.moveTo(w / 2, h - 1); p.quadraticCurveTo(w, h * .45, w / 2, 1); p.quadraticCurveTo(0, h * .45, w / 2, h - 1); const gr = c.createLinearGradient(0, h, w, 0); gr.addColorStop(0, "#2f5a2a"); gr.addColorStop(1, "#6a9a48"); c.fillStyle = gr; c.fill(p); c.strokeStyle = "rgba(220,240,190,.5)"; c.beginPath(); c.moveTo(w / 2, h); c.lineTo(w / 2, 4); c.stroke(); });
    const lg = new THREE.PlaneGeometry(.07, .12); lg.translate(0, .06, 0);
    const n = 700, im = new THREE.InstancedMesh(lg, M(0xffffff, { map: leafT, alphaTest: .5, side: THREE.DoubleSide, uv: .04, temp: .1 }), n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    for (let i = 0; i < n; i++) { const u = rnd() * TAU, v = Math.acos(2 * rnd() - 1), r = .5 * Math.cbrt(rnd()); const pos = V3(Math.sin(v) * Math.cos(u) * r * 1.3, Math.abs(Math.cos(v)) * r * 1.1 + .05, Math.sin(v) * Math.sin(u) * r); e.set(rnd() * 3, rnd() * TAU, rnd() * 3); q.setFromEuler(e); m4.compose(pos, q, V3(1, 1, 1)); im.setMatrixAt(i, m4); c.setHSL(.27 + rnd() * .05, .4, .3 + rnd() * .15); im.setColorAt(i, c); }
    const bush = new THREE.Group(); bush.add(im); bush.position.set(-.6, H(-.6, -2.9), -2.9); world.add(bush); S.bush = bush;
  }

  /* ================================================================ 見えない世界の層（レンズで出す） */
  const L = S.layers;
  /* ---- 地下水：地下水面の板・流れの粒・雨のしみこみ ---- */
  {
    const g = new THREE.Group(); world.add(g); g.visible = false; L.water = g;
    const nx = 40, nz = 32, geo = new THREE.PlaneGeometry(BOX.x1 - BOX.x0, BOX.z1 - BOX.z0, nx, nz).rotateX(-Math.PI / 2).translate(0, 0, (BOX.z0 + BOX.z1) / 2), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, WT(p.getX(i), p.getZ(i)));
    const sheet = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uTime: G.uTime, uK: { value: 0 } },
      vertexShader: "varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP,1.0); }",
      fragmentShader: `varying vec3 vP; uniform float uTime, uK;
        void main(){ float s = vP.x * .55 + vP.z * .83; float r = .5 + .5 * sin(s * 6.0 - uTime * 2.2); float a = (.18 + .3 * pow(r, 6.0)) * uK; gl_FragColor = vec4(vec3(.35,.75,1.0), a); }`,
    }));
    g.add(sheet); S.wSheet = sheet;
    const n = LOWP ? 380 : 650, pos = new Float32Array(n * 3), P = [];
    const spawn = (o, init) => { o.x = BOX.x0 + rnd() * (BOX.x1 - BOX.x0); o.z = BOX.z0 + rnd() * (BOX.z1 - BOX.z0); o.y = init ? WT(o.x, o.z) - rnd() * (WT(o.x, o.z) - BOX.yb - .3) : WT(o.x, o.z) - .1 - rnd() * 1.6; o.rain = false; };
    for (let i = 0; i < n; i++) { const o = {}; spawn(o, true); P.push(o); }
    /* 雨：ときどき地表から下へしみこむ粒 */
    const nr = LOWP ? 70 : 120, rp = new Float32Array(nr * 3), R = [];
    const rspawn = o => { o.x = BOX.x0 + 1 + rnd() * (BOX.x1 - BOX.x0 - 2); o.z = BOX.z0 + 1 + rnd() * (BOX.z1 - BOX.z0 - 2); o.y = 6 + rnd() * 4; o.v = 6; };
    for (let i = 0; i < nr; i++) { const o = {}; rspawn(o); o.y = rnd() * 10 - 2; R.push(o); }
    const geoP = new THREE.BufferGeometry(); geoP.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const geoR = new THREE.BufferGeometry(); geoR.setAttribute("position", new THREE.BufferAttribute(rp, 3));
    const mk = (c, s) => new THREE.PointsMaterial({ color: c, size: s, sizeAttenuation: false, map: dot(), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
    g.add(new THREE.Points(geoP, mk(0x7fd2ff, LOWP ? 5 : 6)), new THREE.Points(geoR, mk(0xc8ecff, 4)));
    S.tickWater = (dt) => {
      for (let i = 0; i < n; i++) {
        const o = P[i], e = .05, gx = (WT(o.x + e, o.z) - WT(o.x - e, o.z)) / (2 * e), gz = (WT(o.x, o.z + e) - WT(o.x, o.z - e)) / (2 * e);
        const gl = Math.hypot(gx, gz) + .02, sp = .55;
        o.x -= gx / gl * sp * dt; o.z -= gz / gl * sp * dt;
        const dp = Math.hypot(o.x - POND.x, o.z - POND.z);
        if (dp < 1.6) o.y += (1.6 - dp) * .6 * dt; else o.y += (WT(o.x, o.z) - .25 - o.y) * .05 * dt;
        if (o.y > WT(o.x, o.z) || o.x < BOX.x0 || o.x > BOX.x1 || o.z < BOX.z0 || o.z > BOX.z1) spawn(o, false);
        pos[i * 3] = o.x; pos[i * 3 + 1] = o.y; pos[i * 3 + 2] = o.z;
      }
      for (let i = 0; i < nr; i++) {
        const o = R[i], s = H(o.x, o.z);
        o.y -= (o.y > s ? 6 : .45) * dt;
        if (o.y < WT(o.x, o.z)) rspawn(o);
        rp[i * 3] = o.x; rp[i * 3 + 1] = o.y; rp[i * 3 + 2] = o.z;
      }
      geoP.attributes.position.needsUpdate = geoR.attributes.position.needsUpdate = true;
    };
  }
  /* ---- 大気：風の流れ・湿り気・気圧の面 ---- */
  {
    const g = new THREE.Group(); world.add(g); g.visible = false; L.air = g;
    const n = LOWP ? 420 : 760, pos = new Float32Array(n * 6), col = new Float32Array(n * 6), P = [];
    const DIR = V3(.55, 0, .83).normalize();
    const spawn = (o, init) => { const u = init ? rnd() : 0; const side = rnd() * 20 - 10; o.x = -9 + DIR.x * u * 20 - DIR.z * side * .6; o.z = -8.5 + DIR.z * u * 20 + DIR.x * side * .6; o.h = .2 + Math.pow(rnd(), 1.4) * 6.5; o.ph = rnd() * 9; };
    for (let i = 0; i < n; i++) { const o = {}; spawn(o, true); P.push(o); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false })));
    /* 湿り気：欅の葉と池から立つ水蒸気（見えない気体を、白い霞に置きかえる） */
    const nm = LOWP ? 70 : 120, mp = new Float32Array(nm * 3), Mo = [];
    const mspawn = o => { const fromTree = rnd() < .65; if (fromTree) { const a = rnd() * TAU, r = rnd() * 2.2; o.x = TREE.x + Math.cos(a) * r; o.z = TREE.z + Math.sin(a) * r; o.y = 2.6 + rnd() * 2.5; } else { const a = rnd() * TAU, r = rnd() * POND.r; o.x = POND.x + Math.cos(a) * r; o.z = POND.z + Math.sin(a) * r; o.y = WT(POND.x, POND.z) + .1; } o.life = 0; };
    for (let i = 0; i < nm; i++) { const o = {}; mspawn(o); o.life = rnd() * 6; Mo.push(o); }
    const mgeo = new THREE.BufferGeometry(); mgeo.setAttribute("position", new THREE.BufferAttribute(mp, 3));
    g.add(new THREE.Points(mgeo, new THREE.PointsMaterial({ color: 0xdff4ff, size: LOWP ? 26 : 34, sizeAttenuation: false, map: dot(), transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending })));
    /* 気圧の面：地面から 4 m ごと（1 m 上がると、およそ 0.12 hPa 下がる） */
    S.pressure = [];
    for (const [k, y] of [[0, .6], [1, 4.6], [2, 8.6]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(15, 11.5, 1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xa6e4f2, transparent: true, opacity: .05, depthWrite: false, side: THREE.DoubleSide }));
      m.position.set(0, y, (BOX.z0 + BOX.z1) / 2); g.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0xa6e4f2, transparent: true, opacity: .35 })); e.position.copy(m.position); g.add(e);
      S.pressure.push({ y, k });
    }
    S.tickAir = (dt, t) => {
      for (let i = 0; i < n; i++) {
        const o = P[i], gy = H(o.x, o.z);
        let sp = 1.1 + .5 * Math.log(1 + o.h * 2);                 /* 上ほど速い（地面の近くは摩擦で遅い） */
        const ds = Math.hypot(o.x - TREE.x, o.z - TREE.z);
        if (ds < 2.6 && o.h > 1.2 && o.h < 6.5) sp *= .35 + .65 * sm(1.2, 2.6, ds);   /* 樹冠の中では弱まる */
        let sw = 0; if (ds < 5 && o.h < 5) { const lee = (o.x - TREE.x) * DIR.x + (o.z - TREE.z) * DIR.z; if (lee > 0) sw = Math.sin(t * 1.3 + o.ph) * .9 * (1 - ds / 5); }   /* 木の風下は渦が乱れる */
        o.x += (DIR.x * sp - DIR.z * sw) * dt; o.z += (DIR.z * sp + DIR.x * sw) * dt;
        const y = gy + o.h + .18 * Math.sin(t * .8 + o.ph);
        const tail = .22 * sp;
        pos[i * 6] = o.x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = o.z; pos[i * 6 + 3] = o.x - DIR.x * tail; pos[i * 6 + 4] = y; pos[i * 6 + 5] = o.z - DIR.z * tail;
        const c = .35 + .35 * (sp / 2.2); col[i * 6] = c * .75; col[i * 6 + 1] = c; col[i * 6 + 2] = 1; col[i * 6 + 3] = col[i * 6 + 4] = col[i * 6 + 5] = .02;
        if (o.x > 9.5 || o.z > 7 || o.x < -10.5 || o.z < -10) spawn(o, false);
      }
      geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true;
      for (let i = 0; i < nm; i++) { const o = Mo[i]; o.life += dt; o.y += .25 * dt; o.x += DIR.x * .6 * dt; o.z += DIR.z * .6 * dt; if (o.life > 7) mspawn(o); mp[i * 3] = o.x; mp[i * 3 + 1] = o.y; mp[i * 3 + 2] = o.z; }
      mgeo.attributes.position.needsUpdate = true;
    };
  }
  /* ---- 土の中のつながり：根・菌根菌の菌糸・細菌など・ミミズの通り道 ---- */
  {
    const g = new THREE.Group(); world.add(g); g.visible = false; L.life = g;
    const rootM = new THREE.MeshLambertMaterial({ color: 0xc9a77c }), tips = [];
    const tubes = [];
    const root = (p, dir, len, r, depth) => {
      const pts = [p.clone()]; let q = p.clone(), d = dir.clone();
      for (let i = 1; i <= 5; i++) { d.add(V3((rnd() - .5) * .5, (rnd() - .6) * .25, (rnd() - .5) * .5)).normalize(); q = q.clone().addScaledVector(d, len / 5); const s = H(q.x, q.z); if (q.y > s - .05) q.y = s - .05; pts.push(q); }
      tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, r, 5, false));
      if (depth > 0) { for (let k = 0; k < 2; k++) root(q, V3(d.x + (rnd() - .5) * 1.2, d.y - .1, d.z + (rnd() - .5) * 1.2).normalize(), len * .62, r * .55, depth - 1); } else tips.push(q);
    };
    /* 根の多くは浅いところに広がる（Jackson ほか 1996）。深く下りる根も少し */
    for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + .4; root(V3(TREE.x, -.1, TREE.z), V3(Math.cos(a), -.25, Math.sin(a)).normalize(), 1.8, .07, 3); }
    root(V3(TREE.x, -.2, TREE.z), V3(.1, -1, .05).normalize(), 1.8, .06, 2);
    g.add(new THREE.Mesh(mergeGeometries(tubes), rootM));
    /* 草の根：短く細い */
    const gr = [];
    for (let i = 0; i < (LOWP ? 140 : 260); i++) { const x = BOX.x0 + .5 + rnd() * 15, z = BOX.z0 + .5 + rnd() * 11.5; if (Math.hypot(x - TREE.x, z - TREE.z) < 1.5) continue; const s = H(x, z); for (let k = 0; k < 3; k++) gr.push(V3(x, s - .02, z), V3(x + (rnd() - .5) * .18, s - .1 - rnd() * .25, z + (rnd() - .5) * .18)); }
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gr), new THREE.LineBasicMaterial({ color: 0xd9c49a, transparent: true, opacity: .7 })));
    /* 菌根菌の菌糸：根の先から土の中へ網のように */
    const hy = [], hp = [];
    for (const t of tips) for (let k = 0; k < 4; k++) {
      let a = t.clone(); for (let s = 0; s < 4; s++) { const b = a.clone().add(V3((rnd() - .5) * .7, (rnd() - .5) * .25, (rnd() - .5) * .7)); const sf = H(b.x, b.z); if (b.y > sf - .04) b.y = sf - .04; hy.push(a, b); hp.push([a.clone(), b.clone()]); a = b; }
    }
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(hy), new THREE.LineBasicMaterial({ color: 0xf2f2d0, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false })));
    /* やりとりの光：根と菌糸のあいだを行き来する（植物は糖を、菌は水と養分を） */
    const np = Math.min(hp.length, LOWP ? 120 : 220), pp = new Float32Array(np * 3), pc = new Float32Array(np * 3), PP = [];
    for (let i = 0; i < np; i++) PP.push({ s: hp[Math.floor(rnd() * hp.length)], u: rnd(), dir: rnd() < .5 ? 1 : -1, sp: .4 + rnd() * .5 });
    const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute("position", new THREE.BufferAttribute(pp, 3)); pgeo.setAttribute("color", new THREE.BufferAttribute(pc, 3));
    g.add(new THREE.Points(pgeo, new THREE.PointsMaterial({ size: 6, vertexColors: true, sizeAttenuation: false, map: dot(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    /* 細菌など：表土に多く、根のまわりでさらに多い（数は模式） */
    const nb = LOWP ? 1600 : 3000, bp = [];
    for (let i = 0; i < nb; i++) { let x, z, nearRoot = rnd() < .4; if (nearRoot && tips.length) { const t = tips[Math.floor(rnd() * tips.length)]; x = t.x + (rnd() - .5) * .8; z = t.z + (rnd() - .5) * .8; } else { x = BOX.x0 + rnd() * 16; z = BOX.z0 + rnd() * 12.5; } x = clamp(x, BOX.x0, BOX.x1); z = clamp(z, BOX.z0, BOX.z1); const d = Math.pow(rnd(), 2.2) * 2.2; bp.push(V3(x, H(x, z) - .03 - d, z)); }
    g.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(bp), new THREE.PointsMaterial({ color: 0xb6f0a0, size: 2.2, sizeAttenuation: false, transparent: true, opacity: .75, depthWrite: false })));
    /* ミミズの通り道（たて穴） */
    const bur = [];
    for (let i = 0; i < 6; i++) { const x = -5 + rnd() * 9, z = -5 + rnd() * 8, s = H(x, z), pts = []; for (let k = 0; k <= 8; k++) pts.push(V3(x + Math.sin(k * .9) * .08, s - k * .14, z + Math.cos(k * .7) * .08)); bur.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .018, 5, false)); }
    g.add(new THREE.Mesh(mergeGeometries(bur), new THREE.MeshBasicMaterial({ color: 0x5a3a28 })));
    S.lifeTips = tips;
    S.tickLife = (dt) => {
      for (let i = 0; i < np; i++) { const o = PP[i]; o.u += o.dir * o.sp * dt; if (o.u > 1 || o.u < 0) { o.s = hp[Math.floor(rnd() * hp.length)]; o.u = o.dir > 0 ? 0 : 1; }
        const a = o.s[0], b = o.s[1]; pp[i * 3] = a.x + (b.x - a.x) * o.u; pp[i * 3 + 1] = a.y + (b.y - a.y) * o.u; pp[i * 3 + 2] = a.z + (b.z - a.z) * o.u;
        const c = o.dir > 0 ? [1, .85, .45] : [.55, .9, 1]; pc[i * 3] = c[0]; pc[i * 3 + 1] = c[1]; pc[i * 3 + 2] = c[2]; }
      pgeo.attributes.position.needsUpdate = pgeo.attributes.color.needsUpdate = true;
    };
  }
  /* ---- 夕方：コウモリと蛾（超音波の反響） ---- */
  {
    const g = new THREE.Group(); world.add(g); g.visible = false; L.dusk = g;
    const bat = new THREE.Group();
    const bodyM = new THREE.MeshLambertMaterial({ color: 0x3a2e28 }), wingM = new THREE.MeshLambertMaterial({ color: 0x4a3a32, side: THREE.DoubleSide });
    const body = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), bodyM); body.scale.set(.8, .8, 1.4); bat.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), bodyM); head.position.z = .08; bat.add(head);
    for (const sd of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(.012, .035, 5), bodyM); ear.position.set(sd * .016, .03, .09); bat.add(ear); }
    const wingGeo = sd => { const s = new THREE.Shape(); s.moveTo(0, .04); s.lineTo(sd * .16, .07); s.lineTo(sd * .3, .02); s.lineTo(sd * .22, -.02); s.lineTo(sd * .15, -.06); s.lineTo(sd * .08, -.03); s.lineTo(0, -.07); s.lineTo(0, .04); return new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2); };
    const wl = new THREE.Mesh(wingGeo(1), wingM), wr = new THREE.Mesh(wingGeo(-1), wingM); bat.add(wl, wr);
    bat.scale.setScalar(1.6); g.add(bat); S.bat = bat;
    const moth = new THREE.Group(); const mm = new THREE.MeshLambertMaterial({ color: 0xbfae8a, side: THREE.DoubleSide });
    const mw = new THREE.Mesh(new THREE.CircleGeometry(.05, 3).rotateX(-Math.PI / 2), mm), mw2 = mw.clone(); mw.position.x = .03; mw2.position.x = -.03; mw2.rotation.y = Math.PI; moth.add(mw, mw2); g.add(moth); S.moth = moth;
    S.tickDusk = (dt, t) => {
      const a = t * .55, R = 2.6;
      const p = V3(TREE.x + 1.2 + Math.cos(a) * R, 2.6 + Math.sin(a * 2) * .5, TREE.z + 1.4 + Math.sin(a) * R * .8);
      const pn = V3(TREE.x + 1.2 + Math.cos(a + .05) * R, 2.6 + Math.sin((a + .05) * 2) * .5, TREE.z + 1.4 + Math.sin(a + .05) * R * .8);
      bat.position.copy(p); bat.lookAt(pn); const f = Math.sin(t * 18) * .7; wl.rotation.z = f; wr.rotation.z = -f;
      /* 蛾：池の上をふらふら。コウモリが近づくと急に落ちる（Roeder & Treat 1957） */
      const mp = V3(POND.x - 1.2 + Math.sin(t * .9) * .6, 1.4 + Math.sin(t * 1.7) * .2, POND.z - .8 + Math.cos(t * .7) * .5);
      const near = p.distanceTo(mp) < 2.4; S.mothDive = near;
      if (near) mp.y -= .7; moth.position.lerp(mp, Math.min(1, dt * (near ? 4 : 2))); mw.rotation.z = Math.sin(t * 30) * .6; mw2.rotation.z = -Math.sin(t * 30) * .6;
      /* 声：近づくほど間隔が短い（Griffin ほか 1960）。反響の輪の半径は、音の速さを何十分の一にして見せる */
      const gap = near ? .09 : .22, ph = (t % gap) / gap;
      G.uEcho.value.set(p.x, p.y, p.z, ph * 3.2);
      S.callNow = ph < (dt / gap) * 1.5; S.batPos = p; S.batNear = near;
    };
  }
  /* ---- 碧の足もと：高さを 3 倍にした網（DEM の 5 m の格子と、20 cm ごとの等高線） ---- */
  {
    const g = new THREE.Group(); world.add(g); g.visible = false; L.dem = g;
    const geo = new THREE.PlaneGeometry(16, 12.5, 64, 50).rotateX(-Math.PI / 2).translate(0, 0, (BOX.z0 + BOX.z1) / 2), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)) * 3);
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: 0x5cc8e0, transparent: true, opacity: .22, depthWrite: false }));
    wire.position.y = 5.2; g.add(wire);
    const grid = []; for (let x = -5; x <= 5; x += 5) grid.push(V3(x, 5.25 + H(x, 0) * 3, BOX.z0), V3(x, 5.25 + H(x, 0) * 3, BOX.z1));
    for (let z = -5; z <= 5; z += 5) grid.push(V3(BOX.x0, 5.25, z), V3(BOX.x1, 5.25, z));
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(grid), new THREE.LineBasicMaterial({ color: 0xf0c27a, transparent: true, opacity: .7 })));
  }
  /* ---- 碧の胸：記録の点（模式。種名と日付は付けない） ---- */
  {
    const g = new THREE.Group(); world.add(g); g.visible = false; L.records = g;
    const pts = [];
    for (let i = 0; i < 22; i++) { let x, z; do { x = -6 + rnd() * 12; z = -5.5 + rnd() * 10; } while (x > 1.5 && z < -2); const y = H(x, z); pts.push(V3(x, y, z)); }
    const seg = []; for (const q of pts) seg.push(q, q.clone().setY(q.y + .9));
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), new THREE.LineBasicMaterial({ color: 0xf0c27a, transparent: true, opacity: .8 })));
    g.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts.map(q => q.clone().setY(q.y + .9))), new THREE.PointsMaterial({ color: 0xffe0a0, size: 10, sizeAttenuation: false, map: dot(), transparent: true, depthWrite: false })));
    const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 49 }, (_, i) => V3(4.1 + Math.cos(i / 48 * TAU) * 1.6, H(4.1, -3.6) + .05, -3.6 + Math.sin(i / 48 * TAU) * 1.6))), new THREE.LineDashedMaterial({ color: 0xa6e4f2, dashSize: .15, gapSize: .12 }));
    ring.computeLineDistances(); g.add(ring); S.emptyAt = V3(4.1, H(4.1, -3.6) + .3, -3.6);
  }
  /* ---- 碧の手：土の柱（コア）を抜き出して見る ---- */
  {
    const g = new THREE.Group(); world.add(g); g.visible = false; L.core = g;
    const cx = -.9, cz = 1.6, top = H(cx, cz), hgt = 1.4;
    const geo = new THREE.CylinderGeometry(.16, .16, hgt, 24, 20, true); geo.translate(0, -hgt / 2, 0);
    const mat = S.soilMat.clone(); mat.uniforms = { ...S.soilMat.uniforms, uAlpha: { value: 1 } };
    const core = new THREE.Mesh(geo, mat); core.userData.base = top; g.add(core); S.core = core; S.coreAt = V3(cx, top, cz);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(.16, 24).rotateX(-Math.PI / 2), M(0xffffff, { map: photoTex("grass_ground.webp", .2, .2) })); g.add(cap); S.coreCap = cap;
    const mic = []; for (let i = 0; i < 260; i++) { const a = rnd() * TAU, r = .2 + rnd() * .35, y = -rnd() * .9; mic.push(V3(Math.cos(a) * r, y, Math.sin(a) * r)); }
    const mp = new THREE.Points(new THREE.BufferGeometry().setFromPoints(mic), new THREE.PointsMaterial({ color: 0xb6f0a0, size: 4, sizeAttenuation: false, map: dot(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(mp); S.coreMic = mp;
    const hel = []; for (let k = 0; k < 2; k++) { const pts = []; for (let i = 0; i <= 80; i++) { const u = i / 80, a = u * TAU * 3 + k * Math.PI; pts.push(V3(Math.cos(a) * .12, u * .9, Math.sin(a) * .12)); } hel.push(pts); }
    const rungs = []; for (let i = 0; i <= 24; i++) { const u = i / 24, a = u * TAU * 3; rungs.push(V3(Math.cos(a) * .12, u * .9, Math.sin(a) * .12), V3(Math.cos(a + Math.PI) * .12, u * .9, Math.sin(a + Math.PI) * .12)); }
    const dna = new THREE.Group(); for (const h of hel) dna.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(h), new THREE.LineBasicMaterial({ color: 0xa6e4f2 }))); dna.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rungs), new THREE.LineBasicMaterial({ color: 0xf0c27a, transparent: true, opacity: .7 }))); g.add(dna); S.dna = dna;
    S.tickCore = (k, t) => {
      const lift = k * 1.75; core.position.set(cx, top + lift, cz); cap.position.set(cx, top + lift + .001, cz); mp.position.set(cx, top + lift, cz); mp.rotation.y = t * .2;
      dna.position.set(cx + .55, top + lift - .4, cz); dna.rotation.y = t * .6; dna.visible = k > .6;
    };
  }
  S.sonic = sonic;
  return S;
}
