// ==UserScript==
// @name         ENT CESI - Visual Redesign
// @namespace    http://tampermonkey.net/
// @version      20.0
// @description  Interface modernisée pour l'ENT CESI : données réelles (profil, EDT, notifications, accès directs) récupérées depuis l'ENT.
// @author       You
// @match        https://ent.cesi.fr/*
// @match        https://sts.viacesi.fr/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';

    /* =====================================================================
       CONFIGURATION
       ===================================================================== */
    // L'email est mémorisé automatiquement à la première connexion (aucun mot de passe stocké).
    const getEmail = () => GM_getValue('cesi_email', '');
    const setEmail = (v) => v && GM_setValue('cesi_email', v.trim());

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
        { href: "https://ent.cesi.fr/travaux-de-fin-detudes", title: "Travaux de fin d'études", icon: "school" },
        { href: "https://ent.cesi.fr/actualites", title: "Actualités", icon: "news" },
        { href: "https://ent.cesi.fr/infos-pratiques", title: "Infos pratiques", icon: "info" },
        { href: "https://ent.cesi.fr/ressources-numeriques", title: "Ressources numériques", icon: "book" },
        { href: "http://support.viacesi.info", title: "Support CESI", icon: "support" },
        { href: "https://www.office.com", title: "Microsoft 365", icon: "apps" }
    ];

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
        pin: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
    };
    const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name] || ICONS.link}"/></svg>`;

    /* =====================================================================
       HELPERS
       ===================================================================== */
    const root = () => document.head || document.documentElement;
    const addStyle = (css) => { const el = document.createElement('style'); el.textContent = css; root().appendChild(el); return el; };
    const addFont = () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
        root().appendChild(link);
    };
    const onReady = (fn) => {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
        else fn();
    };
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

    const host = location.hostname;
    const path = location.pathname;

    /* =====================================================================
       1. WAYF : redirection automatique (si email déjà mémorisé)
       ===================================================================== */
    if (host.includes('ent.cesi.fr') && path.includes('/identification/wayf')) {
        const email = getEmail();
        if (!email) return; // première fois : page native, l'email sera mémorisé à la connexion
        addStyle('html{background:#0d1117 !important} body{opacity:0 !important}');
        onReady(() => {
            const loginInput = document.querySelector('input[name="login"]');
            const form = document.querySelector('form[name="wayf"]') || document.querySelector('form');
            if (loginInput && form) { loginInput.value = email; form.submit(); }
            else document.body.style.opacity = '1';
        });
        return;
    }

    addFont();

    /* =====================================================================
       2. PAGE DE CONNEXION (sts.viacesi.fr)
       ===================================================================== */
    if (host.includes('sts.viacesi.fr')) {
        addStyle(`
            html, body {
                background: linear-gradient(135deg, rgba(13,17,23,.82), rgba(10,12,16,.92)),
                            url('https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=1920&auto=format&fit=crop') center / cover no-repeat fixed #0d1117 !important;
                font-family: 'Inter', system-ui, sans-serif !important;
                margin: 0 !important; padding: 0 !important;
                min-height: 100vh !important; width: 100% !important;
                display: flex !important; justify-content: center !important; align-items: center !important;
                overflow-x: hidden !important;
            }
            body::before { content: ""; position: fixed; inset: 0; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); pointer-events: none; z-index: 0; }
            #cesi-login-card {
                position: relative; z-index: 2; background: #fff; width: 100%; max-width: 420px;
                padding: 40px 32px; margin: 20px; border-radius: 20px; box-shadow: 0 25px 60px rgba(0,0,0,.55);
                box-sizing: border-box; animation: cesiScaleIn .45s cubic-bezier(.16,1,.3,1);
            }
            @keyframes cesiScaleIn { from { opacity: 0; transform: scale(.97) translateY(10px); } to { opacity: 1; transform: none; } }
            #cesi-login-card img { display: block !important; max-width: 135px; height: auto; margin: 0 auto 24px; border: 0 !important; border-radius: 0 !important; }
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
            #cesi-login-card #submitButton, #cesi-login-card .style-30 {
                display: flex !important; justify-content: center !important; align-items: center !important;
                width: 100% !important; height: 48px !important; margin: 20px 0 0 !important; padding: 0 !important;
                background: #FBE216 !important; color: #000 !important; border: 0 !important; border-radius: 10px !important;
                font: 700 .9rem 'Inter', sans-serif !important; text-transform: uppercase; letter-spacing: .5px; cursor: pointer;
                box-shadow: 0 4px 14px rgba(251,226,22,.3) !important; transition: all .2s cubic-bezier(.4,0,.2,1) !important; box-sizing: border-box !important;
            }
            #cesi-login-card #submitButton:hover, #cesi-login-card .style-30:hover { background: #ebd10f !important; transform: translateY(-1.5px); box-shadow: 0 6px 20px rgba(251,226,22,.45) !important; }
            #cesi-login-card .help-links { border-top: 1px solid #f1f5f9; margin-top: 26px; padding-top: 18px; text-align: center; }
            #cesi-login-card .help-links a { color: #64748b; font-size: .78rem; text-decoration: none; margin: 0 8px; font-weight: 500; transition: color .15s; }
            #cesi-login-card .help-links a:hover { color: #0f172a; text-decoration: underline; }
        `);

        onReady(() => {
            const form = document.querySelector('form');
            if (!form) return;

            const oldLogo = document.querySelector('img[src*="logo"]');
            const logoSrc = oldLogo ? oldLogo.src : '/adfs/portal/logo/logo.png';

            const card = document.createElement('div');
            card.id = 'cesi-login-card';
            card.innerHTML = `<img src="${esc(logoSrc)}" alt="CESI" /><h2>Bienvenue sur l'ENT</h2><p class="subtitle">Connectez-vous à votre espace d'apprentissage</p>`;
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

            // Mémorise l'email (jamais le mot de passe)
            const remember = () => userInput && setEmail(userInput.value);
            form.addEventListener('submit', remember, true);
            if (btn) btn.addEventListener('click', remember, true);
            passInput && passInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') remember(); });
        });
        return;
    }

    /* =====================================================================
       3. TABLEAU DE BORD (ent.cesi.fr/accueil-apprenant)
       ===================================================================== */
    if (!(host.includes('ent.cesi.fr') && path.includes('/accueil-apprenant'))) return;

    document.documentElement.classList.add('cesi-loading');
    addStyle('html.cesi-loading body { visibility: hidden !important; }');
    setTimeout(() => document.documentElement.classList.remove('cesi-loading'), 4000);

    addStyle(`
        :root {
            --c-bg: #f4f5f7; --c-card: #ffffff; --c-ink: #0f172a; --c-text: #334155; --c-muted: #64748b;
            --c-line: #e2e8f0; --c-line-strong: #cbd5e1; --c-soft: #f8fafc;
            --c-accent: #FBE216; --c-accent-dark: #ebd10f; --c-accent-ink: #857000; --c-accent-soft: #fffbeb;
            --c-danger: #dc2626; --radius: 14px;
            --shadow-sm: 0 1px 3px rgba(15,23,42,.05); --shadow-md: 0 8px 24px rgba(15,23,42,.08);
        }
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

        #cesi-topbar-wrap { position: sticky; top: 0; z-index: 50; background: rgba(244,245,247,.82); backdrop-filter: saturate(180%) blur(12px); -webkit-backdrop-filter: saturate(180%) blur(12px); border-bottom: 1px solid rgba(203,213,225,.55); }
        #cesi-topbar { max-width: 1240px; margin: 0 auto; padding: 12px 40px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        #cesi-header-logo { height: 52px; width: auto; display: block; object-fit: contain; border: 0 !important; outline: 0 !important; box-shadow: none !important; background: none !important; border-radius: 0 !important; padding: 0 !important; margin: 0 !important; }
        .cesi-user-actions { display: flex; align-items: center; gap: 12px; }

        .cesi-icon-btn { position: relative; width: 40px; height: 40px; border-radius: 50%; background: var(--c-card); border: 1px solid var(--c-line-strong); color: var(--c-muted); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow-sm); transition: all .15s ease; }
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

        .cesi-profile-btn { display: flex; align-items: center; gap: 10px; height: 40px; padding: 4px 12px 4px 16px; background: var(--c-card); border: 1px solid var(--c-line-strong); border-radius: 30px; box-shadow: var(--shadow-sm); cursor: pointer; transition: all .15s ease; }
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
                    const cls = live ? ' is-live' : done ? ' is-done' : '';
                    return `
                        <div class="edt-course-item${cls}">
                            <span class="course-time">${c.allDay ? 'Journée' : `${esc(c.start)} - ${esc(c.end)}`}</span>
                            <div class="course-info">
                                <h5 class="course-title">${esc(c.title)}</h5>
                                <p class="course-sub">${svg('pin')}${esc(c.place)}</p>
                                ${c.teacher ? `<p class="course-sub">${svg('user')}${esc(c.teacher)}</p>` : ''}
                            </div>
                            ${live ? '<span class="live-pill">EN COURS</span>' : ''}
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
        const paintEdt = () => { const box = document.getElementById('cesi-edt-container'); if (box) box.innerHTML = renderEdt(); };

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
                    <a href="/accueil-apprenant" aria-label="Accueil"><img src="/uas/ksup/LOGO/cesi_RVB_ENT.png" alt="CESI" id="cesi-header-logo" /></a>
                    <div class="cesi-user-actions">
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
        document.documentElement.classList.remove('cesi-loading');

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
            const photo = doc.querySelector('img[src*="/medias/photo/"]');
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
        document.addEventListener('click', () => closeAll());
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
    });
})();
