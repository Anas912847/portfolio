/* Anas OS : le bureau dans lequel on arrive après avoir plongé dans l'écran du PC.
   Fenêtres déplaçables, terminal, sons synthétisés (coupés par défaut), jour / nuit.
   Sans JavaScript, le contenu reste une page normale. */
(() => {
  "use strict";
  const html = document.documentElement;
  const FR = html.lang !== "en";
  const STILL = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const HOME = html.dataset.page === "home";
  const store = (name) => ({
    get: (k) => { try { return window[name].getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { window[name].setItem(k, v); } catch (e) { /* stockage indisponible */ } },
  });
  const LS = store("localStorage"), SS = store("sessionStorage");
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

  /* ------------------------------------------------------------ sons (Web Audio, rien à télécharger) */
  const Sound = (() => {
    let ctx = null, on = LS.get("aa-sound") === "on";
    const ac = () => {
      if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    };
    function tone(c, f, d, type, vol, f2, delay) {
      const t = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.02);
    }
    function noise(c, d, vol, f1, f2) {
      const t = c.currentTime, n = Math.floor(c.sampleRate * d);
      const buf = c.createBuffer(1, n, c.sampleRate), data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf; f.type = "bandpass"; f.Q.value = 1.2;
      f.frequency.setValueAtTime(f1, t); f.frequency.exponentialRampToValueAtTime(f2 || f1, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + d * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      src.connect(f).connect(g).connect(c.destination); src.start(t);
    }
    const lib = {
      tick: (c) => tone(c, 2200, 0.02, "square", 0.012),
      click: (c) => tone(c, 1500, 0.035, "square", 0.04),
      key: (c) => noise(c, 0.035, 0.08, 3200, 1800),
      blip: (c) => tone(c, 660, 0.09, "sine", 0.1, 990),
      open: (c) => tone(c, 520, 0.11, "triangle", 0.1, 880),
      close: (c) => tone(c, 760, 0.1, "triangle", 0.08, 380),
      min: (c) => tone(c, 600, 0.12, "sine", 0.07, 300),
      error: (c) => tone(c, 200, 0.2, "square", 0.05, 150),
      ping: (c) => { tone(c, 1320, 0.12, "sine", 0.1); tone(c, 1320, 0.12, "sine", 0.06, null, 0.17); },
      boot: (c) => [523, 659, 784, 1047].forEach((f, i) => tone(c, f, 0.28, "triangle", 0.07, null, i * 0.11)),
      whoosh: (c) => noise(c, 1.1, 0.16, 250, 3200),
    };
    return {
      play(n) { if (!on || !lib[n]) return; const c = ac(); if (c) lib[n](c); },
      get on() { return on; },
      set(v) { on = v; LS.set("aa-sound", v ? "on" : "off"); if (v) { ac(); lib.blip(ctx); } syncSound(); },
    };
  })();
  function syncSound() {
    $$(".sound-btn").forEach((b) => {
      b.hidden = false;
      b.setAttribute("aria-pressed", String(Sound.on));
      const l = Sound.on ? b.dataset.on : b.dataset.off;
      b.setAttribute("aria-label", l); b.setAttribute("title", l);
      b.classList.toggle("is-on", Sound.on);
    });
  }
  syncSound();
  $$(".sound-btn").forEach((b) => b.addEventListener("click", () => Sound.set(!Sound.on)));

  /* ------------------------------------------------------------ e-mail (anti-spam) */
  const rev = (s) => s.split("").reverse().join("");
  $$(".js-mail").forEach((el) => {
    const addr = rev(el.dataset.u || "") + "@" + rev(el.dataset.d || "");
    const subject = el.dataset.subject ? "?subject=" + encodeURIComponent(el.dataset.subject) : "";
    el.setAttribute("href", "mailto:" + addr + subject);
    if (el.classList.contains("js-mail-text")) el.textContent = addr;
  });

  /* ------------------------------------------------------------ jour / nuit */
  const meta = $('meta[name="theme-color"]');
  function syncTheme() {
    $$(".theme-btn").forEach((b) => {
      b.hidden = false;
      const l = html.dataset.theme === "night" ? b.dataset.toDay : b.dataset.toNight;
      b.setAttribute("aria-label", l); b.setAttribute("title", l);
    });
  }
  function toggleTheme() {
    const next = html.dataset.theme === "night" ? "day" : "night";
    const apply = () => {
      html.dataset.theme = next;
      LS.set("aa-theme", next);
      if (meta) meta.setAttribute("content", next === "day" ? "#E3E6E3" : "#0E1C22");
      syncTheme();
      Wall.swap();
    };
    Sound.play("blip");
    // dans la scène 3D, c'est l'éclairage qui change (géré par pc3d.js) : pas de balayage
    if (STILL || !document.startViewTransition || html.classList.contains("is-stage")) { apply(); return; }
    html.classList.add("theme-swap");
    const vt = document.startViewTransition(apply);
    vt.finished.finally(() => html.classList.remove("theme-swap"));
  }
  syncTheme();
  $$(".theme-btn").forEach((b) => b.addEventListener("click", toggleTheme));

  /* ------------------------------------------------------------ horloge */
  const clocks = $$(".tray__clock");
  const tick = () => {
    const d = new Date();
    const s = d.toLocaleTimeString(FR ? "fr-FR" : "en-GB", { hour: "2-digit", minute: "2-digit" });
    clocks.forEach((c) => { c.textContent = s; c.setAttribute("datetime", d.toISOString()); });
  };
  tick(); setInterval(tick, 15000);

  /* ------------------------------------------------------------ fond d'écran vidéo (le réseau en 3D) */
  const Wall = (() => {
    const box = $(".os__wall");
    const noop = { start() {}, swap() {}, pause() {} };
    const saveData = navigator.connection && navigator.connection.saveData;
    if (!box || STILL || saveData || !HOME) return noop;
    const probe = document.createElement("video");
    const ext = probe.canPlayType('video/webm; codecs="vp9"') ? "webm" : probe.canPlayType("video/mp4") ? "mp4" : "";
    if (!ext) return noop;
    const w = window.innerWidth * Math.min(2, window.devicePixelRatio || 1) > 1400 ? 1600 : 960;
    let v = null;
    const src = () => `/assets/video/net-${html.dataset.theme}-loop-${w}.${ext}`;
    function start() {
      if (!v) {
        v = document.createElement("video");
        v.className = "os__video"; v.muted = true; v.loop = true; v.playsInline = true;
        v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
        v.src = src(); box.appendChild(v);
        v.addEventListener("playing", () => v.classList.add("is-on"), { once: true });
      }
      v.play().catch(() => {});
    }
    function swap() { if (!v) return; const t = v.currentTime; v.src = src(); v.addEventListener("loadedmetadata", () => { try { v.currentTime = t; } catch (e) { /* rien */ } v.play().catch(() => {}); }, { once: true }); }
    function pause() { if (v) v.pause(); }
    document.addEventListener("visibilitychange", () => { if (!v) return; if (document.hidden) v.pause(); else if (html.classList.contains("is-inside")) v.play().catch(() => {}); });
    return { start, swap, pause };
  })();

  /* ------------------------------------------------------------ note d'information (aucun cookie) */
  const notice = $("#notice");
  function showNotice(delay) {
    if (!notice || LS.get("aa-notice-ok") === "1") return;
    setTimeout(() => { notice.hidden = false; requestAnimationFrame(() => notice.classList.add("is-on")); }, delay || 0);
  }
  const ok = $("#notice-ok");
  if (ok) ok.addEventListener("click", () => { notice.classList.remove("is-on"); LS.set("aa-notice-ok", "1"); Sound.play("close"); setTimeout(() => { notice.hidden = true; }, 250); });

  /* ------------------------------------------------------------ menu démarrer */
  const startBtn = $(".taskbar__start"), menu = $("#startmenu");
  function menuToggle(force) {
    if (!menu) return;
    const open = force != null ? force : menu.hidden;
    menu.hidden = !open;
    startBtn.setAttribute("aria-expanded", String(open));
    if (open) { Sound.play("tick"); const f = $("a, button", menu); if (f) f.focus(); }
  }
  if (startBtn) startBtn.addEventListener("click", (e) => { e.stopPropagation(); menuToggle(); });
  document.addEventListener("click", (e) => { if (menu && !menu.hidden && !menu.contains(e.target) && e.target !== startBtn) menuToggle(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu && !menu.hidden) { menuToggle(false); startBtn.focus(); } });

  // pages projet / légales : la fenêtre unique est déjà ouverte
  if (!HOME) {
    html.classList.add("is-inside");
    showNotice(2500);
    // morph de fenêtre vers une autre page projet (précédent / suivant)
    const vtOK = "onpagereveal" in window && !STILL;
    $$(".pnav__link").forEach((a) => a.addEventListener("click", () => Sound.play("open")));
    void vtOK;
    return;
  }

  /* ============================================================ BUREAU (accueil) */
  const desk = $(".os__desk");
  const wins = $$("[data-win]");
  const tabs = $(".taskbar__tabs");
  const leaveBtn = $("[data-leave]");
  let z = 20, booted = false;

  // les fenêtres passent en mode « bureau » (positionnées, cachées jusqu'à ouverture)
  wins.forEach((w) => { w.hidden = true; w.classList.add("is-floating"); });

  const winById = (id) => wins.find((w) => w.id === id);
  const small = () => window.innerWidth < 760;
  function place(w) {
    if (w.dataset.placed) return;
    const vw = desk.clientWidth, vh = desk.clientHeight;
    const ww = Math.min(w.offsetWidth, vw - 24), wh = Math.min(w.offsetHeight, vh - 24);
    const n = $$("[data-win]:not([hidden])").length;
    const k = (n % 5) - 2;
    w.style.left = clamp((vw - ww) / 2 + k * 32, 12, Math.max(12, vw - ww - 12)) + "px";
    w.style.top = clamp((vh - wh) / 2 + k * 26 - 10, 12, Math.max(12, vh - wh - 12)) + "px";
    w.dataset.placed = "1";
  }
  function focusWin(w) {
    wins.forEach((x) => x.classList.toggle("is-active", x === w));
    w.style.zIndex = String(++z);
    $$(".tab", tabs).forEach((t) => t.classList.toggle("is-active", t.dataset.tab === w.id));
  }
  function setHash(id) { try { history.replaceState(null, "", id ? "#" + id : window.location.pathname); } catch (e) { /* rien */ } }
  function animate(w, cls, from, done) {
    if (STILL) { done && done(); return; }
    if (from) {
      const r = from.getBoundingClientRect(), wr = w.getBoundingClientRect();
      w.style.transformOrigin = `${r.left + r.width / 2 - wr.left}px ${r.top + r.height / 2 - wr.top}px`;
    } else w.style.transformOrigin = "50% 50%";
    w.classList.add(cls);
    const end = () => { w.classList.remove(cls); w.removeEventListener("animationend", end); done && done(); };
    w.addEventListener("animationend", end);
    setTimeout(end, 500);
  }
  function addTab(w) {
    if ($(`.tab[data-tab="${w.id}"]`, tabs)) return;
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button"; b.className = "tab"; b.dataset.tab = w.id;
    const ico = $(".win__ico use", w);
    b.innerHTML = `<svg aria-hidden="true"><use href="${ico ? ico.getAttribute("href") : "#i-file"}"/></svg><span></span>`;
    b.querySelector("span").textContent = $(".win__title", w).textContent;
    b.addEventListener("click", () => {
      if (w.classList.contains("is-min")) restore(w, b);
      else if (w.classList.contains("is-active")) minimize(w);
      else focusWin(w);
    });
    li.appendChild(b); tabs.appendChild(li);
  }
  function removeTab(w) { const t = $(`.tab[data-tab="${w.id}"]`, tabs); if (t) t.parentNode.remove(); }

  function open(id, from) {
    const w = winById(id);
    if (!w) return false;
    menuToggle(false);
    if (!html.classList.contains("is-inside")) enter({ quiet: true });
    if (w.hidden) {
      w.hidden = false;
      if (small()) w.classList.add("is-max");
      place(w);
      addTab(w);
      focusWin(w);
      animate(w, "is-opening", from);
      Sound.play("open");
      if (w.id === "terminal") setTimeout(() => { const i = $(".term__in", w); if (i && !small()) i.focus(); }, 80);
    } else if (w.classList.contains("is-min")) restore(w);
    else { focusWin(w); animate(w, "is-nudge"); }
    setHash(id);
    if (w.id !== "terminal") w.focus({ preventScroll: true });
    return true;
  }
  function close(w) {
    Sound.play("close");
    animate(w, "is-closing", null, () => { w.hidden = true; w.classList.remove("is-min"); });
    removeTab(w);
    if (window.location.hash === "#" + w.id) setHash("");
    const rest = wins.filter((x) => !x.hidden && x !== w && !x.classList.contains("is-min")).sort((a, b) => +b.style.zIndex - +a.style.zIndex)[0];
    if (rest) focusWin(rest);
  }
  function minimize(w) {
    Sound.play("min");
    const t = $(`.tab[data-tab="${w.id}"]`, tabs);
    animate(w, "is-minimizing", t, () => w.classList.add("is-min"));
    w.classList.remove("is-active");
    if (t) t.classList.remove("is-active");
  }
  function restore(w, from) {
    w.classList.remove("is-min");
    focusWin(w);
    animate(w, "is-opening", from || $(`.tab[data-tab="${w.id}"]`, tabs));
    Sound.play("open");
  }
  function toggleMax(w) { if (small()) return; w.classList.toggle("is-max"); Sound.play("tick"); }

  wins.forEach((w) => {
    w.addEventListener("pointerdown", () => { if (!w.classList.contains("is-active")) focusWin(w); });
    $$(".win__btn", w).forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const a = b.dataset.act;
      if (a === "close") close(w); else if (a === "min") minimize(w); else if (a === "max") toggleMax(w);
    }));
    const bar = $(".win__bar", w);
    bar.addEventListener("dblclick", (e) => { if (!e.target.closest(".win__btn")) toggleMax(w); });
    // déplacement à la souris / au doigt
    let drag = null;
    bar.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest(".win__btn") || w.classList.contains("is-max") || small()) return;
      drag = { x: e.clientX, y: e.clientY, l: w.offsetLeft, t: w.offsetTop };
      bar.setPointerCapture(e.pointerId);
      w.classList.add("is-dragging");
    });
    bar.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const vw = desk.clientWidth, vh = desk.clientHeight;
      w.style.left = clamp(drag.l + e.clientX - drag.x, 80 - w.offsetWidth, vw - 80) + "px";
      w.style.top = clamp(drag.t + e.clientY - drag.y, 0, vh - 40) + "px";
    });
    const stop = () => { drag = null; w.classList.remove("is-dragging"); };
    bar.addEventListener("pointerup", stop); bar.addEventListener("pointercancel", stop);
    w.addEventListener("keydown", (e) => { if (e.key === "Escape" && !e.target.closest(".term__in")) { close(w); } });
  });

  // icônes, liens du menu, liens internes vers une fenêtre (#profil, #p-vote...)
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href], [data-open]");
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    let id = a.dataset.open;
    if (!id && a.getAttribute("href")) {
      const u = new URL(a.href, window.location.href);
      if (u.pathname === window.location.pathname && u.hash) id = decodeURIComponent(u.hash.slice(1));
    }
    if (!id || !winById(id)) return;
    e.preventDefault();
    if (a.classList.contains("icon")) { $$(".icon").forEach((i) => i.classList.toggle("is-selected", i === a)); }
    open(id, a);
  });
  window.addEventListener("hashchange", () => { const id = window.location.hash.slice(1); if (winById(id)) open(id); });

  // carte du réseau : survol = route orange
  const topo = $(".topo");
  if (topo) {
    const routes = {};
    $$(".route", topo).forEach((r) => { routes[r.dataset.route] = r; });
    $$(".node", topo).forEach((n) => {
      const on = (v) => { n.classList.toggle("is-on", v); const r = routes[n.dataset.node]; if (r) r.classList.toggle("is-on", v); if (v) Sound.play("tick"); };
      n.addEventListener("mouseenter", () => on(true)); n.addEventListener("mouseleave", () => on(false));
      n.addEventListener("focus", () => on(true)); n.addEventListener("blur", () => on(false));
    });
  }

  // fenêtre projet -> page complète : la fenêtre s'agrandit jusqu'à la page (View Transitions)
  const VT_DOC = "onpagereveal" in window && !STILL;
  $$("[data-page-link]").forEach((a) => a.addEventListener("click", (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey) return;
    Sound.play("open");
    if (!VT_DOC) return;
    wins.forEach((w) => { w.style.viewTransitionName = ""; });
    const w = a.closest("[data-win]");
    if (w) w.style.viewTransitionName = "pwin";
  }));
  window.addEventListener("pageshow", (e) => { if (e.persisted) wins.forEach((w) => { w.style.viewTransitionName = ""; }); });

  /* ------------------------------------------------------------ entrée / sortie du PC */
  function enter(opts) {
    opts = opts || {};
    html.classList.remove("is-stage");
    if (html.classList.contains("is-inside") && booted) return;
    html.classList.add("is-inside");
    SS.set("aa-inside", "1");
    Wall.start();
    if (!booted) {
      booted = true;
      $$(".icon").forEach((ic, i) => ic.style.setProperty("--i", i));
      html.classList.add("is-booting");
      setTimeout(() => html.classList.remove("is-booting"), 1400);
      if (!opts.quiet) Sound.play("boot");
    }
    const target = window.location.hash.slice(1);
    if (!opts.quiet) {
      if (winById(target)) setTimeout(() => open(target), 250);
      else if (!wins.some((w) => !w.hidden)) setTimeout(() => open("welcome"), opts.fromScreen ? 520 : 200);
    }
    showNotice(2600);
  }
  function leave() {
    menuToggle(false);
    if (!window.__pcAvailable) return;
    Sound.play("whoosh");
    html.classList.remove("is-inside");
    Wall.pause();
    SS.set("aa-inside", "");
    window.dispatchEvent(new CustomEvent("anasos:leave"));
  }
  if (leaveBtn) {
    const show = () => { leaveBtn.hidden = false; };
    if (window.__pcAvailable) show(); else window.addEventListener("anasos:pc-available", show);
    leaveBtn.addEventListener("click", leave);
  }

  /* ------------------------------------------------------------ terminal */
  const term = $("[data-term]");
  if (term) {
    const out = $(".term__out", term), input = $(".term__in", term), form = $(".term__form", term);
    const hist = []; let hi = 0;
    const projects = wins.filter((w) => w.classList.contains("win--project")).map((w) => ({
      id: w.id.slice(2), win: w.id, title: $(".win__title", w).textContent.trim(), ip: ($(".pw__ip strong", w) || {}).textContent || "",
    }));
    const TX = FR ? {
      help: [["help", "liste des commandes"], ["whoami", "qui suis-je"], ["ls", "fichiers du bureau"], ["ls projets", "liste des projets"], ["open <nom>", "ouvrir une fenêtre (ex. open vote)"],
        ["ping <ip>", "tester un hôte (ex. ping 10.0.20.11)"], ["nmap", "scanner le réseau"], ["ifconfig", "ma configuration"], ["contact", "me contacter"],
        ["theme jour|nuit", "changer l'ambiance"], ["sound on|off", "activer les sons"], ["lang en", "passer en anglais"], ["clear", "effacer"], ["exit", "sortir du PC"]],
      unknown: (c) => `${c} : commande introuvable. Tapez help.`,
      whoami: "Anas Azouaoui, étudiant en 2e année de BUT Informatique, parcours DACS, IUT de Montpellier-Sète. Objectif : réseau et cybersécurité.",
      noproj: (q) => `Aucun projet ne correspond à « ${q} ». Tapez ls projets.`,
      opening: (t) => `Ouverture de ${t}...`, pingFail: (ip) => `ping ${ip} : hôte injoignable.`,
      pingHead: (ip, name) => `PING ${ip} (${name})`, pingStats: "3 paquets envoyés, 3 reçus, 0 % de perte",
      nmap: "Scan de 10.0.0.0/16 en cours...", nmapDone: (n) => `${n + 1} hôtes actifs.`,
      sudo: "Bien essayé. Ici on fait de la sécurité défensive.", hack: "Accès refusé. Mais je peux vous expliquer comment on se protège de ça.",
      theme: "Ambiance changée.", sound: (on) => (on ? "Sons activés." : "Sons coupés."), leave: "Arrêt du système...", gateway: "passerelle",
      files: "bienvenue.txt  profil.txt  projets/  reseau.map  competences.csv  contact",
    } : {
      help: [["help", "list the commands"], ["whoami", "who am I"], ["ls", "desktop files"], ["ls projects", "list the projects"], ["open <name>", "open a window (e.g. open vote)"],
        ["ping <ip>", "test a host (e.g. ping 10.0.20.11)"], ["nmap", "scan the network"], ["ifconfig", "my configuration"], ["contact", "contact me"],
        ["theme day|night", "change the mood"], ["sound on|off", "turn sounds on"], ["lang fr", "switch to French"], ["clear", "clear"], ["exit", "leave the PC"]],
      unknown: (c) => `${c}: command not found. Type help.`,
      whoami: "Anas Azouaoui, 2nd-year computer science student (BUT Informatique, DACS track), IUT de Montpellier-Sète. Goal: networks and cybersecurity.",
      noproj: (q) => `No project matches "${q}". Type ls projects.`,
      opening: (t) => `Opening ${t}...`, pingFail: (ip) => `ping ${ip}: host unreachable.`,
      pingHead: (ip, name) => `PING ${ip} (${name})`, pingStats: "3 packets sent, 3 received, 0% loss",
      nmap: "Scanning 10.0.0.0/16...", nmapDone: (n) => `${n + 1} hosts up.`,
      sudo: "Nice try. This is a defensive security shop.", hack: "Access denied. But I can explain how to defend against that.",
      theme: "Mood changed.", sound: (on) => (on ? "Sounds on." : "Sounds off."), leave: "Shutting down...", gateway: "gateway",
      files: "welcome.txt  profile.txt  projects/  network.map  skills.csv  contact",
    };
    const say = (text, cls) => { const p = document.createElement("p"); if (cls) p.className = cls; p.textContent = text; out.appendChild(p); out.scrollTop = out.scrollHeight; return p; };
    const later = (lines, step) => lines.forEach((l, i) => setTimeout(() => { say(l[0], l[1]); if (i === 0 || l[2]) Sound.play(l[2] || "tick"); }, i * (step || 220)));
    const findProj = (q) => {
      const n = norm(q).replace(/^p-/, "");
      return projects.find((p) => p.id === n || p.ip === n) || projects.find((p) => norm(p.title).includes(n));
    };
    const winAlias = { bienvenue: "welcome", welcome: "welcome", profil: "profil", profile: "profil", projets: "projets", projects: "projets", reseau: "reseau", network: "reseau", competences: "competences", skills: "competences", contact: "contact", terminal: "terminal" };
    const cmds = {
      help() { TX.help.forEach(([c, d]) => say(`${c.padEnd(16, " ")} ${d}`)); },
      aide() { cmds.help(); },
      whoami() { say(TX.whoami); },
      ls(a) {
        if (a[0] && /^(projets|projects)\/?$/.test(norm(a[0]))) projects.forEach((p) => say(`${p.ip.padEnd(12, " ")} ${p.id.padEnd(13, " ")} ${p.title}`));
        else say(TX.files);
      },
      dir(a) { cmds.ls(a); },
      cat(a) { const k = norm(a[0] || "").replace(/\.(txt|csv|map)$/, ""); if (winAlias[k]) { say(TX.opening(k)); open(winAlias[k]); } else say(TX.unknown("cat " + (a[0] || ""))); },
      open(a) {
        const q = a.join(" ");
        if (!q) { say(TX.noproj("")); return; }
        const k = norm(q).replace(/\/$/, "");
        if (winAlias[k]) { say(TX.opening(k)); open(winAlias[k]); return; }
        const p = findProj(q);
        if (!p) { say(TX.noproj(q), "is-err"); Sound.play("error"); return; }
        say(TX.opening(p.title)); open(p.win);
      },
      ouvrir(a) { cmds.open(a); },
      cd(a) { cmds.open(a); },
      ping(a) {
        const ip = (a[0] || "10.0.0.1").trim();
        const p = projects.find((x) => x.ip === ip) || (ip === "10.0.0.1" ? { title: TX.gateway } : null) || findProj(ip);
        if (!p) { say(TX.pingFail(ip), "is-err"); Sound.play("error"); return; }
        const dst = p.ip || "10.0.0.1";
        later([[TX.pingHead(dst, p.title), null, "ping"], ...[1, 2, 3].map((s) => [`64 bytes from ${dst}: icmp_seq=${s} ttl=64 time=${(0.4 + Math.random()).toFixed(2)} ms`, null, "ping"]), [TX.pingStats, "is-ok"]], 380);
      },
      nmap() {
        later([[TX.nmap], ["10.0.0.1      " + TX.gateway, "is-ok"], ...projects.map((p) => [`${p.ip.padEnd(13, " ")} ${p.title}`, "is-ok"]), [TX.nmapDone(projects.length)]], 160);
      },
      ifconfig() { say("eth0   inet 10.0.20.42  netmask 255.255.255.0  gateway 10.0.0.1"); say("       ether 0a:a5:20:26:be:57  (portfolio)"); },
      ip(a) { cmds.ifconfig(a); },
      contact() { open("contact"); say(TX.opening("contact")); },
      theme(a) { const v = norm(a[0] || ""); const want = /^(jour|day|light|clair)$/.test(v) ? "day" : /^(nuit|night|dark|sombre)$/.test(v) ? "night" : null; if (!want || want !== html.dataset.theme) toggleTheme(); say(TX.theme); },
      sound(a) { const v = norm(a[0] || ""); Sound.set(v ? v === "on" : !Sound.on); say(TX.sound(Sound.on)); },
      son(a) { cmds.sound(a); },
      lang(a) { const v = norm(a[0] || (FR ? "en" : "fr")); const l = $(".lang__other"); if (l && v !== html.lang) window.location.href = l.href; },
      date() { say(new Date().toLocaleString(FR ? "fr-FR" : "en-GB")); },
      echo(a) { say(a.join(" ")); },
      history() { hist.forEach((h, i) => say(`${String(i + 1).padStart(3, " ")}  ${h}`)); },
      clear() { out.innerHTML = ""; },
      cls() { cmds.clear(); },
      sudo() { say(TX.sudo, "is-err"); Sound.play("error"); },
      hack() { say(TX.hack, "is-err"); Sound.play("error"); },
      exit() { say(TX.leave); setTimeout(() => (window.__pcAvailable ? leave() : close(winById("terminal"))), 500); },
      shutdown() { cmds.exit(); }, logout() { cmds.exit(); },
    };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const line = input.value.trim();
      input.value = "";
      say("anas@portfolio:~$ " + line, "is-cmd");
      if (!line) return;
      hist.push(line); hi = hist.length;
      const [c, ...args] = line.split(/\s+/);
      const fn = cmds[norm(c)];
      if (fn) fn(args); else { say(TX.unknown(c), "is-err"); Sound.play("error"); }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") { e.preventDefault(); hi = Math.max(0, hi - 1); input.value = hist[hi] || ""; }
      else if (e.key === "ArrowDown") { e.preventDefault(); hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ""; }
      else if (e.key === "Tab") {
        e.preventDefault();
        const parts = input.value.split(/\s+/), last = norm(parts[parts.length - 1] || "");
        const pool = parts.length > 1 ? projects.map((p) => p.id).concat(Object.keys(winAlias)) : Object.keys(cmds);
        const m = pool.filter((x) => x.startsWith(last));
        if (m.length === 1) { parts[parts.length - 1] = m[0]; input.value = parts.join(" ") + " "; }
        else if (m.length > 1) say(m.join("  "));
      } else if (e.key.length === 1) Sound.play("key");
    });
    term.addEventListener("click", () => { if (!window.getSelection().toString()) input.focus(); });
  }

  /* ------------------------------------------------------------ démarrage */
  window.AnasOS = { enter, leave, open, toggleTheme, sound: (n) => Sound.play(n), ready: true };
  window.dispatchEvent(new CustomEvent("anasos:ready"));
  if (!html.classList.contains("is-stage")) enter({ quiet: false, direct: true });
  // filet de sécurité : si la 3D ne démarre pas (module bloqué), on ouvre le bureau
  else setTimeout(() => { if (!window.__pcStarted && html.classList.contains("is-stage")) { const st = $("#stage"); if (st) st.hidden = true; enter({}); } }, 7000);
})();
