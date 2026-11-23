// ==UserScript==
// @name         CESI Suite - ENT, Moodle & Scenari
// @namespace    http://tampermonkey.net/
// @version      26.3
// @description  Suite complète pour CESI : ENT modernisé, Moodle unifié, SSO fluide (WAYF, STS), et lecteur de cours modernisé (Moodle Opale & Scenari Topaze).
// @author       Maxence
// @match        https://ent.cesi.fr/*
// @match        https://sts.viacesi.fr/*
// @match        https://wayf.cesi.fr/*
// @match        https://wayf.cesi.fr/login*
// @match        https://wayf.cesi.fr/
// @match        *://moodle.cesi.fr/*
// @match        https://moodle.cesi.fr/*
// @match        *://moodle.cesi.fr/pluginfile.php/*
// @match        https://moodle.cesi.fr/pluginfile.php/*/mod_resource/content/*
// @match        *://scenari.cesi.fr/*
// @match        https://scenari.cesi.fr/*
// @match        file://*/*
// @updateURL    https://raw.githubusercontent.com/TheGolden974/Tampermonkey-ENT-CESI/main/script.js
// @downloadURL  https://raw.githubusercontent.com/TheGolden974/Tampermonkey-ENT-CESI/main/script.js
// @allFrames    true
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';

    const host = location.hostname;
    const path = location.pathname;

    /* =====================================================================
       0. CONFIGURATION & HELPERS GLOBAUX
       ===================================================================== */
    const getEmail = () => { try { return GM_getValue('cesi_email', '') || 'maxence.alaouadiorflar@viacesi.fr'; } catch { return 'maxence.alaouadiorflar@viacesi.fr'; } };
    const setEmail = (v) => { try { if (v) GM_setValue('cesi_email', v.trim()); } catch { /* ignore */ } };

    const root = () => document.head || document.documentElement;
    const addClass = (cls) => {
        if (document.documentElement) document.documentElement.classList.add(cls);
        else document.addEventListener('DOMContentLoaded', () => document.documentElement?.classList.add(cls), { once: true });
    };
    const removeClass = (cls) => {
        document.documentElement?.classList.remove(cls);
    };
    const addStyle = (css, cls = 'scn-injected cesi-injected') => {
        const el = document.createElement('style');
        if (cls) el.className = cls;
        el.textContent = css;
        const r = root();
        if (r) {
            r.appendChild(el);
        } else {
            document.addEventListener('DOMContentLoaded', () => (root() || document.body)?.appendChild(el), { once: true });
        }
        return el;
    };
    const addFont = () => {
        const inject = () => {
            if (document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]')) return;
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
            (root() || document.body)?.appendChild(link);
        };
        if (root()) inject();
        else document.addEventListener('DOMContentLoaded', inject, { once: true });
    };
    const onReady = (fn) => {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
        else fn();
    };
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
    const abs = (h) => { try { return new URL(h, location.origin).href; } catch { return '#'; } };
    const getJSON = async (url) => {
        const r = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' }, cache: 'no-store' });
        if (!r.ok) throw new Error(`${url} → ${r.status}`);
        return r.json();
    };
    const getDoc = async (url) => {
        const r = await fetch(url, { credentials: 'include', cache: 'no-store' });
        if (!r.ok) throw new Error(`${url} → ${r.status}`);
        return { url: r.url, doc: new DOMParser().parseFromString(await r.text(), 'text/html') };
    };

    const ICONS = {
        calendar: "M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z",
        school: "M12 3L1 9l11 6 9-4.91v6.27h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z",
        user: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
        group: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
        doc: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
        card: "M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z",
        bell: "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z",
        link: "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z",
        info: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
        book: "M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z",
        news: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
        support: "M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z",
        apps: "M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z",
        logout: "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z",
        pin: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
        menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
        expand: 'M12 5.83L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83zm0 12.34L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17z',
        collapse: 'M7.41 18.59L8.83 20 12 16.83 15.17 20l1.41-1.41L12 14l-4.59 4.59zm9.18-13.18L15.17 4 12 7.17 8.83 4 7.41 5.41 12 10l4.59-4.59z',
        moon: 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z',
        sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM2 13h2a1 1 0 0 0 0-2H2a1 1 0 0 0 0 2zm18 0h2a1 1 0 0 0 0-2h-2a1 1 0 0 0 0 2zM11 2v2a1 1 0 0 0 2 0V2a1 1 0 0 0-2 0zm0 18v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-2 0z',
        rocket: 'M12 2.5c3.5 2.4 5 6.3 5 10.2l2.3 2.3c.3.3.4.7.2 1.1l-1.5 3.1c-.2.5-.8.7-1.3.4l-2.6-1.4H9.9l-2.6 1.4c-.5.3-1.1.1-1.3-.4L4.5 16.1c-.2-.4-.1-.8.2-1.1L7 12.7c0-3.9 1.5-7.8 5-10.2zm0 5.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
        flag: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z',
        globe: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z'
    };
    const svg = (name, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true"><path d="${ICONS[name] || ICONS.link}"/></svg>`;
    const getCourseKind = (title) => {
        const t = String(title || '');
        if (/prosit\s*aller/i.test(t)) return { id: 'aller', label: 'Prosit Aller', icon: 'rocket' };
        if (/prosit\s*retour/i.test(t)) return { id: 'retour', label: 'Prosit Retour', icon: 'flag' };
        if (/travau?x?\s*personnels?\s*encadr[eé]s?|\btpe\b/i.test(t)) return { id: 'tpe', label: 'Travaux Personnels Encadrés', icon: 'school' };
        if (/travail\s*(?:de|en)\s*groupe|\btdg\b/i.test(t)) return { id: 'groupe', label: 'Travail de groupe', icon: 'group' };
        if (/\b(?:anglais|english)\b/i.test(t)) return { id: 'anglais', label: 'Anglais', icon: 'globe' };
        return null;
    };
    const courseKindBadge = (kind) => kind
        ? `<span class="course-kind-badge kind-${kind.id}" title="${esc(kind.label)}" aria-label="${esc(kind.label)}">${svg(kind.icon)}</span>`
        : '';
    const COURSE_KIND_CSS = `
        .course-kind-badge {
            display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
            width: 30px; height: 30px; border-radius: 9px;
            background: var(--c-accent-soft); color: var(--c-accent-ink) !important;
            border: 1px solid rgba(251,226,22,.45);
        }
        .course-kind-badge svg { width: 16px; height: 16px; fill: currentColor; flex-shrink: 0; }
        html.dark .course-kind-badge {
            background: rgba(251,226,22,.14); color: #FBE216 !important;
            border-color: rgba(251,226,22,.35);
        }
        .edt-course-item .course-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    `;
    const CESI_LOGO_URL = 'https://www.anrt.asso.fr/sites/default/files/styles/large/public/2024-03/CESI.png?itok=GJ29qFB-';
    const cesiBrand = () => `<span class="cesi-brand-wrap"><img class="cesi-brand-svg cesi-brand-img" src="${CESI_LOGO_URL}" alt="CESI École d'ingénieurs" /><img class="cesi-brand-svg cesi-brand-img cesi-brand-yellow" src="${CESI_LOGO_URL}" alt="" aria-hidden="true" /></span>`;
    const BRAND_CSS = `
        .cesi-brand-link { display: inline-flex !important; align-items: center !important; text-decoration: none !important; flex-shrink: 0 !important; color: #0f172a !important; }
        html.dark .cesi-brand-link, html.cesi-dark .cesi-brand-link, html.scn-dark .cesi-brand-link { color: #f0f6fc !important; }
        .cesi-brand-wrap { position: relative; display: inline-flex; align-items: center; }
        .cesi-brand-svg, .cesi-brand-img { height: 48px; width: auto !important; display: block; object-fit: contain; }
        .cesi-brand-yellow { display: none !important; position: absolute; inset: 0; pointer-events: none; clip-path: inset(40% 0 38% 73%); }
        html.dark .cesi-brand-img:not(.cesi-brand-yellow), html.cesi-dark .cesi-brand-img:not(.cesi-brand-yellow), html.scn-dark .cesi-brand-img:not(.cesi-brand-yellow) { filter: brightness(0) invert(1); }
        html.dark .cesi-brand-yellow, html.cesi-dark .cesi-brand-yellow, html.scn-dark .cesi-brand-yellow { display: block !important; }
        html.cesi-theme-switching *, html.cesi-theme-switching *::before, html.cesi-theme-switching *::after,
        html.cesi-theme-switching #page-wrapper *, html.cesi-theme-switching #cesi-app *, html.cesi-theme-switching #scn-shell * { transition: none !important; }
    `;
    const CAMPUS_3D_CSS = `
        .cesi-map-section { margin-top: 32px; }
        .cesi-map-section .section-title { display: flex; align-items: center; gap: 8px; font-size: .95rem; font-weight: 700; letter-spacing: .3px; text-transform: uppercase; color: var(--c-ink); margin: 0 0 16px; padding: 0 4px; }
        .cesi-map-section .section-title svg { width: 18px; height: 18px; color: var(--c-muted); fill: currentColor; }
        .cesi-map-card { background: var(--c-card); border: 1px solid var(--c-line); border-radius: var(--radius); box-shadow: var(--shadow-sm); overflow: hidden; }
        .cesi-map-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--c-line); background: var(--c-card); }
        .cesi-map-tabs { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .cesi-map-tab { height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--c-line); background: var(--c-soft); color: var(--c-muted); font: 700 .76rem 'Inter', sans-serif; cursor: pointer; transition: all .15s; }
        .cesi-map-tab:hover { color: var(--c-ink); border-color: var(--c-line-strong); }
        .cesi-map-tab.active { background: var(--c-accent); color: #141413 !important; border-color: var(--c-accent); }
        .cesi-map-status { display: inline-flex; align-items: center; gap: 8px; padding: 5px 12px; border-radius: 999px; background: var(--c-accent-soft); border: 1px solid rgba(251,226,22,.45); color: var(--c-accent-ink) !important; font-size: .76rem; font-weight: 700; cursor: pointer; transition: all .15s; }
        .cesi-map-status:hover { background: var(--c-accent); color: #141413 !important; }
        .cesi-map-status.is-live { background: #dcfce7; border-color: #86efac; color: #166534 !important; }
        .cesi-map-status span { color: inherit !important; }
        .cesi-map-status .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
        .cesi-map-status.is-live .dot { background: #16a34a; animation: cesiPulse 1.4s infinite; }
        #cesi-3d-stage { position: relative; height: 430px; perspective: 1150px; overflow: hidden; cursor: grab; user-select: none; background: radial-gradient(circle at 50% 45%, var(--c-soft) 0%, var(--c-bg) 100%); touch-action: none; contain: layout style paint; overscroll-behavior: contain; }
        #cesi-3d-stage:active { cursor: grabbing; }
        #cesi-3d-world { position: absolute; left: 50%; top: 52%; transform-style: preserve-3d; transition: transform .22s cubic-bezier(.22,1,.36,1); }
        #cesi-3d-stage.is-dragging #cesi-3d-world { transition: none; will-change: transform; }
        #cesi-3d-stage.is-dragging .m3d-face { transition: none !important; }
        .m3d-floor { position: absolute; width: 700px; height: 250px; left: -350px; top: -125px; transform-style: preserve-3d; transition: transform .3s cubic-bezier(.22,1,.36,1), opacity .2s; }
        .m3d-slab { position: absolute; background: var(--c-card); border: 2px solid var(--c-line-strong); border-radius: 14px; box-shadow: 0 18px 36px rgba(0,0,0,.14); transform-style: preserve-3d; }
        html.dark .m3d-slab { background: #161b22; border-color: #30363d; box-shadow: 0 18px 38px rgba(0,0,0,.45); }
        .m3d-slab-west { left: 8px; top: 8px; width: 172px; height: 224px; transform: rotateZ(-10deg); }
        .m3d-slab-center { left: 172px; top: 32px; width: 428px; height: 188px; }
        .m3d-slab-east { left: 598px; top: 24px; width: 112px; height: 196px; transform: rotateZ(10deg); }
        .m3d-floor-tag { position: absolute; left: 12px; top: -24px; font-size: .72rem; font-weight: 800; letter-spacing: .5px; color: var(--c-ink) !important; background: var(--c-card); border: 1px solid var(--c-line); padding: 2px 9px; border-radius: 6px; transform: translateZ(4px); pointer-events: none; }
        .m3d-corridor { position: absolute; left: 162px; top: 112px; width: 430px; height: 26px; background: rgba(148,163,184,.08); border-top: 1px solid var(--c-line); border-bottom: 1px solid var(--c-line); display: flex; align-items: center; justify-content: center; font-size: .54rem; font-weight: 700; letter-spacing: 2.5px; color: var(--c-muted); pointer-events: none; }
        .m3d-corridor-hall { position: absolute; left: 92px; top: 150px; width: 72px; height: 56px; background: rgba(148,163,184,.08); border-radius: 6px; pointer-events: none; }
        .m3d-corridor-wl { position: absolute; left: 74px; top: 10px; width: 16px; height: 144px; background: rgba(148,163,184,.08); border-radius: 4px; pointer-events: none; }
        .m3d-corridor-wr { position: absolute; left: 152px; top: 58px; width: 16px; height: 96px; background: rgba(148,163,184,.08); border-radius: 4px; pointer-events: none; }
        .m3d-corridor-e { position: absolute; left: 584px; top: 32px; width: 16px; height: 116px; transform: rotateZ(10deg); background: rgba(148,163,184,.08); border-radius: 4px; pointer-events: none; }
        .m3d-entrance { position: absolute; left: 112px; bottom: -4px; padding: 3px 10px; border-radius: 6px; background: var(--c-ink); color: var(--c-bg) !important; font-size: .62rem; font-weight: 800; letter-spacing: .6px; transform: translateZ(4px) rotateZ(-10deg); pointer-events: none; }
        .m3d-compass { position: absolute; right: 12px; top: 8px; font-size: .6rem; font-weight: 800; color: var(--c-muted) !important; transform: translateZ(4px); pointer-events: none; }
        .m3d-room { position: absolute; transform-style: preserve-3d; cursor: pointer; --h: 20px; --top-bg: var(--c-soft); --wall-bg: #cbd5e1; --wall-side: #94a3b8; --bd: var(--c-line-strong); --fg: var(--c-ink); }
        html.dark .m3d-room { --top-bg: #21262d; --wall-bg: #2d333b; --wall-side: #1c2128; --bd: #444c56; }
        .m3d-room:hover { --h: 26px; --top-bg: var(--c-card); --bd: var(--c-accent); }
        .m3d-room.is-special { --top-bg: rgba(148,163,184,.16); }
        .m3d-room.is-wc { --h: 16px; --top-bg: #dbeafe; --wall-bg: #93c5fd; --wall-side: #60a5fa; --bd: #3b82f6; --fg: #1e3a8a; }
        html.dark .m3d-room.is-wc { --top-bg: #1e3a5f; --wall-bg: #1d4ed8; --wall-side: #1e40af; --bd: #60a5fa; --fg: #dbeafe; }
        .m3d-room.is-stairs { --h: 14px; --top-bg: #e2e8f0; --wall-bg: #94a3b8; --wall-side: #64748b; --bd: #64748b; --fg: #334155; }
        html.dark .m3d-room.is-stairs { --top-bg: #1f2937; --wall-bg: #374151; --wall-side: #111827; --bd: #4b5563; --fg: #9ca3af; }
        .m3d-room.is-admin { --h: 24px; --top-bg: #f3e8ff; --wall-bg: #c084fc; --wall-side: #9333ea; --bd: #a855f7; --fg: #581c87; }
        html.dark .m3d-room.is-admin { --top-bg: #3b1d5e; --wall-bg: #6b21a8; --wall-side: #4c1d95; --bd: #a855f7; --fg: #f3e8ff; }
        .m3d-room.is-terrace { --h: 8px; --top-bg: #dcfce7; --wall-bg: #4ade80; --wall-side: #16a34a; --bd: #22c55e; --fg: #14532d; }
        html.dark .m3d-room.is-terrace { --top-bg: #14532d; --wall-bg: #15803d; --wall-side: #166534; --bd: #4ade80; --fg: #dcfce7; }
        .m3d-room.is-active { --h: 34px; --top-bg: var(--c-accent); --wall-bg: #eab308; --wall-side: #ca8a04; --bd: #141413; --fg: #141413; }
        .m3d-room.is-active.is-live { --h: 38px; --top-bg: #22c55e; --wall-bg: #16a34a; --wall-side: #15803d; --bd: #052e16; --fg: #ffffff; }
        .m3d-face { position: absolute; box-sizing: border-box; border: 1px solid var(--bd); transition: transform .22s ease, background .2s ease, border-color .2s ease; }
        .m3d-top { inset: 0; background: var(--top-bg); transform: translateZ(var(--h)); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 3px; border-radius: 4px; color: var(--fg) !important; font-weight: 800; font-size: .68rem; line-height: 1.15; }
        .m3d-top span, .m3d-top small { color: inherit !important; }
        .m3d-top small { font-size: .56rem; font-weight: 600; opacity: .82; margin-top: 2px; }
        .m3d-front { left: 0; right: 0; bottom: 0; height: var(--h); background: var(--wall-bg); transform-origin: bottom; transform: rotateX(-90deg); }
        .m3d-back  { left: 0; right: 0; top: 0; height: var(--h); background: var(--wall-bg); transform-origin: top; transform: rotateX(90deg); }
        .m3d-left  { top: 0; bottom: 0; left: 0; width: var(--h); background: var(--wall-side); transform-origin: left; transform: rotateY(-90deg); }
        .m3d-right { top: 0; bottom: 0; right: 0; width: var(--h); background: var(--wall-side); transform-origin: right; transform: rotateY(90deg); }
        .m3d-pin { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) translateZ(calc(var(--h) + 22px)) rotateX(-55deg); background: #141413; color: #fbe216 !important; padding: 3px 8px; border-radius: 999px; font-size: .64rem; font-weight: 800; white-space: nowrap; box-shadow: 0 6px 14px rgba(0,0,0,.35); pointer-events: none; }
        .m3d-room.is-live .m3d-pin { background: #166534; color: #ffffff !important; }
        .cesi-map-hud { position: absolute; left: 14px; bottom: 14px; z-index: 10; pointer-events: none; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .cesi-map-hint { background: rgba(15,23,42,.85); color: #f8fafc !important; padding: 5px 10px; border-radius: 8px; font-size: .7rem; font-weight: 600; }
        .cesi-map-detail { position: absolute; right: 14px; bottom: 14px; z-index: 10; max-width: 280px; background: var(--c-card); border: 1px solid var(--c-line); border-left: 4px solid var(--c-accent); border-radius: 10px; padding: 10px 13px; box-shadow: var(--shadow-md); font-size: .76rem; color: var(--c-text); }
        .cesi-map-detail strong { display: block; color: var(--c-ink); font-size: .84rem; margin-bottom: 3px; }
        .cesi-map-detail .sub { color: var(--c-muted); font-size: .72rem; }
    `;
    const mountCampus3D = (mountEl) => {
        if (!mountEl) return { updateFromItems: () => {}, selectCourse: () => {} };
        const FLOORS = {
            RDC: {
                label: 'RDC — Rez-de-chaussée',
                hasEast: true,
                rooms: [
                    { id: 'atelier3', wing: 'west', label: 'Atelier 3', x: 10, y: 10, w: 62, h: 46, kind: 'special', info: 'Atelier technique · Aile Ouest' },
                    { id: 'atelier2', wing: 'west', label: 'Atelier 2', x: 10, y: 62, w: 62, h: 46, kind: 'special', info: 'Atelier technique · Aile Ouest' },
                    { id: 'fablab', wing: 'west', label: 'FabLab', x: 10, y: 114, w: 62, h: 78, kind: 'special', info: 'Atelier de fabrication numérique · Aile Ouest' },
                    { id: 'bde', wing: 'west', label: 'BDE', x: 92, y: 10, w: 64, h: 46, kind: 'special', info: 'Bureau des Étudiants · Aile Ouest' },
                    { id: 'rdc_esc_o', wing: 'west', label: 'Esc. / Asc.', x: 96, y: 66, w: 54, h: 76, kind: 'stairs', info: 'Escalier principal & ascenseur · Hall d\'entrée' },
                    { id: 'rdc_wc_o', label: 'WC 🚻', x: 176, y: 40, w: 40, h: 66, kind: 'wc', info: 'Toilettes Ouest · RDC' },
                    { id: 's2', label: 'Salle 2', x: 222, y: 40, w: 58, h: 66, info: 'Salle de cours · RDC Nord' },
                    { id: 's4', label: 'Salle 4', x: 286, y: 40, w: 58, h: 66, info: 'Salle de cours · RDC Nord' },
                    { id: 's6', label: 'Salle 6', x: 350, y: 40, w: 58, h: 66, info: 'Salle de cours · RDC Nord' },
                    { id: 's8', label: 'Salle 8', x: 414, y: 40, w: 58, h: 66, info: 'Salle de cours · RDC Nord' },
                    { id: 's9', label: 'Salle 9', x: 478, y: 40, w: 58, h: 66, info: 'Salle de cours · RDC Nord' },
                    { id: 's1', label: 'Salle 1', x: 200, y: 144, w: 62, h: 66, info: 'Salle de cours · RDC Sud (près de l\'entrée)' },
                    { id: 's3', label: 'Salle 3', x: 268, y: 144, w: 62, h: 66, info: 'Salle de cours · RDC Sud' },
                    { id: 's5', label: 'Salle 5', x: 336, y: 144, w: 62, h: 66, info: 'Salle de cours · RDC Sud' },
                    { id: 's7', label: 'Salle 7', x: 404, y: 144, w: 62, h: 66, info: 'Salle de cours · RDC Sud' },
                    { id: 'rdc_tech', label: 'Local Tech.', x: 472, y: 144, w: 64, h: 66, kind: 'special', info: 'Locaux techniques & accès terrasse · RDC' },
                    { id: 'rdc_wc_e', label: 'WC 🚻', x: 544, y: 20, w: 40, h: 52, kind: 'wc', info: 'Toilettes Est · RDC' },
                    { id: 'rdc_esc_e', label: 'Esc. Est', x: 544, y: 78, w: 40, h: 58, kind: 'stairs', info: 'Escalier Est · RDC' },
                    { id: 'recantou', wing: 'east', label: 'Lou Recantou', sub: 'Détente & Repas', x: 10, y: 10, w: 92, h: 176, kind: 'special', info: 'Espace restauration (7 micro-ondes, terrasse) · Aile Est' },
                ]
            },
            'R+1': {
                label: 'R+1 — 1er étage',
                hasEast: true,
                rooms: [
                    { id: 'r1_wo1', wing: 'west', label: 'Salle ?', x: 10, y: 10, w: 62, h: 46, kind: 'special', info: 'Salle R+1 Aile Ouest (nom à définir)' },
                    { id: 'r1_wo2', wing: 'west', label: 'Salle ?', x: 10, y: 62, w: 62, h: 46, kind: 'special', info: 'Salle R+1 Aile Ouest (nom à définir)' },
                    { id: 'r1_10', wing: 'west', label: '10 - R+1', x: 10, y: 114, w: 62, h: 78, info: 'Salle de cours · R+1 Aile Ouest' },
                    { id: 'r1_wo3', wing: 'west', label: 'Salle ?', x: 92, y: 10, w: 64, h: 46, kind: 'special', info: 'Salle R+1 Aile Ouest (nom à définir)' },
                    { id: 'r1_esc_o', wing: 'west', label: 'Esc. / Asc.', x: 96, y: 66, w: 54, h: 76, kind: 'stairs', info: 'Escalier principal & ascenseur · R+1' },
                    { id: 'r1_wc_o', label: 'WC 🚻', x: 176, y: 40, w: 40, h: 66, kind: 'wc', info: 'Toilettes Ouest · R+1' },
                    { id: 'r1_17', label: '17 - R+1', x: 222, y: 40, w: 58, h: 66, info: 'Salle de cours · R+1 Nord' },
                    { id: 'r1_19', label: '19 - R+1', x: 286, y: 40, w: 58, h: 66, info: 'Salle de cours · R+1 Nord' },
                    { id: 'r1_21', label: '21 - R+1', x: 350, y: 40, w: 58, h: 66, info: 'Salle de cours · R+1 Nord' },
                    { id: 'r1_23', label: '23 - R+1', x: 414, y: 40, w: 58, h: 66, info: 'Salle de cours · R+1 Nord' },
                    { id: 'r1_25', label: '25 - R+1', x: 478, y: 40, w: 58, h: 66, info: 'Salle de cours · R+1 Nord' },
                    { id: 'r1_16', label: '16 - R+1', x: 200, y: 144, w: 58, h: 66, info: 'Salle de cours · R+1 Sud' },
                    { id: 'r1_18', label: '18 - R+1', x: 264, y: 144, w: 58, h: 66, info: 'Salle de cours · R+1 Sud' },
                    { id: 'r1_20', label: '20 - R+1', x: 328, y: 144, w: 58, h: 66, info: 'Salle de cours · R+1 Sud' },
                    { id: 'r1_22', label: '22 - R+1', x: 392, y: 144, w: 58, h: 66, info: 'Salle de cours · R+1 Sud' },
                    { id: 'r1_24', label: '24 - R+1', x: 456, y: 144, w: 58, h: 66, info: 'Salle de cours · R+1 Sud' },
                    { id: 'r1_26', label: '26 - R+1', x: 520, y: 148, w: 56, h: 60, info: 'Salle de cours · R+1 Jonction Est' },
                    { id: 'r1_wc_e', label: 'WC 🚻', x: 544, y: 20, w: 40, h: 52, kind: 'wc', info: 'Toilettes Est · R+1' },
                    { id: 'r1_esc_e', label: 'Esc. Est', x: 544, y: 78, w: 40, h: 58, kind: 'stairs', info: 'Escalier Est · R+1' },
                    { id: 'r1_labo', wing: 'east', label: 'Labo Chimie', x: 10, y: 10, w: 92, h: 40, kind: 'special', info: 'Laboratoire de chimie · R+1 Aile Est (fond)' },
                    { id: 'r1_29', wing: 'east', label: '29 - R+1', x: 10, y: 55, w: 92, h: 40, info: 'Salle de cours · R+1 Aile Est' },
                    { id: 'r1_28', wing: 'east', label: '28 - R+1', x: 10, y: 100, w: 92, h: 40, info: 'Salle de cours · R+1 Aile Est' },
                    { id: 'r1_27', wing: 'east', label: '27 - R+1', x: 10, y: 145, w: 92, h: 42, info: 'Salle de cours · R+1 Angle Sud-Est' },
                ]
            },
            'R+2': {
                label: 'R+2 — 2ème étage',
                hasEast: false,
                rooms: [
                    { id: 'r2_wo1', wing: 'west', label: 'Salle ?', x: 10, y: 10, w: 62, h: 46, kind: 'special', info: 'Salle R+2 Aile Ouest (nom à définir)' },
                    { id: 'r2_wo2', wing: 'west', label: 'Salle ?', x: 10, y: 62, w: 62, h: 46, kind: 'special', info: 'Salle R+2 Aile Ouest (nom à définir)' },
                    { id: 'r2_wo4', wing: 'west', label: 'Salle ?', x: 10, y: 114, w: 62, h: 78, kind: 'special', info: 'Salle R+2 Aile Ouest (nom à définir)' },
                    { id: 'r2_wo3', wing: 'west', label: 'Salle ?', x: 92, y: 10, w: 64, h: 46, kind: 'special', info: 'Salle R+2 Aile Ouest (nom à définir)' },
                    { id: 'r2_esc_o', wing: 'west', label: 'Esc. / Asc.', x: 96, y: 66, w: 54, h: 76, kind: 'stairs', info: 'Escalier principal & ascenseur · R+2' },
                    { id: 'r2_wc_o', label: 'WC 🚻', x: 176, y: 40, w: 40, h: 66, kind: 'wc', info: 'Toilettes Ouest · R+2' },
                    { id: 'admin1', label: 'Administration', sub: 'Bureaux & Scolarité', x: 222, y: 40, w: 186, h: 66, kind: 'admin', info: 'Pôle Administration & Scolarité · R+2 Nord' },
                    { id: 'admin2', label: 'Administration', sub: 'Direction & Pilotes', x: 414, y: 40, w: 122, h: 66, kind: 'admin', info: 'Pôle Direction & Pilotes · R+2 Nord' },
                    { id: 'r2_30', label: '30 - R+2 (temp.)', x: 200, y: 144, w: 62, h: 66, info: 'Salle R+2 Sud (numéro temporaire)' },
                    { id: 'r2_32', label: '32 - R+2 (temp.)', x: 268, y: 144, w: 62, h: 66, info: 'Salle R+2 Sud (numéro temporaire)' },
                    { id: 'r2_pause', label: 'Pause Employés', sub: 'Ex-Salle 5', x: 336, y: 144, w: 62, h: 66, kind: 'special', info: 'Salle de pause pour les employés · R+2 Sud' },
                    { id: 'r2_terrasse', label: 'Terrasse 🌿', sub: 'Extérieur', x: 404, y: 144, w: 132, h: 66, kind: 'terrace', info: 'Terrasse extérieure · R+2 Sud-Est' },
                    { id: 'r2_esc_e', label: 'Esc. Est', x: 544, y: 78, w: 40, h: 58, kind: 'stairs', info: 'Escalier Est · R+2' },
                ]
            }
        };

        mountEl.innerHTML = `
            <section class="cesi-map-section">
                <h3 class="section-title">${svg('pin')} Plan 3D du Campus — CESI Pau</h3>
                <div class="cesi-map-card">
                    <div class="cesi-map-bar">
                        <div class="cesi-map-tabs">
                            <button type="button" class="cesi-map-tab active" data-floor="RDC">RDC</button>
                            <button type="button" class="cesi-map-tab" data-floor="R+1">R+1</button>
                            <button type="button" class="cesi-map-tab" data-floor="R+2">R+2</button>
                            <button type="button" class="cesi-map-tab" data-floor="ALL">Vue 3D (3 étages)</button>
                        </div>
                        <button type="button" class="cesi-map-status" id="cesi-map-status" title="Centrer sur la salle du cours">
                            <span class="dot"></span><span id="cesi-map-status-txt">Chargement du cours…</span>
                        </button>
                        <div class="cesi-map-tabs">
                            <button type="button" class="cesi-map-tab" id="cesi-3d-zout" title="Dézoomer">−</button>
                            <button type="button" class="cesi-map-tab" id="cesi-3d-zin" title="Zoomer">+</button>
                            <button type="button" class="cesi-map-tab" id="cesi-3d-reset" title="Réinitialiser la vue">↺ Reset</button>
                        </div>
                    </div>
                    <div id="cesi-3d-stage">
                        <div id="cesi-3d-world"></div>
                        <div class="cesi-map-hud">
                            <span class="cesi-map-hint">🖱️ Glisser pour tourner en 3D · Molette pour zoomer · Cliquer sur une salle</span>
                        </div>
                        <div class="cesi-map-detail" id="cesi-map-detail" hidden></div>
                    </div>
                </div>
            </section>`;

        const stage = mountEl.querySelector('#cesi-3d-stage');
        const world = mountEl.querySelector('#cesi-3d-world');
        const detail = mountEl.querySelector('#cesi-map-detail');
        const statusBtn = mountEl.querySelector('#cesi-map-status');
        const statusTxt = mountEl.querySelector('#cesi-map-status-txt');

        let curFloor = 'RDC', activeTarget = null, rotX = 52, rotZ = -18, scale = 0.96;
        const applyCam = () => { world.style.transform = `scale(${scale}) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`; };

        const matchRooms = (rawPlace) => {
            if (!rawPlace) return null;
            const full = String(rawPlace).toLowerCase().trim();
            const defaultFloor = full.includes('r+2') ? 'R+2' : full.includes('r+1') ? 'R+1' : 'RDC';
            const parts = full.split(/[,/;|]+|\s+\+\s+/).map((p) => p.trim()).filter(Boolean);
            const roomIds = [];
            let floor = defaultFloor;
            const matchOne = (seg) => {
                const f = seg.includes('r+2') ? 'R+2' : seg.includes('r+1') ? 'R+1' : defaultFloor;
                const candidates = FLOORS[f]?.rooms || [];
                let hit = candidates.find((r) => r.label.toLowerCase() === seg) || candidates.find((r) => seg.includes(r.label.toLowerCase()));
                if (!hit) {
                    const cleanSeg = seg.replace(/r\s*\+\s*\d+/gi, ' ');
                    const nums = [...cleanSeg.matchAll(/\b(\d{1,2})\b/g)].map((m) => m[1]);
                    const isAtelier = cleanSeg.includes('atelier');
                    const hits = [];
                    for (const n of nums) {
                        const re = new RegExp(`\\b${n}\\b`);
                        const h = candidates.find((r) => (isAtelier || !r.label.toLowerCase().includes('atelier')) && re.test(r.label.toLowerCase().replace(/r\s*\+\s*\d+/gi, ' ')));
                        if (h) hits.push({ f, id: h.id });
                    }
                    if (hits.length) return hits;
                }
                if (!hit) {
                    for (const fk of Object.keys(FLOORS)) {
                        hit = FLOORS[fk].rooms.find((r) => seg.includes(r.label.toLowerCase()));
                        if (hit) return [{ f: fk, id: hit.id }];
                    }
                }
                return hit ? [{ f, id: hit.id }] : [];
            };
            for (const part of (parts.length ? parts : [full])) {
                for (const res of matchOne(part)) {
                    if (!roomIds.length) floor = res.f;
                    if (res.f === floor && !roomIds.includes(res.id)) roomIds.push(res.id);
                }
            }
            return { floor, roomIds };
        };

        const showDetail = (room, floorKey) => {
            if (!room) { detail.hidden = true; return; }
            const isTarget = activeTarget && activeTarget.roomIds.includes(room.id) && activeTarget.floor === floorKey;
            const titlePlace = isTarget && activeTarget.roomIds.length > 1 ? activeTarget.rawPlace : room.label;
            detail.hidden = false;
            detail.innerHTML = isTarget
                ? `<strong>${esc(titlePlace)} (${esc(floorKey)})</strong><div>${esc(activeTarget.title)}</div><div class="sub">${esc(activeTarget.time)}${activeTarget.teacher ? ' · ' + esc(activeTarget.teacher) : ''}</div>`
                : `<strong>${esc(room.label)} (${esc(floorKey)})</strong><div class="sub">${esc(room.info || 'Campus CESI Pau')}</div>`;
        };

        const buildFloor = (floorKey, zOffset) => {
            const f = FLOORS[floorKey];
            const renderRoom = (r) => {
                const isAct = activeTarget && activeTarget.floor === floorKey && activeTarget.roomIds.includes(r.id);
                const isPin = isAct && activeTarget.roomIds[0] === r.id;
                const cls = ['m3d-room', r.kind ? `is-${r.kind}` : '', isAct ? 'is-active' : '', isAct && activeTarget.live ? 'is-live' : ''].filter(Boolean).join(' ');
                return `
                    <div class="${cls}" data-floor="${esc(floorKey)}" data-room-id="${esc(r.id)}" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;">
                        <div class="m3d-face m3d-front"></div><div class="m3d-face m3d-back"></div>
                        <div class="m3d-face m3d-left"></div><div class="m3d-face m3d-right"></div>
                        <div class="m3d-face m3d-top"><span>${esc(r.label)}</span>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</div>
                        ${isPin ? `<div class="m3d-pin">${activeTarget.live ? '● EN COURS' : '📍 COURS'}</div>` : ''}
                    </div>`;
            };
            const westHtml = f.rooms.filter((r) => r.wing === 'west').map(renderRoom).join('');
            const eastHtml = f.rooms.filter((r) => r.wing === 'east').map(renderRoom).join('');
            const centerHtml = f.rooms.filter((r) => !r.wing).map(renderRoom).join('');
            return `
                <div class="m3d-floor" style="transform: translateZ(${zOffset}px);">
                    <div class="m3d-slab m3d-slab-west"><div class="m3d-corridor-hall"></div><div class="m3d-corridor-wl"></div><div class="m3d-corridor-wr"></div>${westHtml}</div>
                    <div class="m3d-slab m3d-slab-center"></div>
                    ${f.hasEast ? `<div class="m3d-slab m3d-slab-east">${eastHtml}</div>` : ''}
                    <span class="m3d-floor-tag">${esc(f.label)}</span><span class="m3d-compass">NORD ↑</span>
                    <div class="m3d-corridor">COULOIR CENTRAL</div>${f.hasEast ? '<div class="m3d-corridor-e"></div>' : ''}
                    ${floorKey === 'RDC' ? '<span class="m3d-entrance">ENTRÉE SUD</span>' : ''}${centerHtml}
                </div>`;
        };

        const renderWorld = () => {
            mountEl.querySelectorAll('.cesi-map-tab[data-floor]').forEach((b) => b.classList.toggle('active', b.dataset.floor === curFloor));
            world.innerHTML = curFloor === 'ALL'
                ? buildFloor('RDC', -70) + buildFloor('R+1', 25) + buildFloor('R+2', 120)
                : buildFloor(curFloor, 0);
            applyCam();
        };

        const selectCourse = (info, autoSwitch = true) => {
            const m = matchRooms(info.place);
            activeTarget = { floor: m ? m.floor : 'RDC', roomIds: m ? m.roomIds : [], title: info.title, time: info.time, teacher: info.teacher || '', live: !!info.live, rawPlace: info.place };
            if (autoSwitch && curFloor !== 'ALL') curFloor = activeTarget.floor;
            statusBtn.classList.toggle('is-live', activeTarget.live);
            statusTxt.textContent = `${activeTarget.live ? 'EN COURS' : 'PROCHAIN'} : ${info.place}`;
            renderWorld();
            const rObj = (FLOORS[activeTarget.floor]?.rooms || []).find((x) => activeTarget.roomIds.includes(x.id));
            if (rObj) showDetail(rObj, activeTarget.floor);
        };

        const updateFromItems = (rawItems) => {
            const now = new Date();
            const items = (rawItems || []).slice().sort((a, b) => a.startD - b.startD);
            const liveCourse = items.find((c) => now >= c.startD && now < c.endD);
            const nextCourse = liveCourse || items.find((c) => c.endD > now);
            if (nextCourse) {
                selectCourse({ place: nextCourse.place, title: nextCourse.title, time: nextCourse.allDay ? 'Journée' : `${nextCourse.start} - ${nextCourse.end}`, teacher: nextCourse.teacher, live: !!liveCourse }, true);
            } else {
                activeTarget = null;
                statusBtn.classList.remove('is-live');
                statusTxt.textContent = 'Aucun cours à venir';
                renderWorld();
            }
        };

        let drag = null, rafId = 0;
        const scheduleCam = () => { if (!rafId) rafId = requestAnimationFrame(() => { rafId = 0; applyCam(); }); };
        stage.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.m3d-room')) return;
            drag = { x: e.clientX, y: e.clientY, rx: rotX, rz: rotZ };
            stage.classList.add('is-dragging');
            stage.setPointerCapture?.(e.pointerId);
        });
        stage.addEventListener('pointermove', (e) => {
            if (!drag) return;
            rotZ = drag.rz - (e.clientX - drag.x) * 0.35;
            rotX = Math.max(15, Math.min(78, drag.rx - (e.clientY - drag.y) * 0.3));
            scheduleCam();
        });
        const endDrag = () => { drag = null; stage.classList.remove('is-dragging'); };
        stage.addEventListener('pointerup', endDrag);
        stage.addEventListener('pointercancel', endDrag);
        window.addEventListener('wheel', (e) => {
            if (!e.target || !e.target.closest || !e.target.closest('#cesi-3d-stage')) return;
            e.preventDefault(); e.stopPropagation();
            const dy = e.deltaY || (e.wheelDeltaY ? -e.wheelDeltaY : 0);
            if (!dy) return;
            const step = e.deltaMode === 1 ? -dy * 0.05 : -dy * 0.002;
            const delta = Math.abs(step) > 0.01 ? Math.max(-0.2, Math.min(0.2, step)) : -Math.sign(dy) * 0.08;
            scale = Math.max(0.55, Math.min(2.2, scale + delta));
            applyCam();
        }, { passive: false, capture: true });
        world.addEventListener('click', (e) => {
            const rmEl = e.target.closest('.m3d-room');
            if (!rmEl) return;
            const fk = rmEl.dataset.floor, rid = rmEl.dataset.roomId;
            const rObj = (FLOORS[fk]?.rooms || []).find((x) => x.id === rid);
            if (rObj) showDetail(rObj, fk);
        });
        mountEl.querySelectorAll('.cesi-map-tab[data-floor]').forEach((b) => b.addEventListener('click', () => { curFloor = b.dataset.floor; renderWorld(); }));
        mountEl.querySelector('#cesi-3d-zin')?.addEventListener('click', () => { scale = Math.min(2.2, scale + 0.12); applyCam(); });
        mountEl.querySelector('#cesi-3d-zout')?.addEventListener('click', () => { scale = Math.max(0.55, scale - 0.12); applyCam(); });
        mountEl.querySelector('#cesi-3d-reset')?.addEventListener('click', () => { rotX = 52; rotZ = -18; scale = 0.96; applyCam(); });
        statusBtn?.addEventListener('click', () => { if (activeTarget) { curFloor = activeTarget.floor; rotX = 52; rotZ = -18; scale = 1.04; renderWorld(); } });
        renderWorld();
        return { updateFromItems, selectCourse };
    };
    const withInstantTheme = (docs, fn) => {
        const els = docs.map((d) => d?.documentElement).filter(Boolean);
        els.forEach((el) => el.classList.add('cesi-theme-switching'));
        fn();
        els.forEach((el) => void el.offsetHeight);
        requestAnimationFrame(() => requestAnimationFrame(() => els.forEach((el) => el.classList.remove('cesi-theme-switching'))));
    };
    const getSystemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    const getSavedTheme = () => {
        try { return localStorage.getItem('cesi_theme') || localStorage.getItem('scn-theme'); } catch { return null; }
    };
    const isPrefDark = () => {
        const saved = getSavedTheme();
        return saved ? saved === 'dark' : getSystemDark();
    };
    const onSystemThemeChange = (cb) => {
        window.matchMedia?.('(prefers-color-scheme: dark)')?.addEventListener('change', (e) => {
            if (!getSavedTheme()) cb(e.matches);
        });
    };

    const EDT_DAYS_SHOWN = 3;           // nombre de jours de cours affichés
    const EDT_DAYS_AHEAD = 14;          // fenêtre de recherche (pour trouver 3 jours de cours)
    const EDT_REFRESH_MIN = 10;         // re-téléchargement de l'EDT (minutes)

    // Moodle : liens propres à ton parcours (non exposés par l'ENT)
    const MOODLE_LINKS = [
        { href: "https://moodle.cesi.fr/", title: "Accueil Moodle" },
        { href: "https://moodle.cesi.fr/my/courses.php", title: "Mes cours" },
        { href: "https://moodle.cesi.fr/course/view.php?id=6183", title: "A3 FISA Informatique 2026-2027" }
    ];

    // Repli si les accès directs ne sont pas trouvés sur la page
    const FALLBACK_ACCESS = [
        { href: "https://ent.cesi.fr/actualites", title: "Actualités", icon: "news" },
        { href: "https://ent.cesi.fr/ressources-numeriques", title: "Ressources numériques", icon: "book" },
        { href: "https://ent.cesi.fr/recherche-travaux-fin-detudes", title: "Travaux fin d'études", icon: "school" },
        { href: "https://ent.cesi.fr/infos-pratiques-pau-orbigny", title: "Infos pratiques", icon: "info" },
        { href: "https://moodle.cesi.fr/", title: "Moodle CESI", icon: "school" },
        { href: "http://support.viacesi.info", title: "Support CESI", icon: "support" },
        { href: "https://www.office.com", title: "Microsoft 365", icon: "apps" }
    ];

    /* =====================================================================
       1. ROUTEUR PRINCIPAL
       ===================================================================== */

    // --- 1.A. WAYF Central (https://wayf.cesi.fr/) ---
    if (host.includes('wayf.cesi.fr')) {
        handleWayf();
        return;
    }

    // --- 1.B. WAYF sur l'ENT (https://ent.cesi.fr/identification/wayf) ---
    if (host.includes('ent.cesi.fr') && path.includes('/identification/wayf')) {
        handleEntWayf();
        return;
    }

    // --- 1.C. Page de connexion Moodle (https://moodle.cesi.fr/login/index.php) ---
    if (host.includes('moodle.cesi.fr') && path.includes('/login/')) {
        handleMoodleLogin();
        return;
    }

    // --- 1.D. Page de connexion STS Viacesi (https://sts.viacesi.fr/) ---
    if (host.includes('sts.viacesi.fr')) {
        handleStsLogin();
        return;
    }

    // --- 1.E. Portail ENT CESI (https://ent.cesi.fr/) ---
    if (host.includes('ent.cesi.fr')) {
        if (path === '/' || path === '') {
            location.replace('https://ent.cesi.fr/accueil-apprenant');
            return;
        }
        if (path.includes('/accueil-apprenant')) {
            handleEntPortal();
        } else {
            handleEntSubpage();
        }
        return;
    }

    // --- 1.F. Moodle CESI (https://moodle.cesi.fr/) ---
    if (host.includes('moodle.cesi.fr')) {
        const isResourceCourse = path.includes('/mod_resource/content/') || path.includes('/pluginfile.php/');
        if (isResourceCourse) {
            handleCourseReader();
        } else {
            handleMoodlePlatform();
        }
        return;
    }

    // --- 1.G. Lecteur de cours Scenari (https://scenari.cesi.fr/ ou local file://) ---
    handleCourseReader();


    /* =====================================================================
       GESTIONNAIRES D'AUTHENTIFICATION & SSO
       ===================================================================== */

    let maskTimeout = null;
    const maskPage = (timeoutMs = 1200) => {
        addClass('cesi-sso-mask');
        addStyle(`
            html.cesi-sso-mask, html.cesi-sso-mask body { background: #0d1117 !important; color-scheme: dark !important; }
            html.cesi-sso-mask body { opacity: 0 !important; pointer-events: none !important; }
            html.cesi-sso-mask::after {
                content: "Connexion CESI en cours...";
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                font: 600 15px 'Inter', system-ui, sans-serif; color: #8b949e;
                z-index: 999999; pointer-events: none;
            }
        `, 'cesi-mask-style');
        if (maskTimeout) clearTimeout(maskTimeout);
        maskTimeout = setTimeout(unmaskPage, timeoutMs);
    };

    const unmaskPage = () => {
        if (maskTimeout) clearTimeout(maskTimeout);
        removeClass('cesi-sso-mask');
        document.querySelectorAll('.cesi-mask-style').forEach((el) => el.remove());
        if (document.body) {
            document.body.style.removeProperty('opacity');
            document.body.style.opacity = '1';
        }
    };

    function submitCredentials(input, form, value) {
        if (!input || !form) return false;
        try {
            input.focus();
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button.btn-submit, button.btn-primary, button[name="submitBtn"], [role="button"]');
            if (submitBtn) {
                submitBtn.click();
                return true;
            }
            if (typeof form.requestSubmit === 'function') {
                form.requestSubmit();
                return true;
            }
            HTMLFormElement.prototype.submit.call(form);
            return true;
        } catch (err) {
            console.error('[CESI SSO] Erreur lors de la soumission:', err);
            unmaskPage();
            return false;
        }
    }

    function tryFillAndSubmit(finder, maxAttempts = 20, interval = 50) {
        let attempts = 0;
        const timer = setInterval(() => {
            attempts++;
            const target = finder();
            if (target) {
                clearInterval(timer);
                submitCredentials(target.input, target.form, target.value);
            } else if (attempts >= maxAttempts) {
                clearInterval(timer);
                unmaskPage();
            }
        }, interval);
    }

    function handleWayf() {
        const email = getEmail();
        const hasParams = location.search.length > 1;

        if (!hasParams && (path === '/' || path === '')) {
            location.replace('https://ent.cesi.fr/');
            return;
        }

        const submitWayf = () => {
            const input = document.querySelector('input#login, input[name="username"], input[name="login"], input[type="email"], input[type="text"]:not([type="hidden"])');
            if (!input) return false;
            try {
                input.focus();
                input.value = email;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));

                // 1. Bouton #submit spécifique de wayf.cesi.fr
                const wayfBtn = document.querySelector('a#submit, .submit, a[title="Valider"], button#submit');
                if (wayfBtn) {
                    wayfBtn.click();
                    return true;
                }

                // 2. Si dans un formulaire CAS standard
                const form = input.closest('form');
                if (form) {
                    const btn = form.querySelector('button[type="submit"], input[type="submit"], .btn-submit, [role="button"]');
                    if (btn) { btn.click(); return true; }
                    if (typeof form.requestSubmit === 'function') { form.requestSubmit(); return true; }
                    HTMLFormElement.prototype.submit.call(form);
                    return true;
                }
                return false;
            } catch (err) {
                console.error('[CESI WAYF]', err);
                unmaskPage();
                return false;
            }
        };

        if (email) {
            maskPage(1500);

            onReady(() => {
                // Si bouton direct IdP (ex: Apprenant / Viacesi)
                const idpLink = document.querySelector('#clients a[href*="ViaCesi"], noscript a[href*="ViaCesi"]');
                if (idpLink && idpLink.href) {
                    location.href = idpLink.href;
                    return;
                }

                if (!submitWayf()) {
                    let attempts = 0;
                    const timer = setInterval(() => {
                        attempts++;
                        if (submitWayf() || attempts >= 25) {
                            clearInterval(timer);
                            if (attempts >= 25) unmaskPage();
                        }
                    }, 50);
                }
            });
        }
    }

    function applyLoginCardStyle() {
        addFont();
        if (!document.querySelector('link[href*="photo-1541829070764"]')) {
            const pre = document.createElement('link');
            pre.rel = 'preload'; pre.as = 'image';
            pre.href = 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=1920&auto=format&fit=crop';
            (document.head || document.documentElement)?.appendChild(pre);
        }
        addStyle(`
            ${BRAND_CSS}
            html {
                margin: 0 !important; padding: 0 !important; height: auto !important; min-height: 100% !important;
                background: #0d1117 !important;
            }
            body {
                background: linear-gradient(135deg, rgba(13,17,23,.82), rgba(10,12,16,.92)),
                            url('https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=1920&auto=format&fit=crop') center / cover no-repeat fixed #0d1117 !important;
                font-family: 'Inter', system-ui, sans-serif !important;
                margin: 0 !important; padding: max(24px, calc(50vh - 255px)) 0 24px !important;
                min-height: 100vh !important; width: 100% !important; box-sizing: border-box !important;
                display: flex !important; justify-content: center !important; align-items: flex-start !important;
                overflow-x: hidden !important;
            }
            body > *:not(#cesi-login-card) { display: none !important; }
            body::before { content: ""; position: fixed; inset: 0; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); pointer-events: none; z-index: 0; }
            #cesi-login-card {
                position: relative; z-index: 2; background: #fff; width: 100%; max-width: 420px;
                padding: 40px 32px; margin: 0 20px 32px; border-radius: 20px; box-shadow: 0 25px 60px rgba(0,0,0,.55);
                box-sizing: border-box; animation: cesiScaleIn .45s cubic-bezier(.16,1,.3,1);
            }
            #cesi-login-card.cesi-no-pop { animation: none !important; }
            @keyframes cesiScaleIn { from { opacity: 0; transform: scale(.97) translateY(10px); } to { opacity: 1; transform: none; } }
            #cesi-login-card .cesi-login-brand { display: flex; justify-content: center; margin: 0 auto 24px; color: #0f172a !important; }
            #cesi-login-card .cesi-login-brand .cesi-brand-svg { height: 42px; }
            #cesi-login-card h2 { font-size: 1.45rem; font-weight: 700; color: #0f172a; text-align: center; margin: 0 0 4px; letter-spacing: -.5px; }
            #cesi-login-card p.subtitle { font-size: .88rem; color: #64748b; text-align: center; margin: 0 0 26px; }
            #cesi-login-card form { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; box-sizing: border-box; }
            #cesi-login-card label { display: block !important; font-size: .72rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: .8px; margin: 14px 0 6px; }
            #cesi-login-card input[type="email"], #cesi-login-card input[type="text"], #cesi-login-card input[type="password"] {
                width: 100% !important; max-width: 100% !important; height: 48px !important;
                border: 1.5px solid #e2e8f0 !important; border-radius: 10px !important; padding: 0 16px !important;
                font: 500 .95rem 'Inter', sans-serif !important; color: #0f172a !important;
                background: #f8fafc !important; box-sizing: border-box !important; transition: all .2s ease !important;
            }
            #cesi-login-card input:focus { border-color: #FBE216 !important; background: #fff !important; box-shadow: 0 0 0 4px rgba(251,226,22,.3) !important; outline: none !important; }
            #cesi-login-card .style-26 { display: flex !important; align-items: center !important; margin: 15px 0 !important; }
            #cesi-login-card input[type="checkbox"] { width: 16px !important; height: 16px !important; accent-color: #FBE216; cursor: pointer; margin: 0 8px 0 0 !important; }
            #cesi-login-card .style-28 { font-size: .82rem !important; font-weight: 500 !important; color: #475569 !important; cursor: pointer; margin: 0 !important; }
            #cesi-login-card #submitButton, #cesi-login-card .style-30, #cesi-login-card input[type="submit"], #cesi-login-card button[type="submit"] {
                display: flex !important; justify-content: center !important; align-items: center !important;
                width: 100% !important; height: 48px !important; margin: 20px 0 0 !important; padding: 0 !important;
                background: #FBE216 !important; color: #000 !important; border: 0 !important; border-radius: 10px !important;
                font: 700 .9rem 'Inter', sans-serif !important; text-transform: uppercase; letter-spacing: .5px; cursor: pointer;
                box-shadow: 0 4px 14px rgba(251,226,22,.3) !important; transition: all .2s cubic-bezier(.4,0,.2,1) !important; box-sizing: border-box !important;
            }
            #cesi-login-card #submitButton:hover, #cesi-login-card .style-30:hover, #cesi-login-card input[type="submit"]:hover, #cesi-login-card button[type="submit"]:hover {
                background: #ebd10f !important; transform: translateY(-1.5px); box-shadow: 0 6px 20px rgba(251,226,22,.45) !important;
            }
            #cesi-login-card .help-links { border-top: 1px solid #f1f5f9; margin-top: 26px; padding-top: 18px; text-align: center; }
            #cesi-login-card .help-links a { color: #64748b; font-size: .78rem; text-decoration: none; margin: 0 8px; font-weight: 500; transition: color .15s; }
            #cesi-login-card .help-links a:hover { color: #0f172a; text-decoration: underline; }
        `);
    }

    function handleEntWayf() {
        const email = getEmail();
        applyLoginCardStyle();

        onReady(() => {
            const findEntInput = () => {
                const input = document.querySelector('input[name="login"], input[type="email"], input#username, input[type="text"]');
                const form = document.querySelector('form[name="wayf"]') || input?.closest('form');
                if (!input || !form) return null;
                return { input, form, value: email };
            };
            const target = findEntInput();
            if (!target) return;

            const { input, form } = target;
            const card = document.createElement('div');
            card.id = 'cesi-login-card';
            card.innerHTML = `<div class="cesi-login-brand">${cesiBrand()}</div><h2>Bienvenue sur l'ENT</h2><p class="subtitle">Identifiez-vous avec votre adresse CESI</p>`;

            const cleanForm = document.createElement('form');
            cleanForm.method = form.method || 'post';
            cleanForm.action = form.action || location.href;
            form.querySelectorAll('input[type="hidden"]').forEach((h) => cleanForm.appendChild(h.cloneNode(true)));

            const lbl = document.createElement('label');
            lbl.setAttribute('for', input.id || 'login');
            lbl.textContent = 'Identifiant CESI';
            input.placeholder = 'prenom.nom@viacesi.fr';
            if (email && !input.value) input.value = email;

            const submitBtn = document.createElement('button');
            submitBtn.type = 'submit';
            submitBtn.textContent = 'Continuer';

            cleanForm.append(lbl, input, submitBtn);
            const saveWayfState = () => {
                setEmail(input.value);
                try {
                    GM_setValue('cesi_login_h', String(Math.round(card.getBoundingClientRect().height)));
                    GM_setValue('cesi_login_ts', Date.now());
                } catch { /* ignore */ }
            };
            cleanForm.addEventListener('submit', saveWayfState, true);
            card.appendChild(cleanForm);

            document.body.innerHTML = '';
            document.body.appendChild(card);

            if (email) {
                saveWayfState();
                submitCredentials(input, cleanForm, email);
            } else {
                input.focus();
            }
        });
    }

    function handleMoodleLogin() {
        maskPage(1500);

        onReady(() => {
            const findButton = () => {
                const idpCandidates = Array.from(document.querySelectorAll(
                    '.potentialidps a, .potentialidplist a, .login-identityprovider-btn, .identityprovider, [data-action="oauth2-login"], a[href*="/auth/"], a[href*="idp"]'
                ));
                for (const a of idpCandidates) {
                    const txt = (a.textContent || '').toLowerCase();
                    const href = (a.getAttribute('href') || '').toLowerCase();
                    if (txt.includes('ent') || txt.includes('cesi') || href.includes('wayf') || href.includes('ent.cesi') || href.includes('saml') || href.includes('cas') || href.includes('oidc')) {
                        return a;
                    }
                }

                const allLinks = Array.from(document.querySelectorAll('a, button, [role="button"]'));
                for (const el of allLinks) {
                    if (el.closest('form#login, form.login-form, .loginform')) continue;
                    const txt = (el.textContent || '').trim().toLowerCase();
                    if ((txt.includes('ent') || txt.includes('cesi')) && (txt.includes('connexion') || txt.includes('connecter') || txt.includes('authentification') || el.classList.contains('btn'))) {
                        return el;
                    }
                }

                if (idpCandidates.length > 0) return idpCandidates[0];
                return null;
            };

            const triggerButton = (btn) => {
                if (btn.tagName === 'A' && btn.href && !btn.href.startsWith('javascript:')) {
                    location.href = btn.href;
                } else {
                    btn.click();
                }
            };

            const btn = findButton();
            if (btn) {
                triggerButton(btn);
            } else {
                let attempts = 0;
                const timer = setInterval(() => {
                    attempts++;
                    const retryBtn = findButton();
                    if (retryBtn) {
                        clearInterval(timer);
                        triggerButton(retryBtn);
                    } else if (attempts >= 15) {
                        clearInterval(timer);
                        unmaskPage();
                    }
                }, 60);
            }
        });
    }

    function handleStsLogin() {
        applyLoginCardStyle();

        onReady(() => {
            const form = document.querySelector('form');
            if (!form) return;

            const card = document.createElement('div');
            card.id = 'cesi-login-card';
            let fromWayf = false;
            let prevH = 0;
            try {
                const ts = Number(GM_getValue('cesi_login_ts', 0));
                prevH = Number(GM_getValue('cesi_login_h', 0));
                fromWayf = (ts && Date.now() - ts < 15000) || document.referrer.includes('/identification/wayf');
                if (ts) GM_setValue('cesi_login_ts', 0);
            } catch { /* ignore */ }
            if (fromWayf) card.classList.add('cesi-no-pop');
            card.innerHTML = `<div class="cesi-login-brand">${cesiBrand()}</div><h2>Bienvenue sur l'ENT</h2><p class="subtitle">Connectez-vous à votre espace d'apprentissage</p>`;
            card.appendChild(form);

            const btn = form.querySelector('span[role="button"]') || form.querySelector('#submitButton') || form.querySelector('.style-30');
            if (btn) btn.textContent = 'Se connecter';

            const help = document.createElement('div');
            help.className = 'help-links';
            help.innerHTML = `<a href="https://sts.viacesi.fr/adfs/portal/updatepassword" target="_blank" rel="noopener">Changer de mot de passe</a> • <a href="https://selfresetpassword.cesi.fr" target="_blank" rel="noopener">Mot de passe perdu</a>`;
            card.appendChild(help);

            document.body.innerHTML = '';
            document.body.appendChild(card);

            const userInput = form.querySelector('input[name="UserName"]');
            const passInput = form.querySelector('input[name="Password"]');
            if (userInput) {
                if (!userInput.value) userInput.value = getEmail();
                userInput.placeholder = 'prenom.nom@viacesi.fr';
            }
            if (passInput) { passInput.placeholder = '••••••••'; (userInput && !userInput.value ? userInput : passInput).focus(); }

            if (fromWayf && prevH > 0) {
                const targetH = Math.round(card.getBoundingClientRect().height);
                const passBlock = passInput?.closest('div') || passInput;
                const revealEls = [passBlock, help].filter(Boolean);
                revealEls.forEach((el) => {
                    el.style.opacity = '0';
                    el.style.transform = 'translateY(-6px)';
                });
                card.style.height = `${prevH}px`;
                card.style.overflow = 'hidden';
                void card.offsetHeight;
                requestAnimationFrame(() => {
                    card.style.transition = 'height .38s cubic-bezier(.16, 1, .3, 1)';
                    card.style.height = `${targetH}px`;
                    revealEls.forEach((el) => {
                        el.style.transition = 'opacity .28s ease .08s, transform .28s ease .08s';
                        el.style.opacity = '1';
                        el.style.transform = 'none';
                    });
                    card.addEventListener('transitionend', (e) => {
                        if (e.propertyName === 'height') {
                            card.style.height = '';
                            card.style.overflow = '';
                            card.style.transition = '';
                        }
                    }, { once: true });
                });
            }

            // Mémorise l'email (jamais le mot de passe)
            const remember = () => userInput && setEmail(userInput.value);
            form.addEventListener('submit', remember, true);
            if (btn) btn.addEventListener('click', remember, true);
            passInput && passInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') remember(); });
        });
    }


    /* =====================================================================
       2. TABLEAU DE BORD ENT (ent.cesi.fr/accueil-apprenant)
       ===================================================================== */
    function handleEntPortal() {
        addFont();
        addClass('cesi-loading');
        addStyle('html.cesi-loading body { visibility: hidden !important; }');
        setTimeout(() => removeClass('cesi-loading'), 4000);

        const THEME_KEY = 'cesi_theme';
        const isDark = isPrefDark;
        const applyTheme = (dark, save = false) => {
            const el = document.documentElement;
            if (el) {
                withInstantTheme([document], () => {
                    el.classList.toggle('dark', dark);
                    el.classList.toggle('scn-dark', dark);
                });
            }
            if (save) {
                try {
                    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
                    localStorage.setItem('scn-theme', dark ? 'dark' : 'light');
                } catch { /* ignore */ }
            }
        };
        applyTheme(isDark(), false);
        document.addEventListener('DOMContentLoaded', () => applyTheme(isDark(), false), { once: true });
        onSystemThemeChange((dark) => applyTheme(dark, false));

        addStyle(`
            :root {
                --c-bg: #f4f5f7; --c-card: #ffffff; --c-ink: #0f172a; --c-text: #334155; --c-muted: #64748b;
                --c-line: #e2e8f0; --c-line-strong: #cbd5e1; --c-soft: #f8fafc;
                --c-accent: #FBE216; --c-accent-dark: #ebd10f; --c-accent-ink: #857000; --c-accent-soft: #fffbeb;
                --c-danger: #dc2626; --radius: 14px;
                --shadow-sm: 0 1px 3px rgba(15,23,42,.05); --shadow-md: 0 8px 24px rgba(15,23,42,.08);
            }
            html.dark {
                --c-bg: #0d1117; --c-card: #161b22; --c-soft: #21262d;
                --c-ink: #f0f6fc; --c-text: #c9d1d9; --c-muted: #8b949e;
                --c-line: #30363d; --c-line-strong: #484f58;
                --c-accent: #FBE216; --c-accent-dark: #fde68a; --c-accent-soft: rgba(251,226,22,.12); --c-accent-ink: #FBE216;
                --c-danger: #f85149;
                --shadow-sm: 0 1px 3px rgba(0,0,0,.5); --shadow-md: 0 8px 24px rgba(0,0,0,.6);
                color-scheme: dark;
            }
            html.dark #cesi-topbar-wrap { background: rgba(22,27,34,.85) !important; border-bottom-color: var(--c-line) !important; }
            html.dark .cesi-icon-btn, html.dark .cesi-profile-btn { background: var(--c-card); border-color: var(--c-line); }
            html.dark .cesi-icon-btn:hover, html.dark .cesi-profile-btn:hover { background: var(--c-soft); border-color: var(--c-line-strong); }
            html.dark .day-tag.soft { background: var(--c-soft); color: var(--c-muted); }
            html.dark .edt-course-item { background: var(--c-soft); border-color: var(--c-line); }
            html.dark .edt-course-item:hover { background: var(--c-card); border-color: var(--c-line-strong); }
            html.dark .edt-course-item.is-live { background: rgba(251,226,22,.12); border-color: #7a6600; }
            html.dark .course-time { background: var(--c-soft); border-color: var(--c-line); color: var(--c-accent-dark); }
            html.dark .custom-link-btn { background: var(--c-soft); border-color: var(--c-line); }
            html.dark .custom-link-btn:hover { background: var(--c-card); border-color: var(--c-accent); }
            html.dark .access-icon-container { background: var(--c-soft); }
            html.dark #cesi-dropdown-menu a:hover, html.dark a.notif-item:hover { background: var(--c-soft); }
            html.dark .notif-item { border-bottom-color: var(--c-line); }
            html.dark .edt-skel { background: linear-gradient(90deg, #161b22 25%, #21262d 50%, #161b22 75%); }
            .cesi-icon-btn .sun { display: none; }
            html.dark .cesi-icon-btn .sun { display: block; }
            html.dark .cesi-icon-btn .moon { display: none; }
            html, body {
                background: var(--c-bg) !important; margin: 0 !important; padding: 0 !important;
                width: 100% !important; height: auto !important; min-height: 100% !important;
                overflow-x: hidden !important; overflow-y: auto !important; position: relative !important;
                font-family: 'Inter', system-ui, -apple-system, sans-serif !important; color: var(--c-ink) !important;
                -webkit-font-smoothing: antialiased;
            }
            #cesi-app { display: flex; flex-direction: column; min-height: 100vh; background: var(--c-bg); }
            #cesi-app, #cesi-app * { box-sizing: border-box; }
            #cesi-app a { text-decoration: none; color: inherit; }
            #cesi-app h1, #cesi-app h2, #cesi-app h3, #cesi-app h4, #cesi-app h5, #cesi-app p { margin: 0; padding: 0; font-family: inherit; }
            #cesi-app button { font-family: inherit; }
            #cesi-app svg { fill: currentColor; flex-shrink: 0; }

            ${BRAND_CSS}
            #cesi-topbar-wrap { position: sticky; top: 0; z-index: 50; background: rgba(244,245,247,.85) !important; backdrop-filter: saturate(180%) blur(12px); -webkit-backdrop-filter: saturate(180%) blur(12px); border-bottom: 1px solid var(--c-line) !important; }
            #cesi-topbar { max-width: 1240px; margin: 0 auto; height: 60px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; gap: 16px; background: transparent !important; border: 0 !important; box-shadow: none !important; }
            .cesi-user-actions { display: flex; align-items: center; gap: 10px; }

            .cesi-icon-btn { position: relative; width: 36px; height: 36px; border-radius: 9px; background: var(--c-card); border: 1px solid var(--c-line-strong); color: var(--c-muted); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow-sm); transition: all .15s ease; }
            .cesi-icon-btn:hover { background: var(--c-soft); color: var(--c-ink); border-color: #94a3b8; }
            .cesi-icon-btn svg { width: 18px; height: 18px; }
            .cesi-icon-btn:focus-visible, .cesi-profile-btn:focus-visible { outline: 3px solid rgba(251,226,22,.7); outline-offset: 2px; }
            .cesi-badge { position: absolute; top: 9px; right: 10px; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; border: 2px solid #fff; }
            .cesi-badge[hidden] { display: none; }

        .cesi-menu { position: relative; }
        .cesi-dropdown { position: absolute; right: 0; top: calc(100% + 8px); z-index: 100; background: var(--c-card); border: 1px solid var(--c-line-strong); border-radius: 12px; box-shadow: var(--shadow-md); padding: 6px; display: none; flex-direction: column; gap: 2px; transform-origin: top right; animation: cesiPop .14s ease-out; }
        .cesi-dropdown.open { display: flex; }
        @keyframes cesiPop { from { opacity: 0; transform: scale(.96) translateY(-4px); } to { opacity: 1; transform: none; } }

        #cesi-notif-dropdown { width: 320px; padding: 12px; gap: 8px; }
        .notif-header { font-size: .76rem; font-weight: 700; color: var(--c-ink); text-transform: uppercase; letter-spacing: .5px; padding-bottom: 8px; border-bottom: 1px solid var(--c-line); }
        #cesi-notif-list { display: flex; flex-direction: column; max-height: 320px; overflow-y: auto; }
        .notif-item { display: block; font-size: .8rem; color: var(--c-muted); padding: 7px 4px; border-bottom: 1px solid #f1f5f9; line-height: 1.35; }
        .notif-item:last-child { border-bottom: 0; }
        a.notif-item:hover { color: var(--c-ink); background: var(--c-soft); border-radius: 6px; }
        .notif-footer { font-size: .76rem; font-weight: 600; color: var(--c-accent-ink) !important; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 10px; margin-top: 2px; }
        .notif-footer:hover { text-decoration: underline !important; }

        .cesi-profile-btn { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 10px 0 12px; background: var(--c-card); border: 1px solid var(--c-line-strong); border-radius: 9px; box-shadow: var(--shadow-sm); cursor: pointer; transition: all .15s ease; }
        .cesi-profile-btn:hover { background: var(--c-soft); border-color: #94a3b8; }
        .cesi-profile-btn .user-name { font-size: .82rem; font-weight: 600; color: var(--c-ink); white-space: nowrap; line-height: 1; }
        .cesi-profile-btn img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 2px solid var(--c-accent); }
        .cesi-profile-btn .arrow { color: var(--c-muted); font-size: .65rem; transition: transform .15s; }
        .cesi-profile-btn[aria-expanded="true"] .arrow { transform: rotate(180deg); }

        #cesi-dropdown-menu { width: 224px; }
        #cesi-dropdown-menu a { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: .82rem; font-weight: 500; color: var(--c-text); }
        #cesi-dropdown-menu a:hover { background: #f1f5f9; color: var(--c-ink); }
        #cesi-dropdown-menu a svg { width: 16px; height: 16px; color: var(--c-muted); }
        #cesi-dropdown-menu hr { border: 0; border-top: 1px solid var(--c-line); margin: 4px 0; }
        #cesi-dropdown-menu a.logout-btn { color: var(--c-danger); font-weight: 600; }
        #cesi-dropdown-menu a.logout-btn svg { color: var(--c-danger); }
        #cesi-dropdown-menu a.logout-btn:hover { background: #fee2e2; color: #991b1b; }

        #cesi-main { flex: 1 0 auto; width: 100%; max-width: 1240px; margin: 0 auto; padding: 28px 40px 48px; }
        .cesi-hello { margin-bottom: 26px; }
        .cesi-hello h1 { font-size: 1.7rem; font-weight: 800; letter-spacing: -.6px; color: var(--c-ink); }
        .cesi-hello h1 .wave { display: inline-block; transform-origin: 70% 70%; animation: cesiWave 2.4s ease-in-out 1; }
        @keyframes cesiWave { 0%,60%,100% { transform: rotate(0); } 10%,30% { transform: rotate(14deg); } 20%,40% { transform: rotate(-8deg); } 50% { transform: rotate(10deg); } }
        .cesi-hello p { margin-top: 4px; font-size: .9rem; color: var(--c-muted); }
        .cesi-hello p::first-letter { text-transform: uppercase; }

        .cesi-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 28px; align-items: start; }
        .cesi-col { min-width: 0; }
        #cesi-app .section-title { padding: 0 4px; margin: 0 0 20px; }
        #cesi-app .cesi-col > .section-title:not(:first-child) { margin-top: 28px; }
        .section-title { display: flex; align-items: center; gap: 8px; font-size: .95rem; font-weight: 700; letter-spacing: .3px; text-transform: uppercase; color: var(--c-ink); margin-bottom: 20px; padding: 8px 4px; }
        .section-title svg { width: 18px; height: 18px; color: var(--c-muted); }
        .cesi-col > .section-title:not(:first-child) { margin-top: 28px; }

        #cesi-edt-container { display: flex; flex-direction: column; gap: 12px; }
        .edt-day-group { background: var(--c-card); border: 1px solid var(--c-line); border-radius: var(--radius); padding: 14px 16px; box-shadow: var(--shadow-sm); transition: box-shadow .15s; }
        .edt-day-group:hover { box-shadow: var(--shadow-md); }
        .edt-day-group.is-today { border-color: var(--c-accent); box-shadow: 0 0 0 3px rgba(251,226,22,.22), var(--shadow-sm); }
        .edt-day-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: .76rem; font-weight: 700; color: var(--c-ink); text-transform: uppercase; letter-spacing: .4px; padding-bottom: 8px; margin-bottom: 10px; border-bottom: 2px solid var(--c-accent); }
        .edt-day-header .left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .day-tag { background: var(--c-accent); color: #000; font-size: .62rem; font-weight: 800; padding: 3px 8px; border-radius: 20px; letter-spacing: .5px; }
        .day-tag.soft { background: #f1f5f9; color: var(--c-muted); }
        .edt-day-header .course-count { font-size: .68rem; color: var(--c-muted); font-weight: 600; }
        .edt-courses-list { display: flex; flex-direction: column; gap: 8px; }
        .edt-course-item { display: flex; align-items: center; gap: 14px; padding: 10px 12px; background: var(--c-soft); border: 1px solid #f1f5f9; border-radius: 10px; transition: all .15s ease; }
        .edt-course-item:hover { background: var(--c-card); border-color: var(--c-line-strong); }
        .edt-course-item.is-live { background: var(--c-accent-soft); border-color: #fde68a; }
        .edt-course-item.is-done { opacity: .5; }
        .edt-course-item.is-done .course-title { text-decoration: line-through; text-decoration-color: #94a3b8; }
        .course-time { min-width: 112px; text-align: center; font-size: .84rem; font-weight: 700; color: var(--c-accent-ink); background: var(--c-accent-soft); border: 1px solid #fef3c7; border-radius: 8px; padding: 5px 8px; font-variant-numeric: tabular-nums; }
        .course-info { flex: 1; min-width: 0; }
        .course-title { font-size: .88rem; font-weight: 600; color: var(--c-ink); }
        .course-sub { display: flex; align-items: center; gap: 4px; margin-top: 2px; font-size: .75rem; color: var(--c-muted); }
        .course-sub svg { width: 12px; height: 12px; }
        .live-pill { display: inline-flex; align-items: center; gap: 6px; font-size: .64rem; font-weight: 800; letter-spacing: .6px; color: #166534; background: #dcfce7; padding: 3px 9px; border-radius: 20px; white-space: nowrap; }
        .live-pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #16a34a; animation: cesiPulse 1.4s infinite; }
        @keyframes cesiPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(.8); } }
        .edt-empty { background: var(--c-card); border: 1px dashed var(--c-line-strong); border-radius: var(--radius); padding: 28px; text-align: center; color: var(--c-muted); font-size: .88rem; }
        .edt-skel { height: 120px; border-radius: var(--radius); background: linear-gradient(90deg, #eef0f3 25%, #f7f8fa 50%, #eef0f3 75%); background-size: 200% 100%; animation: cesiShimmer 1.2s infinite; }
        @keyframes cesiShimmer { to { background-position: -200% 0; } }

        .view-all-edt { display: flex; justify-content: center; align-items: center; width: 100%; height: 44px; margin-top: 14px; background: var(--c-accent); color: #000 !important; border-radius: 10px; font-size: .8rem; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; box-shadow: 0 2px 8px rgba(251,226,22,.3); transition: all .15s ease; }
        .view-all-edt:hover { background: var(--c-accent-dark); transform: translateY(-1px); box-shadow: 0 6px 16px rgba(251,226,22,.4); }

        .section-container { background: var(--c-card); border: 1px solid var(--c-line); border-radius: var(--radius); padding: 14px; box-shadow: var(--shadow-sm); }
        .section-links-list { display: flex; flex-direction: column; gap: 8px; }
        .custom-link-btn { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--c-soft); border: 1px solid var(--c-line); border-radius: 10px; font-size: .82rem; font-weight: 600; color: var(--c-ink); transition: all .15s ease; }
        .custom-link-btn:hover { background: var(--c-card); border-color: var(--c-accent); transform: translateX(3px); box-shadow: 0 2px 8px rgba(15,23,42,.05); }
        .custom-link-btn .btn-icon { width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; background: rgba(251,226,22,.22); color: #8a7400; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: .82rem; }
        .custom-link-btn .btn-icon svg { width: 15px; height: 15px; }
        .custom-link-btn .chev { margin-left: auto; color: #94a3b8; font-size: .9rem; transition: transform .15s; }
        .custom-link-btn:hover .chev { transform: translateX(2px); color: var(--c-ink); }

        .other-access-section { margin-top: 28px; }
        .cesi-access-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .cesi-access-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 92px; padding: 14px 8px; text-align: center; background: var(--c-card); border: 1px solid var(--c-line); border-radius: 12px; box-shadow: var(--shadow-sm); transition: all .15s ease; }
        .cesi-access-card:hover { transform: translateY(-3px); border-color: var(--c-accent); box-shadow: var(--shadow-md); }
        .access-icon-container { width: 36px; height: 36px; border-radius: 10px; background: var(--c-soft); color: var(--c-muted); display: flex; align-items: center; justify-content: center; transition: all .15s; overflow: hidden; }
        .cesi-access-card:hover .access-icon-container { background: var(--c-accent); color: #000; }
        .access-icon-container svg { width: 18px; height: 18px; }
        .access-icon-container img { width: 26px; height: 26px; object-fit: contain; }
        .access-title { font-size: .7rem; font-weight: 700; color: var(--c-ink); text-transform: uppercase; letter-spacing: .25px; line-height: 1.25; }

        ${COURSE_KIND_CSS}
        ${CAMPUS_3D_CSS}

        #cesi-footer { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 8px 24px; padding: 18px 20px; background: var(--c-card); border-top: 1px solid var(--c-line); }
        #cesi-footer a { color: var(--c-muted); font-size: .78rem; font-weight: 600; transition: color .15s; }
        #cesi-footer a:hover { color: var(--c-ink); text-decoration: underline; }
        #cesi-footer .separator { color: var(--c-line-strong); }

        @media (max-width: 960px) { .cesi-grid { grid-template-columns: 1fr; } #cesi-topbar, #cesi-main { padding-left: 20px; padding-right: 20px; } }
        @media (max-width: 560px) {
            .cesi-profile-btn .user-name, .cesi-profile-btn .arrow { display: none; }
            .cesi-profile-btn { padding: 4px; width: 40px; justify-content: center; }
            .cesi-access-grid { grid-template-columns: repeat(2, 1fr); }
            .edt-course-item { flex-wrap: wrap; }
            .course-time { min-width: 0; }
            .cesi-hello h1 { font-size: 1.4rem; }
        }
        @media (prefers-reduced-motion: reduce) { #cesi-app * { animation: none !important; transition: none !important; } }
    `);

    onReady(() => {
        /* ---------- 1. Lecture de la page d'origine AVANT remplacement ---------- */
        const $ = (s, r = document) => r.querySelector(s);
        const anchors = [...document.querySelectorAll('a[href]')];
        const linkByText = (re, fallback) => {
            const a = anchors.find((x) => re.test((x.textContent || '').trim()));
            return a ? a.href : fallback;
        };

        const fullName = ($('.session_libelle')?.textContent || '').trim() || 'Apprenant';
        const words = fullName.split(/\s+/);
        const firstName = words.find((w) => w !== w.toUpperCase()) || words[0];
        const headerAvatar = $('#compte .avatar__wrapper img')?.src || '';

        const URLS = {
            profil:  linkByText(/^mon profil$/i, '/mon-profil'),
            edt:     linkByText(/^mon emploi du temps$/i, '/mon-emploi-du-temps'),
            notes:   linkByText(/^mes notes$/i, '/mes-notes'),
            notifs:  linkByText(/^mes notifications$/i, '/mes-notifications-1'),
            logout:  $('#se_deconnecter')?.href || '/identification/logout',
            carte:   linkByText(/carte étudiante/i, '/carte-etudiante-europeenne')
        };

        // Accès directs réels de l'ENT (logo + titre)
        const scrapeAccess = () => {
            const heading = [...document.querySelectorAll('h1,h2,h3,h4,.titre,[class*="titre"]')]
                .find((e) => /acc[eè]s directs/i.test(e.textContent) && e.tagName !== 'A');
            const box = heading && (heading.closest('section, .bloc, [class*="acces"], [class*="Acces"]') || heading.parentElement);
            if (!box) return [];
            const seen = new Set();
            return [...box.querySelectorAll('a[href]')].map((a) => {
                const img = a.querySelector('img');
                const title = (a.textContent || '').replace(/\s+/g, ' ').trim() || a.title || img?.alt || '';
                return { href: a.href, title, img: img?.src || '' };
            }).filter((l) => l.title && !l.href.endsWith('#') && !seen.has(l.href) && seen.add(l.href));
        };
        const accessLinks = scrapeAccess();

        /* ---------- 2. Helpers EDT ---------- */
        const pad = (n) => String(n).padStart(2, '0');
        const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
        // L'API renvoie "2026-10-14T11:30:00+02" → "+02:00" pour un parsing fiable
        const parseDate = (s) => new Date(/[+-]\d{2}$/.test(s) ? `${s}:00` : s);
        const dayLabel = (key) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${key}T12:00:00`));
        const people = (list) => Array.isArray(list)
            ? list.map((p) => (typeof p === 'string' ? p : [p.prenom, p.nom].filter(Boolean).join(' ') || p.libelle || p.nomComplet || '')).filter(Boolean).join(', ')
            : '';

        let edtState = { status: 'loading', items: [] };

        const normalize = (s) => {
            const start = parseDate(s.start), end = parseDate(s.end || s.start);
            return {
                date: dateKey(start), startD: start, endD: end,
                start: hm(start), end: hm(end),
                allDay: String(s.allDay) === 'true',
                title: s.title || s.nomModule || s.matiere || 'Séance',
                place: (Array.isArray(s.salles) ? s.salles.map((x) => x.nomSalle).filter(Boolean).join(', ') : '') || 'Salle non précisée',
                teacher: people(s.intervenants)
            };
        };

        const loadEdt = async () => {
            const now = new Date();
            const from = dateKey(now);
            const to = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + EDT_DAYS_AHEAD));
            try {
                let data;
                try { data = await getJSON(`/api/seance/all?start=${from}&end=${to}`); }
                catch { data = await getJSON('/api/seance/prochaines?nombreSeances=15'); }
                edtState = { status: 'ok', items: (Array.isArray(data) ? data : []).map(normalize) };
            } catch (e) {
                console.warn('[CESI redesign] EDT', e);
                edtState = { status: 'error', items: [] };
            }
            paintEdt();
        };

        const renderEdt = () => {
            if (edtState.status === 'loading') return '<div class="edt-skel"></div><div class="edt-skel"></div>';
            if (edtState.status === 'error') return `<div class="edt-empty">Impossible de charger l'emploi du temps. <a href="${esc(URLS.edt)}"><u>Ouvrir l'EDT</u></a></div>`;

            const now = new Date();
            const today = dateKey(now);
            const tomorrow = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
            const groups = {};
            edtState.items.forEach((c) => { (groups[c.date] = groups[c.date] || []).push(c); });
            const days = Object.keys(groups).sort().filter((d) => d >= today).slice(0, EDT_DAYS_SHOWN);

            if (!days.length) return '<div class="edt-empty">Aucun cours à venir. Profite de ton temps libre ! ☕</div>';

            return days.map((day) => {
                const courses = groups[day].slice().sort((a, b) => a.startD - b.startD);
                const tag = day === today ? '<span class="day-tag">AUJOURD\'HUI</span>'
                    : day === tomorrow ? '<span class="day-tag soft">DEMAIN</span>' : '';
                const items = courses.map((c) => {
                    const live = now >= c.startD && now < c.endD;
                    const done = now >= c.endD;
                    const kind = getCourseKind(c.title);
                    const cls = (live ? ' is-live' : done ? ' is-done' : '') + (kind ? ` kind-${kind.id}` : '');
                    return `
                        <div class="edt-course-item${cls}" style="cursor:pointer" data-room="${esc(c.place)}" data-title="${esc(c.title)}" data-time="${esc(c.allDay ? 'Journée' : `${c.start} - ${c.end}`)}" data-teacher="${esc(c.teacher)}" data-live="${live ? '1' : '0'}">
                            <span class="course-time">${c.allDay ? 'Journée' : `${esc(c.start)} - ${esc(c.end)}`}</span>
                            <div class="course-info">
                                <h5 class="course-title"><span>${esc(c.title)}</span>${live ? '<span class="live-pill">EN COURS</span>' : ''}</h5>
                                <p class="course-sub">${svg('pin')}${esc(c.place)}</p>
                                ${c.teacher ? `<p class="course-sub">${svg('user')}${esc(c.teacher)}</p>` : ''}
                            </div>
                            ${courseKindBadge(kind)}
                        </div>`;
                }).join('');
                return `
                    <div class="edt-day-group${day === today ? ' is-today' : ''}">
                        <div class="edt-day-header">
                            <span class="left"><span>${esc(dayLabel(day))}</span>${tag}</span>
                            <span class="course-count">${courses.length} COURS</span>
                        </div>
                        <div class="edt-courses-list">${items}</div>
                    </div>`;
            }).join('');
        };
        let updateCampusMap = () => {};
        const paintEdt = () => { const box = document.getElementById('cesi-edt-container'); if (box) box.innerHTML = renderEdt(); updateCampusMap(); };

        /* ---------- 3. Gabarits ---------- */
        const linkBtn = (l, icon) => `
            <a href="${esc(l.href)}" class="cesi-access-card" target="_blank" rel="noopener">
                <div class="access-icon-container">${icon}</div>
                <h4 class="access-title">${esc(l.title)}</h4>
            </a>`;

        const moodleHtml = MOODLE_LINKS.map((l) => linkBtn(l, svg('school'))).join('');

        // Les liens dépendant de la promo sont complétés après lecture de /mon-profil
        const profileLinks = (promoBase) => [
            promoBase && { href: `${promoBase}/dossiers-de-synthese`, title: 'Dossier de synthèse', icon: 'doc' },
            { href: URLS.carte, title: 'Carte étudiante', icon: 'card' },
            { href: URLS.profil, title: 'Mon profil', icon: 'user' },
            promoBase && { href: `${promoBase}/trombinoscope`, title: 'Ma promo', icon: 'group' },
            { href: URLS.notes, title: 'Mes notes', icon: 'doc' }
        ].filter(Boolean).map((l) => linkBtn(l, svg(l.icon))).join('');

        const accessHtml = (accessLinks.length ? accessLinks : FALLBACK_ACCESS).map((l) => `
            <a href="${esc(l.href)}" class="cesi-access-card" target="_blank" rel="noopener">
                <div class="access-icon-container">${l.img ? `<img src="${esc(l.img)}" alt="" loading="lazy">` : svg(l.icon)}</div>
                <h4 class="access-title">${esc(l.title)}</h4>
            </a>`).join('');

        const longDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
        const hour = new Date().getHours();
        const greeting = hour < 5 || hour >= 18 ? 'Bonsoir' : 'Bonjour';

        document.documentElement.removeAttribute('style');
        document.body.removeAttribute('style');

        const app = document.createElement('div');
        app.id = 'cesi-app';
        app.innerHTML = `
            <div id="cesi-topbar-wrap">
                <header id="cesi-topbar">
                    <a href="/accueil-apprenant" class="cesi-brand-link" aria-label="Accueil">${cesiBrand()}</a>
                    <div class="cesi-user-actions">
                        <button type="button" class="cesi-icon-btn" id="cesi-theme-btn" title="Basculer clair/sombre" aria-label="Thème">
                            ${svg('moon', 'moon')}${svg('sun', 'sun')}
                        </button>
                        <div class="cesi-menu">
                            <button type="button" class="cesi-icon-btn" id="cesi-notif-btn" aria-label="Notifications" aria-haspopup="true" aria-expanded="false">
                                ${svg('bell')}<span class="cesi-badge" id="cesi-notif-badge" hidden></span>
                            </button>
                            <div class="cesi-dropdown" id="cesi-notif-dropdown">
                                <div class="notif-header">Notifications</div>
                                <div id="cesi-notif-list"><div class="notif-item">Chargement…</div></div>
                                <a href="${esc(URLS.notifs)}" class="notif-footer">Voir toutes les notifications &gt;</a>
                            </div>
                        </div>
                        <div class="cesi-menu">
                            <button type="button" class="cesi-profile-btn" id="cesi-profile-btn" aria-haspopup="true" aria-expanded="false">
                                <span class="user-name">${esc(fullName)}</span>
                                <img src="${esc(headerAvatar)}" alt="Photo de profil" id="cesi-avatar" />
                                <span class="arrow">▾</span>
                            </button>
                            <div class="cesi-dropdown" id="cesi-dropdown-menu">
                                <a href="${esc(URLS.profil)}">${svg('user')}Mon profil</a>
                                <a href="${esc(URLS.edt)}">${svg('calendar')}Mon emploi du temps</a>
                                <a href="${esc(URLS.notes)}">${svg('doc')}Mes notes</a>
                                <a href="${esc(URLS.notifs)}">${svg('bell')}Mes notifications</a>
                                <hr />
                                <a href="${esc(URLS.logout)}" class="logout-btn">${svg('logout')}Déconnexion</a>
                            </div>
                        </div>
                    </div>
                </header>
            </div>

            <main id="cesi-main">
                <section class="cesi-hello">
                    <h1>${greeting} ${esc(firstName)} <span class="wave">👋</span></h1>
                    <p>${esc(longDate)}</p>
                </section>
                <div class="cesi-grid">
                    <div class="cesi-col">
                        <h3 class="section-title">${svg('calendar')} Emploi du temps</h3>
                        <div id="cesi-edt-container">${renderEdt()}</div>
                        <a href="${esc(URLS.edt)}" class="view-all-edt">Accès à l'emploi du temps complet &gt;</a>
                    </div>
                    <div class="cesi-col">
                        <h3 class="section-title">${svg('school')} Moodle CESI</h3>
                        <div class="cesi-access-grid">${moodleHtml}</div>
                        <h3 class="section-title">${svg('user')} Mon profil</h3>
                        <div class="cesi-access-grid" id="cesi-profile-links">${profileLinks(null)}</div>
                        <div class="other-access-section">
                            <h3 class="section-title">${svg('link')} Accès directs</h3>
                            <div class="cesi-access-grid">${accessHtml}</div>
                        </div>
                    </div>
                </div>

                <div id="cesi-home-map"></div>
            </main>

            <footer id="cesi-footer">
                <a href="/infos-pratiques" target="_blank" rel="noopener">Infos pratiques</a>
                <span class="separator">•</span>
                <a href="/donnees-personelles" target="_blank" rel="noopener">Données personnelles</a>
                <span class="separator">•</span>
                <a href="/ressources-numeriques" target="_blank" rel="noopener">Ressources numériques</a>
            </footer>
        `;

        document.body.innerHTML = '';
        document.body.appendChild(app);
        removeClass('cesi-loading');

        const campus3D = mountCampus3D(document.getElementById('cesi-home-map'));
        updateCampusMap = () => campus3D.updateFromItems(edtState.items);
        updateCampusMap();
        document.getElementById('cesi-edt-container')?.addEventListener('click', (e) => {
            const item = e.target.closest('.edt-course-item');
            if (!item) return;
            campus3D.selectCourse({
                place: item.dataset.room,
                title: item.dataset.title,
                time: item.dataset.time,
                teacher: item.dataset.teacher,
                live: item.dataset.live === '1'
            }, true);
            document.querySelector('.cesi-map-section')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        /* ---------- 4. Données asynchrones ---------- */
        const avatar = document.getElementById('cesi-avatar');
        const setInitials = () => {
            const initials = (fullName.match(/\b\p{L}/gu) || []).slice(0, 2).join('').toUpperCase();
            avatar.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#FBE216"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-weight="700" font-size="16" fill="#0f172a">${initials}</text></svg>`);
        };
        avatar.addEventListener('error', setInitials, { once: true });
        if (!headerAvatar) setInitials();

        // Profil : vraie photo + chemin de la promo actuelle (ex. /fisa-info-26-29-pau-…)
        getDoc(URLS.profil).then(({ url, doc }) => {
            const photo = doc.querySelector('.personne__entete__avatar img[src*="/medias/photo/"], .avatar__wrapper img[src*="/medias/photo/"]');
            if (photo) avatar.src = abs(photo.getAttribute('src'));
            const seg = new URL(url).pathname.split('/').filter(Boolean)[0];
            if (seg && !/^mon-profil$/.test(seg)) {
                document.getElementById('cesi-profile-links').innerHTML = profileLinks(`${location.origin}/${seg}`);
            }
        }).catch((e) => console.warn('[CESI redesign] profil', e));

        // Emploi du temps
        loadEdt();
        setInterval(paintEdt, 60_000);                       // statut "en cours"/"terminé"
        setInterval(loadEdt, EDT_REFRESH_MIN * 60_000);      // nouvelles données

        // Notifications (chargées à l'ouverture, comme l'ENT natif)
        let notifLoaded = false;
        const loadNotifs = async () => {
            if (notifLoaded) return;
            notifLoaded = true;
            const list = document.getElementById('cesi-notif-list');
            try {
                const { doc } = await getDoc('/api/notifications/popup');
                doc.querySelectorAll('script,style').forEach((e) => e.remove());
                let items = [...doc.querySelectorAll('li')].map((li) => ({
                    text: li.textContent.replace(/\s+/g, ' ').trim(),
                    href: li.querySelector('a[href]')?.getAttribute('href')
                })).filter((i) => i.text);
                if (!items.length) {
                    const t = doc.body.textContent.replace(/\s+/g, ' ').trim();
                    if (t) items = [{ text: t }];
                }
                list.innerHTML = items.length
                    ? items.slice(0, 10).map((i) => i.href
                        ? `<a class="notif-item" href="${esc(abs(i.href))}">${esc(i.text)}</a>`
                        : `<div class="notif-item">${esc(i.text)}</div>`).join('')
                    : '<div class="notif-item">Vous n\'avez pas de nouvelle notification.</div>';
            } catch (e) {
                notifLoaded = false;
                list.innerHTML = '<div class="notif-item">Impossible de charger les notifications.</div>';
            }
        };

        /* ---------- 5. Défilement natif ---------- */
        const unlockScroll = () => {
            [document.documentElement.style, document.body.style].forEach((s) => {
                s.setProperty('overflow-y', 'auto', 'important');
                s.setProperty('overflow-x', 'hidden', 'important');
                s.setProperty('height', 'auto', 'important');
            });
        };
        unlockScroll();
        const scrollTimer = setInterval(unlockScroll, 200);
        setTimeout(() => clearInterval(scrollTimer), 5000);
        ['wheel', 'touchmove'].forEach((evt) =>
            window.addEventListener(evt, (e) => e.stopPropagation(), { capture: true, passive: true }));

        /* ---------- 6. Menus déroulants ---------- */
        const menus = [
            { btn: document.getElementById('cesi-notif-btn'),   panel: document.getElementById('cesi-notif-dropdown'), onOpen: loadNotifs },
            { btn: document.getElementById('cesi-profile-btn'), panel: document.getElementById('cesi-dropdown-menu') }
        ];
        const closeAll = (except) => menus.forEach((m) => {
            if (m.panel !== except) { m.panel.classList.remove('open'); m.btn.setAttribute('aria-expanded', 'false'); }
        });
        menus.forEach((m) => {
            m.btn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeAll(m.panel);
                const open = m.panel.classList.toggle('open');
                m.btn.setAttribute('aria-expanded', String(open));
                if (open && m.onOpen) m.onOpen();
            });
            m.panel.addEventListener('click', (e) => e.stopPropagation());
        });
        document.getElementById('cesi-theme-btn')?.addEventListener('click', () => {
            applyTheme(!document.documentElement.classList.contains('dark'), true);
        });
        document.addEventListener('click', () => closeAll());
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
    });
    }



    /* =====================================================================
       2.B. PORTAIL ENT - PAGES SECONDAIRES (Actualités, Ressources, Profil, etc.)
       ===================================================================== */
    function handleEntSubpage() {
        addFont();

        const THEME_KEY = 'cesi_theme';
        const isDark = isPrefDark;
        const applyTheme = (dark, save = false) => {
            const el = document.documentElement;
            if (el) {
                withInstantTheme([document], () => {
                    el.classList.toggle('dark', dark);
                    el.classList.toggle('scn-dark', dark);
                });
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.documentElement?.classList.toggle('dark', dark);
                    document.documentElement?.classList.toggle('scn-dark', dark);
                }, { once: true });
            }
            if (save) {
                try {
                    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
                    localStorage.setItem('scn-theme', dark ? 'dark' : 'light');
                } catch { /* ignore */ }
            }
        };
        applyTheme(isDark(), false);
        onSystemThemeChange((dark) => applyTheme(dark, false));

        addStyle(`
            :root {
                --c-bg: #f4f5f7; --c-card: #ffffff; --c-soft: #f8fafc;
                --c-line: #e2e8f0; --c-line-strong: #cbd5e1;
                --c-ink: #0f172a; --c-text: #334155; --c-muted: #64748b;
                --c-accent: #FBE216; --c-accent-dark: #e5cd0b; --c-accent-soft: #fffbeb; --c-accent-ink: #7a6600;
                --c-danger: #dc2626; --radius: 14px; --shadow-sm: 0 1px 3px rgba(15,23,42,.06); --shadow-md: 0 8px 24px rgba(15,23,42,.08);
            }
            html.dark {
                --c-bg: #0d1117; --c-card: #161b22; --c-soft: #21262d;
                --c-line: #30363d; --c-line-strong: #484f58;
                --c-ink: #f0f6fc; --c-text: #c9d1d9; --c-muted: #8b949e;
                --c-accent: #FBE216; --c-accent-dark: #fde68a; --c-accent-soft: rgba(251,226,22,.1); --c-accent-ink: #FBE216;
                --c-danger: #f85149; --shadow-sm: 0 1px 3px rgba(0,0,0,.4); --shadow-md: 0 8px 24px rgba(0,0,0,.5);
                color-scheme: dark;
            }
            html, body {
                background: var(--c-bg) !important; color: var(--c-text) !important;
                font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
                margin: 0 !important; padding: 0 !important; min-height: 100vh !important;
            }

            /* Cacher l'ancien en-tête, la barre latérale jaune et le pied de page obsolète */
            body > header:not(#cesi-sub-topbar-wrap), header:not(#cesi-sub-topbar-wrap),
            nav, #menu, .sidebar-navigation,
            #pied_deco, #fil_ariane, #orejime, .hautDePage__navigationMobile,
            .region-header, .header-site, .vignette_deco, .vignette_deco2 {
                display: none !important;
            }

            ${BRAND_CSS}
            /* Nouvelle Topbar unifiée identique au tableau de bord */
            #cesi-sub-topbar-wrap {
                position: sticky; top: 0; z-index: 1000;
                background: rgba(244,245,247,.85); backdrop-filter: saturate(180%) blur(12px); -webkit-backdrop-filter: saturate(180%) blur(12px);
                border-bottom: 1px solid var(--c-line);
            }
            html.dark #cesi-sub-topbar-wrap {
                background: rgba(22,27,34,.85);
            }
            #cesi-sub-topbar {
                max-width: 1240px; margin: 0 auto; height: 60px; padding: 0 32px;
                display: flex; align-items: center; justify-content: space-between; gap: 16px;
            }
            .cesi-sub-left { display: flex; align-items: center; gap: 20px; }
            .cesi-sub-nav { display: flex !important; position: static !important; background: transparent !important; align-items: center; gap: 6px; flex-wrap: wrap; }
            .cesi-sub-nav a {
                color: var(--c-muted) !important; font-size: .84rem; font-weight: 600; text-decoration: none !important;
                padding: 7px 12px; border-radius: 8px; transition: all .15s; background: transparent !important;
            }
            .cesi-sub-nav a:hover, .cesi-sub-nav a.active { color: var(--c-ink) !important; background: var(--c-card) !important; box-shadow: var(--shadow-sm); }
            .cesi-sub-nav a.active { font-weight: 700; color: #000 !important; background: var(--c-accent) !important; }
            .cesi-sub-right { display: flex; align-items: center; gap: 10px; }
            .cesi-sub-btn {
                height: 36px; min-width: 36px; padding: 0 10px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
                border: 1px solid var(--c-line); border-radius: 9px; background: var(--c-card); color: var(--c-muted);
                font: 600 .78rem 'Inter', sans-serif; cursor: pointer; transition: all .15s; text-decoration: none !important;
            }
            .cesi-sub-btn:hover { color: var(--c-ink); border-color: var(--c-muted); }
            .cesi-sub-btn svg { width: 17px; height: 17px; fill: currentColor; }
            .cesi-sub-btn .sun { display: none; } html.dark .cesi-sub-btn .sun { display: block; } html.dark .cesi-sub-btn .moon { display: none; }

            /* Zone de contenu principale */
            main#page, main.avec_nav, main.active, main, #main-wrapper, #content, .region-content {
                margin: 0 auto !important; width: 100% !important; max-width: 1240px !important;
                padding: 32px 40px 60px !important; box-sizing: border-box !important;
                background: transparent !important; border: 0 !important;
            }

            .page__titre, h1.page-title, h1.title, h1 {
                font-family: 'Inter', sans-serif !important; font-size: 1.8rem !important; font-weight: 800 !important;
                color: var(--c-ink) !important; margin: 0 0 24px !important; letter-spacing: -.6px !important;
            }
            h2 {
                font-family: 'Inter', sans-serif !important; font-size: 1.25rem !important; font-weight: 700 !important;
                color: var(--c-ink) !important; border-left: 4px solid var(--c-accent) !important; padding-left: 10px !important;
                margin: 28px 0 16px !important;
            }
            h3, h4 { font-family: 'Inter', sans-serif !important; color: var(--c-ink) !important; font-weight: 700 !important; }

            #contenu-encadres, #page_deco, #sans_encadres, #sans_encadres.contenu, .sans_encadres, .contenu,
            #page, main#page, .region-content, .layout-content, .views-element-container {
                background: transparent !important; background-color: transparent !important; border: 0 !important; padding: 0 !important; box-shadow: none !important;
            }
            html.dark #contenu-encadres, html.dark #page_deco, html.dark #page, html.dark #sans_encadres, html.dark .sans_encadres, html.dark .contenu {
                background: transparent !important; background-color: transparent !important;
            }

            /* Cartes pour actualités et blocs de contenu */
            ul.actualites, ul.objets {
                display: flex !important; flex-direction: column !important; gap: 14px !important;
                list-style: none !important; padding: 0 !important; margin: 0 !important;
            }
            ul.actualites li, ul.objets li, .block, .node, article, .views-row, .card, .view-content > div {
                background: var(--c-card) !important; border: 1px solid var(--c-line) !important;
                border-radius: var(--radius) !important; box-shadow: var(--shadow-sm) !important;
                padding: 20px 24px !important; margin-bottom: 16px !important; color: var(--c-text) !important;
                transition: transform .15s, border-color .15s, box-shadow .15s !important;
            }
            ul.actualites li:hover, ul.objets li:hover, .card:hover {
                border-color: var(--c-accent) !important; transform: translateY(-2px) !important;
                box-shadow: var(--shadow-md) !important;
            }
            ul.actualites img.vignette, ul.objets img.vignette {
                width: 90px !important; height: 90px !important; object-fit: cover !important;
                border-radius: 10px !important; flex-shrink: 0 !important;
            }

            a { color: var(--c-ink) !important; text-decoration: none !important; transition: color .15s; }
            a:hover { color: var(--c-accent-ink) !important; }
            p { line-height: 1.6 !important; }

            /* Tableaux */
            table { width: 100% !important; border-collapse: separate !important; border-spacing: 0 !important; border: 1px solid var(--c-line) !important; border-radius: 12px !important; overflow: hidden !important; background: var(--c-card) !important; margin: 18px 0 !important; }
            th { background: var(--c-soft) !important; color: var(--c-ink) !important; font-weight: 700 !important; padding: 12px 16px !important; border-bottom: 1px solid var(--c-line) !important; }
            td { padding: 12px 16px !important; border-bottom: 1px solid var(--c-line) !important; color: var(--c-text) !important; }
            tr:last-child td { border-bottom: 0 !important; }

            /* Formulaires et boutons */
            input[type="text"], input[type="search"], select, textarea {
                background: var(--c-soft) !important; border: 1px solid var(--c-line) !important; border-radius: 8px !important;
                color: var(--c-ink) !important; padding: 10px 14px !important; font-family: inherit !important; box-sizing: border-box !important;
            }
            input[type="submit"], button.btn, .button {
                background: var(--c-accent) !important; color: #000 !important; font-weight: 700 !important;
                border: 0 !important; border-radius: 8px !important; padding: 10px 20px !important; cursor: pointer !important;
                transition: transform .15s, opacity .15s !important;
            }
            input[type="submit"]:hover, button.btn:hover, .button:hover { opacity: .9; transform: translateY(-1px); }

            /* Modernisation & Dark Mode des pages ENT (Notes, Trombinoscope, Profil, Carte, EDT) */
            html.dark #page :is(strong, b, th, h1, h2, h3, h4, h5, h6) { color: var(--c-ink) !important; }
            html.dark #page :is(p, span, td, dt, dd, label):not(.cesi-sub-badge):not(.cesi-brand-txt) { color: var(--c-text); }

            /* Mes notes */
            .semestres__notes { list-style: none !important; padding: 0 !important; margin: 0 !important; display: flex; flex-direction: column; gap: 20px; }
            .semestres__notes > li {
                background: var(--c-card) !important; border: 1px solid var(--c-line) !important; border-radius: 16px !important;
                padding: 22px 24px !important; color: var(--c-text) !important; box-shadow: var(--shadow-sm) !important;
            }
            .semestres__notes__titre {
                display: inline-flex !important; align-items: center; gap: 10px; font-size: 1.08rem !important; font-weight: 800 !important;
                color: var(--c-ink) !important; border-left: 4px solid var(--c-accent); padding-left: 12px; margin-bottom: 16px;
            }
            .semestres__notes__titre a[href=""] { pointer-events: none; cursor: default; }
            .semestres__notes > li > a[href] { display: none !important; }
            .semestres__notes ul { list-style: none !important; padding: 0 !important; margin: 0 !important; display: flex; flex-direction: column; gap: 10px; }
            .semestres__notes__document {
                background: var(--c-soft) !important; border: 1px solid var(--c-line) !important; border-radius: 12px !important;
                padding: 0 !important; margin: 0 !important; transition: transform .15s, border-color .15s, box-shadow .15s !important;
            }
            .semestres__notes__document:hover {
                border-color: var(--c-accent) !important; transform: translateY(-1px); box-shadow: var(--shadow-sm) !important;
            }
            .semestres__notes__document a {
                display: flex !important; align-items: center; justify-content: space-between; gap: 14px;
                padding: 14px 18px !important; color: var(--c-ink) !important; font-weight: 600 !important; font-size: .94rem !important;
                text-decoration: none !important;
            }
            .semestres__notes__document a::before {
                content: "📄"; font-size: 1.15rem; flex-shrink: 0;
            }
            .semestres__notes__document a::after {
                content: "Ouvrir le PDF ↗" !important; margin-left: auto !important; flex-shrink: 0 !important;
                position: static !important; width: auto !important; height: auto !important; text-indent: 0 !important;
                background: var(--c-accent-soft) !important; color: var(--c-accent-ink) !important;
                border: 1px solid rgba(251,226,22,.4) !important; padding: 5px 12px !important; border-radius: 999px !important;
                font-size: .78rem !important; line-height: 1.3 !important; font-weight: 700 !important; transition: all .15s;
            }
            .semestres__notes__document:hover a::after {
                background: var(--c-accent) !important; color: #141413 !important; border-color: var(--c-accent) !important;
            }

            /* Trombinoscope */
            .trombinoscope__form {
                background: var(--c-card) !important; border: 1px solid var(--c-line) !important; border-radius: 16px !important;
                padding: 20px 24px !important; margin-bottom: 18px !important; box-shadow: var(--shadow-sm) !important;
            }
            .trombinoscope__form form {
                display: grid !important; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)) !important; gap: 16px !important;
            }
            .trombinoscope__form--left { float: none !important; width: 100% !important; margin: 0 !important; }
            .trombinoscope__form--left p { margin: 0 0 6px !important; }
            .trombinoscope__form--left label {
                font-size: .76rem !important; text-transform: uppercase; letter-spacing: .05em; color: var(--c-muted) !important; font-weight: 700 !important;
            }
            .trombinoscope__form--left input, .trombinoscope__form--left select { width: 100% !important; }
            .trombinoscope__separateur { display: none !important; }
            .trombinoscope__information {
                display: table !important; clear: both !important; width: auto !important; grid-column: 1 / -1 !important;
                background: var(--c-accent) !important; color: #141413 !important; font-weight: 800 !important; font-size: .82rem !important;
                padding: 6px 14px !important; border-radius: 999px !important; margin: 0 0 18px !important;
            }
            .trombinoscope__carte {
                background: var(--c-card) !important; border: 1px solid var(--c-line) !important; border-radius: 16px !important;
                box-shadow: var(--shadow-sm) !important; overflow: hidden !important; color: var(--c-text) !important;
                transition: transform .15s, border-color .15s, box-shadow .15s !important;
            }
            .trombinoscope__carte:hover { border-color: var(--c-accent) !important; transform: translateY(-2px); box-shadow: var(--shadow-md) !important; }
            .trombinoscope__carte__avatar { background: var(--c-soft) !important; border-right: 1px solid var(--c-line) !important; }
            .trombinoscope__carte__action a, .trombinoscope__carte__action button {
                border-radius: 8px !important; background: var(--c-soft) !important; border: 1px solid var(--c-line) !important;
            }

            /* Mon profil */
            .personne__entete {
                background: var(--c-card) !important; border: 1px solid var(--c-line) !important; border-radius: 18px !important;
                box-shadow: var(--shadow-md) !important; color: var(--c-text) !important; overflow: hidden !important;
            }
            .personne__entete__carte {
                background: var(--c-soft) !important; border: 0 !important; border-right: 1px solid var(--c-line) !important;
                border-radius: 0 !important; color: var(--c-text) !important;
            }
            .personne__entete__avatar img { border: 3px solid var(--c-accent) !important; box-shadow: var(--shadow-sm) !important; }
            .personne__entete__info, .personne__entete__info strong { color: var(--c-ink) !important; }
            .emploiDuTemps__liste { list-style: none !important; padding: 0 !important; margin: 12px 0 0 !important; display: flex; flex-direction: column; gap: 10px; }
            .emploiDuTemps__item {
                background: var(--c-card) !important; border: 1px solid var(--c-line) !important; border-left: 4px solid var(--c-accent) !important;
                border-radius: 12px !important; padding: 14px 18px !important; color: var(--c-text) !important; box-shadow: var(--shadow-sm) !important;
            }
            .emploiDuTemps__item__jour { color: var(--c-muted) !important; font-size: .75rem !important; font-weight: 700 !important; text-transform: uppercase; }
            .emploiDuTemps__item__horaire { color: var(--c-accent-ink) !important; font-weight: 800 !important; }
            .emploiDuTemps__item__intitule { color: var(--c-ink) !important; font-weight: 700 !important; }
            .personne__entete.accordeon {
                border-radius: 16px !important; background: var(--c-card) !important; border: 1px solid var(--c-line) !important;
                color: var(--c-text) !important; padding: 0 !important; margin-top: 22px !important; box-shadow: var(--shadow-sm) !important;
            }
            .personne__entete.accordeon h2.accordeon__titre {
                background: var(--c-soft) !important; color: var(--c-ink) !important; border: 0 !important;
                border-left: 4px solid var(--c-accent) !important; border-bottom: 1px solid var(--c-line) !important;
                margin: 0 !important; padding: 16px 24px !important; font-size: 1.08rem !important; font-weight: 800 !important;
            }
            .personne__entete.accordeon .accordeon__conteneur {
                padding: 22px 24px !important; background: var(--c-card) !important;
            }
            .personne__profils {
                display: inline-flex !important; align-items: center; float: none !important;
                background: var(--c-accent-soft) !important; color: var(--c-accent-ink) !important;
                border: 1px solid rgba(251,226,22,.4) !important; padding: 5px 14px !important;
                border-radius: 999px !important; font-size: .78rem !important; font-weight: 700 !important; margin-bottom: 14px !important;
            }
            .personne__liens {
                display: grid !important; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)) !important;
                gap: 16px !important; align-items: stretch !important;
            }
            .personne__liens > h2 { grid-column: 1 / -1 !important; margin: 6px 0 4px !important; }
            .personne__liens .trombinoscope__wrapper {
                display: flex !important; flex-direction: column !important; gap: 8px !important;
                width: 100% !important; float: none !important; margin: 0 !important;
            }
            .personne__liens .trombinoscope__wrapper > div:first-child {
                font-size: .75rem !important; font-weight: 700 !important; color: var(--c-muted) !important;
                text-transform: uppercase; letter-spacing: .04em;
            }
            .personne__liens .trombinoscope__carte {
                width: 100% !important; margin: 0 !important; flex: 1 !important; display: flex !important;
            }
            .personne__liens .trombinoscope__carte__avatar {
                width: 100px !important; min-width: 100px !important; height: 115px !important; flex-shrink: 0 !important;
            }
            .personne__liens .trombinoscope__carte__avatar img {
                width: 100% !important; height: 100% !important; object-fit: cover !important;
            }

            /* Carte étudiante européenne */
            .toybox.pdf-viewer__toybox {
                display: flex !important; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
                background: var(--c-card) !important; border: 1px solid var(--c-line) !important; border-radius: 14px !important;
                padding: 10px 16px !important; margin-bottom: 18px !important; box-shadow: var(--shadow-sm) !important;
            }
            .toybox__btn, .toybox__zoom, [class*="toybox"] button, [class*="toybox"] a {
                background: var(--c-soft) !important; border: 1px solid var(--c-line) !important; border-radius: 10px !important;
                color: var(--c-ink) !important; width: auto !important; padding: 7px 14px !important; font-weight: 600 !important;
            }
            .toybox__btn.js-pdfFallback {
                display: inline-flex !important; align-items: center; gap: 6px;
                background: var(--c-accent-soft) !important; color: var(--c-accent-ink) !important;
                border: 1px solid rgba(251,226,22,.4) !important; padding: 6px 14px !important;
                border-radius: 999px !important; font-size: .82rem !important; font-weight: 700 !important;
                transition: all .15s !important;
            }
            .toybox__btn.js-pdfFallback:hover {
                background: var(--c-accent) !important; color: #141413 !important; border-color: var(--c-accent) !important;
            }
            .toybox__btn.js-pdfFallback::after { content: "↗"; font-weight: 800; }
            .toybox__btn.js-pdfFallback .toybox__btn-icon { display: none !important; }
            .toybox__btn-icon { color: var(--c-ink) !important; }
            .pdf-viewer__content {
                background: var(--c-card) !important; border: 1px solid var(--c-line) !important; border-radius: 20px !important;
                padding: 36px 24px !important; box-shadow: var(--shadow-md) !important; display: flex; justify-content: center;
            }
            .pdf-viewer__viewer { width: 100% !important; display: flex; justify-content: center; }
            .pdf-viewer__page {
                width: 100% !important; max-width: 540px !important; height: auto !important; aspect-ratio: 979 / 588;
                margin: 0 auto !important; border-radius: 16px !important; overflow: hidden !important;
                box-shadow: 0 14px 36px rgba(0,0,0,.32) !important; border: 1px solid rgba(0,0,0,.1) !important;
            }
            .pdf-viewer__page .canvasWrapper, .pdf-viewer__page canvas {
                width: 100% !important; height: 100% !important; display: block !important;
            }
            .pdf-viewer__page .textLayer { display: none !important; }
            .cesi-info-banner {
                display: flex; align-items: center; gap: 12px; margin: 0 0 22px; padding: 14px 18px;
                background: var(--c-card); border: 1px solid var(--c-line); border-left: 4px solid var(--c-accent);
                border-radius: 14px; box-shadow: var(--shadow-sm); color: var(--c-text); font-size: .92rem;
            }
            .cesi-info-banner strong { color: var(--c-ink); }

            /* Mon emploi du temps (version semaine identique à l'accueil) */
            .js-calendar__wrapper { display: none !important; }
            #cesi-week-nav {
                display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
                background: var(--c-card); border: 1px solid var(--c-line); border-radius: 14px;
                padding: 12px 18px; margin-bottom: 20px; box-shadow: var(--shadow-sm);
            }
            .cesi-week-controls { display: flex; align-items: center; gap: 8px; }
            .cesi-week-btn {
                height: 36px; padding: 0 14px; display: inline-flex; align-items: center; justify-content: center;
                background: var(--c-soft); border: 1px solid var(--c-line); border-radius: 9px;
                color: var(--c-ink); font: 600 .84rem 'Inter', sans-serif; cursor: pointer; transition: all .15s;
            }
            .cesi-week-btn:hover { border-color: var(--c-accent); color: var(--c-accent-ink); }
            .cesi-week-pill {
                background: var(--c-accent); color: #141413 !important; border-radius: 999px;
                padding: 7px 16px; font-size: .85rem; font-weight: 800; letter-spacing: -.1px;
            }
            #cesi-week-grid {
                display: grid; grid-template-columns: repeat(var(--wk-cols, 5), minmax(0, 1fr));
                background: var(--c-card); border: 1px solid var(--c-line); border-radius: 16px;
                box-shadow: var(--shadow-md); overflow: hidden;
            }
            .wk-col { display: flex; flex-direction: column; min-width: 0; border-right: 1px solid var(--c-line); }
            .wk-col:last-child { border-right: 0; }
            .wk-col.is-today { background: rgba(251,226,22,.03); }
            .wk-col-head {
                padding: 14px 14px 12px; border-bottom: 2px solid var(--c-line); background: var(--c-soft);
                display: flex; flex-direction: column; gap: 6px;
            }
            .wk-col.is-today .wk-col-head { background: var(--c-accent-soft); border-bottom-color: var(--c-accent); }
            html.dark .wk-col.is-today .wk-col-head { background: rgba(251,226,22,.1); }
            .wk-col-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
            .wk-col-day { font-size: .74rem; font-weight: 800; color: var(--c-muted); text-transform: uppercase; letter-spacing: .5px; }
            .wk-col.is-today .wk-col-day { color: var(--c-accent-ink); }
            .wk-col-date { font-size: 1.05rem; font-weight: 800; color: var(--c-ink); letter-spacing: -.3px; }
            .wk-col-body { padding: 12px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
            .day-tag { background: var(--c-accent); color: #000 !important; font-size: .6rem; font-weight: 800; padding: 2px 7px; border-radius: 20px; letter-spacing: .4px; }
            .day-tag.soft { background: var(--c-card); color: var(--c-muted) !important; border: 1px solid var(--c-line); }
            .course-count { font-size: .68rem; color: var(--c-muted); font-weight: 600; }
            .edt-course-item { display: flex; flex-direction: column; gap: 7px; padding: 10px 11px; background: var(--c-soft); border: 1px solid var(--c-line); border-radius: 10px; transition: all .15s ease; }
            .edt-course-item:hover { background: var(--c-card); border-color: var(--c-accent); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
            .edt-course-item.is-live { background: var(--c-accent-soft); border-color: var(--c-accent); }
            html.dark .edt-course-item.is-live { background: rgba(251,226,22,.12); border-color: #7a6600; }
            .edt-course-item.is-done { opacity: .52; }
            .edt-course-item.is-done .course-title { text-decoration: line-through; text-decoration-color: #94a3b8; }
            .wk-evt-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; flex-wrap: wrap; }
            .course-time { font-size: .75rem; font-weight: 700; color: var(--c-accent-ink) !important; background: var(--c-accent-soft); border: 1px solid #fef3c7; border-radius: 7px; padding: 3px 8px; font-variant-numeric: tabular-nums; }
            html.dark .course-time { background: var(--c-card); border-color: var(--c-line); color: var(--c-accent-dark) !important; }
            .course-title { margin: 0; font-size: .84rem; font-weight: 700; color: var(--c-ink); line-height: 1.3; }
            .course-sub { display: flex; align-items: center; gap: 5px; margin: 0 !important; font-size: .73rem; color: var(--c-muted) !important; line-height: 1.3 !important; }
            .course-sub svg { width: 12px; height: 12px; fill: currentColor; flex-shrink: 0; }
            .live-pill { display: inline-flex; align-items: center; gap: 5px; font-size: .6rem; font-weight: 800; letter-spacing: .5px; color: #166534 !important; background: #dcfce7; padding: 2px 7px; border-radius: 20px; white-space: nowrap; }
            .live-pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #16a34a; animation: cesiPulse 1.4s infinite; }
            @keyframes cesiPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(.8); } }
            .edt-empty { background: var(--c-soft); border: 1px dashed var(--c-line-strong); border-radius: 10px; padding: 16px 10px; text-align: center; color: var(--c-muted); font-size: .78rem; }
            #cesi-week-grid .edt-course-item { cursor: pointer; }
            ${COURSE_KIND_CSS}
            ${COURSE_KIND_CSS}
        ${CAMPUS_3D_CSS}
            @media (max-width: 1050px) {
                #cesi-week-grid { grid-template-columns: 1fr; }
                .wk-col { border-right: 0; border-bottom: 1px solid var(--c-line); }
                .wk-col:last-child { border-bottom: 0; }
            }

            /* Documents partagés & Fiches documents */
            .liste__document { list-style: none !important; padding: 0 !important; margin: 18px 0 0 !important; display: flex; flex-direction: column; gap: 18px; }
            .liste__document > li:empty { display: none !important; }
            .liste__document--element {
                background: var(--c-card) !important; border: 1px solid var(--c-line) !important; border-radius: 16px !important;
                padding: 22px 24px !important; box-shadow: var(--shadow-sm) !important;
            }
            .liste__document--element--titre {
                display: inline-flex !important; align-items: center; gap: 10px; font-size: 1.08rem !important; font-weight: 800 !important;
                color: var(--c-ink) !important; border-left: 4px solid var(--c-accent); padding-left: 12px; margin-bottom: 16px;
            }
            .liste__document--definition, .liste-definition__motif2 { list-style: none !important; padding: 0 !important; margin: 0 !important; background: transparent !important; border: 0 !important; box-shadow: none !important; }
            ul.objets.liste__ged { list-style: none !important; padding: 0 !important; margin: 0 !important; display: flex !important; flex-direction: column !important; gap: 10px !important; background: transparent !important; border: 0 !important; box-shadow: none !important; }
            ul.objets.liste__ged li.liste__ged-item {
                background: var(--c-soft) !important; border: 1px solid var(--c-line) !important; border-radius: 12px !important;
                padding: 0 !important; margin: 0 !important; box-shadow: none !important;
            }
            ul.objets.liste__ged li.liste__ged-item:hover { border-color: var(--c-accent) !important; transform: translateY(-1px) !important; box-shadow: var(--shadow-sm) !important; }
            .liste__ged-item a {
                display: flex !important; align-items: center; justify-content: space-between; gap: 14px;
                padding: 14px 18px !important; color: var(--c-ink) !important; font-weight: 600 !important; font-size: .94rem !important;
                outline: none !important;
            }
            .liste__ged-item a::before { content: "📄"; font-size: 1.15rem; flex-shrink: 0; }
            .liste__ged-item a::after {
                content: "Consulter →" !important; margin-left: auto; flex-shrink: 0;
                background: var(--c-accent-soft); color: var(--c-accent-ink); border: 1px solid rgba(251,226,22,.4);
                padding: 5px 12px; border-radius: 999px; font-size: .78rem; font-weight: 700; transition: all .15s;
            }
            .liste__ged-item:hover a::after { background: var(--c-accent); color: #141413; border-color: var(--c-accent); }

            /* Encadrés / Fichiers joints sur les fiches documents */
            #avec_encadres { width: 100% !important; float: none !important; min-height: 0 !important; height: auto !important; margin: 0 !important; }
            #encadres { width: 100% !important; float: none !important; margin: 18px 0 0 !important; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; align-items: start; }
            .encadre_auto_fiche {
                background: var(--c-card) !important; border: 1px solid var(--c-line) !important; border-radius: 16px !important;
                padding: 20px 24px !important; box-shadow: var(--shadow-sm) !important; margin: 0 !important;
            }
            .encadre_auto_fiche > h2:first-child { margin-top: 0 !important; }
            .fichiers-joints { list-style: none !important; padding: 0 !important; margin: 0 !important; display: flex; flex-direction: column; gap: 10px; }
            .fichiers-joints__item {
                background: var(--c-soft) !important; border: 1px solid var(--c-line) !important; border-radius: 12px !important;
                transition: transform .15s, border-color .15s !important;
            }
            .fichiers-joints__item:hover { border-color: var(--c-accent) !important; transform: translateY(-1px); }
            .fichiers-joints__lien {
                display: flex !important; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
                padding: 14px 16px !important; color: var(--c-ink) !important; font-weight: 600 !important;
                background-image: none !important;
            }
            .fichiers-joints__lien::before { display: none !important; }
            .fichiers-joints__titre { color: var(--c-ink) !important; font-weight: 700 !important; }
            .fichiers-joints__type-poids { color: var(--c-muted) !important; font-size: .82rem !important; margin-left: 6px; }
            .fichiers-joints__lien::after {
                content: "Télécharger ↗"; margin-left: auto; flex-shrink: 0;
                background: var(--c-accent-soft); color: var(--c-accent-ink); border: 1px solid rgba(251,226,22,.4);
                padding: 5px 12px; border-radius: 999px; font-size: .78rem; font-weight: 700; transition: all .15s;
            }
            .fichiers-joints__item:hover .fichiers-joints__lien::after { background: var(--c-accent); color: #141413; border-color: var(--c-accent); }
            .liste-definitions { list-style: none !important; padding: 0 !important; margin: 0 !important; display: flex; flex-direction: column; gap: 8px; }
            .encadre__liste { list-style: none !important; padding: 0 !important; margin: 0 !important; display: flex; flex-wrap: wrap; gap: 8px; }
            .encadre__liste li {
                background: var(--c-soft) !important; border: 1px solid var(--c-line) !important; border-radius: 999px !important;
                padding: 5px 12px !important; font-size: .82rem !important; color: var(--c-text) !important;
            }
            .actions-fiche { margin: 14px 0 !important; }
            .actions-fiche button {
                display: inline-flex; align-items: center; gap: 8px;
                background: var(--c-card) !important; border: 1px solid var(--c-line) !important; border-radius: 10px !important;
                color: var(--c-ink) !important; padding: 8px 14px !important; font-weight: 600 !important; cursor: pointer;
            }
            .actions-fiche button:hover { border-color: var(--c-accent) !important; }

            @media (max-width: 900px) {
                #cesi-sub-topbar, main#page { padding-left: 20px !important; padding-right: 20px !important; }
                .cesi-sub-nav { display: none; }
            }
        `);

        onReady(() => {
            // Supprimer le bandeau de cookies pour plus de fluidité
            document.getElementById('orejime')?.remove();

            // Nettoyer les classes gênantes sur le body et main
            const mainPage = document.getElementById('page');
            if (mainPage) {
                mainPage.classList.remove('avec_nav');
                mainPage.classList.remove('active');
            }

            if (document.getElementById('cesi-sub-topbar-wrap')) return;

            const curPath = location.pathname;
            const topbarWrap = document.createElement('div');
            topbarWrap.id = 'cesi-sub-topbar-wrap';
            topbarWrap.innerHTML = `
                <div id="cesi-sub-topbar">
                    <div class="cesi-sub-left">
                        <a href="/accueil-apprenant" class="cesi-brand-link" aria-label="Accueil">
                            ${cesiBrand()}
                        </a>
                        <div class="cesi-sub-nav">
                            <a href="/accueil-apprenant">Tableau de bord</a>
                            <a href="/actualites" class="${curPath.includes('/actualites') ? 'active' : ''}">Actualités</a>
                            <a href="/ressources-numeriques" class="${curPath.includes('/ressources-numeriques') ? 'active' : ''}">Ressources</a>
                            <a href="/recherche-travaux-fin-detudes" class="${curPath.includes('/recherche-travaux-fin-detudes') ? 'active' : ''}">Travaux fin d'études</a>
                            <a href="https://moodle.cesi.fr/" target="_blank" rel="noopener">Moodle</a>
                            <a href="https://moodle.cesi.fr/my/courses.php" target="_blank" rel="noopener">Mes cours</a>
                        </div>
                    </div>
                    <div class="cesi-sub-right">
                        <button type="button" class="cesi-sub-btn" id="cesi-sub-theme" title="Basculer clair/sombre" aria-label="Thème">
                            ${svg('moon', 'moon')}${svg('sun', 'sun')}
                        </button>
                        <a href="/identification/logout" class="cesi-sub-btn" title="Déconnexion" style="color: var(--c-danger) !important;">
                            ${svg('logout')} Déconnexion
                        </a>
                    </div>
                </div>
            `;
            document.body.prepend(topbarWrap);

            document.getElementById('cesi-sub-theme')?.addEventListener('click', () => {
                applyTheme(!document.documentElement.classList.contains('dark'), true);
            });

            // Info carte étudiante française sur la page Carte étudiante européenne
            if (curPath.includes('carte-etudiante') && !document.querySelector('.cesi-info-banner')) {
                const h1 = document.querySelector('#page h1, main h1, .page__titre');
                const banner = document.createElement('div');
                banner.className = 'cesi-info-banner';
                banner.innerHTML = `<span>ℹ️</span><div><strong>Carte étudiante française :</strong> la carte étudiante normale est disponible dans l'application <strong>Edusign &gt; Nom &gt; Mes cartes</strong>.</div>`;
                if (h1) h1.after(banner);
                else (document.querySelector('#page, main') || document.body).prepend(banner);
            }

            // Mon emploi du temps : vue semaine moderne alignée sur le tableau de bord
            if (curPath.includes('mon-emploi-du-temps') && !document.getElementById('cesi-week-edt')) {
                const calWrap = document.querySelector('.js-calendar__wrapper');
                const host = document.createElement('div');
                host.id = 'cesi-week-edt';
                host.innerHTML = `
                    <div id="cesi-week-nav">
                        <div class="cesi-week-controls">
                            <button type="button" class="cesi-week-btn" id="cesi-wk-today">Aujourd'hui</button>
                            <button type="button" class="cesi-week-btn" id="cesi-wk-prev" aria-label="Semaine précédente">‹</button>
                            <button type="button" class="cesi-week-btn" id="cesi-wk-next" aria-label="Semaine suivante">›</button>
                        </div>
                        <span class="cesi-week-pill" id="cesi-wk-label">Chargement...</span>
                    </div>
                    <div id="cesi-week-grid"></div>
                    <div id="cesi-week-map"></div>
                `;
                if (calWrap) calWrap.after(host);
                else (document.querySelector('#sans_encadres, #page, main') || document.body).appendChild(host);
                const weekMap = mountCampus3D(document.getElementById('cesi-week-map'));

                const pad = (n) => String(n).padStart(2, '0');
                const dk = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
                const pd = (v) => {
                    if (!v) return new Date();
                    const s = String(v).trim().replace(' ', 'T');
                    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
                    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) : new Date(s);
                };
                const isoWeek = (d) => {
                    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
                    t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
                    const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
                    return Math.ceil((((t - y) / 86400000) + 1) / 7);
                };
                let weekOffset = 0;

                const renderWeek = async () => {
                    const now = new Date();
                    const todayKey = dk(now);
                    const tmr = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                    const tomorrowKey = dk(tmr);
                    const dow = (now.getDay() + 6) % 7; // 0 = lundi
                    const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + weekOffset * 7);
                    const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
                    const nextMon = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 7);
                    const fmtRange = `${mon.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${sun.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                    document.getElementById('cesi-wk-label').textContent = `Semaine n°${isoWeek(mon)} — ${fmtRange}`;

                    const grid = document.getElementById('cesi-week-grid');
                    grid.innerHTML = '<div class="edt-empty" style="grid-column:1/-1">Chargement de l\'emploi du temps...</div>';
                    try {
                        const raw = await getJSON(`/api/seance/all?start=${dk(mon)}&end=${dk(nextMon)}`);
                        const items = (Array.isArray(raw) ? raw : []).map((s) => {
                            const start = pd(s.start), end = pd(s.end || s.start);
                            const teacher = Array.isArray(s.intervenants)
                                ? s.intervenants.map((x) => [x.prenom, x.nom].filter(Boolean).join(' ') || x.nomComplet || '').filter(Boolean).join(', ')
                                : '';
                            return {
                                date: dk(start), startD: start, endD: end,
                                start: hm(start), end: hm(end),
                                allDay: String(s.allDay) === 'true',
                                title: s.title || s.nomModule || s.matiere || 'Séance',
                                place: (Array.isArray(s.salles) ? s.salles.map((x) => x.nomSalle).filter(Boolean).join(', ') : '') || 'Salle non précisée',
                                teacher
                            };
                        });
                        const groups = {};
                        items.forEach((c) => { (groups[c.date] = groups[c.date] || []).push(c); });

                        const days = [];
                        for (let i = 0; i < 6; i++) {
                            const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
                            const k = dk(d);
                            if (i < 5 || (groups[k] && groups[k].length)) days.push({ d, k });
                        }
                        grid.style.setProperty('--wk-cols', String(days.length));
                        grid.innerHTML = days.map(({ d, k }) => {
                            const courses = (groups[k] || []).slice().sort((a, b) => a.startD - b.startD);
                            const tag = k === todayKey ? '<span class="day-tag">AUJOURD\'HUI</span>'
                                : k === tomorrowKey ? '<span class="day-tag soft">DEMAIN</span>' : '';
                            const wd = d.toLocaleDateString('fr-FR', { weekday: 'long' });
                            const dt = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                            const listHtml = courses.length ? courses.map((c) => {
                                const live = now >= c.startD && now < c.endD;
                                const done = now >= c.endD;
                                const kind = getCourseKind(c.title);
                                const kindCls = kind ? ` kind-${kind.id}` : '';
                                return `
                                    <div class="edt-course-item${live ? ' is-live' : done ? ' is-done' : ''}${kindCls}" data-room="${esc(c.place)}" data-title="${esc(c.title)}" data-time="${esc(c.allDay ? 'Journée' : `${c.start} - ${c.end}`)}" data-teacher="${esc(c.teacher)}" data-live="${live ? '1' : '0'}">
                                        <div class="wk-evt-top">
                                            <span class="course-time">${c.allDay ? 'Journée' : `${esc(c.start)} - ${esc(c.end)}`}</span>
                                            ${courseKindBadge(kind)}
                                            ${live ? '<span class="live-pill">EN COURS</span>' : ''}
                                        </div>
                                        <h5 class="course-title">${esc(c.title)}</h5>
                                        <p class="course-sub">${svg('pin')}${esc(c.place)}</p>
                                        ${c.teacher ? `<p class="course-sub">${svg('user')}${esc(c.teacher)}</p>` : ''}
                                    </div>`;
                            }).join('') : '<div class="edt-empty">Aucun cours</div>';
                            return `
                                <div class="wk-col${k === todayKey ? ' is-today' : ''}">
                                    <div class="wk-col-head">
                                        <div class="wk-col-top">
                                            <span class="wk-col-day">${esc(wd)}</span>
                                            ${tag || `<span class="course-count">${courses.length} cours</span>`}
                                        </div>
                                        <div class="wk-col-date">${esc(dt)}</div>
                                    </div>
                                    <div class="wk-col-body">${listHtml}</div>
                                </div>`;
                        }).join('');
                        weekMap.updateFromItems(items);
                    } catch (e) {
                        console.warn('[CESI redesign] Week EDT', e);
                        grid.innerHTML = '<div class="edt-empty" style="grid-column:1/-1">Impossible de charger l\'emploi du temps.</div>';
                    }
                };

                document.getElementById('cesi-week-grid').addEventListener('click', (e) => {
                    const item = e.target.closest('.edt-course-item');
                    if (!item) return;
                    weekMap.selectCourse({
                        place: item.dataset.room,
                        title: item.dataset.title,
                        time: item.dataset.time,
                        teacher: item.dataset.teacher,
                        live: item.dataset.live === '1'
                    }, true);
                    document.querySelector('#cesi-week-map .cesi-map-section')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                });
                document.getElementById('cesi-wk-today').addEventListener('click', () => { weekOffset = 0; renderWeek(); });
                document.getElementById('cesi-wk-prev').addEventListener('click', () => { weekOffset -= 1; renderWeek(); });
                document.getElementById('cesi-wk-next').addEventListener('click', () => { weekOffset += 1; renderWeek(); });
                renderWeek();
            }
        });
    }


    /* =====================================================================
       2.C. PLATEFORME MOODLE (Dashboard, Liste des cours, Navigation)
       ===================================================================== */
    function handleMoodlePlatform() {
        addFont();

        const THEME_KEY = 'cesi_theme';
        const isDark = isPrefDark;
        const applyTheme = (dark, save = false) => {
            const el = document.documentElement;
            if (el) {
                withInstantTheme([document], () => {
                    el.classList.toggle('cesi-dark', dark);
                    el.classList.toggle('dark', dark);
                    el.classList.toggle('scn-dark', dark);
                });
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.documentElement?.classList.toggle('cesi-dark', dark);
                    document.documentElement?.classList.toggle('dark', dark);
                    document.documentElement?.classList.toggle('scn-dark', dark);
                }, { once: true });
            }
            if (save) {
                try {
                    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
                    localStorage.setItem('scn-theme', dark ? 'dark' : 'light');
                } catch { /* ignore */ }
            }
        };
        applyTheme(isDark(), false);
        onSystemThemeChange((dark) => applyTheme(dark, false));

        addStyle(`
            html.cesi-dark, html.dark {
                --m-bg: #0d1117; --m-card: #161b22; --m-soft: #21262d;
                --m-border: #30363d; --m-text: #c9d1d9; --m-ink: #f0f6fc;
                --m-muted: #8b949e; --m-primary: #FBE216; --m-primary-ink: #000;
                --m-line: #30363d; color-scheme: dark;
            }
            html:not(.cesi-dark):not(.dark) {
                --m-bg: #f4f5f7; --m-card: #ffffff; --m-soft: #f8fafc;
                --m-border: #e2e8f0; --m-text: #334155; --m-ink: #0f172a;
                --m-muted: #64748b; --m-primary: #FBE216; --m-primary-ink: #000;
                --m-line: #e2e8f0;
            }
            html, body {
                background: var(--m-bg) !important; color: var(--m-text) !important;
                font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
                margin: 0 !important; min-height: 100vh !important;
            }
            ${BRAND_CSS}
            /* Barre de navigation Moodle unifiée */
            .top-bar, #mainnavigation, .navbar:not(.toast-wrapper) {
                min-height: 60px !important; width: 100% !important; left: 0 !important; right: 0 !important;
                background: rgba(244,245,247,.85) !important;
                backdrop-filter: saturate(180%) blur(12px) !important; -webkit-backdrop-filter: saturate(180%) blur(12px) !important;
                border-bottom: 1px solid var(--m-border) !important;
                box-shadow: none !important;
            }
            html.cesi-dark .top-bar, html.cesi-dark #mainnavigation, html.cesi-dark .navbar:not(.toast-wrapper) {
                background: rgba(22,27,34,.85) !important;
            }
            .top-bar .navbar, .top-bar .top-bar-inner, .top-bar .container-fluid {
                background: transparent !important; border: 0 !important; box-shadow: none !important; backdrop-filter: none !important;
                max-width: none !important;
            }
            .toast-wrapper {
                background: transparent !important; border: 0 !important; min-height: 0 !important;
                backdrop-filter: none !important; box-shadow: none !important;
            }
            .navbar .primary-navigation, .navbar .moremenu, .navbar .more-nav, .navbar .navbar-nav,
            html.cesi-dark .navbar .moremenu, html.cesi-dark .navbar .more-nav {
                background: transparent !important; border: 0 !important;
            }
            #cesi-moodle-quicklinks a {
                display: inline-flex !important; align-items: center !important; height: 36px !important;
                padding: 0 12px !important; border-radius: 9px !important; margin: 0 !important; line-height: 1 !important;
            }
            .navbar .nav-link, .navbar .navbar-nav > li > a {
                font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
            }
            .navbar .userinitials, .navbar .usermenu .avatar {
                box-shadow: none !important; border: 0 !important;
            }
            .navbar-brand, .site-name {
                font-weight: 800 !important; color: var(--m-ink) !important; letter-spacing: -.3px !important;
            }
            .nav-link, .navbar .nav > li > a {
                color: var(--m-muted) !important; font-weight: 600 !important; font-size: .86rem !important;
                border-radius: 8px !important; transition: all .15s !important;
            }
            .nav-link:hover, .navbar .nav > li > a:hover {
                color: var(--m-ink) !important; background: var(--m-soft) !important;
            }
            .navbar .primary-navigation,
            .navbar .primary-navigation .moremenu,
            .navbar .primary-navigation .more-nav {
                display: flex !important; align-items: center !important; visibility: visible !important; opacity: 1 !important; overflow: visible !important;
            }
            .navbar .primary-navigation .nav-item {
                display: inline-flex !important; align-items: center !important; visibility: visible !important; opacity: 1 !important;
            }
            .navbar .primary-navigation .nav-link,
            .navbar .primary-navigation .nav-link * {
                color: var(--m-ink) !important; visibility: visible !important; opacity: 1 !important;
                text-transform: none !important;
            }
            .navbar .primary-navigation .nav-link {
                display: inline-flex !important; align-items: center !important; height: 32px !important;
                padding: 0 10px !important; font-size: .8rem !important; line-height: 1 !important;
                white-space: nowrap !important; border-radius: 8px !important;
            }
            .navbar .primary-navigation .nav-link.active,
            .navbar .primary-navigation .nav-link.active * {
                background: var(--m-primary) !important; color: #000 !important; font-weight: 700 !important;
            }

            /* Cartes, conteneurs et listes Moodle */
            #page, #page-content, #region-main-box, #region-main, #region-main > div[role="main"],
            #page .main-inner, #block-region-content,
            #region-main > .card:has(.block), #region-main .card:has(#block-region-content),
            #page-my-index #page-header, #page-my-index #page-header .card {
                background: transparent !important; border: 0 !important; border-radius: 0 !important;
                box-shadow: none !important; color: var(--m-text) !important;
            }
            html.cesi-dark #page-header .page-header-headings,
            html.cesi-dark .page-context-header .page-header-headings {
                background: transparent !important; border: 0 !important;
            }
            html.cesi-dark #page-header:has(img, [style*="background-image"]) .page-header-headings {
                background: rgba(13, 17, 23, .82) !important; color: #f0f6fc !important;
                border: 1px solid var(--m-border) !important; border-radius: 10px !important;
            }
            html.cesi-dark #page-header .page-header-headings h1 {
                background: transparent !important; border: 0 !important; color: #f0f6fc !important;
            }
            #region-main > .card:has(.block) > .card-body,
            #region-main .card:has(#block-region-content) > .card-body {
                padding: 0 !important;
            }
            .card, .block, .dashboard-card,
            .course-info-container, .activity-item, .list-group-item, .course-listitem,
            [data-region="course-content"], .courses-view-course-item, .section.course-section,
            .maincalendar .calendartable td, .maincalendar .calendartable th {
                background: var(--m-card) !important; border: 1px solid var(--m-border) !important;
                border-radius: 12px !important; color: var(--m-text) !important;
            }
            #page-wrapper { background: var(--m-bg) !important; }

            /* Onglets de navigation secondaire (Cours, Participants, Notes, Compétences) */
            html.cesi-dark ul.nav-tabs, html.cesi-dark .moremenu, html.cesi-dark .more-nav,
            html.cesi-dark .secondary-navigation, html.cesi-dark .secondary-navigation nav,
            html.cesi-dark .navigation, html.cesi-dark .header-maxwidth {
                background: var(--m-card) !important; border-color: var(--m-border) !important;
            }
            html.cesi-dark .nav-tabs .nav-link, html.cesi-dark .more-nav .nav-link {
                color: var(--m-muted) !important; border-color: transparent !important; background: transparent !important;
            }
            html.cesi-dark .nav-tabs .nav-link:hover, html.cesi-dark .more-nav .nav-link:hover {
                color: var(--m-ink) !important; background: var(--m-soft) !important;
            }
            html.cesi-dark .nav-tabs .nav-link.active, html.cesi-dark .more-nav .nav-link.active {
                color: #000 !important; background: var(--m-primary) !important; border-color: var(--m-primary) !important; font-weight: 700 !important;
            }

            /* Titres de sections et textes contrastés */
            html.cesi-dark .sectionname, html.cesi-dark .sectionname a,
            html.cesi-dark .course-section-header, html.cesi-dark h1, html.cesi-dark h2,
            html.cesi-dark h3, html.cesi-dark h4, html.cesi-dark h5, html.cesi-dark h6,
            html.cesi-dark .contentafterlink, html.cesi-dark .activity-item .activityname a,
            html.cesi-dark .course-listitem .coursename, html.cesi-dark .course-listitem .coursename a {
                color: var(--m-ink) !important;
            }
            html.cesi-dark .text-muted, html.cesi-dark .dimmed_text, html.cesi-dark p, html.cesi-dark span.categoryname {
                color: var(--m-muted) !important;
            }
            html.cesi-dark .course-listitem:hover, html.cesi-dark .list-group-item:hover {
                background: var(--m-soft) !important;
            }

            /* Formulaires, barres de recherche et sélecteurs */
            html.cesi-dark input.form-control, html.cesi-dark select.form-control,
            html.cesi-dark select.custom-select, html.cesi-dark .input-group-text,
            html.cesi-dark textarea.form-control, html.cesi-dark .custom-select {
                background: var(--m-soft) !important; border-color: var(--m-border) !important; color: var(--m-ink) !important;
            }
            html.cesi-dark input.form-control::placeholder { color: var(--m-muted) !important; }

            /* Menus déroulants, tiroirs et popovers */
            html.cesi-dark .dropdown-menu, html.cesi-dark .popover, html.cesi-dark .popover-body,
            html.cesi-dark .popover-header, html.cesi-dark .modal-content,
            html.cesi-dark .drawer, html.cesi-dark .drawer.bg-white, html.cesi-dark .drawercontent {
                background: var(--m-card) !important; border-color: var(--m-border) !important; color: var(--m-text) !important;
            }
            html.cesi-dark .dropdown-item { color: var(--m-text) !important; }
            html.cesi-dark .dropdown-item:hover, html.cesi-dark .dropdown-item:focus {
                background: var(--m-soft) !important; color: var(--m-ink) !important;
            }
            html.cesi-dark .dropdown-divider { border-top-color: var(--m-border) !important; }
            html.cesi-dark [data-action="toggle-drawer"] {
                background: var(--m-card) !important; border: 1px solid var(--m-border) !important; color: var(--m-muted) !important;
            }
            html.cesi-dark [data-action="toggle-drawer"]:hover {
                background: var(--m-soft) !important; color: var(--m-ink) !important;
            }

            /* Cours et activités */
            .dashboard-card {
                transition: transform .18s, border-color .18s, box-shadow .18s !important;
                overflow: hidden !important;
            }
            .dashboard-card:hover {
                transform: translateY(-3px) !important; border-color: var(--m-primary) !important;
                box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
            }
            .dashboard-card .card-title, .course-card-title {
                color: var(--m-ink) !important; font-weight: 700 !important; font-size: .95rem !important;
            }
            .activity-item {
                padding: 8px 12px !important; margin-bottom: 6px !important; transition: background .15s !important;
            }
            .section.course-section {
                padding: 12px 16px !important; margin-bottom: 12px !important;
            }
            .section.course-section .course-section-header {
                margin-bottom: 6px !important; padding: 2px 0 !important;
            }
            .activity-item:hover { background: var(--m-soft) !important; }
            .activity-item .activity-grid,
            .activity-item .activity-name-area,
            .activity-item .activitytitle,
            .activity-item .activityname {
                background: transparent !important; box-shadow: none !important;
            }
            .activity-item .activity-grid { align-items: center !important; }
            .activityname a, .activityname a .instancename { color: var(--m-ink) !important; font-weight: 600 !important; }
            .activityname a:hover, .activityname a:hover .instancename { color: var(--m-primary) !important; }

            /* Boutons Moodle */
            .btn-primary {
                background: var(--m-primary) !important; color: #000 !important; font-weight: 700 !important;
                border: 0 !important; border-radius: 8px !important; padding: 8px 18px !important;
            }
            .btn-secondary {
                background: var(--m-soft) !important; color: var(--m-ink) !important; font-weight: 600 !important;
                border: 1px solid var(--m-border) !important; border-radius: 8px !important;
            }
            html.cesi-dark .card-footer, html.cesi-dark .card-header {
                background: var(--m-card) !important; border-color: var(--m-border) !important; color: var(--m-text) !important;
            }
            html.cesi-dark .btn-dark {
                background: var(--m-soft) !important; color: var(--m-ink) !important; border: 1px solid var(--m-border) !important;
            }
            html.cesi-dark .btn-dark:hover {
                background: var(--m-primary) !important; color: #000 !important; border-color: var(--m-primary) !important;
            }
            h2.sectionname { border-left: 4px solid var(--m-primary) !important; padding-left: 10px !important; }
            /* Cartes visuelles Moodle (.item.col et .card.card-bg-light) */
            .item > div:has(.icon-holder):has(.item-content),
            .card.card-bg-light,
            .col > .card:has(> img):has(.card-footer) {
                background: var(--m-card) !important; border: 1px solid var(--m-border) !important;
                border-radius: 16px !important; padding: 12px !important; overflow: hidden !important;
                box-shadow: 0 2px 8px rgba(0,0,0,.06) !important; transform: none !important;
                display: flex !important; flex-direction: column !important; justify-content: space-between !important; height: 100% !important;
                transition: border-color .12s ease, box-shadow .12s ease !important;
            }
            .item > div:has(.icon-holder):has(.item-content):hover,
            .card.card-bg-light:hover,
            .col > .card:has(> img):has(.card-footer):hover {
                transform: none !important; border-color: var(--m-primary) !important;
                box-shadow: 0 8px 20px rgba(0,0,0,.12) !important;
            }
            .item .icon-holder {
                width: 100% !important; padding: 0 !important; margin: 0 !important;
                background: transparent !important; overflow: hidden !important; border-radius: 10px !important;
                display: flex !important; align-items: center !important; justify-content: center !important;
            }
            .item .icon-holder:has(i, svg):not(:has(img)) {
                padding: 10px 0 4px !important;
            }
            .item .icon-holder i,
            .item .icon-holder svg {
                width: 56px !important; height: 56px !important; border-radius: 14px !important;
                display: inline-flex !important; align-items: center !important; justify-content: center !important;
                font-size: 26px !important; background: #fffbeb !important; color: #7a6600 !important;
                border: 1px solid #fde68a !important; fill: currentColor !important;
            }
            html.cesi-dark .item .icon-holder i,
            html.cesi-dark .item .icon-holder svg {
                background: rgba(251,226,22,.1) !important; color: var(--m-primary) !important;
                border-color: rgba(251,226,22,.32) !important;
            }
            .item .icon-holder img,
            .card.card-bg-light > img,
            .col > .card:has(> img):has(.card-footer) > img {
                width: 100% !important; min-width: 100% !important; max-width: none !important;
                height: 195px !important; object-fit: cover !important; object-position: center !important;
                display: block !important; border-radius: 10px !important; margin: 0 !important;
            }
            .card.card-bg-light .card-body,
            .col > .card:has(> img):has(.card-footer) .card-body {
                padding: 12px 4px 8px !important; background: transparent !important;
            }
            .card.card-bg-light .card-title,
            .col > .card:has(> img):has(.card-footer) .card-title {
                color: var(--m-ink) !important; font-weight: 700 !important; margin: 0 0 4px !important;
            }
            .card.card-bg-light .card-text,
            .col > .card:has(> img):has(.card-footer) .card-text {
                color: var(--m-muted) !important; margin: 0 !important; font-size: .88rem !important;
            }
            .item .item-content,
            .card.card-bg-light .card-footer,
            .col > .card:has(> img):has(.card-footer) .card-footer {
                padding: 10px 0 0 !important; margin: 0 !important; border-top: 0 !important; background: transparent !important;
            }
            .item .item-content a.btn,
            .card.card-bg-light .card-footer a.btn,
            .col > .card:has(> img):has(.card-footer) .card-footer a.btn,
            .section .no-overflow a.btn.btn-dark {
                background: var(--m-soft) !important; color: var(--m-ink) !important;
                border: 1px solid var(--m-border) !important; border-radius: 10px !important;
                font-size: .88rem !important; font-weight: 700 !important; padding: 8px 14px !important;
                text-transform: none !important;
                transition: background .12s ease, color .12s ease, border-color .12s ease !important;
            }
            .item .item-content a.btn,
            .card.card-bg-light .card-footer a.btn,
            .col > .card:has(> img):has(.card-footer) .card-footer a.btn {
                width: 100% !important; display: block !important;
            }
            .item .item-content a.btn:hover,
            .card.card-bg-light .card-footer a.btn:hover,
            .col > .card:has(> img):has(.card-footer) .card-footer a.btn:hover,
            .section .no-overflow a.btn.btn-dark:hover {
                background: var(--m-primary) !important; color: #000 !important; border-color: var(--m-primary) !important;
            }
            .section .no-overflow a.btn.btn-primary {
                border-radius: 10px !important; font-size: .88rem !important; padding: 9px 16px !important;
                margin: 4px !important; text-transform: none !important;
            }
            .activity-item:has(.no-overflow a.btn) .activity-grid,
            .activity-item:has(.no-overflow a.btn) .activity-altcontent {
                display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important;
            }
            .section .no-overflow:has(> p > a.btn, > a.btn),
            .section .no-overflow > div:has(> p > a.btn, > a.btn) {
                display: flex !important; flex-wrap: wrap !important; align-items: stretch !important;
                justify-content: center !important; gap: 10px !important; width: 100% !important;
            }
            .section .no-overflow:has(> p > a.btn, > a.btn) br { display: none !important; }
            .section .no-overflow > div:has(> p > a.btn) > p:has(> a.btn),
            .section .no-overflow:has(> p > a.btn) > p:has(> a.btn) {
                display: contents !important; margin: 0 !important;
            }
            .section .no-overflow:has(> p > a.btn, > a.btn) a.btn {
                flex: 1 1 200px !important; max-width: 320px !important; margin: 0 !important;
                display: inline-flex !important; align-items: center !important; justify-content: center !important;
                text-align: center !important; padding: 10px 16px !important; border-radius: 10px !important;
                font-size: .86rem !important; font-weight: 700 !important; text-transform: none !important;
            }
            .section .no-overflow a.btn.btn-info {
                background: var(--m-soft) !important; color: var(--m-ink) !important;
                border: 1px solid var(--m-border) !important; box-shadow: none !important;
            }
            .section .no-overflow a.btn.btn-info[href]:hover {
                background: var(--m-primary) !important; color: #000 !important; border-color: var(--m-primary) !important;
            }
            .section .no-overflow a.btn.btn-info:not([href]) {
                cursor: default !important; opacity: .78 !important;
            }
            /* Bouton isolé type "SESSION LOCALE" (activityinline + pattern-holder) */
            .activity-item:has(.pattern-holder):has(a.btn),
            .activity-item.activityinline:has(.no-overflow a.btn) {
                background: transparent !important; border: 0 !important; box-shadow: none !important;
                padding: 4px 0 0 !important; margin: 0 !important;
            }
            .activity-item:has(.pattern-holder) .pattern-holder { display: none !important; }
            .activity-item:has(.pattern-holder) .activity-grid,
            .activity-item:has(.pattern-holder) .activity-altcontent,
            .activity-item:has(.pattern-holder) .item.col {
                display: block !important; margin: 0 !important; padding: 0 !important;
            }
            .activity-item:has(.pattern-holder) .item.col {
                display: flex !important; justify-content: center !important;
            }
            .activity-item:has(.pattern-holder) a.btn {
                background: var(--m-primary) !important; color: #000 !important; border: 0 !important;
                border-radius: 10px !important; font-size: .88rem !important; font-weight: 800 !important;
                padding: 8px 22px !important; width: auto !important; min-width: 180px !important;
                display: inline-flex !important; align-items: center !important; justify-content: center !important;
                text-transform: none !important; box-shadow: 0 2px 10px rgba(251,226,22,.25) !important;
            }
            .activity-item:has(.pattern-holder) a.btn:hover {
                filter: brightness(0.95) !important; color: #000 !important;
            }
            #cesi-moodle-more { position: relative !important; }
            #cesi-moodle-more .dropdown-menu { min-width: 220px; border-radius: 12px !important; padding: 6px !important; box-shadow: 0 10px 28px rgba(0,0,0,.18) !important; }
            #cesi-moodle-more .dropdown-item { border-radius: 8px !important; padding: 7px 12px !important; font-size: .86rem !important; font-weight: 500 !important; }
            #cesi-moodle-more .dropdown-menu.show { display: block !important; }

            /* Page "Mes cours" (/my/courses.php — block_myoverview) */
            .block_myoverview { border-radius: 16px !important; box-shadow: 0 2px 10px rgba(0,0,0,.04) !important; }
            .block_myoverview .card-title {
                font-size: 1.05rem !important; font-weight: 800 !important; color: var(--m-ink) !important;
                border-left: 4px solid var(--m-primary) !important; padding-left: 10px !important; margin: 0 !important;
            }
            [data-region="myoverview"] [data-region="filter"] { margin: 4px 0 16px !important; }
            [data-region="myoverview"] [data-region="filter"] > .row {
                display: flex !important; flex-wrap: wrap !important; align-items: center !important;
                gap: 10px !important; width: 100% !important; margin: 0 !important;
            }
            [data-region="myoverview"] [data-region="filter"] > .row > div {
                margin: 0 !important; padding: 0 !important;
            }
            [data-region="myoverview"] .dropdown-toggle {
                height: 38px !important; border-radius: 10px !important; padding: 0 14px !important;
                border: 1px solid var(--m-border) !important; background: var(--m-soft) !important;
                color: var(--m-ink) !important; font-size: .84rem !important; font-weight: 600 !important;
                display: inline-flex !important; align-items: center !important; gap: 6px !important;
                box-shadow: none !important;
            }
            [data-region="myoverview"] .dropdown-toggle:hover {
                border-color: var(--m-primary) !important; background: var(--m-card) !important;
            }
            [data-region="myoverview"] [data-region="filter"] input[data-region="input"] {
                height: 38px !important; border-radius: 10px !important; padding: 0 36px 0 14px !important;
                border: 1px solid var(--m-border) !important; background: var(--m-soft) !important;
                color: var(--m-ink) !important; font-size: .86rem !important; box-shadow: none !important;
            }
            [data-region="myoverview"] [data-region="filter"] input[data-region="input"]:focus {
                border-color: var(--m-primary) !important; box-shadow: 0 0 0 3px rgba(251,226,22,.18) !important;
                background: var(--m-card) !important;
            }
            [data-region="myoverview"] ul.list-group {
                display: flex !important; flex-direction: column !important; gap: 10px !important;
                background: transparent !important; border: 0 !important;
            }
            [data-region="myoverview"] li.list-group-item.course-listitem {
                padding: 12px 16px !important; margin: 0 !important;
                border: 1px solid var(--m-border) !important; border-radius: 14px !important;
                background: var(--m-card) !important;
            }
            [data-region="myoverview"] li.list-group-item.course-listitem:hover {
                border-color: var(--m-primary) !important; background: var(--m-soft) !important;
                box-shadow: 0 4px 14px rgba(0,0,0,.06) !important;
            }
            [data-region="myoverview"] .course-listitem .row { align-items: center !important; }
            [data-region="myoverview"] .course-listitem .list-image {
                height: 68px !important; border-radius: 10px !important;
                background-size: cover !important; background-position: center !important;
                border: 1px solid var(--m-border) !important;
            }
            html.cesi-dark [data-region="myoverview"] .course-listitem .list-image[style*="noimg"],
            html.cesi-dark .dashboard-card .card-img-top[style*="noimg"] {
                filter: invert(0.88) hue-rotate(180deg);
            }
            [data-region="myoverview"] .course-listitem a.coursename {
                font-size: .94rem !important; font-weight: 700 !important; color: var(--m-ink) !important;
                text-decoration: none !important; line-height: 1.35 !important;
            }
            [data-region="myoverview"] .course-listitem a.coursename:hover { text-decoration: underline !important; }
            [data-region="myoverview"] .course-listitem .categoryname {
                display: inline-block !important; margin-top: 4px !important; padding: 2px 9px !important;
                border-radius: 999px !important; font-size: .74rem !important; font-weight: 600 !important;
                background: var(--m-soft) !important; border: 1px solid var(--m-border) !important;
                color: var(--m-muted) !important;
            }
            [data-region="myoverview"] .course-listitem .progress-text {
                font-size: .76rem !important; font-weight: 600 !important; color: var(--m-muted) !important; margin-top: 4px !important;
            }
            [data-region="myoverview"] .course-listitem .coursemenubtn {
                width: 34px !important; height: 34px !important; border-radius: 9px !important;
                display: inline-flex !important; align-items: center !important; justify-content: center !important;
                color: var(--m-muted) !important; border: 1px solid transparent !important;
            }
            [data-region="myoverview"] .course-listitem .coursemenubtn:hover {
                background: var(--m-card) !important; border-color: var(--m-border) !important; color: var(--m-ink) !important;
            }
            [data-region="myoverview"] .menu:has(.cesi-course-actions) > .dropdown { display: none !important; }
            .cesi-course-actions {
                display: inline-flex; align-items: center; gap: 6px; margin-left: auto;
            }
            .cesi-course-act-btn {
                width: 32px; height: 32px; border-radius: 9px; border: 1px solid var(--m-border);
                background: var(--m-soft); color: var(--m-muted); padding: 0;
                display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
                transition: background .12s ease, color .12s ease, border-color .12s ease;
            }
            .cesi-course-act-btn:hover { background: var(--m-card); color: var(--m-ink); border-color: var(--m-muted); }
            .cesi-course-act-btn.is-fav {
                background: rgba(251,226,22,.16); color: #eab308; border-color: rgba(251,226,22,.45);
            }
            .cesi-course-act-btn.is-fav:hover { background: rgba(251,226,22,.26); color: #ca8a04; }
            .cesi-course-act-btn.is-hide:hover { color: #ef4444; border-color: rgba(239,68,68,.45); }
            .cesi-course-act-btn svg { width: 16px; height: 16px; display: block; }

            /* Bouton de thème dans la barre Moodle */
            .cesi-moodle-theme-btn {
                height: 36px; width: 36px; display: inline-flex; align-items: center; justify-content: center;
                border: 1px solid var(--m-border); border-radius: 9px; background: var(--m-card); color: var(--m-muted);
                cursor: pointer; transition: all .15s; flex-shrink: 0;
            }
            .cesi-moodle-theme-btn:hover { color: var(--m-ink); border-color: var(--m-muted); }
            .cesi-moodle-theme-btn svg { width: 16px; height: 16px; fill: currentColor; }
            .cesi-moodle-theme-btn .sun { display: none; } html.cesi-dark .cesi-moodle-theme-btn .sun { display: block; } html.cesi-dark .cesi-moodle-theme-btn .moon { display: none; }
        `);

        onReady(() => {
            // 1. Bypasser automatiquement les pages intermédiaires LTI ou Ressources
            if (location.pathname.includes('/mod/lti/view.php')) {
                const launchBtn = document.querySelector('a[href*="launch.php"], a[href*="triggerview"], .activity-information a[target="_blank"]');
                if (launchBtn && launchBtn.href) {
                    location.replace(launchBtn.href);
                    return;
                }
            }
            if (location.pathname.includes('/mod/resource/view.php')) {
                const resLink = document.querySelector('.resourceworkaround a, .resourcecontent a, .box a[href*="pluginfile.php"]');
                if (resLink && resLink.href) {
                    location.replace(resLink.href);
                    return;
                }
            }

            // 2. Sur la vue de cours Moodle (/course/view.php), optimiser les liens pour ouvrir directement
            document.querySelectorAll('a[href*="/mod/lti/view.php?id="]').forEach((a) => {
                const m = a.href.match(/id=(\d+)/);
                if (m) {
                    a.href = `https://moodle.cesi.fr/mod/lti/launch.php?id=${m[1]}&triggerview=0`;
                    a.target = '_blank';
                }
            });

            // Si la page contient en fait un module Opale ou Topaze embarqué, basculer vers le lecteur
            const isTopaze = !!(document.getElementById('outCat') || document.getElementById('title') || document.querySelector('article.learnOut, .part_ti, h1.case_ti'));
            const isOpale = !isTopaze && !!(
                document.querySelector('nav[aria-label*="menu" i], ul[data-totalpages], header.style-2, main.style-15, .style-16, a[rel="prev"], a[rel="next"]') ||
                location.pathname.includes('/mod_resource/content/') ||
                location.pathname.includes('/pluginfile.php/') ||
                document.querySelector('.style-0, .style-1, .style-2, .style-3, .style-15, .style-16, .style-17, .style-18')
            );
            if (isTopaze || isOpale) {
                handleCourseReader();
                return;
            }

            // Nettoyer les séparateurs "-" isolés entre boutons dans les labels Moodle
            document.querySelectorAll('.section .no-overflow p, .section .no-overflow div').forEach((el) => {
                if (!el.querySelector('a.btn')) return;
                Array.from(el.childNodes).forEach((n) => {
                    if (n.nodeType === Node.TEXT_NODE && /^\s*[-–|•]\s*$/.test(n.nodeValue)) n.remove();
                });
            });

            // Remplacer le menu ⋮ de "Mes cours" par des boutons directs Étoile (favori) et Œil barré (cacher)
            const myOverview = document.querySelector('[data-region="myoverview"]');
            if (myOverview) {
                const STAR_OUTLINE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
                const STAR_FILLED = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
                const EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>';
                const EYE_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

                let syncingActions = false;
                let actionObs = null;
                const syncCourseActions = () => {
                    if (syncingActions) return;
                    syncingActions = true;
                    try {
                        myOverview.querySelectorAll('[data-region="course-content"] .menu').forEach((menuEl) => {
                            const addFav = menuEl.querySelector('a[data-action="add-favourite"]');
                            const remFav = menuEl.querySelector('a[data-action="remove-favourite"]');
                            const hideBtn = menuEl.querySelector('a[data-action="hide-course"]');
                            const showBtn = menuEl.querySelector('a[data-action="show-course"]');
                            if (!addFav && !hideBtn) return;

                            let box = menuEl.querySelector('.cesi-course-actions');
                            if (!box) {
                                box = document.createElement('div');
                                box.className = 'cesi-course-actions';
                                box.innerHTML = `
                                    <button type="button" class="cesi-course-act-btn" data-cesi-act="fav"></button>
                                    <button type="button" class="cesi-course-act-btn is-hide" data-cesi-act="vis"></button>
                                `;
                                menuEl.appendChild(box);

                                box.querySelector('[data-cesi-act="fav"]').addEventListener('click', (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const isFav = remFav && !remFav.classList.contains('hidden');
                                    (isFav ? remFav : addFav)?.click();
                                    setTimeout(syncCourseActions, 50);
                                });
                                box.querySelector('[data-cesi-act="vis"]').addEventListener('click', (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const isHidden = showBtn && !showBtn.classList.contains('hidden');
                                    (isHidden ? showBtn : hideBtn)?.click();
                                    setTimeout(syncCourseActions, 50);
                                });
                            }

                            const favEl = box.querySelector('[data-cesi-act="fav"]');
                            const visEl = box.querySelector('[data-cesi-act="vis"]');
                            const favState = remFav && !remFav.classList.contains('hidden') ? '1' : '0';
                            const visState = showBtn && !showBtn.classList.contains('hidden') ? '1' : '0';

                            if (favEl.dataset.state !== favState) {
                                favEl.dataset.state = favState;
                                const isFav = favState === '1';
                                favEl.classList.toggle('is-fav', isFav);
                                favEl.innerHTML = isFav ? STAR_FILLED : STAR_OUTLINE;
                                favEl.title = isFav ? 'Retirer des favoris' : 'Marquer comme favori';
                                favEl.setAttribute('aria-label', favEl.title);
                            }

                            if (visEl.dataset.state !== visState) {
                                visEl.dataset.state = visState;
                                const isHidden = visState === '1';
                                visEl.innerHTML = isHidden ? EYE_ON : EYE_OFF;
                                visEl.title = isHidden ? 'Ré-afficher' : 'Retirer de l’affichage';
                                visEl.setAttribute('aria-label', visEl.title);
                            }
                        });
                    } finally {
                        actionObs?.takeRecords();
                        syncingActions = false;
                    }
                };

                syncCourseActions();
                actionObs = new MutationObserver(syncCourseActions);
                actionObs.observe(myOverview, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['class']
                });
            }

            // Cacher les sections/catégories Moodle vides
            document.querySelectorAll('li.section.course-section, .section.course-section').forEach((sec) => {
                const hasActivity = sec.querySelector('li.activity, .activity-item, .item');
                const summary = sec.querySelector('.summarytext, .section-summary-activities, .description');
                const hasSummaryContent = summary && (clean(summary.textContent).length > 0 || summary.querySelector('img, video, iframe, a'));
                if (!hasActivity && !hasSummaryContent) {
                    sec.style.display = 'none';
                }
            });

            // Unifier le logo CESI en haut à gauche de la barre Moodle
            const moodleBrand = document.querySelector('.navbar .navbar-brand');
            if (moodleBrand && !moodleBrand.dataset.cesiBranded) {
                moodleBrand.dataset.cesiBranded = '1';
                moodleBrand.classList.add('cesi-brand-link');
                moodleBrand.innerHTML = cesiBrand();
            }

            // Filtrer la barre de titre Moodle : garder A3 FISA, Mes cours, Cycles Ingénieurs et cacher le reste dans "Plus ▾"
            const primaryNavList = document.querySelector('.navbar .primary-navigation ul.more-nav, .navbar .primary-navigation ul.navbar-nav, #mainnavigation ul.navbar-nav');
            if (primaryNavList && !primaryNavList.dataset.cesiFiltered) {
                primaryNavList.dataset.cesiFiltered = '1';

                const makeNavItem = (label, href, isActive = false) => {
                    const li = document.createElement('li');
                    li.className = 'nav-item';
                    li.innerHTML = `<a class="nav-link${isActive ? ' active' : ''}" href="${esc(href)}">${esc(label)}</a>`;
                    return li;
                };

                // Chercher "Cycles Ingénieurs" (ou "PGE") et "Mes cours" dans les éléments existants
                const allAnchors = Array.from(primaryNavList.querySelectorAll('a[href]'));
                const cyclesAnchor = allAnchors.find((a) => /cycles?\s*ing[ée]nieurs?/i.test(clean(a.textContent)) && a.getAttribute('href') !== '#');
                const pgeLi = Array.from(primaryNavList.children).find((li) => /\bpge\b/i.test(clean(li.textContent)));
                const mesCoursAnchor = allAnchors.find((a) => /\/my\/courses\.php/i.test(a.getAttribute('href') || '') || /^mes cours$/i.test(clean(a.textContent)));

                // Collecter tout le reste (y compris les items de dropdownmoremenu) pour le menu déroulant "Plus"
                const hiddenLinks = [];
                const seenHrefs = new Set([
                    'https://moodle.cesi.fr/course/view.php?id=6183',
                    'https://moodle.cesi.fr/my/courses.php'
                ]);
                if (cyclesAnchor?.href) seenHrefs.add(cyclesAnchor.href);

                Array.from(primaryNavList.children).forEach((li) => {
                    if (li === pgeLi && !cyclesAnchor) return;
                    const links = Array.from(li.querySelectorAll('a[href]')).filter((a) => {
                        const h = a.getAttribute('href') || '';
                        const txt = clean(a.textContent);
                        return h && h !== '#' && txt && !seenHrefs.has(a.href) && !/cycles?\s*ing[ée]nieurs?/i.test(txt);
                    });
                    links.forEach((a) => {
                        seenHrefs.add(a.href);
                        hiddenLinks.push({ label: clean(a.textContent), href: a.href });
                    });
                });

                primaryNavList.innerHTML = '';
                primaryNavList.appendChild(makeNavItem(
                    'A3 FISA Informatique 2026 - 2027',
                    'https://moodle.cesi.fr/course/view.php?id=6183',
                    location.href.includes('id=6183')
                ));
                primaryNavList.appendChild(makeNavItem(
                    'Mes cours',
                    mesCoursAnchor?.href || 'https://moodle.cesi.fr/my/courses.php',
                    location.pathname.includes('/my/courses.php')
                ));

                if (cyclesAnchor) {
                    primaryNavList.appendChild(makeNavItem(
                        'Cycles Ingénieurs',
                        cyclesAnchor.href,
                        location.href === cyclesAnchor.href
                    ));
                } else if (pgeLi) {
                    const pgeToggle = pgeLi.querySelector('a.nav-link, button');
                    if (pgeToggle) pgeToggle.textContent = 'Cycles Ingénieurs';
                    primaryNavList.appendChild(pgeLi);
                }

                if (hiddenLinks.length) {
                    const moreLi = document.createElement('li');
                    moreLi.id = 'cesi-moodle-more';
                    moreLi.className = 'nav-item dropdown';
                    moreLi.innerHTML = `
                        <a href="#" class="nav-link dropdown-toggle" role="button" aria-expanded="false">Plus</a>
                        <div class="dropdown-menu">
                            ${hiddenLinks.map((l) => `<a class="dropdown-item" href="${esc(l.href)}">${esc(l.label)}</a>`).join('')}
                        </div>
                    `;
                    const toggle = moreLi.querySelector('.dropdown-toggle');
                    const menu = moreLi.querySelector('.dropdown-menu');
                    toggle.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const open = menu.classList.toggle('show');
                        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
                    });
                    document.addEventListener('click', (e) => {
                        if (!moreLi.contains(e.target)) {
                            menu.classList.remove('show');
                            toggle.setAttribute('aria-expanded', 'false');
                        }
                    });
                    primaryNavList.appendChild(moreLi);
                }
            }

            // Intégrer proprement les accès rapides et le bouton de thème dans la barre Moodle
            const userNav = document.getElementById('usernavigation') || document.querySelector('.navbar .navbar-nav:last-child') || document.querySelector('.navbar');
            if (userNav && !document.getElementById('cesi-moodle-quicklinks')) {
                const wrap = document.createElement('div');
                wrap.id = 'cesi-moodle-quicklinks';
                wrap.style.cssText = 'display: inline-flex; align-items: center; gap: 8px; margin-right: 12px;';
                wrap.innerHTML = `
                    <a href="https://ent.cesi.fr/accueil-apprenant" class="btn btn-sm" style="background: var(--m-primary) !important; color: #000 !important; font-weight: 800; font-size: .78rem; padding: 4px 10px; border-radius: 8px; text-decoration: none;">ENT CESI</a>
                    <button type="button" class="cesi-moodle-theme-btn" id="cesi-moodle-theme-btn" title="Basculer clair/sombre" aria-label="Thème">
                        ${svg('moon', 'moon')}${svg('sun', 'sun')}
                    </button>
                `;
                userNav.prepend(wrap);

                document.getElementById('cesi-moodle-theme-btn')?.addEventListener('click', () => {
                    applyTheme(!document.documentElement.classList.contains('cesi-dark'), true);
                });
            }
        });
    }

    /* =====================================================================
       3. LECTEUR DE COURS SCENARI & MOODLE
       ===================================================================== */
    function handleCourseReader() {
        const isPlayer = /\/player\.xhtml$/i.test(location.pathname);

        const KEY = 'scn-theme';
        const getHtml = () => document.documentElement;
        const store = {
            get: () => { try { return localStorage.getItem('cesi_theme') || localStorage.getItem(KEY); } catch { return null; } },
            set: (v) => {
                try {
                    localStorage.setItem('cesi_theme', v);
                    localStorage.setItem(KEY, v);
                } catch { /* ignore */ }
            }
        };
        const isDark = isPrefDark;
        const applyTheme = () => {
            const dark = isDark();
            getHtml()?.classList.toggle('scn-dark', dark);
            getHtml()?.classList.toggle('dark', dark);
        };
        const setTheme = (dark, save = true) => {
            if (save) store.set(dark ? 'dark' : 'light');
            const docs = [document];
            try { if (window.parent !== window) docs.push(window.parent.document); } catch { /* cross-origin */ }
            document.querySelectorAll('iframe').forEach((f) => { try { f.contentDocument && docs.push(f.contentDocument); } catch { /* ignore */ } });
            withInstantTheme(docs, () => {
                docs.forEach((d) => {
                    d.documentElement?.classList.toggle('scn-dark', dark);
                    d.documentElement?.classList.toggle('dark', dark);
                });
            });
        };
        addClass('scn');
        if (getHtml()) applyTheme();
        else document.addEventListener('DOMContentLoaded', () => applyTheme(), { once: true });
        addEventListener('storage', (e) => (e.key === KEY || e.key === 'cesi_theme') && applyTheme());
        onSystemThemeChange((dark) => setTheme(dark, false));

        addFont();

        const VARS = `html.scn {
            --bg: #f4f5f7; --card: #ffffff; --ink: #0f172a; --text: #334155; --muted: #64748b;
            --line: #e2e8f0; --soft: #f8fafc;
            --acc: #FBE216; --acc-ink: #7a6600; --acc-soft: #fffbeb; --acc-line: #fde68a;
            --sh-sm: 0 1px 3px rgba(15,23,42,.06); --sh-md: 0 8px 24px rgba(15,23,42,.10);
            --side: 280px; --toc: 240px; --bar: 60px;
        }
        html.scn.scn-dark {
            --bg: #0d1117; --card: #161b22; --ink: #e6edf3; --text: #c9d1d9; --muted: #8b949e;
            --line: #30363d; --soft: #1c2128;
            --acc-ink: #FBE216; --acc-soft: rgba(251,226,22,.08); --acc-line: rgba(251,226,22,.35);
            --sh-sm: 0 1px 3px rgba(0,0,0,.4); --sh-md: 0 8px 24px rgba(0,0,0,.5);
            color-scheme: dark;
        }`;

        if (isPlayer) {
            addStyle(VARS + `
            html.scn, html.scn body { background: var(--bg) !important; margin: 0 !important; }
            html.scn #contentFrame { border: 0 !important; display: block; background: var(--bg); }
            html.scn .msgBox { font-family: 'Inter', system-ui, sans-serif !important; color: var(--ink) !important; }
            html.scn .msgBox > div { background: var(--card) !important; border: 1px solid var(--line) !important; border-radius: 14px !important; box-shadow: var(--sh-md) !important; }
        `);
            onReady(() => {
                const frame = document.getElementById('contentFrame');
                if (!frame) return;
                const syncUrl = () => {
                    try {
                        const href = frame.contentWindow?.location?.href;
                        if (href && !/^about:/i.test(href) && href !== location.href) {
                            history.replaceState(null, '', href);
                        }
                    } catch { /* cross-origin */ }
                };
                frame.addEventListener('load', syncUrl);
                syncUrl();
            });
            return;
        }

        addClass('scn-loading');
        setTimeout(() => removeClass('scn-loading'), 3000);

        addStyle(VARS + `
        html.scn.scn-loading body { visibility: hidden !important; }
        html.scn { background: var(--bg) !important; scroll-behavior: smooth; scroll-padding-top: calc(var(--bar) + 20px); }
        html.scn body {
            background: var(--bg) !important; color: var(--text) !important; margin: 0 !important; padding: 0 !important;
            height: auto !important; min-height: 100% !important;
            font: 400 16px/1.65 'Inter', system-ui, -apple-system, sans-serif !important;
            -webkit-font-smoothing: antialiased;
        }
        html.scn :is(h1,h2,h3,h4,h5,h6,p,li,td,th,a,span,div,nav,article,section) { font-family: inherit; }
        html.scn :is(#scn-side, #scn-bar, #scn-toc, .part_ti, .case_ti, .section_ti, .btnNav, h1, h2, h3, h4, h5, h6),
        html.scn :is(#scn-side, #scn-bar, #scn-toc, .part_ti, .case_ti, .section_ti, .btnNav, h1, h2, h3, h4, h5, h6) *:not(svg *) {
            font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
        }
        html.scn ::selection { background: rgba(251,226,22,.45); }

        /* Neutralisation des éléments natifs Scenari et Opale */
        html.scn header, html.scn .style-2, html.scn #header, html.scn #tools, html.scn .style-64, html.scn .style-39,
        html.scn main a[rel="prev"]:not(#scn-shell *), html.scn main a[rel="next"]:not(#scn-shell *),
        html.scn main a[title*="enlarge" i]:not(.imgZoom):not(:has(img)),
        html.scn main a[title*="interface" i]:not(.imgZoom):not(:has(img)),
        html.scn main a[title*="agrandir" i]:not(.imgZoom):not(:has(img)) {
            display: none !important;
        }
        html.scn a.imgZoom { display: block !important; text-decoration: none !important; }

        html.scn .style-0, html.scn .style-1 {
            height: auto !important; min-height: 100% !important; background: transparent !important; margin: 0 !important; padding: 0 !important;
        }
        html.scn .style-15, html.scn .style-16, html.scn .style-17, html.scn .style-18 {
            position: static !important; float: none !important; width: 100% !important; max-width: 100% !important;
            padding: 0 !important; margin: 0 !important; background: transparent !important; border: 0 !important; outline: none !important;
        }
        html.scn .style-51, html.scn .style-76 {
            position: static !important; width: auto !important; height: auto !important; background: transparent !important; border: 0 !important;
        }
        html.scn .style-78, html.scn .style-79, html.scn .style-80, html.scn .style-81, html.scn .style-82, html.scn .style-83, html.scn .style-84, html.scn .style-106, html.scn .style-118, html.scn .style-122, html.scn .style-134 {
            display: none !important;
        }

        /* =========== Structure : barre latérale | contenu | sommaire =========== */
        #scn-shell { display: grid; grid-template-columns: var(--side) minmax(0, 1fr) var(--toc); grid-template-rows: var(--bar) 1fr; min-height: 100vh; }
        #scn-shell.no-toc { grid-template-columns: var(--side) minmax(0, 1fr); }
        #scn-shell.collapsed-side { grid-template-columns: 0 minmax(0, 1fr) var(--toc); }
        #scn-shell.collapsed-side.no-toc { grid-template-columns: 0 minmax(0, 1fr); }
        #scn-shell.collapsed-side #scn-side {
            transform: translateX(-100%); overflow: hidden; visibility: hidden; pointer-events: none; border-right: 0;
        }
        #scn-shell *, #scn-shell *::before, #scn-shell *::after { box-sizing: border-box; }

        /* ---------- Barre latérale ---------- */
        #scn-side {
            grid-column: 1; grid-row: 1 / -1;
            position: sticky; top: 0; align-self: start; height: 100vh; z-index: 120;
            display: flex; flex-direction: column; background: var(--card); border-right: 1px solid var(--line);
            transition: transform .22s ease;
        }
        .scn-brand { padding: 18px 18px 14px; border-bottom: 1px solid var(--line); }
        .scn-logo-box { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .scn-logo-badge { background: var(--acc); color: #000; font-weight: 900; font-size: 1.05rem; padding: 3px 8px; border-radius: 6px; letter-spacing: .5px; line-height: 1; }
        .scn-logo-txt { font-size: .68rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
        .scn-brand-title { margin: 0; font-size: .92rem; font-weight: 800; line-height: 1.3; color: var(--ink); letter-spacing: -.2px; }
        .scn-brand-sub { margin: 3px 0 0; font-size: .74rem; font-weight: 500; line-height: 1.35; color: var(--muted); }
        .scn-side-label { padding: 16px 18px 6px; font-size: .66rem; font-weight: 800; letter-spacing: .8px; text-transform: uppercase; color: var(--muted); }
        .scn-side-scroll { flex: 1; overflow-y: auto; padding: 0 10px 20px; scrollbar-width: thin; }

        /* Navigation de la barre latérale (#outCat, #outSec) */
        html.scn :is(#outCat, #outSec) {
            position: static !important; top: auto !important; left: auto !important; right: auto !important; bottom: auto !important;
            width: auto !important; margin: 0 !important; padding: 0 !important; background: none !important; border: 0 !important;
            transform: none !important;
        }
        html.scn :is(#outCat, #outSec) ul {
            display: flex !important; flex-direction: column !important; gap: 2px !important; margin: 0 !important; padding: 0 !important;
            list-style: none !important; background: none !important; border: 0 !important; counter-reset: scnmod;
        }
        html.scn :is(#outCat, #outSec) li {
            display: block !important; position: static !important; width: 100% !important; margin: 0 !important; padding: 0 !important;
            border: 0 !important; background: none !important; counter-increment: scnmod; transform: none !important;
        }
        html.scn :is(#outCat, #outSec) :is(ul, li, a, span, div) {
            position: static !important; float: none !important; top: auto !important; left: auto !important; right: auto !important; bottom: auto !important;
            transform: none !important; height: auto !important; min-height: 0 !important; max-height: none !important;
            overflow: visible !important; white-space: normal !important; vertical-align: baseline !important;
            text-indent: 0 !important; clip: auto !important; opacity: 1 !important;
        }
        html.scn #outCat :is(a.outCat_lnk, div.outCat_lnk) {
            position: relative !important; display: flex !important; align-items: center; min-height: 40px !important; box-sizing: border-box !important;
            width: 100% !important; height: auto !important;
            padding: 8px 14px 8px 42px !important; border: 0 !important; border-radius: 9px !important;
            background: transparent !important; color: var(--text) !important; text-decoration: none !important;
            font-size: .82rem !important; font-weight: 500 !important; line-height: 1.35 !important; text-align: left !important;
            transition: background .15s, color .15s;
        }
        html.scn #outCat :is(a.outCat_lnk, div.outCat_lnk)::before {
            content: counter(scnmod, decimal-leading-zero); display: block !important; position: absolute; left: 8px; top: 50%; transform: translateY(-50%);
            min-width: 24px; padding: 1px 0;
            border-radius: 6px; background: var(--soft); border: 1px solid var(--line);
            font-size: .66rem; font-weight: 800; line-height: 1.6; text-align: center; color: var(--muted);
        }
        html.scn #outCat :is(a.outCat_lnk, div.outCat_lnk):hover {
            background: var(--soft) !important; color: var(--ink) !important;
        }
        html.scn #outCat li.outCat_sel_yes > :is(a, div) {
            background: var(--acc-soft) !important; color: var(--ink) !important; font-weight: 700 !important; box-shadow: inset 3px 0 0 var(--acc);
        }
        html.scn #outCat li.outCat_sel_yes > :is(a, div)::before {
            background: var(--acc); border-color: var(--acc); color: #000;
        }
        html.scn #outCat a span { color: inherit !important; background: none !important; }

        /* Sections imbriquées sous le module actif */
        html.scn #outSec {
            position: static !important; top: auto !important; left: auto !important; right: auto !important; bottom: auto !important;
            width: auto !important; transform: none !important;
            margin: 6px 0 8px 18px !important; padding: 4px 0 4px 12px !important;
            background: none !important; border: 0 !important; border-left: 2px solid var(--line) !important; box-shadow: none !important;
        }
        html.scn #outSec ul { display: flex !important; flex-direction: column !important; gap: 2px !important; margin: 0 !important; padding: 0 !important; list-style: none !important; }
        html.scn #outSec li { display: block !important; position: static !important; margin: 0 !important; padding: 0 !important; background: none !important; border: 0 !important; transform: none !important; }
        html.scn #outSec :is(a, span, div) {
            position: static !important; transform: none !important;
            display: block !important; padding: 6px 10px !important; border-radius: 7px !important;
            color: var(--muted) !important; background: transparent !important; text-decoration: none !important;
            font-size: .78rem !important; font-weight: 500 !important; line-height: 1.35 !important; text-align: left !important; transition: all .15s;
        }
        html.scn #outSec :is(a, span, div):hover, html.scn #outSec :is(a, span, div).scn-active { color: var(--ink) !important; background: var(--soft) !important; font-weight: 700 !important; }

        /* ---------- Colonne centrale ---------- */
        #scn-center { grid-column: 2; grid-row: 2; min-width: 0; display: flex; flex-direction: column; }
        ${BRAND_CSS}
        #scn-bar {
            grid-column: 2 / -1; grid-row: 1;
            position: sticky; top: 0; z-index: 100; height: var(--bar); display: flex; align-items: center; gap: 12px; padding: 0 24px;
            background: rgba(244,245,247,.85);
            backdrop-filter: saturate(180%) blur(12px); -webkit-backdrop-filter: saturate(180%) blur(12px);
            border-bottom: 1px solid var(--line);
        }
        html.scn-dark #scn-bar { background: rgba(22,27,34,.85); }
        #scn-bar .cesi-brand-link { display: none !important; }
        #scn-shell.collapsed-side #scn-bar .cesi-brand-link { display: inline-flex !important; }
        @media (max-width: 900px) { #scn-bar .cesi-brand-link { display: inline-flex !important; } }
        #scn-crumb { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; font-size: .8rem; color: var(--muted); white-space: nowrap; }
        #scn-crumb span { overflow: hidden; text-overflow: ellipsis; }
        #scn-crumb .sep { flex: none; color: var(--line); font-weight: 700; }
        #scn-crumb .cur { color: var(--ink); font-weight: 700; }
        #scn-progress { position: absolute; left: 0; bottom: -1px; height: 2px; width: 0; background: var(--acc); transition: width .1s linear; pointer-events: none; }
        .scn-btn {
            flex: none; height: 36px; min-width: 36px; padding: 0 10px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
            border: 1px solid var(--line); border-radius: 9px; background: var(--card); color: var(--muted);
            font: 600 .76rem 'Inter', system-ui, sans-serif; cursor: pointer; transition: all .15s;
        }
        .scn-btn:hover { color: var(--ink); border-color: var(--muted); }
        .scn-btn:focus-visible { outline: 3px solid rgba(251,226,22,.7); outline-offset: 1px; }
        .scn-btn svg { width: 17px; height: 17px; fill: currentColor; }
        .scn-btn .sun { display: none; } html.scn-dark .scn-btn .sun { display: block; } html.scn-dark .scn-btn .moon { display: none; }

        html.scn main, html.scn #main { flex: 1 0 auto; width: 100% !important; margin: 0 !important; padding: 24px 0 56px !important; background: transparent !important; position: static !important; }
        html.scn .case { width: 100% !important; max-width: 928px !important; margin: 0 auto !important; padding: 0 24px !important; background: transparent !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; box-sizing: border-box !important; }
        html.scn #content { width: 100% !important; margin: 0 !important; padding: 0 !important; background: transparent !important; border: 0 !important; box-shadow: none !important; }
        html.scn .case > :first-child, html.scn #content > :first-child { margin-top: 0 !important; padding-top: 0 !important; }
        html.scn section { width: 100% !important; max-width: 880px !important; margin: 0 auto 16px !important; padding: 24px 28px !important; background: var(--card) !important; border: 1px solid var(--line) !important; border-radius: 14px; box-shadow: var(--sh-sm); box-sizing: border-box !important; }
        html.scn section:last-child { margin-bottom: 0 !important; }
        html.scn section section { max-width: none !important; margin: 16px 0 0 !important; padding: 0 !important; background: transparent !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
        html.scn section.scn-card-sec { width: 100% !important; max-width: 880px !important; margin: 0 auto 16px !important; padding: 24px 28px !important; background: var(--card) !important; border: 1px solid var(--line) !important; border-radius: 14px !important; box-shadow: var(--sh-sm) !important; box-sizing: border-box !important; }
        html.scn section:empty { display: none !important; }
        html.scn #footer { padding: 20px !important; text-align: center; opacity: .5; background: transparent !important; }
        html.scn-dark #footer img { filter: invert(1); }
        /* Contraste garanti en mode sombre (neutralise les textes noirs et fonds blancs natifs Scenari) */
        html.scn.scn-dark #main { color: var(--text) !important; }
        html.scn.scn-dark #main :is(p, ul, ol, li, div, span, td, dt, dd, label, figcaption, blockquote, em, i, small, code, pre) {
            color: var(--text) !important;
        }
        html.scn.scn-dark #main li::marker { color: var(--text) !important; }
        html.scn #main :is(h1, h2, h3, h4, .part_ti, .section_ti, .case_ti),
        html.scn #main :is(h1, h2, h3, h4, .part_ti, .section_ti, .case_ti) * {
            background: none !important; background-color: transparent !important; background-image: none !important; box-shadow: none !important;
        }
        html.scn.scn-dark #main :is(h1, h2, h3, h4, h5, h6, strong, b, th, .part_ti, .section_ti, .case_ti),
        html.scn.scn-dark #main :is(h1, h2, h3, h4, h5, h6, th, .part_ti, .section_ti, .case_ti) * {
            color: var(--ink) !important;
        }
        html.scn #main a:not(.btnNav):not(.scn-btn):not(.collapsed_open):not(.collapsed_closed),
        html.scn #main a:not(.btnNav):not(.scn-btn):not(.collapsed_open):not(.collapsed_closed) * {
            color: #0284c7 !important;
        }
        html.scn.scn-dark #main a:not(.btnNav):not(.scn-btn):not(.collapsed_open):not(.collapsed_closed),
        html.scn.scn-dark #main a:not(.btnNav):not(.scn-btn):not(.collapsed_open):not(.collapsed_closed) * {
            color: #7dd3fc !important;
        }
        html.scn.scn-dark #main :is(a.collapsed_open, a.collapsed_closed),
        html.scn.scn-dark #main :is(a.collapsed_open, a.collapsed_closed) * {
            color: var(--ink) !important;
        }
        html.scn.scn-dark #main .scn-lvl { color: var(--acc-ink) !important; }
        html.scn.scn-dark #main .scn-card-icon { color: var(--acc-ink) !important; }
        html.scn.scn-dark #main :is(table, thead, tbody, tfoot, tr, td) {
            background-color: transparent !important; border-color: var(--line) !important;
        }
        html.scn.scn-dark #main th {
            background-color: var(--soft) !important; border-color: var(--line) !important;
        }

        html.scn #main .metas:empty { display: none !important; }
        html.scn .scn-meta-box,
        html.scn #main .metas {
            width: 100% !important; max-width: 880px !important; margin: 0 auto 16px !important; padding: 14px 20px !important; box-sizing: border-box !important;
            background: var(--card) !important; background-color: var(--card) !important;
            border: 1px solid var(--line) !important; border-radius: 14px !important; box-shadow: var(--sh-sm) !important;
            color: var(--text) !important; text-align: left !important;
        }
        html.scn .scn-meta-box :is(p, div, span, strong, b, th, td, tr, table),
        html.scn #main .metas :is(p, div, span, strong, b, th, td, tr, table, .members, .members_ti, .person, .name) {
            background: transparent !important; background-color: transparent !important; border: 0 !important;
        }
        html.scn #main .metas .members {
            display: flex !important; flex-wrap: wrap !important; align-items: center !important; justify-content: space-between !important; gap: 8px !important;
            margin: 0 !important; padding: 0 !important;
        }
        html.scn #main .metas .members .members_ti {
            font-size: .75rem !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: .5px !important;
            color: var(--muted) !important; text-align: left !important; margin: 0 !important; padding: 0 !important;
        }
        html.scn .scn-meta-box :is(strong, b, th),
        html.scn #main .metas .person :is(strong, b, .name) { color: var(--ink) !important; font-weight: 700 !important; }

        /* Titre de page */
        html.scn h1.case_ti:empty { display: none !important; }
        html.scn h1.case_ti {
            position: static !important; width: 100% !important; height: auto !important; min-height: 0 !important; max-width: 880px !important;
            margin: 0 auto 20px !important; padding: 0 0 12px !important; box-sizing: border-box !important;
            border-bottom: 2px solid var(--acc) !important; background: none !important; box-shadow: none !important;
            color: var(--ink) !important; font-size: 2.1rem !important; font-weight: 900 !important;
            letter-spacing: -.5px !important; line-height: 1.2 !important; text-align: left !important; text-transform: none !important;
            text-indent: 0 !important; overflow: visible !important;
        }
        html.scn h1.case_ti * {
            position: static !important; display: inline !important; width: auto !important; height: auto !important;
            color: inherit !important; background: none !important; padding: 0 !important; margin: 0 !important;
            font-size: inherit !important; text-indent: 0 !important; opacity: 1 !important; visibility: visible !important;
        }
        html.scn .scn-banner-img {
            display: block !important; width: 100% !important; max-width: 880px !important; height: auto !important;
            margin: 0 auto 16px !important; border-radius: 14px !important; border: 1px solid var(--line) !important;
            box-shadow: var(--sh-sm) !important; overflow: hidden !important;
        }

        /* Titres de section H2 */
        html.scn h2, html.scn .part_ti, html.scn .style-20 {
            font-size: 1.55rem !important; font-weight: 800 !important; color: var(--ink) !important;
            margin: 1.6rem 0 1rem !important; padding: 0 0 0 16px !important; position: relative !important;
            line-height: 1.3 !important; letter-spacing: -.3px !important; display: block !important;
        }
        html.scn .scn-dup, html.scn h2.scn-dup, html.scn .part_ti.scn-dup { display: none !important; }
        html.scn h2::after, html.scn .part_ti::after, html.scn .style-20::after {
            content: '' !important; position: absolute !important; left: 0 !important; top: 3px !important; bottom: 3px !important;
            width: 4px !important; border-radius: 2px !important; background: var(--acc) !important;
        }
        html.scn h2 span, html.scn .style-21 {
            background: none !important; color: inherit !important; font-family: inherit !important;
            padding: 0 !important; margin: 0 !important; font-size: inherit !important; font-weight: inherit !important;
            text-transform: none !important;
        }
        html.scn h3, html.scn .section_ti, html.scn .style-22 {
            font-size: 1.15rem !important; font-weight: 700 !important; color: var(--ink) !important;
            margin: 1.4rem 0 .6rem !important; line-height: 1.4 !important;
        }
        html.scn #main section > :is(h2, h3, h4, .part_ti, .hBk_ti):first-child,
        html.scn #main .scn-dup + :is(h2, h3, h4, .part_ti, .hBk_ti),
        html.scn #main section.part > .part_ti,
        html.scn #main section.scn-card-sec > .part_ti {
            margin-top: 0 !important; padding-top: 0 !important;
        }
        html.scn #main section.part,
        html.scn #main section.scn-card-sec {
            padding: 20px 28px !important;
        }

        /* Cartes Active Learning & Objectifs */
        .scn-card {
            background: var(--soft); border: 1px solid var(--line); border-radius: 12px;
            padding: 16px 20px; margin: 12px 0; transition: border-color .15s, box-shadow .15s;
        }
        .scn-card:hover { border-color: var(--acc-line); box-shadow: var(--sh-sm); }
        .scn-card-ti {
            display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: .96rem;
            color: var(--ink); margin-bottom: 6px;
        }
        .scn-card-icon { color: var(--acc-ink); font-size: 1.1rem; }
        .scn-card-body { font-size: .88rem; color: var(--text); line-height: 1.55; }
        .scn-card-body p { margin: 4px 0 !important; }

        /* Grille des objectifs (Scenari learnOut) */
        .scn-obj-grid { display: flex !important; flex-direction: column !important; gap: 10px !important; margin: 12px 0 18px !important; }
        .scn-obj-grid > article.learnOut { margin: 0 !important; height: auto !important; min-height: 0 !important; display: flex !important; flex-direction: column !important; }
        html.scn article.learnOut {
            background: var(--soft) !important; border: 1px solid var(--line) !important; border-radius: 10px !important;
            padding: 9px 14px !important; margin: 0 0 10px !important; min-height: 0 !important; height: auto !important;
            box-shadow: none !important; position: relative !important;
        }
        html.scn article.learnOut:last-child { margin-bottom: 0 !important; }
        html.scn article.learnOut .learnOut_ti { font-size: .9rem !important; font-weight: 600 !important; line-height: 1.4 !important; color: var(--ink) !important; margin: 0 !important; }
        .scn-lvl {
            display: inline-block; font-size: .68rem; font-weight: 800; letter-spacing: .5px;
            text-transform: uppercase; padding: 2px 8px; border-radius: 6px;
            background: var(--acc-soft); color: var(--acc-ink); border: 1px solid var(--acc-line);
            margin: 0 8px 0 0; vertical-align: middle;
        }

        /* Sous-pages Opale (subPageSelector) en cartes modernes cliquables */
        html.scn nav.subPageSelector, html.scn .subPageSelector {
            margin: 24px 0 !important; padding: 0 !important;
        }
        html.scn nav.subPageSelector ul.sw_child_navList {
            display: grid !important; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important;
            gap: 14px !important; list-style: none !important; padding: 0 !important; margin: 16px 0 !important;
        }
        html.scn nav.subPageSelector ul.sw_child_navList li {
            display: block !important; margin: 0 !important; padding: 0 !important;
        }
        html.scn nav.subPageSelector ul.sw_child_navList li a {
            display: flex !important; align-items: center !important; justify-content: space-between !important;
            padding: 16px 20px !important; background: var(--soft) !important; border: 1px solid var(--line) !important;
            border-radius: 12px !important; color: var(--ink) !important; font-weight: 600 !important;
            text-decoration: none !important; transition: all .15s ease !important;
        }
        html.scn nav.subPageSelector ul.sw_child_navList li a:hover {
            background: var(--card) !important; border-color: var(--acc) !important; transform: translateY(-2px) !important;
            box-shadow: 0 6px 18px rgba(0,0,0,.08) !important;
        }
        html.scn nav.subPageSelector ul.sw_child_navList li a::after {
            content: "→" !important; font-weight: 800 !important; color: var(--acc-ink) !important; font-size: 1.15rem !important; margin-left: 10px !important;
        }

        /* Tableaux */
        .scn-tbl { overflow-x: auto; margin: 18px 0; border: 1px solid var(--line); border-radius: 12px; }
        html.scn table { width: 100% !important; border-collapse: collapse !important; font-size: .86rem !important; }
        html.scn th { background: var(--soft) !important; color: var(--ink) !important; font-weight: 700 !important; text-align: left !important; padding: 10px 14px !important; border-bottom: 1px solid var(--line) !important; }
        html.scn td { padding: 10px 14px !important; border-bottom: 1px solid var(--line) !important; color: var(--text) !important; }
        html.scn tr:last-child td { border-bottom: 0 !important; }

        /* Images */
        html.scn img.scn-img {
            max-width: 100% !important; height: auto !important;
            border-radius: 14px !important; border: 1px solid var(--line) !important; box-shadow: var(--sh-sm) !important;
            margin: 14px auto !important; display: block !important; overflow: hidden !important;
        }
        html.scn .case > :first-child img.scn-img, html.scn #content > :first-child img.scn-img { margin-top: 0 !important; }

        /* Boutons Précédent / Suivant (pageTurner) */
        #scn-shell nav.pageTurner {
            position: static !important; display: flex !important; flex-direction: row !important;
            gap: 14px !important; justify-content: space-between !important; align-items: stretch !important;
            margin: 32px auto 0 !important; max-width: 928px !important; width: 100% !important; height: auto !important;
            background: none !important; border: 0 !important; padding: 0 24px !important; box-sizing: border-box !important;
        }
        #scn-shell a.btnNav {
            position: relative !important; top: auto !important; left: auto !important; right: auto !important; bottom: auto !important;
            flex: 1 1 0% !important; width: auto !important; height: auto !important; min-width: 0 !important; min-height: 0 !important; max-width: 380px !important;
            display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important; text-align: center !important;
            padding: 14px 20px !important; margin: 0 !important; border-radius: 14px !important;
            background: var(--card) !important; background-image: none !important; border: 1px solid var(--line) !important;
            color: var(--ink) !important; text-decoration: none !important; text-indent: 0 !important; overflow: visible !important;
            box-shadow: var(--sh-sm) !important; transition: all .18s ease;
        }
        #scn-shell a.btnNav:hover { border-color: var(--acc-line) !important; transform: translateY(-2px); box-shadow: var(--sh-md) !important; }
        #scn-shell a.btnNav.prev[data-sub] { text-align: left !important; align-items: flex-start !important; }
        #scn-shell a.btnNav.next { margin-left: auto !important; }
        #scn-shell a.btnNav.next[data-sub] { text-align: right !important; align-items: flex-end !important; }
        #scn-shell a.btnNav::before,
        #scn-shell a.btnNav span::before,
        #scn-shell a.btnNav span::after { content: none !important; display: none !important; background: none !important; }
        #scn-shell a.btnNav span {
            position: static !important; width: auto !important; height: auto !important; margin: 0 !important; padding: 0 !important;
            background: none !important; background-image: none !important; border: 0 !important;
            display: inline-flex !important; align-items: center !important; justify-content: center !important;
            text-indent: 0 !important; overflow: visible !important; visibility: visible !important; opacity: 1 !important;
            font-size: .78rem !important; font-weight: 600 !important; line-height: 1.3 !important; color: var(--muted) !important; text-transform: uppercase !important; letter-spacing: .5px !important;
        }
        #scn-shell a.btnNav :is(svg, img) { display: block !important; width: 18px !important; height: 18px !important; margin: 0 !important; flex: none !important; }
        #scn-shell a.btnNav[data-sub]::after {
            content: attr(data-sub) !important; display: block !important; font-size: .92rem !important; font-weight: 700 !important;
            color: var(--ink) !important; margin-top: 3px !important; line-height: 1.3 !important;
            position: static !important; width: auto !important; height: auto !important; background: none !important;
        }
        #scn-shell a.btnNav:not([data-sub])::after { content: none !important; display: none !important; }

        /* ---------- Sommaire « Sur cette page » (TOC) ---------- */
        #scn-toc {
            grid-column: 3; grid-row: 2;
            position: sticky; top: var(--bar); align-self: start; max-height: calc(100vh - var(--bar));
            overflow-y: auto; padding: 28px 18px 28px 12px; font-size: .78rem;
        }
        #scn-toc h4 {
            margin: 0 0 10px; font-size: .68rem; font-weight: 800; text-transform: uppercase;
            letter-spacing: .8px; color: var(--muted);
        }
        #scn-toc ol { list-style: none; margin: 0; padding: 0 0 0 10px; border-left: 1px solid var(--line); display: flex; flex-direction: column; gap: 4px; }
        #scn-toc li { margin: 0; padding: 0; }
        #scn-toc a {
            display: block; color: var(--muted); text-decoration: none; padding: 3px 0 3px 8px;
            line-height: 1.35; border-left: 2px solid transparent; margin-left: -11px;
            transition: all .15s; border-radius: 0 6px 6px 0;
        }
        #scn-toc a:hover { color: var(--ink); }
        #scn-toc a.scn-active { color: var(--ink); font-weight: 700; border-left-color: var(--acc); background: var(--acc-soft); }
        #scn-toc a.l2 { padding-left: 16px; font-size: .74rem; }
        #scn-toc a.l3 { padding-left: 24px; font-size: .7rem; }

        /* Responsive */
        #scn-scrim { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 110; backdrop-filter: blur(2px); }
        @media (max-width: 1200px) {
            #scn-shell { grid-template-columns: var(--side) minmax(0, 1fr); }
            #scn-toc { display: none !important; }
        }
        @media (max-width: 900px) {
            #scn-shell { display: block; }
            #scn-side { position: fixed; top: 0; bottom: 0; left: 0; width: var(--side); transform: translateX(-100%); z-index: 130; }
            html.scn-nav-open #scn-side { transform: translateX(0); }
            html.scn-nav-open #scn-scrim { display: block; }
            html.scn .case { padding: 0 14px !important; }
            html.scn section { padding: 18px 18px !important; }
            #scn-shell nav.pageTurner { flex-direction: column !important; padding: 14px 16px !important; }
            #scn-shell a.btnNav { max-width: none !important; }
        }
    `);

        onReady(() => {
            try {
                const $ = (s, r = document) => r.querySelector(s);
                const $$ = (s, r = document) => [...r.querySelectorAll(s)];

                const isTopaze = !!($('#outCat') || $('#title') || $('article.learnOut, .part_ti, h1.case_ti'));
                const isOpale = !isTopaze && !!(
                    $('nav[aria-label*="menu" i], ul[data-totalpages], header.style-2, main.style-15, .style-16, a[rel="prev"], a[rel="next"]') ||
                    location.pathname.includes('/mod_resource/content/') ||
                    location.pathname.includes('/pluginfile.php/') ||
                    $('.style-0, .style-1, .style-2, .style-3, .style-15, .style-16, .style-17, .style-18')
                );

                if (!isTopaze && !isOpale) {
                    removeClass('scn-loading');
                    return;
                }

                if (isOpale) {
                    initOpale($, $$);
                } else {
                    initTopaze($, $$);
                }
            } catch (err) {
                console.error('[CESI Visual Redesign] Erreur d\'initialisation:', err);
                removeClass('scn-loading');
            }
        });

        function initOpale($, $$) {
            // 1. Métadonnées du cours
        const courseTitle = clean($('header h1, .style-3, h1')?.textContent) || clean(document.title) || 'Cours CESI';
        const courseSub = clean($('header h2, .subTitle')?.textContent);

        // 2. Navigation des modules
        const opaleNav = $('nav.pageSelector') || $('nav[aria-label*="menu" i]') || $('ul[data-totalpages]')?.closest('nav') || $('.style-51 nav, .style-76 nav') || $('#menu');
        const topUl = $('nav.pageSelector > ul.mnu') || $('ul[data-totalpages]') || (opaleNav ? (opaleNav.querySelector('ul[data-totalpages]') || opaleNav.querySelector('ul.mnu') || opaleNav.querySelector('ul')) : null) || $('.style-52 > ul') || $('.style-51 ul');

        let modules = [];
        if (topUl) {
            const topLis = Array.from(topUl.children).filter((el) => el.tagName === 'LI');
            topLis.forEach((li) => {
                const subUl = li.querySelector('ul.sub, ul.mnu_open, ul');
                const subItems = [];
                if (subUl) {
                    Array.from(subUl.children).filter((el) => el.tagName === 'LI').forEach((subLi) => {
                        const subA = subLi.querySelector('a:not([role="button"]):not([href="#"])');
                        const subTxt = clean(subLi.textContent.replace(/^[>v]\s*/, ''));
                        const isActive = subLi.classList.contains('sel_yes') || !subA || !!subLi.querySelector('.style-72, .style-86, .style-73, .style-87, .sel_yes');
                        if (subTxt) {
                            subItems.push({
                                title: subTxt,
                                href: subA ? subA.getAttribute('href') : null,
                                active: !!isActive
                            });
                        }
                    });
                }

                // Rechercher le lien principal du module (hors boutons chevrons et hors sous-ul)
                const mainA = Array.from(li.querySelectorAll('a')).find((a) => {
                    const role = a.getAttribute('role');
                    const href = a.getAttribute('href');
                    const isSubLink = subUl && subUl.contains(a);
                    const isToggle = a.classList.contains('tgle_c') || a.classList.contains('tgle_o');
                    return role !== 'button' && !isToggle && href && href !== '#' && !isSubLink;
                });

                let title = '';
                const firstDiv = li.querySelector('div.lbl, div');
                if (firstDiv) {
                    const clone = firstDiv.cloneNode(true);
                    clone.querySelectorAll('a[role="button"], a.tgle_c, a.tgle_o, span.style-56, span.style-59, span.style-67, span.style-78').forEach((el) => el.remove());
                    title = clean(clone.textContent.replace(/^[>v]\s*/, ''));
                }
                if (!title && mainA) title = clean(mainA.textContent);
                if (!title) title = clean(li.textContent).split('\n')[0].replace(/^[>v]\s*/, '').trim();

                const isCurrentUrl = mainA && mainA.getAttribute('href') && (location.pathname.endsWith(mainA.getAttribute('href')) || location.href.includes(mainA.getAttribute('href')));
                const hasActiveSub = subItems.some((s) => s.active);
                const isLiActive = li.classList.contains('sel_yes') || li.classList.contains('anc_yes') || !!li.querySelector('.sel_yes, a.tgle_o, .style-86, .style-87, .style-72') || isCurrentUrl;

                // Si ce module est actif et n'avait pas encore de sous-items dans le menu, mais que nav.subPageSelector est présent sur la page
                if (isLiActive && subItems.length === 0) {
                    document.querySelectorAll('nav.subPageSelector ul.sw_child_navList li a').forEach((a) => {
                        const href = a.getAttribute('href');
                        const isSubActive = href && (location.pathname.endsWith(href) || location.href.includes(href));
                        subItems.push({
                            title: clean(a.textContent),
                            href,
                            active: !!isSubActive
                        });
                    });
                }

                const isActive = hasActiveSub || isLiActive;

                if (title) {
                    modules.push({
                        title,
                        href: mainA ? mainA.getAttribute('href') : null,
                        active: !!isActive,
                        subs: subItems
                    });
                }
            });
        }

        // Normalisation : un seul module doit être actif à la fois
        const activeMods = modules.filter((m) => m.active);
        if (activeMods.length > 1) {
            const best = activeMods.find((m) => m.href && (location.pathname.endsWith(m.href) || location.href.includes(m.href))) ||
                         activeMods.find((m) => m.subs.some((s) => s.active)) ||
                         activeMods.find((m) => m.subs.length > 0) ||
                         activeMods[0];
            modules.forEach((m) => { m.active = (m === best); });
        } else if (activeMods.length === 0 && modules.length > 0) {
            modules[0].active = true;
        }

        const activeMod = modules.find((m) => m.active);
        const activeSub = activeMod?.subs.find((s) => s.active);
        const breadcrumbModule = activeMod?.title || '';
        const breadcrumbSub = activeSub?.title || '';

        // 3. Contenu principal
        const section = $('section') || $('main .style-16') || $('main') || document.body;
        section.removeAttribute('style');
        $$('[style]', section).forEach((el) => {
            if (el.tagName === 'SPAN' && el.parentElement?.tagName === 'H2') el.removeAttribute('style');
            if (el.style.width || el.style.height || el.style.position) {
                el.style.width = '';
                el.style.height = '';
                el.style.position = '';
            }
        });

        // 4. Liens Précédent / Suivant
        const prevA = $('a[rel="prev"]');
        const nextA = $('a[rel="next"]');
        const prevHref = prevA?.getAttribute('href');
        const nextHref = nextA?.getAttribute('href');
        const prevTitle = prevA ? (prevA.title.match(/\((.*)\)\s*$/)?.[1] || clean(prevA.textContent) || 'Précédent') : null;
        const nextTitle = nextA ? (nextA.title.match(/\((.*)\)\s*$/)?.[1] || clean(nextA.textContent) || 'Suivant') : null;

        // 5. Menu latéral
        const navUl = document.createElement('ul');
        navUl.id = 'outCat';
        modules.forEach((mod) => {
            const li = document.createElement('li');
            li.className = mod.active ? 'outCat_sel_yes' : 'outCat_sel_no';

            const hasTargetHref = (mod.subs.length > 0 && mod.subs[0].href) ? mod.subs[0].href : mod.href;
            const linkTag = hasTargetHref ? 'a' : 'div';
            const a = document.createElement(linkTag);
            if (hasTargetHref) a.href = hasTargetHref;
            a.className = 'outCat_lnk';
            a.innerHTML = `<span>${esc(mod.title)}</span>`;
            li.appendChild(a);

            if (mod.active && mod.subs.length > 0) {
                const outSec = document.createElement('div');
                outSec.id = 'outSec';
                const subUl = document.createElement('ul');
                mod.subs.forEach((sub) => {
                    const subLi = document.createElement('li');
                    const subA = document.createElement(sub.href ? 'a' : 'span');
                    if (sub.href) subA.href = sub.href;
                    if (sub.active) subA.className = 'scn-active';
                    subA.innerHTML = `<span>${esc(sub.title)}</span>`;
                    subLi.appendChild(subA);
                    subUl.appendChild(subLi);
                });
                outSec.appendChild(subUl);
                li.appendChild(outSec);
            }

            navUl.appendChild(li);
        });

        // 6. Structure Shell
        const shell = document.createElement('div');
        shell.id = 'scn-shell';
        shell.innerHTML = `
            <aside id="scn-side" aria-label="Navigation du cours">
                <div class="scn-brand">
                    <div class="scn-logo-box">
                        <a href="https://ent.cesi.fr/accueil-apprenant" target="_top" class="cesi-brand-link" aria-label="Accueil ENT CESI">${cesiBrand()}</a>
                    </div>
                    <p class="scn-brand-title">${esc(courseTitle)}</p>
                    ${courseSub && courseSub !== courseTitle ? `<p class="scn-brand-sub">${esc(courseSub)}</p>` : ''}
                </div>
                <div class="scn-side-label">Modules</div>
                <div class="scn-side-scroll" id="scn-side-scroll"></div>
            </aside>
            <div id="scn-bar">
                <button type="button" class="scn-btn" id="scn-menu" aria-label="Menu">${svg('menu')}</button>
                <a href="https://ent.cesi.fr/accueil-apprenant" target="_top" class="cesi-brand-link" aria-label="Accueil ENT CESI">${cesiBrand()}</a>
                <div id="scn-crumb">
                    <span>${esc(courseSub || courseTitle)}</span>
                    ${breadcrumbModule ? `<span class="sep">/</span><span class="${breadcrumbSub ? '' : 'cur'}">${esc(breadcrumbModule)}</span>` : ''}
                    ${breadcrumbSub ? `<span class="sep">/</span><span class="cur">${esc(breadcrumbSub)}</span>` : ''}
                </div>
                <button type="button" class="scn-btn" id="scn-theme" title="Mode sombre / clair" aria-label="Basculer le thème">${svg('moon', 'moon')}${svg('sun', 'sun')}</button>
                <div id="scn-progress"></div>
            </div>
            <div id="scn-center">
                <main id="main">
                    <div class="case"></div>
                </main>
            </div>
            <nav id="scn-toc" aria-label="Sur cette page"></nav>
            <div id="scn-scrim"></div>`;

        shell.querySelector('#scn-side-scroll').appendChild(navUl);
        const caseBox = shell.querySelector('.case');
        caseBox.appendChild(section);

        // 7. Amélioration du contenu
        const WORKFLOW_WORDS = ['kick-off', 'self-study 1', 'review', 'self-study 2', 'outcome', 'feedback', 'theme', 'situation', 'duration', 'assessment'];
        $$('section ul > li, main ul > li', caseBox).forEach((li) => {
            const strong = li.querySelector('strong');
            const firstP = li.querySelector('p');
            const txt = (strong ? strong.textContent : (firstP ? firstP.textContent : '')).trim();
            const lower = txt.toLowerCase();

            if (txt && txt.length < 50 && WORKFLOW_WORDS.some((w) => lower.includes(w))) {
                const card = document.createElement('div');
                card.className = 'scn-card';
                const bodyNodes = Array.from(li.childNodes).filter((n) => n !== strong && n !== firstP);
                const bodyHtml = bodyNodes.map((n) => n.nodeType === 3 ? `<p>${n.textContent.trim()}</p>` : (n.outerHTML || '')).join('');

                card.innerHTML = `
                    <div class="scn-card-ti"><span class="scn-card-icon">✦</span> <span>${esc(txt)}</span></div>
                    <div class="scn-card-body">${bodyHtml || (firstP ? firstP.innerHTML : '')}</div>
                `;
                li.replaceWith(card);
            }
        });

        const OPALE_KEYWORDS = ['theme', 'situation', 'duration', 'cecrl', 'expressions', 'grammar', 'vocabulary', 'assessment', 'kick-off', 'self-study', 'review', 'outcome', 'feedback'];
        $$('p > strong:first-child', caseBox).forEach((strong) => {
            const p = strong.parentElement;
            const txt = clean(strong.textContent).replace(/:$/, '').trim();
            const lower = txt.toLowerCase();
            if (txt && txt.length < 40 && OPALE_KEYWORDS.some((k) => lower.includes(k))) {
                const card = document.createElement('div');
                card.className = 'scn-card';
                card.innerHTML = `<div class="scn-card-ti"><span class="scn-card-icon">✦</span> <span>${esc(txt)}</span></div><div class="scn-card-body"></div>`;
                const body = card.querySelector('.scn-card-body');
                let cur = p.nextElementSibling;
                p.replaceWith(card);
                while (cur && !cur.querySelector('strong:first-child') && cur.tagName !== 'H2' && cur.tagName !== 'H3' && !cur.classList.contains('style-20')) {
                    const next = cur.nextElementSibling;
                    if (cur.textContent.trim()) {
                        body.appendChild(cur);
                    } else {
                        cur.remove();
                    }
                    cur = next;
                }
            }
        });

        $$('p, li, strong', caseBox).forEach((el) => {
            if (el.children.length === 0 && /\((B1|B2|A1|A2|C1|C2)\)/.test(el.textContent)) {
                el.innerHTML = el.innerHTML.replace(/\((B1|B2|A1|A2|C1|C2)\)/g, '<span class="scn-lvl">$1</span>');
            }
        });

        $$('table', caseBox).forEach((t) => {
            if (t.parentElement.classList.contains('scn-tbl')) return;
            const w = document.createElement('div');
            w.className = 'scn-tbl';
            t.before(w);
            w.appendChild(t);
        });

        const markImg = (img) => { if (img.naturalWidth > 80) img.classList.add('scn-img'); };
        $$('img', caseBox).forEach((img) => (img.complete ? markImg(img) : img.addEventListener('load', () => markImg(img), { once: true })));

        // 8. Boutons de navigation
        if (prevHref || nextHref) {
            const turner = document.createElement('nav');
            turner.className = 'pageTurner';
            if (prevHref) {
                turner.innerHTML += `<a href="${esc(prevHref)}" class="btnNav prev" data-sub="← ${esc(prevTitle)}"><span>Page précédente</span></a>`;
            }
            if (nextHref) {
                turner.innerHTML += `<a href="${esc(nextHref)}" class="btnNav next" data-sub="${esc(nextTitle)} →"><span>Page suivante</span></a>`;
            }
            shell.querySelector('#main').after(turner);
        }

        // 9. Sommaire « Sur cette page »
        const toc = shell.querySelector('#scn-toc');
        let tocN = 0;
        const headings = $$('h2, h3, h4, .scn-card-ti', caseBox);
        const tocItems = headings.map((el) => {
            if (!el.id) el.id = `scn-t-${++tocN}`;
            const level = el.tagName === 'H2' ? 1 : el.tagName === 'H3' ? 2 : 3;
            return { text: clean(el.textContent.replace(/^✦\s*/, '')), target: el, level };
        }).filter((x) => x.text && x.text.length < 80);

        let tocLinks = [];
        if (tocItems.length >= 1) {
            toc.innerHTML = `<h4>Sur cette page</h4><ol>${tocItems.map((t, i) =>
                `<li><a href="#${esc(t.target.id)}" class="l${t.level}" data-i="${i}">${esc(t.text)}</a></li>`).join('')}</ol>`;
            tocLinks = $$('a', toc).map((a) => ({ a, el: tocItems[+a.dataset.i].target }));
            toc.addEventListener('click', (e) => {
                const a = e.target.closest('a[data-i]');
                if (!a) return;
                e.preventDefault();
                const el = tocItems[+a.dataset.i].target;
                el.scrollIntoView({ block: 'start' });
            });
        }
        if (!tocLinks.length) {
            toc.remove();
            shell.classList.add('no-toc');
        }

        // 10. Désactiver les anciens styles Opale et basculer sur le shell
        $$('head style:not(.scn-injected):not(.cesi-injected)').forEach((s) => { s.disabled = true; });
        $$('head link[rel="stylesheet"]:not([href*="Inter"])').forEach((l) => { l.disabled = true; });
        document.body.innerHTML = '';
        document.body.appendChild(shell);

        const activeLi = navUl.querySelector('li.outCat_sel_yes');
        if (activeLi) {
            const sideScroll = shell.querySelector('#scn-side-scroll');
            sideScroll.scrollTop = Math.max(0, activeLi.offsetTop - 80);
        }

        removeClass('scn-loading');
        setupInteractions(shell, toc, tocLinks, $, $$);
        }

        function initTopaze($, $$) {
            const main = $('#main') || $('main, [role="main"]');
        if (!main) { removeClass('scn-loading'); return; }

        try {
            if (window.top !== window && window.top.location.origin === location.origin) {
                if (window.top.location.href !== location.href) {
                    window.top.history.replaceState(null, '', location.href);
                }
            }
        } catch { /* cross-origin */ }

        const courseTitle = clean($('#title h1, h1.case_ti')?.textContent) || clean(document.title);
        const courseSub = clean($('#title h2, .subTitle')?.textContent);
        const outCat = $('#outCat');
        const outSec = $('#outSec');
        const activeLi = $('#outCat li.outCat_sel_yes') || $('#outCat li:first-child');
        const moduleName = clean(activeLi?.textContent) || clean($('h2.part_ti')?.textContent);
        const caseTi = $('h1.case_ti');

        const shell = document.createElement('div');
        shell.id = 'scn-shell';
        shell.innerHTML = `
            <aside id="scn-side" aria-label="Navigation du cours">
                <div class="scn-brand">
                    <div class="scn-logo-box">
                        <a href="https://ent.cesi.fr/accueil-apprenant" target="_top" class="cesi-brand-link" aria-label="Accueil ENT CESI">${cesiBrand()}</a>
                    </div>
                    <p class="scn-brand-title">${esc(courseTitle)}</p>
                    ${courseSub && courseSub !== courseTitle ? `<p class="scn-brand-sub">${esc(courseSub)}</p>` : ''}
                </div>
                <div class="scn-side-label">Modules</div>
                <div class="scn-side-scroll" id="scn-side-scroll"></div>
            </aside>
            <div id="scn-bar">
                <button type="button" class="scn-btn" id="scn-menu" aria-label="Menu">${svg('menu')}</button>
                <a href="https://ent.cesi.fr/accueil-apprenant" target="_top" class="cesi-brand-link" aria-label="Accueil ENT CESI">${cesiBrand()}</a>
                <div id="scn-crumb">
                    <span>${esc(courseSub || courseTitle)}</span>
                    ${moduleName ? `<span class="sep">/</span><span class="cur">${esc(moduleName)}</span>` : ''}
                </div>
                <button type="button" class="scn-btn" id="scn-theme" title="Mode sombre / clair" aria-label="Basculer le thème">${svg('moon', 'moon')}${svg('sun', 'sun')}</button>
                <div id="scn-progress"></div>
            </div>
            <div id="scn-center"></div>
            <nav id="scn-toc" aria-label="Sur cette page"></nav>
            <div id="scn-scrim"></div>`;

        const sideScroll = shell.querySelector('#scn-side-scroll');
        if (outCat) {
            outCat.querySelectorAll('li').forEach((li) => {
                if (!clean(li.textContent)) li.remove();
            });
            sideScroll.appendChild(outCat);
        }
        if (outSec && activeLi) activeLi.appendChild(outSec);
        [outCat, outSec].forEach((n) => n && [n, ...n.querySelectorAll('[style]')].forEach((e) => e.removeAttribute('style')));

        // Neutraliser les scripts natifs Scenari qui tentent de repositionner #outSec ou #outCat au scroll
        try {
            if (window.tplMgr) {
                window.tplMgr.setOutlinePos = () => {};
                window.tplMgr.scrollToElt = () => {};
                window.tplMgr.initOutline = () => {};
            }
            if (window.scCoLib && window.scCoLib.util) {
                window.scCoLib.util.setPos = () => {};
            }
        } catch (e) { /* ignore */ }

        // Observer pour nettoyer en continu tout style inline injecté au scroll par Scenari sur la sidebar
        const stripStyles = (el) => {
            if (!el) return;
            const clean = () => {
                if (el.getAttribute('style')) el.removeAttribute('style');
                el.querySelectorAll('[style]').forEach((e) => {
                    e.style.removeProperty('position');
                    e.style.removeProperty('top');
                    e.style.removeProperty('left');
                    e.style.removeProperty('right');
                    e.style.removeProperty('bottom');
                    e.style.removeProperty('transform');
                });
            };
            clean();
            new MutationObserver(clean).observe(el, { attributes: true, subtree: true, attributeFilter: ['style'] });
        };
        if (outCat) stripStyles(outCat);
        if (outSec) stripStyles(outSec);

        const center = shell.querySelector('#scn-center');
        center.appendChild(main);
        const footer = $('#footer');
        if (footer) center.appendChild(footer);
        document.body.insertBefore(shell, document.body.firstChild);

        if (caseTi) {
            caseTi.querySelectorAll('img').forEach((img) => {
                img.classList.add('scn-banner-img');
                caseTi.after(img);
            });
            if (!clean(caseTi.textContent)) caseTi.classList.add('scn-dup');
        }
        const normTitle = (s) => clean(s).replace(/\s*-\s*/g, '-').toLowerCase();
        const caseTitleNorm = caseTi ? normTitle(caseTi.textContent) : '';
        if (caseTitleNorm) {
            $$('#main h2.part_ti', shell).forEach((h2) => {
                if (normTitle(h2.textContent) === caseTitleNorm) h2.classList.add('scn-dup');
            });
        }
        $$('#main section', shell).forEach((sec) => {
            const clone = sec.cloneNode(true);
            clone.querySelectorAll('.scn-dup, section, [style*="display: none"], [style*="display:none"]').forEach((el) => el.remove());
            const hasMedia = Array.from(sec.querySelectorAll('img, video, audio, iframe, canvas, table, input, button, object, embed'))
                .some((m) => !m.closest('section') || m.closest('section') === sec ? (m.offsetWidth > 0 || m.offsetHeight > 0) : false);
            const hasContent = !!clean(clone.textContent) || hasMedia;
            if (!hasContent) {
                const nested = Array.from(sec.querySelectorAll(':scope section'));
                if (nested.length) {
                    sec.style.setProperty('background', 'transparent', 'important');
                    sec.style.setProperty('border', '0', 'important');
                    sec.style.setProperty('box-shadow', 'none', 'important');
                    sec.style.setProperty('padding', '0', 'important');
                    nested.forEach((n) => n.classList.add('scn-card-sec'));
                } else {
                    sec.style.display = 'none';
                }
            }
        });

        if (activeLi) sideScroll.scrollTop = Math.max(0, activeLi.offsetTop - 80);

        $$('.learnOut_ti').forEach((ti) => {
            const walker = document.createTreeWalker(ti, NodeFilter.SHOW_TEXT);
            let n;
            while ((n = walker.nextNode())) {
                if (!n.nodeValue.trim()) continue;
                const m = n.nodeValue.match(/^\s*\[(\d+)\]\s*/);
                if (m) {
                    n.nodeValue = n.nodeValue.slice(m[0].length);
                    const b = document.createElement('span');
                    b.className = 'scn-lvl';
                    b.textContent = `Niveau ${m[1]}`;
                    ti.before(b);
                }
                break;
            }
        });

        $$('article.learnOut').forEach((a) => {
            if (a.parentElement.classList.contains('scn-obj-grid')) return;
            const grid = document.createElement('div');
            grid.className = 'scn-obj-grid';
            a.before(grid);
            let cur = a;
            while (cur && cur.matches?.('article.learnOut')) {
                const next = cur.nextElementSibling;
                grid.appendChild(cur);
                cur = next;
            }
        });

        $$('table.txt_tb').forEach((t) => {
            if (t.parentElement.classList.contains('scn-tbl')) return;
            const w = document.createElement('div');
            w.className = 'scn-tbl';
            t.before(w);
            w.appendChild(t);
        });

        const markImg = (img) => { if (img.naturalWidth > 80) img.classList.add('scn-img'); };
        $$('#main img').forEach((img) => (img.complete ? markImg(img) : img.addEventListener('load', () => markImg(img), { once: true })));

        // Neutraliser les encadrés colorés natifs (ex: Concepteur du projet en violet)
        $$('#main [style*="background"], #main .credits, #main .author, #main .auth, #main .case_au, #main .info', shell).forEach((el) => {
            if (el.closest('section, .scn-card, .scn-tbl, article.learnOut, nav')) return;
            el.style.removeProperty('background');
            el.style.removeProperty('background-color');
            el.style.removeProperty('color');
            el.classList.add('scn-meta-box');
        });
        $$('#main > .case > div, #main #content > div, #main #content > aside, #main #content > article', shell).forEach((el) => {
            if (el.matches('section, .scn-card, .scn-tbl, .scn-obj-grid, .scn-meta-box, article.learnOut') || el.id === 'content') return;
            const bg = getComputedStyle(el).backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                el.classList.add('scn-meta-box');
            }
        });

        let fixingTurner = false;
        const fixPageTurner = () => {
            if (fixingTurner) return;
            fixingTurner = true;
            try {
                const turner = $('nav.pageTurner');
                if (turner) {
                    const btns = $$('a.btnNav', turner);
                    if (btns.length && Array.from(turner.children).some((c) => !c.matches('a.btnNav'))) {
                        turner.innerHTML = '';
                        btns.forEach((b) => turner.appendChild(b));
                    }
                    if (turner.previousElementSibling !== main) main.after(turner);
                }
                $$('a.btnNav').forEach((a) => {
                    if (a.dataset.scnFixed) return;
                    a.dataset.scnFixed = '1';
                    const isPrev = a.classList.contains('prev');
                    const m = (a.title || '').match(/\((.*)\)\s*$/);
                    const sub = m ? m[1] : (clean(a.textContent) || (isPrev ? 'Précédent' : 'Suivant'));
                    a.dataset.sub = isPrev ? `← ${sub}` : `${sub} →`;
                    a.innerHTML = `<span>${isPrev ? 'Page précédente' : 'Page suivante'}</span>`;
                });
            } finally {
                fixingTurner = false;
            }
        };
        fixPageTurner();
        addEventListener('load', fixPageTurner, { once: true });
        new MutationObserver(fixPageTurner).observe(center, { childList: true, subtree: true });

        const toc = shell.querySelector('#scn-toc');
        let tocN = 0;
        let tocItems = [];
        let tocLinks = [];
        let sideSecLinks = [];

        const scrollToTocItem = (e) => {
            const a = e.target.closest('a[data-i]');
            if (!a) return;
            e.preventDefault();
            const item = tocItems[+a.dataset.i];
            if (!item) return;
            const el = item.target;
            const closed = el.matches('article.collapsed') && el.querySelector(':scope > a.collapsed_closed');
            if (closed) closed.click();
            el.scrollIntoView({ block: 'start' });
        };
        toc.addEventListener('click', scrollToTocItem);

        let lastTocKey = '';
        const buildToc = () => {
            const nextItems = $$('#main :is(h2.part_ti, h3.part_ti, h4.part_ti, .hBk_ti, .collapsed_ti):not(.scn-dup)', shell)
                .filter((el) => !el.closest('.collapsed_co'))
                .map((el) => {
                const target = el.matches('.collapsed_ti') ? (el.closest('.collapsed, article, section') || el) : el;
                if (!target.id) target.id = `scn-t-${++tocN}`;
                const level = el.matches('h2') ? 1 : el.matches('h3.part_ti') ? 2 : 3;
                return { text: clean(el.textContent), target, level };
            }).filter((x) => x.text);

            const nextKey = nextItems.map((t) => `${t.level}:${t.text}`).join('|');
            if (nextKey === lastTocKey) return false;
            lastTocKey = nextKey;
            tocItems = nextItems;

            tocLinks = [];
            sideSecLinks = [];
            if (tocItems.length >= 1) {
                const tocListHtml = tocItems.map((t, i) =>
                    `<li><a href="#${esc(t.target.id)}" class="l${t.level}" data-i="${i}">${esc(t.text)}</a></li>`).join('');
                if (!toc.isConnected) shell.appendChild(toc);
                shell.classList.remove('no-toc');
                toc.innerHTML = `<h4>Sur cette page</h4><ol>${tocListHtml}</ol>`;
                tocLinks = $$('a', toc).map((a) => ({ a, el: tocItems[+a.dataset.i].target }));

                if (activeLi) {
                    let sideSec = activeLi.querySelector('#outSec') || $('#outSec', shell);
                    if (!sideSec) {
                        sideSec = document.createElement('div');
                        sideSec.id = 'outSec';
                        activeLi.appendChild(sideSec);
                    }
                    const sideItems = tocItems.map((t, i) => ({ ...t, i })).filter((t) => t.level <= 2);
                    const sideHtml = (sideItems.length ? sideItems : tocItems.map((t, i) => ({ ...t, i })))
                        .map((t) => `<li><a href="#${esc(t.target.id)}" class="l${t.level}" data-i="${t.i}">${esc(t.text)}</a></li>`)
                        .join('');
                    sideSec.innerHTML = `<ul>${sideHtml}</ul>`;
                    sideSecLinks = $$('a[data-i]', sideSec).map((a) => ({ a, el: tocItems[+a.dataset.i].target }));
                    if (!sideSec.dataset.scnBound) {
                        sideSec.dataset.scnBound = '1';
                        sideSec.addEventListener('click', scrollToTocItem);
                    }
                }
            } else {
                toc.remove();
                shell.classList.add('no-toc');
            }
            return true;
        };

        buildToc();
        removeClass('scn-loading');
        const refreshTocSpy = setupInteractions(shell, toc, () => tocLinks, $, $$, () => sideSecLinks);
        const syncTocNow = () => { if (buildToc()) refreshTocSpy(); };
        addEventListener('load', syncTocNow, { once: true });
        setTimeout(syncTocNow, 300);
        setTimeout(syncTocNow, 1000);
        let tocMutTimer = null;
        const tocObs = new MutationObserver(() => {
            if (tocMutTimer) clearTimeout(tocMutTimer);
            tocMutTimer = setTimeout(syncTocNow, 80);
        });
        tocObs.observe(main, { childList: true, subtree: true });
        setTimeout(() => tocObs.disconnect(), 8000);
        }

        function setupInteractions(shell, toc, getTocLinks, $, $$, getCustomSecLinks = null) {
            $('#scn-theme')?.addEventListener('click', () => setTheme(!getHtml()?.classList.contains('scn-dark')));

        const toggleSide = () => {
            if (innerWidth <= 900) {
                getHtml()?.classList.toggle('scn-nav-open');
            } else {
                shell.classList.toggle('collapsed-side');
            }
        };
        const closeNav = () => {
            getHtml()?.classList.remove('scn-nav-open');
            shell.classList.remove('collapsed-side');
        };

        $('#scn-menu')?.addEventListener('click', toggleSide);
        $('#scn-scrim')?.addEventListener('click', closeNav);
        $('#scn-side')?.addEventListener('click', (e) => { if (e.target.closest('#outSec a, .outCat_lnk')) closeNav(); });

        const bar = $('#scn-progress');
        const resolveTocLinks = () => (typeof getTocLinks === 'function' ? getTocLinks() : (getTocLinks || []));
        const resolveSecLinks = () => {
            const custom = typeof getCustomSecLinks === 'function' ? getCustomSecLinks() : getCustomSecLinks;
            return (custom && custom.length)
                ? custom
                : $$('#outSec a[href^="#"]').map((a) => ({ a, el: document.getElementById(a.getAttribute('href').slice(1)) })).filter((x) => x.el);
        };
        const spy = (links, limit) => {
            if (!links.length) return;
            let cur = links[0];
            for (const s of links) if (s.el.getBoundingClientRect().top <= limit) cur = s;
            links.forEach((s) => s.a.classList.toggle('scn-active', s === cur));
            return cur;
        };

        let ticking = false;
        const onScroll = () => {
            ticking = false;
            const max = document.documentElement.scrollHeight - innerHeight;
            if (bar) bar.style.width = max > 0 ? `${Math.min(100, (scrollY / max) * 100)}%` : '0';
            spy(resolveSecLinks(), 120);
            const cur = spy(resolveTocLinks(), 120);
            if (cur && toc && toc.isConnected) {
                const r = cur.a.getBoundingClientRect(), tr = toc.getBoundingClientRect();
                if (r.top < tr.top + 40 || r.bottom > tr.bottom - 20) toc.scrollTop += r.top - tr.top - tr.height / 3;
            }
        };
        addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
        addEventListener('resize', onScroll);
        onScroll();
        return onScroll;

        addEventListener('keydown', (e) => {
            if (e.key === 'Escape') return closeNav();
            if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
            const t = e.target;
            if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;

            if (e.key === 'ArrowLeft') {
                const btn = $('a.btnNav.prev');
                if (btn) { e.preventDefault(); btn.click(); }
            } else if (e.key === 'ArrowRight') {
                const btn = $('a.btnNav.next');
                if (btn) { e.preventDefault(); btn.click(); }
            } else if (e.key === 'm' || e.key === 'M') {
                toggleSide();
            } else if (e.key === 'd' || e.key === 'D') {
                setTheme(!getHtml()?.classList.contains('scn-dark'));
            }
        });
        }
    }
})();
