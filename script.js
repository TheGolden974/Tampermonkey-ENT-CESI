// ==UserScript==
// @name         CESI Scenari - Visual Redesign
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Lecteur de cours Scenari CESI réorganisé : barre latérale des modules, sommaire « Sur cette page », barre d'outils, objectifs en grille, mode sombre, raccourcis clavier (← / →).
// @author       You
// @match        https://scenari.cesi.fr/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const isPlayer = /\/player\.xhtml$/.test(location.pathname);
    const isContent = location.pathname.startsWith('/scenari/');
    if (!isPlayer && !isContent) return;

    /* =====================================================================
       THÈME (partagé entre le player et l'iframe : même origine)
       ===================================================================== */
    const KEY = 'scn-theme';
    const html = document.documentElement;
    const store = {
        get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
        set: (v) => { try { localStorage.setItem(KEY, v); } catch { /* ignore */ } }
    };
    // Clair par défaut ; le mode sombre s'active via le bouton (choix mémorisé)
    const isDark = () => store.get() === 'dark';
    const applyTheme = () => html.classList.toggle('scn-dark', isDark());
    const setTheme = (dark) => {
        store.set(dark ? 'dark' : 'light');
        const docs = [document];
        try { if (window.parent !== window) docs.push(window.parent.document); } catch { /* cross-origin */ }
        document.querySelectorAll('iframe').forEach((f) => { try { f.contentDocument && docs.push(f.contentDocument); } catch { /* ignore */ } });
        docs.forEach((d) => d.documentElement.classList.toggle('scn-dark', dark));
    };
    html.classList.add('scn');
    applyTheme();
    addEventListener('storage', (e) => e.key === KEY && applyTheme());

    /* =====================================================================
       HELPERS
       ===================================================================== */
    const root = () => document.head || document.documentElement;
    const addStyle = (css) => { const el = document.createElement('style'); el.textContent = css; root().appendChild(el); };
    const onReady = (fn) => document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn();
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    root().appendChild(font);

    const VARS = `
        html.scn {
            --bg: #f4f5f7; --card: #ffffff; --ink: #0f172a; --text: #334155; --muted: #64748b;
            --line: #e2e8f0; --soft: #f8fafc;
            --acc: #FBE216; --acc-ink: #7a6600; --acc-soft: #fffbeb; --acc-line: #fde68a;
            --sh-sm: 0 1px 3px rgba(15,23,42,.06); --sh-md: 0 8px 24px rgba(15,23,42,.10);
            --side: 280px; --toc: 240px; --bar: 56px;
        }
        html.scn.scn-dark {
            --bg: #0d1117; --card: #161b22; --ink: #e6edf3; --text: #c9d1d9; --muted: #8b949e;
            --line: #30363d; --soft: #1c2128;
            --acc-ink: #FBE216; --acc-soft: rgba(251,226,22,.08); --acc-line: rgba(251,226,22,.35);
            --sh-sm: 0 1px 3px rgba(0,0,0,.4); --sh-md: 0 8px 24px rgba(0,0,0,.5);
            color-scheme: dark;
        }
    `;

    /* =====================================================================
       1. PLAYER (cadre extérieur)
       ===================================================================== */
    if (isPlayer) {
        addStyle(VARS + `
            html.scn, html.scn body { background: var(--bg) !important; margin: 0 !important; }
            html.scn #contentFrame { border: 0 !important; display: block; background: var(--bg); }
            html.scn .msgBox { font-family: 'Inter', system-ui, sans-serif !important; color: var(--ink) !important; }
            html.scn .msgBox > div { background: var(--card) !important; border: 1px solid var(--line) !important; border-radius: 14px !important; box-shadow: var(--sh-md) !important; }
        `);
        return;
    }

    /* =====================================================================
       2. CONTENU DU COURS (iframe)
       ===================================================================== */
    // Masque la page d'origine le temps de la réorganiser (évite le flash)
    html.classList.add('scn-loading');
    setTimeout(() => html.classList.remove('scn-loading'), 4000);

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
        html.scn #header, html.scn #tools { display: none !important; }

        /* =========== Structure : barre latérale | contenu | sommaire =========== */
        #scn-shell { display: grid; grid-template-columns: var(--side) minmax(0, 1fr) var(--toc); min-height: 100vh; }
        #scn-shell.no-toc { grid-template-columns: var(--side) minmax(0, 1fr); }
        #scn-shell *, #scn-shell *::before, #scn-shell *::after { box-sizing: border-box; }

        /* ---------- Barre latérale ---------- */
        #scn-side {
            position: sticky; top: 0; align-self: start; height: 100vh; z-index: 120;
            display: flex; flex-direction: column; background: var(--card); border-right: 1px solid var(--line);
        }
        .scn-brand { padding: 18px 18px 14px; border-bottom: 1px solid var(--line); }
        .scn-logo { width: 104px; height: 40px; margin-bottom: 12px; background: var(--scn-logo) no-repeat 0 50% / contain; }
        html.scn-dark .scn-logo { filter: invert(1) hue-rotate(180deg); }
        .scn-brand-title { margin: 0; font-size: .92rem; font-weight: 800; line-height: 1.3; color: var(--ink); letter-spacing: -.2px; }
        .scn-brand-sub { margin: 3px 0 0; font-size: .74rem; font-weight: 500; line-height: 1.35; color: var(--muted); }
        .scn-side-label { padding: 16px 18px 6px; font-size: .66rem; font-weight: 800; letter-spacing: .8px; text-transform: uppercase; color: var(--muted); }
        .scn-side-scroll { flex: 1; overflow-y: auto; padding: 0 10px 20px; scrollbar-width: thin; }

        html.scn #outCat { position: static !important; top: auto !important; width: auto !important; margin: 0 !important; padding: 0 !important; background: none !important; border: 0 !important; }
        html.scn #outCat ul.outCat { display: flex !important; flex-direction: column; gap: 2px; margin: 0 !important; padding: 0 !important; list-style: none !important; background: none !important; border: 0 !important; counter-reset: scnmod; }
        html.scn #outCat ul.outCat > li { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; border: 0 !important; background: none !important; counter-increment: scnmod; }
        /* Neutralise les tailles/positions fixes de la nav horizontale d'origine (CSS + styles inline posés par Scenari) */
        html.scn #outCat :is(ul, li, a, span), html.scn #outSec :is(ul, li, a, span) {
            position: static !important; float: none !important; top: auto !important; left: auto !important; right: auto !important; bottom: auto !important;
            transform: none !important; height: auto !important; min-height: 0 !important; max-height: none !important;
            width: auto !important; min-width: 0 !important; max-width: none !important;
            overflow: visible !important; white-space: normal !important; vertical-align: baseline !important;
            text-indent: 0 !important; clip: auto !important; opacity: 1 !important;
        }
        html.scn #outCat a.outCat_lnk span, html.scn #outSec a span { display: inline !important; margin: 0 !important; padding: 0 !important; line-height: inherit !important; }
        html.scn #outCat li::before, html.scn #outCat li::after, html.scn #outCat a.outCat_lnk::after { display: none !important; }
        html.scn #outCat a.outCat_lnk {
            position: relative !important; display: flex !important; align-items: center; justify-content: center; min-height: 40px !important; box-sizing: border-box !important;
            width: 100% !important; height: auto !important;
            padding: 8px 40px !important; border: 0 !important; border-radius: 9px !important;
            background: transparent !important; color: var(--text) !important; text-decoration: none !important;
            font-size: .82rem !important; font-weight: 500 !important; line-height: 1.35 !important; text-align: center !important;
            transition: background .15s, color .15s;
        }
        html.scn #outCat a.outCat_lnk::before {
            content: counter(scnmod, decimal-leading-zero); display: block !important; position: absolute; left: 8px; top: 50%; transform: translateY(-50%);
            min-width: 24px; padding: 1px 0;
            border-radius: 6px; background: var(--soft); border: 1px solid var(--line);
            font-size: .66rem; font-weight: 800; line-height: 1.6; text-align: center; color: var(--muted);
        }
        html.scn #outCat a.outCat_lnk span { color: inherit !important; background: none !important; }
        html.scn #outCat a.outCat_lnk:hover { background: var(--soft) !important; color: var(--ink) !important; }
        html.scn #outCat li.outCat_sel_yes > a.outCat_lnk { background: var(--acc-soft) !important; color: var(--ink) !important; font-weight: 700 !important; box-shadow: inset 3px 0 0 var(--acc); }
        html.scn #outCat li.outCat_sel_yes > a.outCat_lnk::before { background: var(--acc); border-color: var(--acc); color: #000; }

        /* Sections de la page courante, imbriquées sous le module actif */
        html.scn #outSec {
            position: static !important; top: auto !important; left: auto !important; width: auto !important;
            margin: 4px 0 8px 22px !important; padding: 2px 0 2px 12px !important;
            background: none !important; border: 0 !important; border-left: 2px solid var(--line) !important; box-shadow: none !important;
        }
        html.scn #outSec ul { display: flex !important; flex-direction: column; gap: 1px; margin: 0 !important; padding: 0 !important; list-style: none !important; }
        html.scn #outSec li { display: block !important; margin: 0 !important; padding: 0 !important; background: none !important; border: 0 !important; }
        html.scn #outSec li::before, html.scn #outSec li::after, html.scn #outSec a::before, html.scn #outSec a::after { display: none !important; }
        html.scn #outSec a {
            display: block !important; padding: 5px 10px !important; border-radius: 7px !important;
            color: var(--muted) !important; background: transparent !important; text-decoration: none !important;
            font-size: .78rem !important; font-weight: 500 !important; line-height: 1.35 !important; text-align: left !important; transition: all .15s;
        }
        html.scn #outSec a * { color: inherit !important; background: none !important; font-size: inherit !important; font-weight: inherit !important; }
        html.scn #outSec a:hover { color: var(--ink) !important; background: var(--soft) !important; }
        html.scn #outSec a.scn-active { color: var(--ink) !important; font-weight: 700 !important; background: var(--soft) !important; }

        /* ---------- Colonne centrale ---------- */
        #scn-center { min-width: 0; display: flex; flex-direction: column; }
        #scn-bar {
            position: sticky; top: 0; z-index: 100; height: var(--bar); display: flex; align-items: center; gap: 10px; padding: 0 24px;
            background: color-mix(in srgb, var(--bg) 85%, transparent);
            backdrop-filter: saturate(180%) blur(12px); -webkit-backdrop-filter: saturate(180%) blur(12px);
            border-bottom: 1px solid var(--line);
        }
        #scn-crumb { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; font-size: .8rem; color: var(--muted); white-space: nowrap; }
        #scn-crumb span { overflow: hidden; text-overflow: ellipsis; }
        #scn-crumb .sep { flex: none; color: var(--line); font-weight: 700; }
        #scn-crumb .cur { color: var(--ink); font-weight: 700; }
        #scn-progress { position: absolute; left: 0; bottom: -1px; height: 2px; width: 0; background: var(--acc); transition: width .1s linear; pointer-events: none; }
        .scn-btn {
            flex: none; height: 34px; min-width: 34px; padding: 0 10px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
            border: 1px solid var(--line); border-radius: 9px; background: var(--card); color: var(--muted);
            font: 600 .76rem 'Inter', system-ui, sans-serif; cursor: pointer; transition: all .15s;
        }
        .scn-btn:hover { color: var(--ink); border-color: var(--muted); }
        .scn-btn:focus-visible { outline: 3px solid rgba(251,226,22,.7); outline-offset: 1px; }
        .scn-btn svg { width: 17px; height: 17px; fill: currentColor; }
        .scn-btn .sun { display: none; } html.scn-dark .scn-btn .sun { display: block; } html.scn-dark .scn-btn .moon { display: none; }
        #scn-menu { display: none; }

        html.scn #main { flex: 1 0 auto; margin: 0 !important; padding: 0 0 56px !important; background: transparent !important; position: static !important; }
        html.scn .case { max-width: 860px; margin: 0 auto !important; padding: 0 32px !important; background: transparent !important; }
        html.scn .metas:empty { display: none; }
        html.scn #footer { padding: 20px !important; text-align: center; opacity: .5; background: transparent !important; }
        html.scn-dark #footer img { filter: invert(1); }

        /* Titre de page : masqué s'il répète le module (déjà dans la barre latérale et le fil d'Ariane), sinon titre compact */
        html.scn h1.case_ti.scn-dup { display: none !important; }
        html.scn h1.case_ti {
            margin: 28px 0 0 !important; padding: 0 !important; background: none !important; box-shadow: none !important;
            color: var(--ink) !important; font-size: 1.5rem !important; font-weight: 800 !important;
            letter-spacing: -.4px; line-height: 1.25 !important; text-align: left !important; text-transform: none !important;
        }
        html.scn h1.case_ti * { color: inherit !important; background: none !important; padding: 0 !important; margin: 0 !important; font-size: inherit !important; }

        /* ---------- Sommaire « Sur cette page » ---------- */
        #scn-toc { position: sticky; top: 0; align-self: start; max-height: 100vh; overflow-y: auto; padding: 28px 18px 24px 8px; scrollbar-width: thin; }
        #scn-toc h4 { margin: 0 0 10px 12px; font-size: .66rem; font-weight: 800; letter-spacing: .8px; text-transform: uppercase; color: var(--muted); }
        #scn-toc ol { list-style: none; margin: 0; padding: 0; border-left: 2px solid var(--line); }
        #scn-toc a {
            display: block; margin-left: -2px; padding: 4px 10px 4px 12px; border-left: 2px solid transparent;
            font-size: .77rem; line-height: 1.4; color: var(--muted); text-decoration: none; transition: color .15s, border-color .15s;
        }
        #scn-toc a.l2 { padding-left: 24px; }
        #scn-toc a.l3 { padding-left: 36px; font-size: .74rem; }
        #scn-toc a:hover { color: var(--ink); }
        #scn-toc a.scn-active { color: var(--ink); font-weight: 700; border-left-color: var(--acc); }

        /* =========== Contenu =========== */
        html.scn #content, html.scn #content section.part, html.scn #content .part_co, html.scn #content tr { background: transparent !important; }
        html.scn .part_ti { display: flex; align-items: center; gap: 10px; margin: 36px 0 14px !important; padding: 0 !important; color: var(--ink) !important; text-align: left !important; text-transform: none !important; letter-spacing: -.3px; }
        html.scn .part_ti span { background: none !important; text-decoration: none !important; color: inherit !important; }
        html.scn h2.part_ti { font-size: 1.45rem !important; font-weight: 800 !important; padding-bottom: 10px !important; border-bottom: 2px solid var(--line) !important; }
        html.scn h2.part_ti::after { content: ""; flex: none; order: -1; width: 6px; height: 1.1em; border-radius: 3px; background: var(--acc); }
        html.scn h3.part_ti { font-size: 1.12rem !important; font-weight: 700 !important; }
        html.scn .section_ti { margin: 22px 0 8px !important; font-size: 1rem !important; font-weight: 700 !important; color: var(--ink) !important; text-align: left !important; }

        html.scn #content { color: var(--text); }
        html.scn #content p { margin: .55em 0 !important; color: var(--text) !important; }
        html.scn #content strong, html.scn #content b { color: var(--ink) !important; }
        html.scn #content ul.txt_il, html.scn #content ol { padding-left: 1.35em !important; margin: .5em 0 !important; }
        html.scn #content li { margin: 4px 0 !important; color: var(--text) !important; }
        html.scn #content li::marker { color: var(--acc-ink); }
        html.scn #content a.op_txt_ul:not(.resLnk), html.scn #content a.txt_ul:not(.dwnLnk) {
            color: var(--ink) !important; text-decoration: underline !important; text-decoration-color: var(--acc) !important;
            text-decoration-thickness: 2px !important; text-underline-offset: 3px;
        }
        html.scn .MathJax_SVG, html.scn .MathJax_SVG * { color: var(--ink) !important; }
        html.scn #content img.scn-img { max-width: 100%; height: auto; border-radius: 10px; }
        html.scn-dark #content img.scn-img { background: #fff; }
        html.scn #content pre { border-radius: 10px !important; padding: 14px 16px !important; overflow: auto; font-size: .86rem; line-height: 1.5; border: 1px solid var(--line) !important; }
        html.scn-dark #content pre { background: #f6f8fa !important; color: #24292f !important; }

        /* Objectifs : grille de cartes */
        .scn-obj-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px; margin: 8px 0; }
        html.scn article.learnOut {
            display: flex !important; flex-direction: column; align-items: flex-start; gap: 8px; margin: 0 !important; padding: 12px 14px !important;
            background: var(--card) !important; border: 1px solid var(--line) !important; border-radius: 12px; box-shadow: var(--sh-sm); transition: border-color .15s, transform .15s;
        }
        html.scn article.learnOut:hover { border-color: var(--acc) !important; transform: translateY(-2px); }
        html.scn .learnOut_ti { color: var(--ink) !important; font-size: .88rem; line-height: 1.45; }
        .scn-lvl {
            flex: none; padding: 2px 9px; border-radius: 999px; font-size: .66rem; font-weight: 800; letter-spacing: .4px; white-space: nowrap;
            background: var(--acc-soft); color: var(--acc-ink); border: 1px solid var(--acc-line);
        }

        /* Blocs repliables */
        html.scn article.collapsed { margin: 16px 0 !important; background: var(--card) !important; border: 1px solid var(--line) !important; border-radius: 14px; box-shadow: var(--sh-sm); overflow: hidden; }
        html.scn article.collapsed > a.collapsed_open, html.scn article.collapsed > a.collapsed_closed {
            display: flex !important; align-items: center; gap: 10px; padding: 14px 18px !important; cursor: pointer;
            background: var(--soft) !important; color: var(--ink) !important; text-decoration: none !important;
            font-size: 1.02rem !important; font-weight: 700 !important; transition: background .15s;
        }
        html.scn article.collapsed > a.collapsed_open { border-bottom: 1px solid var(--line); }
        html.scn article.collapsed > a:hover { background: var(--acc-soft) !important; }
        html.scn article.collapsed > a * { color: inherit !important; }
        html.scn .collapsed_co { padding: 6px 20px 16px !important; }

        /* Tableaux */
        .scn-tbl { overflow-x: auto; margin: 14px 0; background: var(--card); border: 1px solid var(--line); border-radius: 12px; }
        html.scn table.txt_tb { width: 100%; margin: 0 !important; border: 0 !important; border-collapse: collapse !important; font-size: .9rem; }
        html.scn table.txt_tb :is(th, td) { padding: 9px 12px !important; border: 0 !important; border-bottom: 1px solid var(--line) !important; background: transparent !important; color: var(--text) !important; text-align: left; vertical-align: top; }
        html.scn table.txt_tb :is(th, tr.txt_head_tbtr > td) { background: var(--soft) !important; color: var(--ink) !important; font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; }
        html.scn table.txt_tb tbody tr:not(.txt_head_tbtr):hover td { background: var(--acc-soft) !important; }
        html.scn table.txt_tb tr:last-child > * { border-bottom: 0 !important; }

        /* Téléchargements / ressources */
        html.scn #content a.dwnLnk, html.scn #content a.resLnk {
            display: inline-flex !important; align-items: center; gap: 6px; margin: 2px 0; padding: 6px 12px !important;
            border-radius: 8px; border: 1px solid var(--acc-line); background: var(--acc-soft) !important;
            color: var(--ink) !important; font-size: .88rem; font-weight: 600; text-decoration: none !important; transition: all .15s;
        }
        html.scn #content a.dwnLnk:hover, html.scn #content a.resLnk:hover { border-color: var(--acc); transform: translateY(-1px); box-shadow: var(--sh-sm); }

        /* Page précédente / suivante */
        html.scn nav.pageTurner {
            display: flex !important; justify-content: space-between; align-items: stretch; gap: 12px; width: 100% !important; box-sizing: border-box;
            margin: 0 !important; padding: 18px 32px !important; position: static !important;
            background: var(--card) !important; border: 0 !important; border-top: 1px solid var(--line) !important;
        }
        html.scn a.btnNav {
            position: static !important; display: flex !important; flex-direction: column; gap: 2px; flex: 0 1 auto; max-width: 48%;
            width: fit-content !important; height: auto !important; padding: 14px 18px !important; text-indent: 0 !important; overflow: visible !important;
            background: var(--card) !important; border: 1px solid var(--line) !important; border-radius: 12px !important; box-shadow: var(--sh-sm);
            color: var(--muted) !important; text-decoration: none !important; font-size: .72rem !important; font-weight: 700 !important;
            text-transform: uppercase; letter-spacing: .5px; transition: all .15s;
        }
        html.scn a.btnNav > span { position: static !important; width: auto !important; height: auto !important; clip: auto !important; overflow: visible !important; margin: 0 !important; color: inherit !important; }
        html.scn a.btnNav::before { display: none !important; }
        html.scn a.btnNav::after { content: attr(data-sub); display: block !important; position: static !important; color: var(--ink); font-size: .95rem; font-weight: 700; letter-spacing: 0; text-transform: none; }
        html.scn a.btnNav.next { margin-left: auto; align-items: flex-end; text-align: right; }
        html.scn a.btnNav:hover { border-color: var(--acc) !important; transform: translateY(-2px); box-shadow: var(--sh-md); }

        /* =========== Responsive =========== */
        #scn-scrim { display: none; }
        @media (max-width: 1240px) {
            #scn-shell, #scn-shell.no-toc { grid-template-columns: var(--side) minmax(0, 1fr); }
            #scn-toc { display: none; }
        }
        @media (max-width: 900px) {
            #scn-shell, #scn-shell.no-toc { grid-template-columns: minmax(0, 1fr); }
            #scn-side { position: fixed; left: 0; top: 0; bottom: 0; width: min(300px, 86vw); height: 100%; transform: translateX(-105%); transition: transform .22s ease; box-shadow: var(--sh-md); }
            html.scn-nav-open #scn-side { transform: none; }
            html.scn-nav-open #scn-scrim { display: block; position: fixed; inset: 0; z-index: 110; background: rgba(15,23,42,.45); }
            #scn-menu { display: inline-flex; }
            #scn-bar { padding: 0 14px; }
            .scn-btn .lbl { display: none; }
            html.scn .case { padding: 0 16px !important; }
            html.scn nav.pageTurner { flex-direction: column; padding: 14px 16px !important; }
            html.scn a.btnNav { max-width: none; }
        }
        @media (prefers-reduced-motion: reduce) { html.scn { scroll-behavior: auto; } html.scn * { transition: none !important; } }
    `);

    const ICONS = {
        menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
        expand: 'M12 5.83L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83zm0 12.34L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17z',
        collapse: 'M7.41 18.59L8.83 20 12 16.83 15.17 20l1.41-1.41L12 14l-4.59 4.59zm9.18-13.18L15.17 4 12 7.17 8.83 4 7.41 5.41 12 10l4.59-4.59z',
        moon: 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z',
        sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM2 13h2a1 1 0 0 0 0-2H2a1 1 0 0 0 0 2zm18 0h2a1 1 0 0 0 0-2h-2a1 1 0 0 0 0 2zM11 2v2a1 1 0 0 0 2 0V2a1 1 0 0 0-2 0zm0 18v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-2 0z'
    };
    const svg = (n, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true"><path d="${ICONS[n]}"/></svg>`;

    onReady(() => {
        const $ = (s, r = document) => r.querySelector(s);
        const $$ = (s, r = document) => [...r.querySelectorAll(s)];
        const main = $('#main');
        if (!main) { html.classList.remove('scn-loading'); return; }

        /* ---------- 1. Lecture de la page d'origine ---------- */
        const tf = $('.titleFrame');
        const logoBg = tf ? getComputedStyle(tf).backgroundImage : 'none';
        if (logoBg && logoBg !== 'none') html.style.setProperty('--scn-logo', logoBg);
        const courseTitle = clean($('#title h1')?.textContent) || clean(document.title);
        const courseSub = clean($('#title h2')?.textContent);
        const outCat = $('#outCat');
        const outSec = $('#outSec');
        const activeLi = $('#outCat li.outCat_sel_yes');
        const moduleName = clean(activeLi?.textContent);
        const caseTi = $('h1.case_ti');

        /* ---------- 2. Nouvelle structure ---------- */
        const shell = document.createElement('div');
        shell.id = 'scn-shell';
        shell.innerHTML = `
            <aside id="scn-side" aria-label="Navigation du cours">
                <div class="scn-brand">
                    <div class="scn-logo" role="img" aria-label="CESI"></div>
                    <p class="scn-brand-title">${esc(courseTitle)}</p>
                    ${courseSub && courseSub !== courseTitle ? `<p class="scn-brand-sub">${esc(courseSub)}</p>` : ''}
                </div>
                <div class="scn-side-label">Modules</div>
                <div class="scn-side-scroll" id="scn-side-scroll"></div>
            </aside>
            <div id="scn-center">
                <div id="scn-bar">
                    <button type="button" class="scn-btn" id="scn-menu" aria-label="Menu">${svg('menu')}</button>
                    <div id="scn-crumb">
                        <span>${esc(courseSub || courseTitle)}</span>
                        ${moduleName ? `<span class="sep">/</span><span class="cur">${esc(moduleName)}</span>` : ''}
                    </div>
                    <button type="button" class="scn-btn" id="scn-open" title="Tout afficher">${svg('expand')}<span class="lbl">Tout ouvrir</span></button>
                    <button type="button" class="scn-btn" id="scn-close" title="Tout réduire">${svg('collapse')}<span class="lbl">Tout réduire</span></button>
                    <button type="button" class="scn-btn" id="scn-theme" title="Mode sombre / clair" aria-label="Basculer le thème">${svg('moon', 'moon')}${svg('sun', 'sun')}</button>
                    <div id="scn-progress"></div>
                </div>
            </div>
            <nav id="scn-toc" aria-label="Sur cette page"></nav>
            <div id="scn-scrim"></div>`;

        // Déplacement des éléments d'origine (leurs événements Scenari sont conservés)
        const sideScroll = shell.querySelector('#scn-side-scroll');
        if (outCat) sideScroll.appendChild(outCat);
        if (outSec && activeLi) activeLi.appendChild(outSec);
        // Supprime les dimensions inline calculées par Scenari pour la nav horizontale
        [outCat, outSec].forEach((n) => n && [n, ...n.querySelectorAll('[style]')].forEach((e) => e.removeAttribute('style')));
        const center = shell.querySelector('#scn-center');
        center.appendChild(main);
        const footer = $('#footer');
        if (footer) center.appendChild(footer);
        document.body.insertBefore(shell, document.body.firstChild);

        // Titre de page identique au module → masqué (doublon)
        const norm = (s) => clean(s).toLowerCase();
        if (caseTi && moduleName && norm(caseTi.textContent) === norm(moduleName)) caseTi.classList.add('scn-dup');

        // Module actif visible dans la barre latérale
        if (activeLi) sideScroll.scrollTop = Math.max(0, activeLi.offsetTop - 80);

        /* ---------- 3. Contenu ---------- */
        // Objectifs "[3] Texte" → badge "Niv. 3"
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
        // Objectifs consécutifs regroupés en grille
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

        // Tableaux défilants
        $$('table.txt_tb').forEach((t) => {
            if (t.parentElement.classList.contains('scn-tbl')) return;
            const w = document.createElement('div');
            w.className = 'scn-tbl';
            t.before(w);
            w.appendChild(t);
        });

        // Images de contenu (pas les petites icônes)
        const markImg = (img) => { if (img.naturalWidth > 80) img.classList.add('scn-img'); };
        $$('#content img').forEach((img) => (img.complete ? markImg(img) : img.addEventListener('load', () => markImg(img), { once: true })));

        // Précédent / suivant : titre de la page cible
        $$('a.btnNav').forEach((a) => {
            const m = (a.title || '').match(/\((.*)\)\s*$/);
            if (m) a.dataset.sub = a.classList.contains('prev') ? `← ${m[1]}` : `${m[1]} →`;
        });

        /* ---------- 4. Sommaire « Sur cette page » ---------- */
        const toc = shell.querySelector('#scn-toc');
        let tocN = 0;
        const tocItems = $$('#content h2.part_ti, #content h3.part_ti, #content article.collapsed > a .collapsed_ti').map((el) => {
            const target = el.matches('.collapsed_ti') ? el.closest('article.collapsed') : el;
            if (!target.id) target.id = `scn-t-${++tocN}`;
            const level = el.matches('h2') ? 1 : el.matches('h3') ? 2 : 3;
            return { text: clean(el.textContent), target, level };
        }).filter((x) => x.text);

        let tocLinks = [];
        if (tocItems.length >= 2) {
            toc.innerHTML = `<h4>Sur cette page</h4><ol>${tocItems.map((t, i) =>
                `<li><a href="#${esc(t.target.id)}" class="l${t.level}" data-i="${i}">${esc(t.text)}</a></li>`).join('')}</ol>`;
            tocLinks = $$('a', toc).map((a) => ({ a, el: tocItems[+a.dataset.i].target }));
            toc.addEventListener('click', (e) => {
                const a = e.target.closest('a[data-i]');
                if (!a) return;
                e.preventDefault();
                const el = tocItems[+a.dataset.i].target;
                const closed = el.matches('article.collapsed') && el.querySelector(':scope > a.collapsed_closed');
                if (closed) closed.click();
                el.scrollIntoView({ block: 'start' });
            });
        }

        if (!tocLinks.length) { toc.remove(); shell.classList.add('no-toc'); }

        // Précédent / suivant : pied de page de la colonne centrale (pleine largeur)
        const turner = $('nav.pageTurner');
        if (turner) main.after(turner);

        html.classList.remove('scn-loading');

        /* ---------- 5. Barre d'outils ---------- */
        const openBtn = $('#tools .cbkOpenBtn');
        const closeBtn = $('#tools .cbkCloseBtn');
        const btnOpen = $('#scn-open'), btnClose = $('#scn-close');
        if (openBtn) btnOpen.addEventListener('click', () => openBtn.click()); else btnOpen.remove();
        if (closeBtn) btnClose.addEventListener('click', () => closeBtn.click()); else btnClose.remove();
        $('#scn-theme').addEventListener('click', () => setTheme(!html.classList.contains('scn-dark')));

        const closeNav = () => html.classList.remove('scn-nav-open');
        $('#scn-menu').addEventListener('click', () => html.classList.toggle('scn-nav-open'));
        $('#scn-scrim').addEventListener('click', closeNav);
        $('#scn-side').addEventListener('click', (e) => { if (e.target.closest('#outSec a')) closeNav(); });

        /* ---------- 6. Progression + section active ---------- */
        const bar = $('#scn-progress');
        const secLinks = $$('#outSec a[href^="#"]').map((a) => ({ a, el: document.getElementById(a.getAttribute('href').slice(1)) })).filter((x) => x.el);
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
            bar.style.width = max > 0 ? `${Math.min(100, (scrollY / max) * 100)}%` : '0';
            spy(secLinks, 120);
            const cur = spy(tocLinks, 120);
            if (cur && toc.isConnected) {
                const r = cur.a.getBoundingClientRect(), tr = toc.getBoundingClientRect();
                if (r.top < tr.top + 40 || r.bottom > tr.bottom - 20) toc.scrollTop += r.top - tr.top - tr.height / 3;
            }
        };
        addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
        addEventListener('resize', onScroll);
        onScroll();

        /* ---------- 7. Clavier ---------- */
        addEventListener('keydown', (e) => {
            if (e.key === 'Escape') return closeNav();
            if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
            const t = e.target;
            if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
            const btn = e.key === 'ArrowLeft' ? $('a.btnNav.prev') : e.key === 'ArrowRight' ? $('a.btnNav.next') : null;
            if (btn) { e.preventDefault(); btn.click(); }
        });
    });
})();
