/* Bureau 3D d'Anas : un diorama façon film d'animation.
   On clique sur l'écran du PC pour plonger dedans et arriver sur « Anas OS » (le bureau HTML).
   Three.js r170 (licence MIT), servi depuis /assets/js/vendor. */
import * as THREE from "./vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";

const html = document.documentElement;
const stage = document.getElementById("stage");
const canvas = stage && stage.querySelector(".stage__canvas");
const STILL = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FR = html.lang !== "en";
const OS = () => window.AnasOS || { enter() {}, sound() {}, ready: true };

function webglOK() {
  try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); }
  catch (e) { return false; }
}
if (!stage || !canvas || !webglOK()) {
  // pas de 3D possible : on arrive directement sur le bureau
  html.classList.remove("is-stage");
  if (stage) stage.hidden = true;
  const go = () => window.AnasOS && window.AnasOS.enter({});
  if (window.AnasOS) go(); else window.addEventListener("anasos:ready", go, { once: true });
} else {
  window.__pcAvailable = true;
  window.dispatchEvent(new CustomEvent("anasos:pc-available"));
  if (html.classList.contains("is-stage")) start(false);
  else window.addEventListener("anasos:leave", () => start(true), { once: true }); // construite seulement si on sort du PC
}

function start(fromInside) {
  window.__pcStarted = true;
  /* ---------------------------------------------------------------- moteur */
  const mobile = Math.min(window.innerWidth, window.innerHeight) < 600;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
  const room = new THREE.Group();
  scene.add(room);

  /* ---------------------------------------------------------------- matériaux et formes */
  const C = {
    wood: "#B5774B", woodDark: "#8F5A37", wall: "#86BFB8", wallSide: "#79B3AC", trim: "#F1EADC",
    desk: "#E6C08B", deskDark: "#C99E66", beige: "#ECE1C8", beigeDark: "#CDBE9D", ink: "#26313D",
    navy: "#2F4858", orange: "#F0641E", aqua: "#3CCFD4", leaf: "#5FA65A", leafDark: "#3E7F47", rug: "#3A6072", white: "#F7F4EC",
  };
  const mats = {};
  const mat = (color, extra) => {
    const k = color + JSON.stringify(extra || {});
    if (!mats[k]) mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.74, metalness: 0 }, extra || {}));
    return mats[k];
  };
  const shadow = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
  const rbox = (w, h, d, r, m) => shadow(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) - 1e-4), m));
  const cyl = (rt, rb, h, m, seg) => shadow(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 32), m));
  const sph = (r, m, seg) => shadow(new THREE.Mesh(new THREE.SphereGeometry(r, seg || 24, seg ? seg - 4 : 18), m));
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  const group = (...children) => { const g = new THREE.Group(); children.forEach((c) => g.add(c)); return g; };
  const interactive = []; // objets cliquables
  const tag = (obj, kind, label) => { obj.userData.kind = kind; obj.userData.label = label; interactive.push(obj); return obj; };
  const L = (fr, en) => (FR ? fr : en);

  /* ---------------------------------------------------------------- textures dessinées */
  function canvasTex(w, h, draw) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    t.userData = { canvas: c, ctx: g }; return t;
  }
  const floorTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = C.wood; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)"; g.fillRect(0, i * 64, w, 64);
      g.fillStyle = "rgba(60,30,15,0.35)"; g.fillRect(0, i * 64, w, 2);
      const off = (i * 173) % 512; g.fillRect(off, i * 64, 2, 64);
    }
  });
  const posterTex = canvasTex(360, 480, (g, w, h) => {
    g.fillStyle = "#0E1C22"; g.fillRect(0, 0, w, h);
    g.strokeStyle = C.aqua; g.lineWidth = 3;
    const sw = [[180, 70], [100, 200], [260, 200]];
    g.beginPath(); g.moveTo(180, 70); g.lineTo(180, 140); g.lineTo(100, 140); g.lineTo(100, 200); g.moveTo(180, 140); g.lineTo(260, 140); g.lineTo(260, 200); g.stroke();
    g.fillStyle = C.white; g.fillRect(166, 56, 28, 28);
    [[100, 200], [260, 200]].forEach(([x, y], k) => {
      g.fillStyle = C.white; g.fillRect(x - 20, y - 8, 40, 16);
      for (let i = 0; i < (k ? 3 : 4); i++) {
        const hx = x - 45 + i * 30;
        g.strokeStyle = C.aqua; g.beginPath(); g.moveTo(x, y + 8); g.lineTo(x, y + 40); g.lineTo(hx, y + 40); g.lineTo(hx, y + 70); g.stroke();
        g.fillStyle = k ? C.orange : C.white; g.beginPath(); g.arc(hx, y + 78, 8, 0, Math.PI * 2); g.fill();
      }
    });
    g.fillStyle = C.white; g.font = "600 30px 'Fira Sans', sans-serif"; g.fillText("10.0.0.1", 40, 360);
    g.fillStyle = C.aqua; g.font = "400 20px 'Fira Sans', sans-serif"; g.fillText("VLAN 10  VLAN 20", 40, 395);
    g.fillStyle = "rgba(255,255,255,0.5)"; g.fillText(L("Mon réseau", "My network"), 40, 430);
    void sw;
  });
  function skyDraw(g, w, h, night) {
    const gr = g.createLinearGradient(0, 0, 0, h);
    if (night) { gr.addColorStop(0, "#0B1630"); gr.addColorStop(1, "#1D3557"); }
    else { gr.addColorStop(0, "#7CC4E8"); gr.addColorStop(1, "#D7EEF5"); }
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (night) {
      g.fillStyle = "#F5F1DE"; g.beginPath(); g.arc(w * 0.7, h * 0.3, 26, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#1A2D50"; g.beginPath(); g.arc(w * 0.7 + 11, h * 0.3 - 6, 22, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#FFFFFF";
      for (let i = 0; i < 40; i++) { const x = (i * 97) % w, y = (i * 53) % (h * 0.8); g.globalAlpha = 0.4 + (i % 3) * 0.2; g.fillRect(x, y, 2, 2); }
      g.globalAlpha = 1;
    } else {
      g.fillStyle = "#FFE7A8"; g.beginPath(); g.arc(w * 0.25, h * 0.28, 30, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(255,255,255,0.92)";
      [[w * 0.62, h * 0.3, 1], [w * 0.8, h * 0.55, 0.8]].forEach(([x, y, s]) => {
        [[0, 0, 26], [24, -10, 30], [52, 0, 24], [26, 8, 26]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill(); });
      });
    }
    // immeubles au loin
    g.fillStyle = night ? "#132544" : "#9FC9D6";
    [[0, 0.72, 0.18], [0.16, 0.62, 0.14], [0.32, 0.78, 0.2], [0.55, 0.66, 0.16], [0.74, 0.74, 0.26]].forEach(([x, y, bw]) => g.fillRect(x * w, y * h, bw * w, h));
    if (night) {
      g.fillStyle = "#F7C873";
      for (let i = 0; i < 18; i++) g.fillRect(((i * 37) % (w - 10)) + 4, h * 0.8 + ((i * 13) % 40), 5, 7);
    }
  }
  const skyTex = canvasTex(256, 224, (g, w, h) => skyDraw(g, w, h, html.dataset.theme === "night"));

  /* ---------------------------------------------------------------- la pièce */
  const floor = at(rbox(5, 0.3, 5, 0.06, new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8 })), 0, -0.15, 0);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(1.4, 1.4);
  const wallMat = mat(C.wall), wallSideMat = mat(C.wallSide);
  const backWall = at(rbox(5, 3.2, 0.24, 0.05, wallMat), 0, 1.6, -2.38);
  const leftWall = at(rbox(0.24, 3.2, 5, 0.05, wallSideMat), -2.38, 1.6, 0);
  const trimMat = mat(C.trim);
  const base1 = at(rbox(4.76, 0.12, 0.05, 0.02, trimMat), 0.12, 0.06, -2.24);
  const base2 = at(rbox(0.05, 0.12, 4.76, 0.02, trimMat), -2.24, 0.06, 0.12);
  const rug = at(cyl(1.25, 1.25, 0.016, mat(C.rug), 48), 0.35, 0.008, -0.55);
  room.add(floor, backWall, leftWall, base1, base2, rug);

  // fenêtre (clic : jour / nuit)
  const win = group(
    at(rbox(1.16, 1.0, 0.08, 0.03, trimMat), 0, 0, 0),
    at(new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.84), new THREE.MeshBasicMaterial({ map: skyTex, toneMapped: false })), 0, 0, 0.045),
    at(rbox(0.035, 0.84, 0.05, 0.01, trimMat), 0, 0, 0.06),
    at(rbox(1.0, 0.035, 0.05, 0.01, trimMat), 0, 0, 0.06),
    at(rbox(1.3, 0.05, 0.16, 0.02, trimMat), 0, -0.52, 0.06),
  );
  at(win, 1.25, 2.0, -2.24);
  room.add(tag(win, "window", L("Fenêtre : passer en mode jour ou nuit", "Window: switch day or night")));

  // affiche du réseau sur le mur de gauche
  const poster = group(
    at(rbox(0.07, 1.12, 0.86, 0.02, mat(C.ink)), 0, 0, 0),
    (() => { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 1.0), new THREE.MeshStandardMaterial({ map: posterTex, roughness: 0.6 })); p.rotation.y = Math.PI / 2; p.position.x = 0.04; return p; })(),
  );
  at(poster, -2.24, 1.78, -0.35);
  room.add(tag(poster, "poster", L("Affiche : mon réseau", "Poster: my network")));

  // étagère + routeur avec LED
  const shelf = at(rbox(0.95, 0.04, 0.28, 0.015, trimMat), -1.15, 1.9, -2.12);
  const leds = [];
  const routerBody = at(rbox(0.46, 0.09, 0.24, 0.03, mat(C.ink)), 0, 0, 0);
  const router = group(routerBody);
  [-0.15, 0.15].forEach((x) => { const a = at(cyl(0.012, 0.016, 0.26, mat(C.ink)), x, 0.15, -0.08); a.rotation.z = x * 0.6; router.add(a); });
  for (let i = 0; i < 4; i++) {
    const m = new THREE.MeshStandardMaterial({ color: "#10181F", emissive: i === 3 ? C.orange : C.aqua, emissiveIntensity: 1.6 });
    const led = at(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.014, 0.01), m), -0.12 + i * 0.07, 0.0, 0.122);
    leds.push(led); router.add(led);
  }
  at(router, -1.15, 1.967, -2.1);
  room.add(shelf, tag(router, "router", L("Routeur : ping 10.0.0.1", "Router: ping 10.0.0.1")));

  // bureau
  const deskMat = mat(C.desk), deskDark = mat(C.deskDark);
  const desk = group(
    at(rbox(2.7, 0.08, 1.05, 0.03, deskMat), 0, 0.94, 0),
    at(rbox(0.07, 0.9, 0.07, 0.02, deskDark), -1.25, 0.45, -0.42),
    at(rbox(0.07, 0.9, 0.07, 0.02, deskDark), -1.25, 0.45, 0.42),
    at(rbox(0.6, 0.9, 0.95, 0.03, deskMat), 1.0, 0.45, 0),
    at(rbox(0.5, 0.36, 0.02, 0.01, deskDark), 1.0, 0.66, 0.48),
    at(rbox(0.5, 0.36, 0.02, 0.01, deskDark), 1.0, 0.24, 0.48),
    at(rbox(0.14, 0.03, 0.03, 0.01, mat(C.ink)), 1.0, 0.72, 0.5),
    at(rbox(0.14, 0.03, 0.03, 0.01, mat(C.ink)), 1.0, 0.3, 0.5),
  );
  at(desk, 0.2, 0, -1.72);
  room.add(desk);
  const TOP = 0.98;

  // écran cathodique
  const beige = mat(C.beige), beigeDark = mat(C.beigeDark);
  const screenCanvas = document.createElement("canvas"); screenCanvas.width = 640; screenCanvas.height = 480;
  const sctx = screenCanvas.getContext("2d");
  const screenTex = new THREE.CanvasTexture(screenCanvas); screenTex.colorSpace = THREE.SRGBColorSpace;
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
  const SW = 0.74, SH = 0.555;
  const screen = at(new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), screenMat), 0, 0.02, 0.118);
  const monitor = group(
    at(rbox(0.96, 0.78, 0.22, 0.07, beige), 0, 0, 0),
    at(rbox(0.72, 0.58, 0.44, 0.12, beige), 0, 0.01, -0.28),
    at(rbox(0.82, 0.64, 0.03, 0.03, mat("#1A232B")), 0, 0.02, 0.1),
    screen,
    at(rbox(0.12, 0.03, 0.02, 0.01, beigeDark), 0.3, -0.33, 0.112),
    at(sph(0.014, new THREE.MeshStandardMaterial({ color: "#0f1418", emissive: C.aqua, emissiveIntensity: 2 }), 10), 0.4, -0.33, 0.115),
    at(rbox(0.3, 0.08, 0.28, 0.03, beigeDark), 0, -0.43, -0.1),
    at(rbox(0.52, 0.04, 0.42, 0.02, beige), 0, -0.48, -0.1),
  );
  at(monitor, 0.15, TOP + 0.5, -1.86);
  room.add(tag(monitor, "screen", L("Écran : entrer dans le PC", "Screen: enter the PC")));

  // clavier (touches en instances) + souris
  const kb = group(at(rbox(0.88, 0.045, 0.3, 0.02, beige), 0, 0, 0));
  const keyGeo = new RoundedBoxGeometry(0.046, 0.03, 0.046, 2, 0.008);
  const keys = new THREE.InstancedMesh(keyGeo, beigeDark, 15 * 4 + 1);
  const dummy = new THREE.Object3D();
  const keyBase = [];
  let ki = 0;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 15; c++) {
    dummy.position.set(-0.385 + c * 0.055, 0.03, -0.1 + r * 0.055); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
    keys.setMatrixAt(ki, dummy.matrix); keyBase.push(dummy.position.clone()); ki++;
  }
  dummy.position.set(0, 0.03, 0.125); dummy.scale.set(6, 1, 1); dummy.updateMatrix(); keys.setMatrixAt(ki, dummy.matrix);
  keys.castShadow = true; keys.receiveShadow = true;
  kb.add(keys);
  at(kb, 0.12, TOP + 0.03, -1.32); kb.rotation.x = 0.05;
  room.add(tag(kb, "keyboard", L("Clavier : taper", "Keyboard: type")));
  const pad = at(rbox(0.32, 0.01, 0.27, 0.01, mat(C.navy)), 0.78, TOP + 0.005, -1.3);
  const mouse = at(rbox(0.07, 0.04, 0.11, 0.03, beige), 0.78, TOP + 0.03, -1.3);
  room.add(pad, tag(mouse, "mouse", L("Souris", "Mouse")));

  // tasse avec vapeur
  const mug = group(
    at(cyl(0.065, 0.06, 0.15, mat(C.orange)), 0, 0.075, 0),
    (() => { const h = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 10, 20), mat(C.orange))); h.position.set(0.075, 0.08, 0); return h; })(),
    at(cyl(0.056, 0.056, 0.01, mat("#4B2E1E")), 0, 0.14, 0),
  );
  at(mug, -0.6, TOP, -1.38);
  room.add(tag(mug, "mug", L("Tasse : café", "Mug: coffee")));
  const steam = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0 }));
    mug.add(s); steam.push(s);
  }

  // lampe de bureau
  const lampHeadMat = mat(C.navy);
  const bulbMat = new THREE.MeshStandardMaterial({ color: "#FFF4D6", emissive: "#FFC27A", emissiveIntensity: 0 });
  const lampHead = group(
    (() => { const c = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.16, 24, 1, true), lampHeadMat)); c.material = lampHeadMat; c.material.side = THREE.DoubleSide; return c; })(),
    at(sph(0.045, bulbMat, 12), 0, -0.05, 0),
  );
  lampHead.position.set(0.18, 0.62, 0.08); lampHead.rotation.z = -2.3;
  const arm1 = at(cyl(0.014, 0.014, 0.42, lampHeadMat), 0.04, 0.22, 0); arm1.rotation.z = -0.25;
  const arm2 = at(cyl(0.014, 0.014, 0.3, lampHeadMat), 0.13, 0.52, 0.03); arm2.rotation.z = 0.9;
  const lamp = group(at(cyl(0.12, 0.13, 0.035, lampHeadMat), 0, 0.017, 0), arm1, arm2, lampHead);
  at(lamp, -0.95, TOP, -2.0);
  room.add(tag(lamp, "lamp", L("Lampe : allumer", "Lamp: switch on")));
  const lampLight = new THREE.PointLight("#FFB26B", 0, 3.2, 1.6);
  lampLight.position.set(-0.75, TOP + 0.5, -1.85);
  lampLight.castShadow = !mobile; lampLight.shadow.mapSize.set(512, 512); lampLight.shadow.bias = -0.002;
  room.add(lampLight);

  // livres
  const books = group(
    at(rbox(0.32, 0.06, 0.22, 0.01, mat(C.orange)), 0, 0.03, 0),
    at(rbox(0.3, 0.05, 0.21, 0.01, mat(C.aqua)), 0.01, 0.085, 0),
    at(rbox(0.28, 0.055, 0.2, 0.01, mat(C.navy)), -0.01, 0.137, 0),
  );
  at(books, 1.12, TOP, -2.02); books.rotation.y = 0.25;
  room.add(tag(books, "books", L("Livres : réseaux et sécurité", "Books: networks and security")));

  // tour du PC (bouton d'alimentation : redémarre l'écran)
  const towerLed = new THREE.MeshStandardMaterial({ color: "#0f1418", emissive: C.aqua, emissiveIntensity: 2 });
  const tower = group(
    at(rbox(0.36, 0.9, 0.74, 0.04, beige), 0, 0.45, 0),
    at(rbox(0.26, 0.05, 0.02, 0.01, beigeDark), 0, 0.74, 0.37),
    at(rbox(0.26, 0.05, 0.02, 0.01, beigeDark), 0, 0.66, 0.37),
    at(cyl(0.035, 0.035, 0.02, mat(C.orange)), 0, 0.42, 0.37),
    at(sph(0.013, towerLed, 10), 0.09, 0.42, 0.372),
  );
  tower.children[3].rotation.x = Math.PI / 2;
  at(tower, 1.92, 0, -1.72);
  room.add(tag(tower, "tower", L("Tour : redémarrer", "Tower: restart")));

  // câble réseau de la tour au routeur
  const cablePath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.92, 0.75, -2.1), new THREE.Vector3(1.95, 0.95, -2.24), new THREE.Vector3(1.5, 1.35, -2.24),
    new THREE.Vector3(0.6, 1.5, -2.24), new THREE.Vector3(-0.2, 1.62, -2.24), new THREE.Vector3(-0.8, 1.9, -2.2), new THREE.Vector3(-0.95, 1.98, -2.16),
  ]);
  const cable = shadow(new THREE.Mesh(new THREE.TubeGeometry(cablePath, 80, 0.012, 8, false), mat(C.aqua, { roughness: 0.5 })));
  room.add(cable);
  // paquet qui circule sur le câble
  const packet = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), new THREE.MeshBasicMaterial({ color: "#E9FFFF" }));
  room.add(packet);

  // plante
  const leafMat = mat(C.leaf), leafDark = mat(C.leafDark);
  const plant = group(
    at(cyl(0.2, 0.16, 0.36, mat(C.trim)), 0, 0.18, 0),
    at(cyl(0.205, 0.205, 0.06, mat(C.orange)), 0, 0.3, 0),
    at(cyl(0.18, 0.18, 0.02, mat("#5A3B26")), 0, 0.36, 0),
  );
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, tall = 0.35 + (i % 3) * 0.12;
    const leaf = sph(0.1, i % 2 ? leafMat : leafDark, 16);
    leaf.scale.set(0.55, tall / 0.1 / 2, 0.3);
    leaf.position.set(Math.cos(a) * 0.08, 0.36 + tall * 0.55, Math.sin(a) * 0.08);
    leaf.rotation.set(Math.sin(a) * 0.45, -a, Math.cos(a) * 0.45);
    plant.add(leaf);
  }
  at(plant, -1.85, 0, -1.8);
  room.add(tag(plant, "plant", L("Plante", "Plant")));

  // chaise de bureau
  const chairMat = mat(C.navy);
  const chair = group(
    at(rbox(0.62, 0.1, 0.58, 0.05, chairMat), 0, 0.56, 0),
    at(rbox(0.58, 0.62, 0.09, 0.05, chairMat), 0, 0.98, 0.27),
    at(cyl(0.03, 0.03, 0.42, mat(C.ink)), 0, 0.3, 0),
  );
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = at(rbox(0.3, 0.035, 0.05, 0.015, mat(C.ink)), Math.cos(a) * 0.15, 0.08, Math.sin(a) * 0.15);
    leg.rotation.y = -a; chair.add(leg);
    chair.add(at(sph(0.035, mat(C.ink), 10), Math.cos(a) * 0.29, 0.035, Math.sin(a) * 0.29));
  }
  at(chair, 0.45, 0, -0.52); chair.rotation.y = -0.45;
  room.add(tag(chair, "chair", L("Chaise : tourner", "Chair: spin")));

  /* ---------------------------------------------------------------- lumières jour / nuit */
  const hemi = new THREE.HemisphereLight("#D8F0F6", "#9C6A44", 1.2);
  const sun = new THREE.DirectionalLight("#FFF0D8", 2.2);
  sun.position.set(3.5, 6, 4.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 16 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
  const screenGlow = new THREE.PointLight(C.aqua, 0.4, 2.4, 1.8);
  screenGlow.position.set(0.15, TOP + 0.52, -1.35);
  scene.add(hemi, sun, screenGlow);

  const PRESET = {
    day: { bg: "#BFDDE2", hemiSky: "#E0F3F8", hemiGround: "#A26E47", hemiI: 1.25, sunC: "#FFF1DA", sunI: 2.3, glow: 0.25, exposure: 1.0 },
    night: { bg: "#0E1C22", hemiSky: "#3B5683", hemiGround: "#1C140E", hemiI: 0.32, sunC: "#8FB0FF", sunI: 0.35, glow: 1.6, exposure: 1.08 },
  };
  let lampOn = html.dataset.theme === "night";
  const cur = { bg: new THREE.Color(), hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), sunC: new THREE.Color(), hemiI: 0, sunI: 0, glow: 0, exposure: 1, lamp: 0 };
  const from = {}, to = {};
  let lightT = 1;
  function setPreset(name, instant) {
    const p = PRESET[name];
    ["bg", "hemiSky", "hemiGround", "sunC"].forEach((k) => { from[k] = cur[k].clone(); to[k] = new THREE.Color(p[k]); });
    ["hemiI", "sunI", "glow", "exposure", "lamp"].forEach((k) => { from[k] = cur[k]; });
    Object.assign(to, { hemiI: p.hemiI, sunI: p.sunI, glow: p.glow, exposure: p.exposure, lamp: lampOn ? 1 : 0 });
    lightT = instant ? 1 : 0;
    if (instant) applyLight(1);
    skyDraw(skyTex.userData.ctx, 256, 224, name === "night"); skyTex.needsUpdate = true;
  }
  function applyLight(k) {
    const e = k * k * (3 - 2 * k);
    ["bg", "hemiSky", "hemiGround", "sunC"].forEach((n) => cur[n].copy(from[n] || to[n]).lerp(to[n], e));
    ["hemiI", "sunI", "glow", "exposure", "lamp"].forEach((n) => { cur[n] = (from[n] != null ? from[n] : to[n]) + (to[n] - (from[n] != null ? from[n] : to[n])) * e; });
    scene.background = cur.bg;
    hemi.color.copy(cur.hemiSky); hemi.groundColor.copy(cur.hemiGround); hemi.intensity = cur.hemiI;
    sun.color.copy(cur.sunC); sun.intensity = cur.sunI;
    screenGlow.intensity = cur.glow;
    renderer.toneMappingExposure = cur.exposure;
    lampLight.intensity = cur.lamp * 5.5; bulbMat.emissiveIntensity = cur.lamp * 3;
  }
  setPreset(html.dataset.theme === "day" ? "day" : "night", true);
  new MutationObserver(() => {
    lampOn = html.dataset.theme === "night";
    setPreset(html.dataset.theme === "day" ? "day" : "night", STILL);
  }).observe(html, { attributes: true, attributeFilter: ["data-theme"] });

  /* ---------------------------------------------------------------- l'écran (texture vivante) */
  const LINES = FR
    ? ["ANAS OS 2.0", "Initialisation du réseau ......... OK", "Passerelle 10.0.0.1 .............. OK", "VLAN 10  BUT 1 ............. 4 hôtes", "VLAN 20  BUT 2 ............. 3 hôtes"]
    : ["ANAS OS 2.0", "Starting network .................. OK", "Gateway 10.0.0.1 .................. OK", "VLAN 10  YEAR 1 ............. 4 hosts", "VLAN 20  YEAR 2 ............. 3 hosts"];
  const PROMPT = L("Cliquez sur l'écran pour entrer", "Click the screen to enter");
  let typedAt = performance.now(), hoverScreen = false, screenMode = "boot", diveP = 0, typed = "";
  const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
  function drawScreen(now) {
    const g = sctx, w = 640, h = 480;
    if (screenMode === "dive") { drawDesktopPreview(g, w, h, diveP); screenTex.needsUpdate = true; return; }
    const gr = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, 420);
    gr.addColorStop(0, "#123038"); gr.addColorStop(1, "#071216");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const elapsed = STILL ? 1e9 : now - typedAt;
    let chars = Math.floor(elapsed / 22);
    g.font = `500 25px ${MONO}`; g.textBaseline = "top";
    let y = 44;
    LINES.forEach((line, i) => {
      const n = Math.max(0, Math.min(line.length, chars)); chars -= line.length + 6;
      g.fillStyle = i === 0 ? "#E3F7F7" : "#3CCFD4";
      g.font = i === 0 ? `700 30px ${MONO}` : `500 21px ${MONO}`;
      g.fillText(line.slice(0, n), 40, y); y += i === 0 ? 56 : 36;
    });
    if (chars > 0) {
      const blink = Math.floor(now / 520) % 2 === 0;
      g.fillStyle = hoverScreen ? "#F0641E" : "#E3F7F7";
      g.font = `700 25px ${MONO}`;
      const txt = "> " + PROMPT + (typed ? " " + typed : "");
      g.fillText(txt, 40, 330);
      if (blink || hoverScreen) { const tw = g.measureText(txt).width; g.fillRect(48 + tw, 330, 14, 26); }
      // petit réseau qui pulse en bas à droite
      const t = now / 1000;
      g.strokeStyle = "rgba(60,207,212,0.6)"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(520, 400); g.lineTo(600, 400); g.moveTo(560, 400); g.lineTo(560, 440); g.stroke();
      [[520, 400], [600, 400], [560, 440]].forEach(([x, yy], k) => { g.fillStyle = (Math.floor(t * 2) % 3 === k) ? "#F0641E" : "#3CCFD4"; g.fillRect(x - 6, yy - 6, 12, 12); });
    }
    // lignes de balayage
    g.fillStyle = "rgba(0,0,0,0.16)";
    for (let i = 0; i < h; i += 3) g.fillRect(0, i, w, 1);
    screenTex.needsUpdate = true;
  }
  // aperçu du bureau Anas OS sur l'écran pendant la plongée (même disposition que le vrai bureau)
  function drawDesktopPreview(g, w, h, p) {
    const night = html.dataset.theme !== "day";
    const bg = g.createLinearGradient(0, 0, w, 0);
    bg.addColorStop(0, night ? "#0B171C" : "#D9E0DC"); bg.addColorStop(1, night ? "#13272E" : "#E8ECE9");
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // le réseau en fond
    g.strokeStyle = night ? "rgba(60,207,212,0.45)" : "rgba(0,106,112,0.35)"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(400, 40); g.lineTo(400, 300); g.moveTo(400, 150); g.lineTo(300, 150); g.lineTo(300, 230); g.moveTo(400, 150); g.lineTo(500, 150); g.lineTo(500, 230); g.stroke();
    const ink = night ? "#E3E6E3" : "#1C2930";
    // icônes à droite, qui apparaissent une à une
    const cols = ["#F7F4EC", "#ECE1C8", "#3CCFD4", "#2F4858", "#F7F4EC", "#1A232B", "#F0641E"];
    const n = Math.min(7, Math.floor(p * 12));
    for (let i = 0; i < n; i++) { g.fillStyle = cols[i]; g.beginPath(); g.roundRect ? g.roundRect(w - 62, 26 + i * 54, 34, 30, 6) : g.rect(w - 62, 26 + i * 54, 34, 30); g.fill(); }
    // le nom en bas à gauche
    g.fillStyle = ink; g.font = "300 66px 'Fira Sans', sans-serif"; g.textBaseline = "alphabetic";
    g.globalAlpha = Math.min(1, p * 1.6); g.fillText("Anas", 28, h - 118); g.fillText("Azouaoui", 28, h - 58); g.globalAlpha = 1;
    // barre des tâches
    g.fillStyle = night ? "rgba(9,20,25,0.9)" : "rgba(240,243,241,0.95)"; g.fillRect(0, h - 30, w, 30);
    g.fillStyle = "#F0641E"; g.fillRect(10, h - 22, 14, 14); g.fillStyle = "#3CCFD4"; g.fillRect(18, h - 16, 14, 14);
    // la fenêtre de bienvenue qui s'ouvre
    if (p > 0.55) {
      const k = Math.min(1, (p - 0.55) / 0.35), ww = 300 * k, wh = 200 * k;
      g.fillStyle = night ? "#12252C" : "#F4F6F4"; g.fillRect(w / 2 - ww / 2, h / 2 - wh / 2 - 20, ww, wh);
      g.fillStyle = night ? "#19323A" : "#E1E7E4"; g.fillRect(w / 2 - ww / 2, h / 2 - wh / 2 - 20, ww, 22 * k);
    }
  }

  /* ---------------------------------------------------------------- caméra */
  const target = new THREE.Vector3(0.22, 1.12, -1.3);
  const rest = { r: 6.3, az: 0.6, el: 0.4 };
  const camPos = new THREE.Vector3(), lookAt = target.clone();
  let parX = 0, parY = 0, pX = 0, pY = 0, rotY = 0, rotYTarget = 0;
  function fitRadius() {
    const a = camera.aspect;
    if (a < 0.75) { camera.fov = 50; rest.r = 9.4; rest.az = 0.42; target.set(-0.15, 1.35, -1.1); }
    else if (a < 1.1) { camera.fov = 40; rest.r = 8.6; rest.az = 0.55; target.set(0.1, 1.2, -1.2); }
    else { camera.fov = 30; rest.r = a < 1.5 ? 8.3 : 7.7; rest.az = 0.6; target.set(0.22, 1.12, -1.3); }
    camera.updateProjectionMatrix();
  }
  function restPose(out) {
    const az = rest.az + pX * 0.1, el = rest.el + pY * 0.05;
    out.set(target.x + rest.r * Math.cos(el) * Math.sin(az), target.y + rest.r * Math.sin(el), target.z + rest.r * Math.cos(el) * Math.cos(az));
    return out;
  }
  function resize() {
    const w = stage.clientWidth || window.innerWidth, h = stage.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; fitRadius();
  }
  window.addEventListener("resize", resize);
  resize();

  // position de la caméra « dans » l'écran (l'écran couvre toute la vue)
  const screenWorld = new THREE.Vector3(), screenNormal = new THREE.Vector3();
  function diveTarget(out) {
    screen.updateWorldMatrix(true, false);
    screen.getWorldPosition(screenWorld);
    screenNormal.set(0, 0, 1).transformDirection(screen.matrixWorld);
    const half = THREE.MathUtils.degToRad(camera.fov / 2);
    const dH = (SH / 2) / Math.tan(half), dW = (SW / 2) / (Math.tan(half) * camera.aspect);
    const d = Math.min(dH, dW) * 0.86;
    out.copy(screenWorld).addScaledVector(screenNormal, d);
    return out;
  }

  /* ---------------------------------------------------------------- animations ponctuelles */
  const tweens = [];
  const tween = (dur, fn, done) => { tweens.push({ t0: performance.now(), dur, fn, done }); };
  const easeIO = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  function bounce(obj, amount) {
    if (STILL) return;
    const base = obj.userData.baseScale || (obj.userData.baseScale = obj.scale.clone());
    const a = amount || 0.14;
    tween(650, (p) => {
      const s = Math.sin(p * Math.PI * 3) * (1 - p) * a;
      obj.scale.set(base.x * (1 - s * 0.6), base.y * (1 + s), base.z * (1 - s * 0.6));
    }, () => obj.scale.copy(base));
  }
  let ledBoost = 0, steamT = -10, typingT = -10, plantKick = 0;
  const sound = (n) => { try { OS().sound(n); } catch (e) { /* rien */ } };

  function act(obj, ev) {
    const k = obj.userData.kind;
    if (k === "screen") { dive(); return; }
    bounce(obj);
    if (k === "window") { sound("blip"); window.AnasOS && window.AnasOS.toggleTheme ? window.AnasOS.toggleTheme() : (html.dataset.theme = html.dataset.theme === "day" ? "night" : "day"); }
    else if (k === "lamp") { sound("click"); lampOn = !lampOn; from.lamp = cur.lamp; to.lamp = lampOn ? 1 : 0; ["bg", "hemiSky", "hemiGround", "sunC"].forEach((n) => { from[n] = cur[n].clone(); }); ["hemiI", "sunI", "glow", "exposure"].forEach((n) => { from[n] = cur[n]; }); lightT = 0; }
    else if (k === "router") { sound("ping"); ledBoost = 1; bubble(ev, FR ? "ping 10.0.0.1 : réponse en 1 ms" : "ping 10.0.0.1: reply in 1 ms"); }
    else if (k === "mug") { sound("blip"); steamT = performance.now(); bubble(ev, FR ? "Café chaud, prêt pour le TD" : "Hot coffee, ready for class"); }
    else if (k === "plant") { sound("blip"); plantKick = 1; }
    else if (k === "tower") { sound("boot"); typedAt = performance.now(); typed = ""; bubble(ev, FR ? "Redémarrage..." : "Restarting..."); }
    else if (k === "chair") { sound("whoosh"); const r0 = chair.rotation.y; tween(1100, (p) => { chair.rotation.y = r0 + easeIO(p) * Math.PI * 2; }); }
    else if (k === "keyboard") { sound("key"); typingT = performance.now(); typed = (typed + "abcdefghijklmnopqrstuvwxyz"[(Math.random() * 26) | 0]).slice(-6); }
    else if (k === "poster") { sound("blip"); bubble(ev, FR ? "Mon réseau : 2 VLAN, 7 projets" : "My network: 2 VLANs, 7 projects"); }
    else if (k === "books") { sound("blip"); bubble(ev, FR ? "Réseaux, Linux, sécurité" : "Networks, Linux, security"); }
    else sound("click");
  }

  /* ---------------------------------------------------------------- interface par-dessus la 3D */
  const tip = stage.querySelector(".stage__tip");
  const bubbleEl = stage.querySelector(".stage__bubble");
  let bubbleTimer = 0;
  function bubble(ev, text) {
    if (!bubbleEl) return;
    bubbleEl.textContent = text;
    bubbleEl.style.left = (ev ? ev.clientX : window.innerWidth / 2) + "px";
    bubbleEl.style.top = (ev ? ev.clientY : window.innerHeight / 2) + "px";
    bubbleEl.classList.remove("is-on"); void bubbleEl.offsetWidth; bubbleEl.classList.add("is-on");
    clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => bubbleEl.classList.remove("is-on"), 1800);
  }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hovered = null, down = null, dragging = false, mode = "idle"; // idle | diving | inside | leaving
  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(interactive, true)[0];
    if (!hit) return null;
    let o = hit.object;
    while (o && !o.userData.kind) o = o.parent;
    return o;
  }
  canvas.addEventListener("pointermove", (ev) => {
    if (mode !== "idle") return;
    const r = canvas.getBoundingClientRect();
    parX = ((ev.clientX - r.left) / r.width) * 2 - 1;
    parY = ((ev.clientY - r.top) / r.height) * 2 - 1;
    if (down) {
      const dx = ev.clientX - down.x;
      if (Math.abs(dx) > 6 || Math.abs(ev.clientY - down.y) > 6) dragging = true;
      if (dragging) { rotYTarget = THREE.MathUtils.clamp(down.rot + dx * 0.006, -0.75, 0.75); canvas.style.cursor = "grabbing"; }
      return;
    }
    if (ev.pointerType === "touch") return;
    const o = pick(ev);
    if (o !== hovered) {
      hovered = o;
      hoverScreen = !!o && o.userData.kind === "screen";
      canvas.style.cursor = o ? "pointer" : "grab";
      if (tip) { tip.textContent = o ? o.userData.label : ""; tip.classList.toggle("is-on", !!o); }
      if (o && o.userData.kind !== "screen") sound("tick");
    }
    if (tip && hovered) { tip.style.left = ev.clientX + "px"; tip.style.top = ev.clientY + "px"; }
  });
  canvas.addEventListener("pointerdown", (ev) => {
    if (mode !== "idle") return;
    down = { x: ev.clientX, y: ev.clientY, rot: rotYTarget }; dragging = false;
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener("pointerup", (ev) => {
    if (mode !== "idle" || !down) return;
    const wasDrag = dragging; down = null; dragging = false;
    canvas.style.cursor = hovered ? "pointer" : "grab";
    if (wasDrag) return;
    const o = pick(ev);
    if (o) act(o, ev);
  });
  canvas.addEventListener("pointerleave", () => { parX = 0; parY = 0; if (tip) tip.classList.remove("is-on"); hovered = null; hoverScreen = false; });

  const enterBtn = stage.querySelector(".enter");
  if (enterBtn) enterBtn.addEventListener("click", () => dive());
  const skip = stage.querySelector(".stage__skip");
  if (skip) skip.addEventListener("click", (e) => { e.preventDefault(); sound("click"); finishDive(true); });

  /* ---------------------------------------------------------------- plongée dans l'écran */
  const diveFrom = new THREE.Vector3(), diveTo = new THREE.Vector3(), lookFrom = new THREE.Vector3(), lookTo = new THREE.Vector3();
  function dive() {
    if (mode !== "idle") return;
    mode = "diving";
    if (tip) tip.classList.remove("is-on");
    stage.classList.add("is-diving");
    sound("whoosh");
    if (STILL) { finishDive(false); return; }
    rotYTarget = rotY; // on fige la rotation
    diveFrom.copy(camera.position); lookFrom.copy(lookAt);
    diveTo.copy(diveTarget(new THREE.Vector3())); lookTo.copy(screenWorld);
    screenMode = "boot";
    const D = 1700;
    let osShown = false;
    tween(D, (p) => {
      const e = easeIO(p);
      camera.position.lerpVectors(diveFrom, diveTo, e);
      lookAt.lerpVectors(lookFrom, lookTo, Math.min(1, e * 1.25));
      if (p > 0.42) { screenMode = "dive"; diveP = (p - 0.42) / 0.58; }
      if (p > 0.86 && !osShown) { osShown = true; finishDive(false); }
    });
  }
  function finishDive(instant) {
    mode = "inside";
    html.classList.remove("is-stage");
    stage.classList.add("is-out");
    try { sessionStorage.setItem("aa-inside", "1"); } catch (e) { /* rien */ }
    OS().enter({ fromScreen: !instant });
    setTimeout(() => { if (mode === "inside") { stage.hidden = true; stage.classList.remove("is-diving"); } }, 650);
  }
  // retour au bureau 3D depuis l'OS (menu « Sortir du PC »)
  function leaveAnim() {
    stage.hidden = false;
    html.classList.add("is-stage");
    stage.classList.remove("is-out", "is-diving");
    mode = "leaving";
    screenMode = "dive"; diveP = 1;
    const back = restPose(new THREE.Vector3());
    if (!camera.position.lengthSq() || STILL) { camera.position.copy(back); lookAt.copy(target); mode = "idle"; screenMode = "boot"; typedAt = performance.now(); return; }
    diveFrom.copy(diveTarget(new THREE.Vector3())); lookFrom.copy(screenWorld);
    camera.position.copy(diveFrom); lookAt.copy(lookFrom);
    tween(1500, (p) => {
      const e = easeIO(p);
      camera.position.lerpVectors(diveFrom, restPose(diveTo), e);
      lookAt.lerpVectors(lookFrom, target, e);
      if (p > 0.3 && screenMode === "dive") { screenMode = "boot"; typedAt = performance.now() - 4000; }
    }, () => { mode = "idle"; });
  }
  window.addEventListener("anasos:leave", leaveAnim);

  /* ---------------------------------------------------------------- boucle */
  const clock = new THREE.Clock();
  restPose(camPos); camera.position.copy(camPos); camera.lookAt(lookAt);
  let lastScreen = 0, running = true;
  const pk = { t: 0 };
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (mode === "inside" || document.hidden) return;
    const dt = Math.min(0.05, clock.getDelta());
    const t = now / 1000;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i], p = Math.min(1, (now - tw.t0) / tw.dur);
      tw.fn(p);
      if (p >= 1) { tweens.splice(i, 1); tw.done && tw.done(); }
    }
    if (lightT < 1) { lightT = Math.min(1, lightT + dt / 0.8); applyLight(lightT); }
    if (mode === "idle") {
      pX += (parX - pX) * 0.05; pY += (parY - pY) * 0.05;
      rotY += (rotYTarget - rotY) * 0.12;
      if (!down && !STILL) rotYTarget *= 0.995; // le diorama revient doucement
      room.rotation.y = rotY;
      restPose(camPos);
      if (!STILL) camPos.y += Math.sin(t * 0.6) * 0.04;
      camera.position.lerp(camPos, 0.08);
      lookAt.lerp(target, 0.1);
    }
    camera.lookAt(lookAt);
    if (!STILL) {
      // LED du routeur, paquet sur le câble, plante, vapeur, touches
      ledBoost = Math.max(0, ledBoost - dt * 0.6);
      leds.forEach((l, i) => { const on = Math.sin(t * (ledBoost > 0 ? 30 : 3 + i * 1.7) + i * 2.1) > -0.2; l.material.emissiveIntensity = on ? 1.8 : 0.15; });
      pk.t = (pk.t + dt * 0.28) % 1;
      packet.position.copy(cablePath.getPointAt(1 - pk.t));
      plantKick = Math.max(0, plantKick - dt * 0.9);
      plant.rotation.z = Math.sin(t * 1.1) * 0.015 + Math.sin(t * 14) * plantKick * 0.12;
      const st = (now - steamT) / 1000;
      steam.forEach((s, i) => {
        const ph = ((t * 0.5 + i / 3) % 1);
        const boost = st < 2.5 ? 1 : 0.45;
        s.position.set(Math.sin(ph * 6 + i) * 0.02, 0.17 + ph * 0.3, 0);
        s.scale.setScalar(0.6 + ph * 1.6);
        s.material.opacity = (1 - ph) * 0.35 * boost * (html.dataset.theme === "night" ? 0.6 : 1);
      });
      const ty = (now - typingT) / 1000;
      if (ty < 0.5) {
        const which = Math.floor(ty * 30) % 60;
        for (let i = 0; i < 60; i++) {
          const b = keyBase[i]; dummy.position.set(b.x, b.y - (i === which || i === (which * 7) % 60 ? 0.012 : 0), b.z); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); keys.setMatrixAt(i, dummy.matrix);
        }
        keys.instanceMatrix.needsUpdate = true;
      }
    }
    if (now - lastScreen > 60 || screenMode === "dive") { lastScreen = now; drawScreen(now); }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  // la scène est prête : on retire l'écran de chargement
  stage.classList.add("is-ready");
  window.dispatchEvent(new CustomEvent("anasos:stage-ready"));
  window.__pc3d = { dive, scene, camera };
  if (fromInside) leaveAnim();
}
