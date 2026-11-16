// Texfinity website sound effects: the same clean, digital sounds as the app, made live with the
// Web Audio API (no sound files). Nothing plays before your first click or key press, and the
// speaker button in the top bar turns them off (remembered in this browser).
(() => {
  const KEY = 'tfSiteSfx';
  let on = true;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch { /* storage off */ }
  let ctx = null; let master = null; let noiseBuf = null; let armed = false;

  function audio() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC({ latencyHint: 'interactive' });
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6; comp.attack.value = 0.002; comp.release.value = 0.12;
    master = ctx.createGain(); master.gain.value = 0.8;
    master.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  function tone(c, at, { f, to = f, type = 'sine', dur = 0.05, vol = 0.15, attack = 0.002 }) {
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, at);
    if (to !== f) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + dur);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + attack); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(master); o.start(at); o.stop(at + dur + 0.02);
  }
  function noise(c, at, { f0 = 800, f1 = f0, q = 1, type = 'bandpass', dur = 0.2, vol = 0.15, attack = 0.04 }) {
    const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const flt = c.createBiquadFilter(); flt.type = type; flt.Q.value = q;
    flt.frequency.setValueAtTime(f0, at); flt.frequency.exponentialRampToValueAtTime(Math.max(30, f1), at + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + Math.min(attack, dur * 0.8)); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(flt).connect(g).connect(master); s.start(at, Math.random() * 0.5); s.stop(at + dur + 0.02);
  }
  const jitter = (f, amt = 0.04) => f * (1 + (Math.random() * 2 - 1) * amt);

  const SOUNDS = {
    hover: { gap: 45, play: (c, t) => tone(c, t, { f: jitter(3400, 0.05), dur: 0.016, vol: 0.03 }) },
    click: { gap: 25, play: (c, t) => { tone(c, t, { f: jitter(1900), to: 1500, dur: 0.035, vol: 0.13 }); noise(c, t, { f0: 6000, type: 'highpass', dur: 0.012, vol: 0.05, attack: 0.001 }); } },
    clickMain: { gap: 25, play: (c, t) => { tone(c, t, { f: 1250, to: 1050, dur: 0.06, vol: 0.13 }); tone(c, t, { f: 2500, to: 2100, dur: 0.04, vol: 0.05 }); noise(c, t, { f0: 6000, type: 'highpass', dur: 0.012, vol: 0.05, attack: 0.001 }); } },
    pop: { gap: 40, play: (c, t) => tone(c, t, { f: 520, to: 1250, dur: 0.07, vol: 0.13 }) },
    on: { gap: 40, play: (c, t) => { tone(c, t, { f: 880, dur: 0.05, vol: 0.12 }); tone(c, t + 0.045, { f: 1320, dur: 0.08, vol: 0.12 }); } },
    off: { gap: 40, play: (c, t) => { tone(c, t, { f: 1320, dur: 0.05, vol: 0.11 }); tone(c, t + 0.045, { f: 880, dur: 0.08, vol: 0.1 }); } },
    page: { gap: 90, play: (c, t) => noise(c, t, { f0: 900, f1: 1700, q: 3, dur: 0.12, vol: 0.06, attack: 0.05 }) },
    open: { gap: 90, play: (c, t) => { noise(c, t, { f0: 350, f1: 2600, q: 1.4, dur: 0.24, vol: 0.13, attack: 0.12 }); tone(c, t + 0.16, { f: 1760, dur: 0.05, vol: 0.04 }); } },
    close: { gap: 90, play: (c, t) => noise(c, t, { f0: 2400, f1: 320, q: 1.4, dur: 0.17, vol: 0.1, attack: 0.03 }) },
    note: { gap: 150, play: (c, t) => { tone(c, t, { f: 1175, dur: 0.18, vol: 0.08 }); tone(c, t + 0.06, { f: 1568, dur: 0.22, vol: 0.07 }); } },
    cart: { gap: 150, play: (c, t) => { tone(c, t, { f: 1568, dur: 0.4, vol: 0.1, attack: 0.004 }); tone(c, t + 0.07, { f: 2093, dur: 0.45, vol: 0.08, attack: 0.004 }); } },
    type: { gap: 22, play: (c, t) => tone(c, t, { f: jitter(2100, 0.08), type: 'triangle', dur: 0.014, vol: 0.035 }) },
  };
  const last = {};
  function play(name, force = false) {
    const s = SOUNDS[name];
    if (!s || (!force && (!on || !armed)) || document.hidden) return;
    const now = performance.now();
    if (now - (last[name] || 0) < s.gap) return;
    last[name] = now;
    const c = audio(); if (!c) return;
    if (c.state === 'suspended') c.resume();
    s.play(c, c.currentTime + 0.005);
  }
  window.tfSfx = play;

  // Nothing plays until you interact (browsers require it anyway).
  const arm = () => { armed = true; audio()?.resume?.(); };
  addEventListener('pointerdown', arm, { capture: true, once: true });
  addEventListener('keydown', arm, { capture: true, once: true });

  // ---------- what makes a sound ----------
  const HOVERABLE = 'a, button, .tile, .fcard, .plan, .mh, summary, [data-add], .cart-btn, label';
  let lastHover = null;
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest?.(HOVERABLE);
    if (el && el !== lastHover && !el.disabled) { lastHover = el; play('hover'); }
    if (!el) lastHover = null;
  });
  document.addEventListener('click', (e) => {
    const el = e.target.closest?.('a, button, summary, input[type=checkbox], [role=button]');
    if (!el) return;
    if (el.matches('input[type=checkbox]')) return play(el.checked ? 'on' : 'off');
    if (el.disabled) return;
    if (el.id === 'tfSfxBtn') return;
    if (el.matches('[data-add]')) return play('cart');
    if (el.matches('.btn-primary, .btn-get, #payBtn, #kofiOk')) return play('clickMain');
    if (el.matches('[data-rm]')) return play('close');
    play('click');
  }, true);
  document.addEventListener('input', (e) => { if (e.target.matches?.('input[type=text], input[type=email], input:not([type]), textarea')) play('type'); }, true);
  addEventListener('hashchange', () => play('page'));

  // Pop-ups and messages: the Ko-fi steps, the mobile menu, the little toast.
  new MutationObserver((list) => {
    for (const m of list) {
      for (const n of m.addedNodes) if (n.nodeType === 1 && n.matches?.('.kofi-modal')) play('open');
      for (const n of m.removedNodes) if (n.nodeType === 1 && n.matches?.('.kofi-modal')) play('close');
      if (m.type === 'attributes' && m.target.id === 'toast' && m.target.classList.contains('show')) play('note');
      if (m.type === 'attributes' && m.target.id === 'mobmenu') play(m.target.classList.contains('open') ? 'open' : 'close');
    }
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  // ---------- the speaker button in the top bar ----------
  function addButton() {
    const right = document.querySelector('.nav-right');
    if (!right || document.getElementById('tfSfxBtn')) return;
    const b = document.createElement('button');
    b.id = 'tfSfxBtn'; b.type = 'button'; b.className = 'cart-btn sfx-btn';
    const draw = () => {
      b.setAttribute('aria-label', on ? 'Sounds on (click to mute)' : 'Sounds off (click to turn on)');
      b.setAttribute('aria-pressed', String(on));
      b.title = on ? 'Mute sounds' : 'Turn sounds on';
      b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/>${on ? '<path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>' : '<path d="M17 9l5 6M22 9l-5 6"/>'}</svg>`;
    };
    draw();
    b.addEventListener('click', () => {
      on = !on;
      try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* storage off */ }
      draw();
      play(on ? 'on' : 'off', true);
    });
    right.insertBefore(b, right.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton); else addButton();
})();
