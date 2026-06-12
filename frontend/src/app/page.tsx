'use client';

import { useEffect } from 'react';

import { PageBackground } from '@/components/PageBackground';
import { Logo } from '@/components/Logo';

export default function LandingPage() {
  useEffect(() => {
    // Populate AR text slots
    document.querySelectorAll<HTMLElement>('.lp-reveal').forEach(el => {
      const ar = el.dataset.ar;
      const arSlot = el.querySelector<HTMLElement>('.lp-ar');
      if (arSlot && ar) arSlot.textContent = ar;
    });

    // Language toggle
    let isArMode = false;
    const langToggle = document.getElementById('lp-lang-toggle');
    const langActiveLabel = document.getElementById('lp-lang-active-label');
    const langOtherLabel = document.getElementById('lp-lang-other-label');
    function toggleLang() {
      isArMode = !isArMode;
      if (isArMode) {
        document.body.classList.add('lp-ar-mode');
        if (langActiveLabel) langActiveLabel.textContent = 'AR';
        if (langOtherLabel) langOtherLabel.textContent = 'EN';
      } else {
        document.body.classList.remove('lp-ar-mode');
        if (langActiveLabel) langActiveLabel.textContent = 'EN';
        if (langOtherLabel) langOtherLabel.textContent = 'AR';
      }
    }
    langToggle?.addEventListener('click', toggleLang);

    // Lens
    let lensOn = false;
    let lx = -1000, ly = -1000;
    const LENS_LERP = 0.10;
    const LENS_R = 130; // half of 260px lens
    const lensEl = document.getElementById('lp-lens');
    const lensBtnEl = document.getElementById('lp-lens-btn');
    function toggleLens() {
      lensOn = !lensOn;
      if (lensOn && hasMoved) { lx = mx; ly = my; }
      if (lensEl) lensEl.dataset.on = lensOn ? '1' : '0';
      if (lensBtnEl) lensBtnEl.dataset.on = lensOn ? '1' : '0';
      if (!lensOn) {
        // Clean up: hide all CA overlays, clear language masks, clear stale lens position
        document.querySelectorAll<HTMLElement>('.lp-reveal, .lp-nav-link').forEach(el => {
          el.style.setProperty('--ca-r', '0px');
        });
        document.querySelectorAll<HTMLElement>('.lp-reveal > .lp-en, .lp-reveal > .lp-ar').forEach(el => {
          el.style.maskImage = '';
          el.style.webkitMaskImage = '';
        });
        if (lensEl) { lensEl.style.left = ''; lensEl.style.top = ''; }
      }
    }
    lensBtnEl?.addEventListener('click', toggleLens);

    // Track mouse position (used to set lens position on toggle-on)
    let mx = -2000, my = -2000, hasMoved = false;
    let rafId = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      if (!hasMoved) hasMoved = true;
    };
    window.addEventListener('mousemove', onMove);

    // Build chromatic-aberration overlays. For .lp-reveal we make TWO overlays — one cloning the EN
    // text and one with the AR translation (from data-ar). CSS picks which to show based on current
    // language mode: in EN mode the AR overlay is the "reveal" (so hovering shows the translation),
    // and vice versa. For .lp-nav-link we make one EN overlay (no translation).
    function makeOverlay(extraClass: string, html: string) {
      const overlay = document.createElement('span');
      overlay.className = `lp-ca-overlay ${extraClass}`;
      overlay.setAttribute('aria-hidden', 'true');
      overlay.innerHTML = html;
      return overlay;
    }
    document.querySelectorAll<HTMLElement>('.lp-reveal').forEach(host => {
      const cs = getComputedStyle(host);
      if (cs.position === 'static') host.style.position = 'relative';
      const en = host.querySelector<HTMLElement>(':scope > .lp-en');
      const arText = host.dataset.ar || '';
      if (!host.querySelector(':scope > .lp-ca-en')) {
        host.appendChild(makeOverlay('lp-ca-en', en ? en.innerHTML : (host.textContent || '')));
      }
      if (arText && !host.querySelector(':scope > .lp-ca-ar')) {
        host.appendChild(makeOverlay('lp-ca-ar', arText));
      }
    });
    document.querySelectorAll<HTMLElement>('.lp-nav-link').forEach(host => {
      if (host.querySelector(':scope > .lp-ca-overlay')) return;
      const cs = getComputedStyle(host);
      if (cs.position === 'static') host.style.position = 'relative';
      // Clone innerHTML without any prior overlay
      const tmp = host.cloneNode(true) as HTMLElement;
      tmp.querySelectorAll('.lp-ca-overlay').forEach(o => o.remove());
      host.appendChild(makeOverlay('lp-ca-en', tmp.innerHTML));
    });

    // One-time cleanup of stale inline styles left by the old AR-reveal logic (HMR safety).
    function clearStyle(s: CSSStyleDeclaration, props: string[]) {
      props.forEach(p => s.removeProperty(p));
    }
    document.querySelectorAll<HTMLElement>('.lp-reveal').forEach(host => {
      const ar = host.querySelector<HTMLElement>('.lp-ar');
      const en = host.querySelector<HTMLElement>('.lp-en');
      if (en) clearStyle(en.style, ['mask-image', '-webkit-mask-image', 'clip-path', '-webkit-clip-path', 'opacity']);
      if (ar) clearStyle(ar.style, ['mask-image', '-webkit-mask-image', 'clip-path', '-webkit-clip-path', 'opacity']);
    });

    function frame() {
      if (lensEl && lensOn) {
        lx += (mx - lx) * LENS_LERP;
        ly += (my - ly) * LENS_LERP;
        lensEl.style.left = lx + 'px';
        lensEl.style.top = ly + 'px';

        // .lp-reveal: update clip-path vars AND mask the currently-visible language inside
        // the lens circle so the opposite-language CA overlay shows through (translation reveal).
        document.querySelectorAll<HTMLElement>('.lp-reveal').forEach(el => {
          const r = el.getBoundingClientRect();
          const cx = lx - r.left;
          const cy = ly - r.top;
          const nx = Math.max(0, Math.min(cx, r.width));
          const ny = Math.max(0, Math.min(cy, r.height));
          const dist = Math.hypot(cx - nx, cy - ny);
          const overlapping = dist < LENS_R;

          el.style.setProperty('--ca-x', cx + 'px');
          el.style.setProperty('--ca-y', cy + 'px');
          el.style.setProperty('--ca-r', overlapping ? LENS_R + 'px' : '0px');

          // The currently-visible original gets a circular hole so the CA overlay (other language) shows through.
          const en = el.querySelector<HTMLElement>(':scope > .lp-en');
          const ar = el.querySelector<HTMLElement>(':scope > .lp-ar');
          const visibleOriginal = isArMode ? ar : en;
          const hiddenOriginal = isArMode ? en : ar;
          if (hiddenOriginal) { hiddenOriginal.style.maskImage = ''; hiddenOriginal.style.webkitMaskImage = ''; }
          if (visibleOriginal) {
            if (overlapping) {
              const mask = `radial-gradient(circle ${LENS_R}px at ${cx}px ${cy}px, transparent 96%, #000 100%)`;
              visibleOriginal.style.maskImage = mask;
              visibleOriginal.style.webkitMaskImage = mask;
              visibleOriginal.style.maskRepeat = 'no-repeat';
            } else {
              visibleOriginal.style.maskImage = '';
              visibleOriginal.style.webkitMaskImage = '';
            }
          }
        });

        // .lp-nav-link: simpler — no translation, just clip the CA overlay to the lens circle.
        document.querySelectorAll<HTMLElement>('.lp-nav-link').forEach(el => {
          const r = el.getBoundingClientRect();
          const cx = lx - r.left;
          const cy = ly - r.top;
          const nx = Math.max(0, Math.min(cx, r.width));
          const ny = Math.max(0, Math.min(cy, r.height));
          const dist = Math.hypot(cx - nx, cy - ny);
          el.style.setProperty('--ca-x', cx + 'px');
          el.style.setProperty('--ca-y', cy + 'px');
          el.style.setProperty('--ca-r', dist < LENS_R ? LENS_R + 'px' : '0px');
        });
      }
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    // Smooth scroll
    function scrollToId(id: string) {
      const t = document.getElementById(id);
      if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 20, behavior: 'smooth' });
    }
    document.querySelectorAll<HTMLAnchorElement>('.lp-wrap a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => { e.preventDefault(); scrollToId(a.getAttribute('href')!.slice(1)); });
    });
    document.querySelectorAll<HTMLButtonElement>('.lp-rail .lp-dot').forEach(d => {
      d.addEventListener('click', () => scrollToId(d.dataset.target!));
    });

    // Active section tracking
    const sIds = ['hero', 'cap-table', 'esop', 'compliance', 'instruments', 'cta'];
    function updateActive() {
      let cur = 'hero';
      sIds.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight / 2) cur = id;
      });
      document.querySelectorAll<HTMLElement>('.lp-rail .lp-dot').forEach(d => {
        d.dataset.active = d.dataset.target === cur ? '1' : '0';
      });
      document.querySelectorAll<HTMLAnchorElement>('.lp-nav-link').forEach(n => {
        n.dataset.active = n.getAttribute('href') === '#' + cur ? '1' : '0';
      });
    }
    window.addEventListener('scroll', updateActive, { passive: true });
    updateActive();

    // Clocks
    function fmt(d: Date, tz: string) {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: tz }).toUpperCase();
    }
    function tick() {
      const d = new Date();
      const r = document.getElementById('lp-clk-rua');
      const l = document.getElementById('lp-clk-ldn');
      if (r) r.textContent = fmt(d, 'Asia/Riyadh');
      if (l) l.textContent = fmt(d, 'Europe/London');
    }
    tick();
    const clockInterval = setInterval(tick, 15000);

    // Fade-up on scroll
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) (e.target as HTMLElement).classList.add('lp-in'); });
    }, { threshold: 0.12 });
    document.querySelectorAll<HTMLElement>('.lp-fade').forEach(el => io.observe(el));

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', updateActive);
      langToggle?.removeEventListener('click', toggleLang);
      lensBtnEl?.removeEventListener('click', toggleLens);
      clearInterval(clockInterval);
      cancelAnimationFrame(rafId);
      io.disconnect();
      document.body.classList.remove('lp-ar-mode');
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .lp-wrap { --serif: var(--font-serif); --mono: var(--font-mono); --ar: var(--font-ar); }
        .lp-wrap * { box-sizing: border-box; margin: 0; padding: 0; }

        /* NAV */
        .lp-nav { position: fixed; top: 14px; left: 14px; right: 14px; z-index: 50; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 24px; padding: 12px 22px;
          background: rgba(10,10,15,.55); backdrop-filter: blur(24px) saturate(1.4); -webkit-backdrop-filter: blur(24px) saturate(1.4);
          border: 1px solid rgba(255,255,255,.07); border-radius: 18px;
          box-shadow: 0 12px 40px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06); }
        .lp-brand { display: flex; align-items: center; gap: 14px; }
        .lp-brand-pipe { height: 18px; width: 1px; background: rgba(255,255,255,.18); }
        .lp-brand-where { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .2em; color: var(--text-secondary); text-transform: uppercase; }
        .lp-nav-center { display: flex; justify-content: center; gap: 28px; }
        .lp-nav-link { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .22em; text-transform: uppercase; color: var(--text-secondary); padding: 6px 0; display: inline-flex; align-items: center; gap: 8px; transition: color .25s; text-decoration: none; }
        .lp-nav-link::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: transparent; transition: background .25s, box-shadow .25s; }
        .lp-nav-link[data-active="1"] { color: var(--text-primary); }
        .lp-nav-link[data-active="1"]::before { background: var(--brand-purple); box-shadow: 0 0 12px rgba(139,92,246,.45); }
        .lp-nav-link:hover { color: var(--text-primary); }
        .lp-nav-right { display: flex; align-items: center; gap: 14px; }
        .lp-nav-clock { display: flex; align-items: center; gap: 14px; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .16em; color: var(--text-secondary); white-space: nowrap; }
        .lp-nav-clock .lp-pair { display: inline-flex; align-items: center; gap: 6px; }
        .lp-nav-clock .lp-pair span { color: var(--text-tertiary); }
        .lp-nav-clock b { color: var(--text-primary); font-weight: 500; }
        .lp-nav-divider { width: 1px; height: 16px; background: rgba(255,255,255,.12); }
        .lp-nav-signin { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .2em; text-transform: uppercase; color: var(--text-secondary); text-decoration: none; padding: 6px 0; transition: color .2s; white-space: nowrap; }
        .lp-nav-signin:hover { color: var(--text-primary); }
        .lp-nav-cta { display: inline-flex; align-items: center; padding: 7px 16px; border: 1px solid rgba(139,92,246,.5); border-radius: 99px; font-family: var(--font-mono); font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--text-primary); text-decoration: none; background: rgba(139,92,246,.1); transition: background .2s, border-color .2s, box-shadow .2s; white-space: nowrap; }
        .lp-nav-cta:hover { background: var(--brand-purple); border-color: var(--brand-purple); box-shadow: 0 0 24px rgba(139,92,246,.4); }
        .lp-lang-btn { display: inline-flex; align-items: center; padding: 5px 12px; border: 1px solid rgba(255,255,255,.14); border-radius: 99px; font-family: var(--font-mono); font-size: 10px; letter-spacing: .24em; text-transform: uppercase; color: var(--text-secondary); background: rgba(255,255,255,.04); transition: all .2s; cursor: pointer; gap: 6px; }
        .lp-lang-btn:hover { color: var(--text-primary); border-color: rgba(255,255,255,.24); background: rgba(255,255,255,.08); }
        .lp-lang-btn .lp-lang-active { color: var(--text-primary); font-weight: 600; }
        .lp-lang-btn .lp-lang-sep { color: var(--text-tertiary); font-weight: 300; }
        /* AR mode: ar text fully visible, en text hidden by default (bubble reveals it) */
        body.lp-ar-mode .lp-ar { clip-path: circle(2000px at 50% 50%) !important; -webkit-clip-path: circle(2000px at 50% 50%) !important; }
        body.lp-ar-mode .lp-en { opacity: 0; pointer-events: none; position: relative; z-index: 2; clip-path: circle(0px at 0 0); -webkit-clip-path: circle(0px at 0 0); }

        /* LEFT RAIL */
        .lp-rail { position: fixed; left: 32px; top: 50%; transform: translateY(-50%); z-index: 40; display: flex; flex-direction: column; align-items: center; gap: 36px; }
        .lp-rail::before { content: ""; position: absolute; left: 50%; top: -20px; bottom: -20px; width: 1px; background: linear-gradient(to bottom, transparent, rgba(255,255,255,.08) 12%, rgba(255,255,255,.08) 88%, transparent); transform: translateX(-50%); }
        .lp-dot { position: relative; width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid var(--text-tertiary); background: transparent; transition: all .4s cubic-bezier(.2,.8,.2,1); cursor: pointer; }
        .lp-dot:hover { border-color: var(--brand-purple-hover); }
        .lp-dot[data-active="1"] { background: var(--brand-purple); border-color: var(--brand-purple); transform: scale(1.4); box-shadow: 0 0 22px rgba(139,92,246,.45); }
        .lp-dot .lp-lbl { position: absolute; left: 24px; top: 50%; transform: translateY(-50%); font-family: var(--font-mono); font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--text-secondary); white-space: nowrap; opacity: 0; transition: opacity .25s, transform .25s; pointer-events: none; }
        .lp-dot:hover .lp-lbl, .lp-dot[data-active="1"] .lp-lbl { opacity: 1; transform: translateY(-50%) translateX(4px); }
        .lp-dot[data-active="1"] .lp-lbl { color: var(--text-primary); }

        /* REVEAL */
        .lp-reveal { position: relative; display: inline-block; isolation: isolate; }
        .lp-en { display: inline-block; will-change: clip-path; }
        .lp-ar { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: var(--font-ar); direction: rtl; color: var(--text-primary); font-weight: 500; line-height: 1; letter-spacing: 0; will-change: clip-path; clip-path: circle(0px at 0 0); -webkit-clip-path: circle(0px at 0 0); }

        /* HERO */
        .lp-hero { min-height: 100vh; display: grid; grid-template-rows: 1fr auto; padding: 140px 60px 40px 200px; position: relative; z-index: 5; }
        .lp-eyebrow { font-family: var(--font-mono); font-size: 11px; letter-spacing: .28em; text-transform: uppercase; color: var(--text-secondary); display: inline-block; }
        .lp-headline { align-self: center; max-width: 1280px; margin: 0 auto; text-align: center; }
        .lp-line { font-family: var(--font-serif); font-weight: 400; font-size: clamp(48px, 9vw, 150px); line-height: .95; letter-spacing: -.025em; }
        .lp-line.lp-italic { font-style: italic; color: var(--brand-purple-hover); }
        .lp-line .lp-ar { font-family: var(--font-ar); font-weight: 600; font-size: .78em; font-style: normal !important; letter-spacing: 0; line-height: 1; }
        .lp-line.lp-italic .lp-ar { color: var(--brand-purple-hover); }
        .lp-sub { margin-top: 38px; font-size: 14px; color: var(--text-secondary); max-width: 540px; margin-left: auto; margin-right: auto; line-height: 1.7; }
        .lp-hero-foot { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 40px; align-items: end; padding-top: 48px; border-top: 1px solid var(--border-subtle); max-width: 1480px; margin: 0 auto; width: 100%; }
        .lp-foot-cell { font-size: 12px; color: var(--text-secondary); line-height: 1.5; }
        .lp-foot-cell b { display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 2px; }
        .lp-scroll-cue { display: flex; align-items: center; gap: 10px; font-family: var(--font-mono); font-size: 10px; letter-spacing: .24em; text-transform: uppercase; color: var(--text-secondary); }
        .lp-scroll-arrow { width: 1px; height: 36px; background: linear-gradient(to bottom, transparent, var(--text-primary) 40%); position: relative; }
        .lp-scroll-arrow::after { content: ""; position: absolute; bottom: 0; left: -3px; width: 7px; height: 7px; border-right: 1px solid var(--text-primary); border-bottom: 1px solid var(--text-primary); transform: rotate(45deg); }

        /* SECTIONS */
        .lp-bay { min-height: 100vh; padding: 140px 60px 100px 200px; position: relative; z-index: 5; }
        .lp-bay-head { display: grid; grid-template-columns: auto 1fr; gap: 60px; align-items: end; border-bottom: 1px solid var(--border-subtle); padding-bottom: 24px; margin-bottom: 64px; max-width: 1480px; margin-left: auto; margin-right: auto; }
        .lp-bay-num { font-family: var(--font-mono); font-size: 11px; letter-spacing: .24em; color: var(--text-tertiary); text-transform: uppercase; }
        .lp-bay-title { font-family: var(--font-serif); font-size: clamp(34px, 4.8vw, 68px); line-height: 1.02; letter-spacing: -.02em; }
        .lp-bay-title em { font-style: italic; color: var(--brand-purple-hover); }
        .lp-bay-title .lp-ar { font-family: var(--font-ar); font-weight: 600; font-style: normal !important; font-size: .8em; line-height: 1; }

        /* DASHBOARD */
        .lp-dash { display: grid; grid-template-columns: 240px 1fr; gap: 28px; max-width: 1480px; margin: 0 auto; }
        .lp-dash-side { border: 1px solid var(--border-default); background: rgba(10,10,13,.55); backdrop-filter: blur(20px); padding: 18px; border-radius: 14px; align-self: start; position: sticky; top: 120px; }
        .lp-dash-side h4 { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: .22em; color: var(--text-tertiary); text-transform: uppercase; margin: 6px 10px 10px; }
        .lp-side-list { display: grid; gap: 2px; margin-bottom: 18px; }
        .lp-side-list a { display: flex; align-items: center; gap: 9px; padding: 8px 10px; font-size: 13px; color: var(--text-secondary); border-radius: 7px; border-left: 2px solid transparent; transition: all 120ms ease; text-decoration: none; }
        .lp-side-list a:hover { color: var(--text-primary); background: rgba(255,255,255,.02); }
        .lp-side-list a.lp-on { color: var(--text-primary); background: rgba(139,92,246,.15); border-left-color: var(--brand-purple); font-weight: 500; }
        .lp-side-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--text-tertiary); flex-shrink: 0; }
        .lp-side-list a.lp-on .lp-side-dot { background: var(--brand-purple); box-shadow: 0 0 8px rgba(139,92,246,.45); }
        .lp-dash-main { display: grid; gap: 24px; }
        .lp-dash-row { display: grid; gap: 24px; }
        .lp-dash-row.lp-kpis { grid-template-columns: repeat(4, 1fr); }
        .lp-kpi { border: 1px solid var(--border-default); background: rgba(10,10,13,.55); backdrop-filter: blur(14px); padding: 22px; border-radius: 12px; position: relative; overflow: hidden; }
        .lp-kpi::after { content: ""; position: absolute; inset: 0; background: radial-gradient(120% 80% at 100% 0%, rgba(139,92,246,.08), transparent 50%); pointer-events: none; }
        .lp-kpi-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--text-tertiary); margin-bottom: 16px; }
        .lp-kpi-value { font-family: var(--font-serif); font-size: 42px; line-height: 1; letter-spacing: -.01em; }
        .lp-kpi-value .lp-unit { font-size: 13px; color: var(--text-secondary); margin-left: 6px; font-family: var(--font-mono); letter-spacing: .04em; }
        .lp-kpi-delta { margin-top: 14px; display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary); }
        .lp-pill { padding: 2px 8px; border: 1px solid var(--border-strong); border-radius: 99px; color: var(--text-primary); }
        .lp-pill.lp-up { color: var(--brand-purple-hover); border-color: rgba(139,92,246,.35); background: rgba(139,92,246,.15); }
        .lp-dash-row.lp-split { grid-template-columns: 1.4fr 1fr; }
        .lp-panel { border: 1px solid var(--border-default); background: rgba(10,10,13,.55); backdrop-filter: blur(14px); border-radius: 12px; overflow: hidden; }
        .lp-panel-head { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid var(--border-subtle); }
        .lp-panel-head h3 { font-family: var(--font-serif); font-size: 24px; font-weight: 400; letter-spacing: -.01em; }
        .lp-panel-meta { font-family: var(--font-mono); font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--text-tertiary); }
        .lp-panel-body { padding: 22px; }
        .lp-stack { display: grid; gap: 14px; }
        .lp-stack-bar { display: grid; grid-template-columns: 170px 1fr 80px; gap: 16px; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--border-subtle); }
        .lp-stack-bar:last-child { border: 0; }
        .lp-who { font-size: 13px; color: var(--text-primary); display: flex; align-items: center; gap: 10px; }
        .lp-swatch { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
        .lp-who small { display: block; font-size: 10px; color: var(--text-tertiary); font-family: var(--font-mono); letter-spacing: .1em; text-transform: uppercase; margin-top: 2px; }
        .lp-track { height: 6px; background: rgba(255,255,255,.04); border-radius: 3px; overflow: hidden; }
        .lp-fill { height: 100%; border-radius: 3px; transform-origin: left; animation: lp-grow 1.4s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes lp-grow { 0% { transform: scaleX(0) } 100% { transform: scaleX(1) } }
        .lp-pct { font-family: var(--font-mono); font-size: 13px; text-align: right; }
        .lp-feed { display: grid; gap: 0; }
        .lp-feed-item { display: grid; grid-template-columns: 80px 1fr; gap: 16px; padding: 14px 0; border-bottom: 1px dashed var(--border-subtle); }
        .lp-feed-item:last-child { border: 0; }
        .lp-feed-time { font-family: var(--font-mono); font-size: 10px; letter-spacing: .16em; color: var(--text-tertiary); text-transform: uppercase; padding-top: 3px; }
        .lp-feed-what { font-size: 13px; line-height: 1.55; }
        .lp-tag { display: inline-block; font-family: var(--font-mono); font-size: 9px; letter-spacing: .18em; text-transform: uppercase; color: var(--brand-purple-hover); border: 1px solid rgba(139,92,246,.35); background: rgba(139,92,246,.15); padding: 1px 6px; margin-right: 8px; vertical-align: 1px; border-radius: 3px; }
        .lp-feed-what em { color: var(--text-secondary); font-style: normal; }
        .lp-filings { display: grid; gap: 12px; }
        .lp-filing { display: grid; grid-template-columns: 60px 1fr auto; gap: 18px; align-items: center; padding: 14px 16px; border: 1px solid var(--border-subtle); border-radius: 10px; background: rgba(255,255,255,.015); }
        .lp-filing-date { text-align: center; font-family: var(--font-serif); font-size: 24px; line-height: 1; }
        .lp-filing-date small { display: block; font-family: var(--font-mono); font-size: 9px; color: var(--text-tertiary); letter-spacing: .2em; text-transform: uppercase; margin-top: 4px; }
        .lp-filing-title { font-size: 13px; }
        .lp-filing-title small { display: block; font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
        .lp-filing-due { font-family: var(--font-mono); font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--text-tertiary); }
        .lp-filing-due.lp-warn { color: var(--brand-purple-hover); }

        /* LAW CARDS */
        .lp-lawgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 1480px; margin: 0 auto; }
        .lp-lawcard { border: 1px solid var(--border-default); background: rgba(10,10,13,.55); backdrop-filter: blur(14px); padding: 30px; border-radius: 14px; min-height: 280px; display: grid; grid-template-rows: auto 1fr auto; gap: 18px; transition: border-color .3s, transform .3s; }
        .lp-lawcard:hover { border-color: rgba(139,92,246,.4); transform: translateY(-4px); }
        .lp-lawcard .lp-meta { font-family: var(--font-mono); font-size: 10px; letter-spacing: .22em; color: var(--text-tertiary); text-transform: uppercase; }
        .lp-lawcard h3 { font-family: var(--font-serif); font-size: 30px; line-height: 1.1; letter-spacing: -.01em; font-weight: 400; }
        .lp-lawcard h3 em { color: var(--brand-purple-hover); font-style: italic; }
        .lp-lawcard h3 .lp-ar { font-family: var(--font-ar); font-weight: 600; font-style: normal !important; font-size: .9em; }
        .lp-lawcard p { font-size: 13px; color: var(--text-secondary); line-height: 1.65; }

        /* CTA */
        .lp-cta-row { display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: end; padding-top: 60px; border-top: 1px solid var(--border-subtle); margin-top: 80px; max-width: 1480px; margin-left: auto; margin-right: auto; }
        .lp-cta-text { font-family: var(--font-serif); font-size: clamp(28px, 3.5vw, 52px); line-height: 1.12; letter-spacing: -.015em; max-width: 820px; }
        .lp-cta-text em { font-style: italic; color: var(--brand-purple-hover); }
        .lp-cta-btn { display: inline-flex; align-items: center; gap: 14px; padding: 16px 26px; border: 1px solid rgba(255,255,255,.18); border-radius: 99px; font-family: var(--font-mono); font-size: 11px; letter-spacing: .22em; text-transform: uppercase; background: rgba(139,92,246,.08); transition: background .3s, color .3s, border-color .3s; white-space: nowrap; text-decoration: none; color: var(--text-primary); }
        .lp-cta-btn:hover { background: var(--brand-purple); color: #fff; border-color: var(--brand-purple); box-shadow: 0 12px 36px rgba(139,92,246,.45); }
        .lp-arrow { width: 18px; height: 1px; background: currentColor; position: relative; flex-shrink: 0; }
        .lp-arrow::after { content: ""; position: absolute; right: 0; top: -3px; width: 7px; height: 7px; border-right: 1px solid currentColor; border-top: 1px solid currentColor; transform: rotate(45deg); }

        /* FOOTER */
        .lp-footer { padding: 56px 60px 36px 200px; border-top: 1px solid var(--border-subtle); display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 40px; font-family: var(--font-mono); font-size: 11px; letter-spacing: .04em; color: var(--text-secondary); position: relative; z-index: 5; }
        .lp-footer h5 { font-size: 10px; letter-spacing: .22em; text-transform: uppercase; color: var(--text-tertiary); margin-bottom: 14px; }
        .lp-footer ul { list-style: none; display: grid; gap: 8px; }
        .lp-footer ul a { color: var(--text-primary); transition: color .2s; text-decoration: none; }
        .lp-footer ul a:hover { color: var(--brand-purple-hover); }

        /* LENS — hidden when off, no exceptions */
        .lp-lens {
          display: none;
          position: fixed; z-index: 98; pointer-events: none;
          width: 260px; height: 260px; margin: -130px 0 0 -130px;
          will-change: left, top;
        }
        .lp-lens[data-on="1"] { display: block; }

        /* Glass body — slight blur reads as glass distortion of the WebGL background */
        .lp-lens-glass { position: absolute; inset: 0; border-radius: 50%;
          backdrop-filter: blur(1.2px) saturate(1.6) contrast(1.15) brightness(1.12);
          -webkit-backdrop-filter: blur(1.2px) saturate(1.6) contrast(1.15) brightness(1.12);
          mask-image: radial-gradient(circle at center, black 0%, black 58%, rgba(0,0,0,.80) 74%, rgba(0,0,0,.34) 88%, transparent 100%);
          -webkit-mask-image: radial-gradient(circle at center, black 0%, black 58%, rgba(0,0,0,.80) 74%, rgba(0,0,0,.34) 88%, transparent 100%); }

        /* Internal highlight — top-left glass reflection */
        .lp-lens-hi { position: absolute; inset: 0; border-radius: 50%;
          background:
            radial-gradient(ellipse 56% 40% at 30% 22%, rgba(255,255,255,.11) 0%, transparent 60%),
            radial-gradient(ellipse 38% 28% at 70% 78%, rgba(255,255,255,.04) 0%, transparent 70%);
          mask-image: radial-gradient(circle at center, black 0%, black 50%, rgba(0,0,0,.7) 68%, transparent 100%);
          -webkit-mask-image: radial-gradient(circle at center, black 0%, black 50%, rgba(0,0,0,.7) 68%, transparent 100%); }

        /* Rim — defined glass edge with chromatic-tinted outer rings (this is the "lens" look) */
        .lp-lens-rim { position: absolute; inset: 0; border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,.28);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,.08),
            inset 0 1px 3px rgba(255,255,255,.10),
            0 0 0 1px rgba(255,64,108,.32),
            0 0 0 2px rgba(64,140,255,.20),
            0 0 36px rgba(139,92,246,.22),
            0 8px 28px rgba(0,0,0,.5);
          mask-image: radial-gradient(circle at center, transparent 74%, rgba(0,0,0,.85) 88%, transparent 100%);
          -webkit-mask-image: radial-gradient(circle at center, transparent 74%, rgba(0,0,0,.85) 88%, transparent 100%); }

        /* CHROMATIC ABERRATION overlay — a clone of the text rendered on top of the original,
           with text-shadow RGB-split, clipped to the lens circle, and switched by language mode
           so the lens shows the OPPOSITE language (translation reveal). */
        .lp-ca-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          color: inherit;
          font: inherit;
          text-shadow:
            -0.9px 0 0 rgba(255, 56, 96, .55),
             0.9px 0 0 rgba(56, 132, 255, .55);
          clip-path: circle(var(--ca-r, 0px) at var(--ca-x, 0) var(--ca-y, 0));
          -webkit-clip-path: circle(var(--ca-r, 0px) at var(--ca-x, 0) var(--ca-y, 0));
          z-index: 2;
        }

        /* EN mode (default body): lens reveals AR; hide EN overlay, show AR overlay. */
        .lp-reveal > .lp-ca-en { display: none; }
        .lp-reveal > .lp-ca-ar {
          display: block;
          font-family: var(--font-ar);
          direction: rtl;
          text-align: center;
          line-height: 1;
          white-space: nowrap;
        }

        /* AR mode: lens reveals EN; flip overlay visibility. */
        .lp-ar-mode .lp-reveal > .lp-ca-en { display: block; }
        .lp-ar-mode .lp-reveal > .lp-ca-ar { display: none; }

        /* Nav links — no translation, only the EN overlay exists and always shows. */
        .lp-nav-link > .lp-ca-en { display: block; }
        /* Lens toggle button */
        .lp-lens-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.04); cursor: pointer; transition: all .2s; color: var(--text-secondary); flex-shrink: 0; }
        .lp-lens-btn:hover { border-color: rgba(255,255,255,.24); background: rgba(255,255,255,.08); color: var(--text-primary); }
        .lp-lens-btn[data-on="1"] { border-color: rgba(139,92,246,.5); background: rgba(139,92,246,.15); color: var(--brand-purple-hover); box-shadow: 0 0 12px rgba(139,92,246,.2); }
        @media (hover: none) { .lp-lens, .lp-lens-btn { display: none; } }

        /* FADE UP */
        .lp-fade { opacity: 0; transform: translateY(24px); transition: opacity .9s ease, transform .9s cubic-bezier(.2,.8,.2,1); }
        .lp-fade.lp-in { opacity: 1; transform: translateY(0); }

        /* RESPONSIVE */
        @media (max-width: 1180px) {
          .lp-brand-where { display: none; }
          .lp-nav-clock .lp-pair:nth-child(2) { display: none; }
        }
        @media (max-width: 980px) {
          .lp-nav-center { display: none; }
        }
        @media (max-width: 880px) {
          .lp-nav { grid-template-columns: 1fr auto; padding: 12px 16px; }
          .lp-nav-center, .lp-nav-clock { display: none; }
          .lp-rail { display: none; }
          .lp-hero { padding: 90px 20px 30px; }
          .lp-hero-foot { grid-template-columns: 1fr 1fr; gap: 20px; }
          .lp-dash { grid-template-columns: 1fr; }
          .lp-dash-side { position: static; }
          .lp-dash-row.lp-kpis { grid-template-columns: repeat(2, 1fr); }
          .lp-dash-row.lp-split { grid-template-columns: 1fr; }
          .lp-bay { padding: 80px 20px 60px; }
          .lp-lawgrid { grid-template-columns: 1fr; }
          .lp-footer { grid-template-columns: 1fr 1fr; padding: 40px 20px; }
          .lp-nav-right { gap: 8px; }
        }
      `}} />

      <div className="lp-wrap">
        <PageBackground />

        {/* Glass lens — follows cursor, toggled via nav button. */}
        {/* Real RGB chromatic aberration is applied to text via .lp-ca-on (text-shadow) inside the rAF loop. */}
        <div id="lp-lens" className="lp-lens" data-on="0" aria-hidden="true">
          <div className="lp-lens-glass" />
          <div className="lp-lens-hi" />
          <div className="lp-lens-rim" />
        </div>

        {/* Nav */}
        <nav className="lp-nav">
          <div className="lp-brand">
            <Logo size={22} color="var(--text-primary)" />
            <div className="lp-brand-pipe" />
            <div className="lp-brand-where">Riyadh · 2026</div>
          </div>
          <div className="lp-nav-center">
            <a className="lp-nav-link" data-active="1" href="#hero">Overview</a>
            <a className="lp-nav-link" data-active="0" href="#cap-table">Cap Table</a>
            <a className="lp-nav-link" data-active="0" href="#esop">ESOP</a>
            <a className="lp-nav-link" data-active="0" href="#compliance">Compliance</a>
            <a className="lp-nav-link" data-active="0" href="#instruments">Instruments</a>
            <a className="lp-nav-link" data-active="0" href="#cta">Contact</a>
          </div>
          <div className="lp-nav-right">
            <div className="lp-nav-clock">
              <span className="lp-pair"><b id="lp-clk-rua">—</b><span>RUH</span></span>
              <span className="lp-pair"><b id="lp-clk-ldn">—</b><span>LDN</span></span>
            </div>
            <div className="lp-nav-divider" />
            <button className="lp-lang-btn" id="lp-lang-toggle" aria-label="Toggle language">
              <span className="lp-lang-active" id="lp-lang-active-label">EN</span>
              <span className="lp-lang-sep">/</span>
              <span id="lp-lang-other-label">AR</span>
            </button>
            <button className="lp-lens-btn" id="lp-lens-btn" data-on="0" aria-label="Toggle lens">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="6.5" cy="6.5" r="5.5" />
                <circle cx="6.5" cy="6.5" r="2" />
              </svg>
            </button>
            <div className="lp-nav-divider" />
            <a className="lp-nav-signin" href="/login">Sign in</a>
            <a className="lp-nav-cta" href="/register">Get started</a>
          </div>
        </nav>

        {/* Left dot rail */}
        <aside className="lp-rail" aria-label="Section navigator">
          <button className="lp-dot" data-target="hero" data-active="1"><span className="lp-lbl">Overview</span></button>
          <button className="lp-dot" data-target="cap-table" data-active="0"><span className="lp-lbl">Cap Table</span></button>
          <button className="lp-dot" data-target="esop" data-active="0"><span className="lp-lbl">ESOP</span></button>
          <button className="lp-dot" data-target="compliance" data-active="0"><span className="lp-lbl">Compliance</span></button>
          <button className="lp-dot" data-target="instruments" data-active="0"><span className="lp-lbl">Instruments</span></button>
          <button className="lp-dot" data-target="cta" data-active="0"><span className="lp-lbl">Contact</span></button>
        </aside>

        {/* Hero */}
        <section className="lp-hero" id="hero">
          <div className="lp-headline">
            <span className="lp-reveal lp-eyebrow" data-ar="إدارة الملكية · جدول الرسملة">
              <span className="lp-en">Equity management · Cap table</span><span className="lp-ar" />
            </span>
            <div style={{ height: 38 }} />
            <div className="lp-line lp-reveal" data-ar="سجل مكتوب">
              <span className="lp-en">A ledger written</span><span className="lp-ar" />
            </div>
            <div className="lp-line lp-italic lp-reveal" data-ar="بلغة القانون.">
              <span className="lp-en">in the language of law.</span><span className="lp-ar" />
            </div>
            <p className="lp-sub">Equity management built on the 2023 Saudi Companies Law — SJSC, LLC, ESOP, sukuk-convertibles. Every event signed, sealed, and reproducible.</p>
          </div>
          <div className="lp-hero-foot lp-fade">
            <div className="lp-foot-cell"><b>Built in Riyadh</b>For Saudi founders, boards, and counsel</div>
            <div className="lp-foot-cell"><b>Law-grade ledger</b>Event-sourced, deterministic, auditable</div>
            <div className="lp-foot-cell"><b>Bilingual by design</b>English + Arabic, RTL native</div>
            <div className="lp-scroll-cue"><span>Scroll</span><div className="lp-scroll-arrow" /></div>
          </div>
        </section>

        {/* Cap Table / Dashboard */}
        <section className="lp-bay" id="cap-table">
          <div className="lp-bay-head lp-fade">
            <div className="lp-bay-num">02 / Cap Table</div>
            <h2 className="lp-bay-title lp-reveal" data-ar="الشركة بأكملها، في صفحة واحدة.">
              <span className="lp-en">The whole company, <em>on one page.</em></span><span className="lp-ar" />
            </h2>
          </div>
          <div className="lp-dash">
            <aside className="lp-dash-side">
              <h4>Workspace</h4>
              <div className="lp-side-list">
                <a className="lp-on" href="#"><span className="lp-side-dot" />Overview</a>
                <a href="#"><span className="lp-side-dot" />Cap table</a>
                <a href="#"><span className="lp-side-dot" />Stakeholders</a>
                <a href="#"><span className="lp-side-dot" />Instruments</a>
                <a href="#"><span className="lp-side-dot" />ESOP</a>
                <a href="#"><span className="lp-side-dot" />Filings</a>
              </div>
              <h4>Company</h4>
              <div className="lp-side-list">
                <a href="#"><span className="lp-side-dot" />Najm Logistics SJSC</a>
                <a href="#"><span className="lp-side-dot" />Nahda Studios LLC</a>
                <a href="#"><span className="lp-side-dot" />+ Add company</a>
              </div>
            </aside>
            <main className="lp-dash-main">
              <div className="lp-dash-row lp-kpis">
                <div className="lp-kpi lp-fade"><div className="lp-kpi-label">Authorized shares</div><div className="lp-kpi-value">10,000,000</div><div className="lp-kpi-delta"><span className="lp-pill">SJSC</span><span>Class A · ordinary</span></div></div>
                <div className="lp-kpi lp-fade"><div className="lp-kpi-label">Issued &amp; outstanding</div><div className="lp-kpi-value">7,842,500</div><div className="lp-kpi-delta"><span className="lp-pill lp-up">+ 240,000</span><span>since Q1</span></div></div>
                <div className="lp-kpi lp-fade"><div className="lp-kpi-label">Fully diluted</div><div className="lp-kpi-value">8,612,500</div><div className="lp-kpi-delta"><span>incl. ESOP &amp; convertibles</span></div></div>
                <div className="lp-kpi lp-fade"><div className="lp-kpi-label">Last priced round</div><div className="lp-kpi-value">42.<span style={{ color: 'var(--text-secondary)' }}>10</span><span className="lp-unit">SAR / share</span></div><div className="lp-kpi-delta"><span>Series A · Mar 2026</span></div></div>
              </div>
              <div className="lp-dash-row lp-split">
                <div className="lp-panel lp-fade">
                  <div className="lp-panel-head">
                    <h3 className="lp-reveal" data-ar="الملكية"><span className="lp-en">Ownership</span><span className="lp-ar" /></h3>
                    <div className="lp-panel-meta">Fully diluted · SAR</div>
                  </div>
                  <div className="lp-panel-body">
                    <div className="lp-stack">
                      <div className="lp-stack-bar"><div className="lp-who"><span className="lp-swatch" style={{ background: '#a78bfa' }} /><div>Founders<small>3 holders · ordinary</small></div></div><div className="lp-track"><div className="lp-fill" style={{ width: '46%', background: '#a78bfa' }} /></div><div className="lp-pct">46.0%</div></div>
                      <div className="lp-stack-bar"><div className="lp-who"><span className="lp-swatch" style={{ background: '#8b5cf6' }} /><div>Series A investors<small>4 holders · pref. A</small></div></div><div className="lp-track"><div className="lp-fill" style={{ width: '22%', background: '#8b5cf6', animationDelay: '.1s' }} /></div><div className="lp-pct">22.0%</div></div>
                      <div className="lp-stack-bar"><div className="lp-who"><span className="lp-swatch" style={{ background: '#6d4cc6' }} /><div>Seed investors<small>9 holders · SAFE / pref.</small></div></div><div className="lp-track"><div className="lp-fill" style={{ width: '14%', background: '#6d4cc6', animationDelay: '.2s' }} /></div><div className="lp-pct">14.0%</div></div>
                      <div className="lp-stack-bar"><div className="lp-who"><span className="lp-swatch" style={{ background: '#4d3692' }} /><div>ESOP pool<small>granted &amp; reserved</small></div></div><div className="lp-track"><div className="lp-fill" style={{ width: '10%', background: '#4d3692', animationDelay: '.3s' }} /></div><div className="lp-pct">10.0%</div></div>
                      <div className="lp-stack-bar"><div className="lp-who"><span className="lp-swatch" style={{ background: '#332661' }} /><div>Sukuk convertibles<small>2 instruments · pending</small></div></div><div className="lp-track"><div className="lp-fill" style={{ width: '8%', background: '#332661', animationDelay: '.4s' }} /></div><div className="lp-pct">8.0%</div></div>
                    </div>
                  </div>
                </div>
                <div className="lp-panel lp-fade">
                  <div className="lp-panel-head">
                    <h3 className="lp-reveal" data-ar="النشاط"><span className="lp-en">Activity</span><span className="lp-ar" /></h3>
                    <div className="lp-panel-meta">Last 30 days</div>
                  </div>
                  <div className="lp-panel-body">
                    <div className="lp-feed">
                      <div className="lp-feed-item"><time className="lp-feed-time">04 May</time><div className="lp-feed-what"><span className="lp-tag">Issue</span>240,000 ordinary shares to <em>F. Al-Otaibi</em> at 42.10 SAR.</div></div>
                      <div className="lp-feed-item"><time className="lp-feed-time">28 Apr</time><div className="lp-feed-what"><span className="lp-tag">Grant</span>ESOP grant — 12,000 options to <em>Engineering · Cohort B</em>, 4-year vest.</div></div>
                      <div className="lp-feed-item"><time className="lp-feed-time">21 Apr</time><div className="lp-feed-what"><span className="lp-tag">Filing</span>MoC annual return draft prepared. Awaiting board signature.</div></div>
                      <div className="lp-feed-item"><time className="lp-feed-time">14 Apr</time><div className="lp-feed-what"><span className="lp-tag">Transfer</span>40,000 shares · <em>S. bin Khalid → Nahda Holdings</em>. Pre-emption waived.</div></div>
                      <div className="lp-feed-item"><time className="lp-feed-time">02 Apr</time><div className="lp-feed-what"><span className="lp-tag">Note</span>Sukuk convertible #2026-001 priced. Ceiling locked at 50.00 SAR.</div></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lp-panel lp-fade">
                <div className="lp-panel-head">
                  <h3 className="lp-reveal" data-ar="الإفصاحات القادمة"><span className="lp-en">Upcoming filings</span><span className="lp-ar" /></h3>
                  <div className="lp-panel-meta">MoC · CMA · ZATCA</div>
                </div>
                <div className="lp-panel-body">
                  <div className="lp-filings">
                    <div className="lp-filing lp-fade"><div className="lp-filing-date">31<small>May</small></div><div className="lp-filing-title">MoC Annual Return<small>Companies Law Art. 218 — board-signed return of share register</small></div><div className="lp-filing-due lp-warn">Due in 24 days</div></div>
                    <div className="lp-filing lp-fade"><div className="lp-filing-date">15<small>Jun</small></div><div className="lp-filing-title">ZATCA — Zakat &amp; corporate tax<small>Q2 estimate · ledger figures auto-attached</small></div><div className="lp-filing-due">Due in 39 days</div></div>
                    <div className="lp-filing lp-fade"><div className="lp-filing-date">02<small>Jul</small></div><div className="lp-filing-title">CMA — beneficial ownership disclosure<small>Triggered by Mar 2026 share issuance</small></div><div className="lp-filing-due">Due in 56 days</div></div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </section>

        {/* ESOP */}
        <section className="lp-bay" id="esop">
          <div className="lp-bay-head lp-fade">
            <div className="lp-bay-num">03 / ESOP</div>
            <h2 className="lp-bay-title lp-reveal" data-ar="مواءمة الفريق دون إرباك السجل.">
              <span className="lp-en">Align the team <em>without diluting</em> the ledger.</span><span className="lp-ar" />
            </h2>
          </div>
          <div className="lp-lawgrid">
            <article className="lp-lawcard lp-fade"><div className="lp-meta">Plan creation</div><h3 className="lp-reveal" data-ar="مجموعات، فترات حظر، فئات."><span className="lp-en">Pools, cliffs, <em>classes.</em></span><span className="lp-ar" /></h3><p>Multiple ESOP plans, each with its own pool, cliff, and graded vesting cadence. Modeled on CMA-permissible structures, not Delaware templates.</p></article>
            <article className="lp-lawcard lp-fade"><div className="lp-meta">Vesting engine</div><h3 className="lp-reveal" data-ar="استحقاق محدد."><span className="lp-en">Deterministic <em>vesting.</em></span><span className="lp-ar" /></h3><p>Per-grant vesting computed event-by-event. Cliff plus graded monthly. Audit-grade reproducibility on every share, every day.</p></article>
            <article className="lp-lawcard lp-fade"><div className="lp-meta">Disclosure</div><h3 className="lp-reveal" data-ar="حزم فصلية."><span className="lp-en">Quarterly <em>packs.</em></span><span className="lp-ar" /></h3><p>CMA-aligned ESOP disclosure packs generated from the ledger. Watermarked drafts, never auto-submitted, always counsel-reviewed.</p></article>
          </div>
        </section>

        {/* Compliance */}
        <section className="lp-bay" id="compliance">
          <div className="lp-bay-head lp-fade">
            <div className="lp-bay-num">04 / Compliance</div>
            <h2 className="lp-bay-title lp-reveal" data-ar="الجوهر، لا الغلاف.">
              <span className="lp-en">The substrate, <em>not the wrapper.</em></span><span className="lp-ar" />
            </h2>
          </div>
          <div className="lp-lawgrid">
            <article className="lp-lawcard lp-fade"><div className="lp-meta">Companies Law 2023</div><h3 className="lp-reveal" data-ar="شركة المساهمة المبسطة كما يجب."><span className="lp-en">SJSC <em>done right.</em></span><span className="lp-ar" /></h3><p>SJSC, LLC, JSC structures, share-class taxonomy, and pre-emption mechanics modeled exactly as written, not approximated from US analogs.</p></article>
            <article className="lp-lawcard lp-fade"><div className="lp-meta">CMA · ZATCA · MoC</div><h3 className="lp-reveal" data-ar="الإفصاح، منظمًا."><span className="lp-en">Disclosure, <em>structured.</em></span><span className="lp-ar" /></h3><p>A calendar of what&apos;s due, when, and to whom — drafts pre-populated from your ledger. Never auto-submitted; always counsel-reviewed.</p></article>
            <article className="lp-lawcard lp-fade"><div className="lp-meta">Audit</div><h3 className="lp-reveal" data-ar="ثابت، قابل للتحقق."><span className="lp-en">Immutable, <em>reproducible.</em></span><span className="lp-ar" /></h3><p>Event-sourced ledger with role-based access. Every state change is signed, hashed, and forever auditable to the original board resolution.</p></article>
          </div>
        </section>

        {/* Instruments */}
        <section className="lp-bay" id="instruments">
          <div className="lp-bay-head lp-fade">
            <div className="lp-bay-num">05 / Instruments</div>
            <h2 className="lp-bay-title lp-reveal" data-ar="صكوك، سيف، خيارات — بأصول.">
              <span className="lp-en">Sukuk, SAFE, warrants — <em>natively.</em></span><span className="lp-ar" />
            </h2>
          </div>
          <div className="lp-lawgrid">
            <article className="lp-lawcard lp-fade"><div className="lp-meta">Sukuk convertibles</div><h3 className="lp-reveal" data-ar="متوافقة مع الشريعة."><span className="lp-en">Sharia-<em>compliant.</em></span><span className="lp-ar" /></h3><p>Convertible sukuk modeled as first-class instruments — conversion ceilings, profit shares, and discharge events all explicit on the ledger.</p></article>
            <article className="lp-lawcard lp-fade"><div className="lp-meta">Phantom · Warrants</div><h3 className="lp-reveal" data-ar="ملكية اصطناعية."><span className="lp-en">Synthetic <em>equity.</em></span><span className="lp-ar" /></h3><p>Phantom shares track value without diluting. Warrants priced and dated, expiring through the same engine the cap table runs on.</p></article>
            <article className="lp-lawcard lp-fade"><div className="lp-meta">Scenario</div><h3 className="lp-reveal" data-ar="تصور الجولة القادمة."><span className="lp-en">Model the <em>next round.</em></span><span className="lp-ar" /></h3><p>Test up-rounds, down-rounds, anti-dilution, sukuk discharge. See dilution before you sign — never after.</p></article>
          </div>
        </section>

        {/* CTA */}
        <section className="lp-bay" id="cta" style={{ minHeight: 'auto' }}>
          <div className="lp-cta-row lp-fade">
            <div className="lp-cta-text lp-reveal" data-ar="أدر جدول ملكيتك كما يصوغه القانون.">
              <span className="lp-en">Run your cap table <em>the way the law writes it.</em></span><span className="lp-ar" />
            </div>
            <a className="lp-cta-btn" href="/register">Get started <span className="lp-arrow" /></a>
          </div>
        </section>

        {/* Footer */}
        <footer className="lp-footer">
          <div>
            <h5>ZeroOne Capital</h5>
            <ul>
              <li>Riyadh, KSA</li>
              <li>hello@01.capital</li>
              <li style={{ color: 'var(--text-tertiary)', fontSize: 10, marginTop: 8 }}>DRAFT — review with legal counsel before reliance.</li>
            </ul>
          </div>
          <div>
            <h5>Product</h5>
            <ul>
              <li><a href="#cap-table">Cap table</a></li>
              <li><a href="#esop">ESOP</a></li>
              <li><a href="#instruments">Instruments</a></li>
              <li><a href="#compliance">Compliance</a></li>
            </ul>
          </div>
          <div>
            <h5>Reference</h5>
            <ul>
              <li><a href="#">Companies Law digest</a></li>
              <li><a href="#">Glossary (EN / AR)</a></li>
              <li><a href="#">Trust &amp; residency</a></li>
            </ul>
          </div>
          <div>
            <h5>Status</h5>
            <ul>
              <li>Discovery sprint · Day 04 / 14</li>
              <li>v0.2 · 2026.05.08</li>
            </ul>
          </div>
        </footer>
      </div>
    </>
  );
}
