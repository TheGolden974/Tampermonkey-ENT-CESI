// ==UserScript==
// @name         CESI Suite - ENT, Moodle & Scenari
// @namespace    http://tampermonkey.net/
// @version      23.0
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
        sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM2 13h2a1 1 0 0 0 0-2H2a1 1 0 0 0 0 2zm18 0h2a1 1 0 0 0 0-2h-2a1 1 0 0 0 0 2zM11 2v2a1 1 0 0 0 2 0V2a1 1 0 0 0-2 0zm0 18v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-2 0z'
    };
    const svg = (name, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true"><path d="${ICONS[name] || ICONS.link}"/></svg>`;

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

    function handleEntWayf() {
        const email = getEmail();
        if (!email) return;

        maskPage(1200);
        onReady(() => {
            const findEntInput = () => {
                const input = document.querySelector('input[name="login"], input[type="email"], input#username, input[type="text"]');
                const form = document.querySelector('form[name="wayf"]') || input?.closest('form');
                if (!input || !form) return null;
                return { input, form, value: email };
            };
            const target = findEntInput();
            if (target) {
                submitCredentials(target.input, target.form, target.value);
            } else {
                tryFillAndSubmit(findEntInput, 20, 50);
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
        addFont();
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
        const isDark = () => {
            const saved = localStorage.getItem(THEME_KEY) || localStorage.getItem('scn-theme');
            return saved ? saved === 'dark' : true;
        };
        const applyTheme = (dark) => {
            const el = document.documentElement;
            if (el) {
                el.classList.toggle('dark', dark);
                el.classList.toggle('scn-dark', dark);
            }
            try {
                localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
                localStorage.setItem('scn-theme', dark ? 'dark' : 'light');
            } catch { /* ignore */ }
        };
        applyTheme(isDark());
        document.addEventListener('DOMContentLoaded', () => applyTheme(isDark()), { once: true });

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
            html.dark #cesi-topbar-wrap { background: rgba(22,27,34,.85); border-bottom-color: var(--c-line); }
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
        document.getElementById('cesi-theme-btn')?.addEventListener('click', () => {
            applyTheme(!document.documentElement.classList.contains('dark'));
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
        const isDark = () => {
            const saved = localStorage.getItem(THEME_KEY) || localStorage.getItem('scn-theme');
            return saved ? saved === 'dark' : true;
        };
        const applyTheme = (dark) => {
            const el = document.documentElement;
            if (el) {
                el.classList.toggle('dark', dark);
                el.classList.toggle('scn-dark', dark);
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.documentElement?.classList.toggle('dark', dark);
                    document.documentElement?.classList.toggle('scn-dark', dark);
                }, { once: true });
            }
            try {
                localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
                localStorage.setItem('scn-theme', dark ? 'dark' : 'light');
            } catch { /* ignore */ }
        };
        applyTheme(isDark());

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
                max-width: 1240px; margin: 0 auto; padding: 12px 40px;
                display: flex; align-items: center; justify-content: space-between; gap: 16px;
            }
            .cesi-sub-left { display: flex; align-items: center; gap: 20px; }
            .cesi-sub-logo { display: inline-flex; align-items: center; gap: 8px; text-decoration: none !important; }
            .cesi-sub-badge { background: var(--c-accent); color: #000; font-weight: 900; font-size: 1.1rem; padding: 4px 9px; border-radius: 6px; letter-spacing: .5px; line-height: 1; }
            .cesi-sub-portal { font-size: .78rem; font-weight: 800; color: var(--c-muted); text-transform: uppercase; letter-spacing: 1px; }
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
                        <a href="/accueil-apprenant" class="cesi-sub-logo">
                            <span class="cesi-sub-badge">CESI</span>
                            <span class="cesi-sub-portal">Portail Apprenant</span>
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
                applyTheme(!document.documentElement.classList.contains('dark'));
            });
        });
    }


    /* =====================================================================
       2.C. PLATEFORME MOODLE (Dashboard, Liste des cours, Navigation)
       ===================================================================== */
    function handleMoodlePlatform() {
        addFont();

        const THEME_KEY = 'cesi_theme';
        const isDark = () => {
            const saved = localStorage.getItem(THEME_KEY) || localStorage.getItem('scn-theme');
            return saved ? saved === 'dark' : true;
        };
        const applyTheme = (dark) => {
            const el = document.documentElement;
            if (el) {
                el.classList.toggle('cesi-dark', dark);
                el.classList.toggle('dark', dark);
                el.classList.toggle('scn-dark', dark);
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.documentElement?.classList.toggle('cesi-dark', dark);
                    document.documentElement?.classList.toggle('dark', dark);
                    document.documentElement?.classList.toggle('scn-dark', dark);
                }, { once: true });
            }
            try {
                localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
                localStorage.setItem('scn-theme', dark ? 'dark' : 'light');
            } catch { /* ignore */ }
        };
        applyTheme(isDark());

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
            /* Barre de navigation Moodle */
            .navbar, #mainnavigation, .fixed-top {
                background: var(--m-card) !important; border-bottom: 1px solid var(--m-border) !important;
                box-shadow: 0 1px 4px rgba(0,0,0,0.06) !important;
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

            /* Cartes, conteneurs et listes Moodle */
            #page, #page-content, #region-main, .card, .block, .dashboard-card,
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
                padding: 12px 16px !important; margin-bottom: 8px !important; transition: background .15s !important;
            }
            .activity-item:hover { background: var(--m-soft) !important; }
            .activityname a { color: var(--m-ink) !important; font-weight: 600 !important; }

            /* Boutons Moodle */
            .btn-primary {
                background: var(--m-primary) !important; color: #000 !important; font-weight: 700 !important;
                border: 0 !important; border-radius: 8px !important; padding: 8px 18px !important;
            }
            .btn-secondary {
                background: var(--m-soft) !important; color: var(--m-ink) !important; font-weight: 600 !important;
                border: 1px solid var(--m-border) !important; border-radius: 8px !important;
            }
            h2.sectionname { border-left: 4px solid var(--m-primary) !important; padding-left: 10px !important; }

            /* Bouton de thème dans la barre Moodle */
            .cesi-moodle-theme-btn {
                height: 34px; width: 34px; display: inline-flex; align-items: center; justify-content: center;
                border: 1px solid var(--m-border); border-radius: 8px; background: var(--m-card); color: var(--m-muted);
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

            // Intégrer proprement les accès rapides et le bouton de thème dans la barre Moodle
            const userNav = document.getElementById('usernavigation') || document.querySelector('.navbar .navbar-nav:last-child') || document.querySelector('.navbar');
            if (userNav && !document.getElementById('cesi-moodle-quicklinks')) {
                const wrap = document.createElement('div');
                wrap.id = 'cesi-moodle-quicklinks';
                wrap.style.cssText = 'display: inline-flex; align-items: center; gap: 8px; margin-right: 12px;';
                wrap.innerHTML = `
                    <a href="https://ent.cesi.fr/accueil-apprenant" class="btn btn-sm" style="background: var(--m-primary) !important; color: #000 !important; font-weight: 800; font-size: .78rem; padding: 4px 10px; border-radius: 8px; text-decoration: none;">ENT CESI</a>
                    <a href="https://moodle.cesi.fr/my/courses.php" class="nav-link d-none d-lg-inline-block" style="font-weight: 600; font-size: .84rem;">Mes cours</a>
                    <button type="button" class="cesi-moodle-theme-btn" id="cesi-moodle-theme-btn" title="Basculer clair/sombre" aria-label="Thème">
                        ${svg('moon', 'moon')}${svg('sun', 'sun')}
                    </button>
                `;
                userNav.prepend(wrap);

                document.getElementById('cesi-moodle-theme-btn')?.addEventListener('click', () => {
                    applyTheme(!document.documentElement.classList.contains('cesi-dark'));
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
        const isDark = () => store.get() !== 'light';
        const applyTheme = () => {
            const dark = isDark();
            getHtml()?.classList.toggle('scn-dark', dark);
            getHtml()?.classList.toggle('dark', dark);
        };
        const setTheme = (dark) => {
            store.set(dark ? 'dark' : 'light');
            const docs = [document];
            try { if (window.parent !== window) docs.push(window.parent.document); } catch { /* cross-origin */ }
            document.querySelectorAll('iframe').forEach((f) => { try { f.contentDocument && docs.push(f.contentDocument); } catch { /* ignore */ } });
            docs.forEach((d) => {
                d.documentElement?.classList.toggle('scn-dark', dark);
                d.documentElement?.classList.toggle('dark', dark);
            });
        };
        addClass('scn');
        if (getHtml()) applyTheme();
        else document.addEventListener('DOMContentLoaded', () => applyTheme(), { once: true });
        addEventListener('storage', (e) => (e.key === KEY || e.key === 'cesi_theme') && applyTheme());

        addFont();

        const VARS = `html.scn {
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
        }`;

        if (isPlayer) {
            addStyle(VARS + `
            html.scn, html.scn body { background: var(--bg) !important; margin: 0 !important; }
            html.scn #contentFrame { border: 0 !important; display: block; background: var(--bg); }
            html.scn .msgBox { font-family: 'Inter', system-ui, sans-serif !important; color: var(--ink) !important; }
            html.scn .msgBox > div { background: var(--card) !important; border: 1px solid var(--line) !important; border-radius: 14px !important; box-shadow: var(--sh-md) !important; }
        `);
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
        html.scn main a[title*="enlarge" i], html.scn main a[title*="interface" i], html.scn main a[title*="agrandir" i] {
            display: none !important;
        }

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
        #scn-shell { display: grid; grid-template-columns: var(--side) minmax(0, 1fr) var(--toc); min-height: 100vh; }
        #scn-shell.no-toc { grid-template-columns: var(--side) minmax(0, 1fr); }
        #scn-shell.collapsed-side { grid-template-columns: 0 minmax(0, 1fr) var(--toc); }
        #scn-shell.collapsed-side.no-toc { grid-template-columns: 0 minmax(0, 1fr); }
        #scn-shell.collapsed-side #scn-side { transform: translateX(-100%); }
        #scn-shell *, #scn-shell *::before, #scn-shell *::after { box-sizing: border-box; }

        /* ---------- Barre latérale ---------- */
        #scn-side {
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

        /* Navigation de la barre latérale (#outCat, #outSec & Opale) */
        html.scn :is(#outCat, #outSec, nav[aria-label*="menu" i]) {
            position: static !important; top: auto !important; left: auto !important; right: auto !important; bottom: auto !important;
            width: auto !important; margin: 0 !important; padding: 0 !important; background: none !important; border: 0 !important;
            transform: none !important;
        }
        html.scn :is(#outCat, #outSec, nav[aria-label*="menu" i]) ul {
            display: flex !important; flex-direction: column !important; gap: 2px !important; margin: 0 !important; padding: 0 !important;
            list-style: none !important; background: none !important; border: 0 !important; counter-reset: scnmod;
        }
        html.scn :is(#outCat, #outSec, nav[aria-label*="menu" i]) li {
            display: block !important; position: static !important; width: 100% !important; margin: 0 !important; padding: 0 !important;
            border: 0 !important; background: none !important; counter-increment: scnmod; transform: none !important;
        }
        html.scn :is(#outCat, #outSec, nav[aria-label*="menu" i]) :is(ul, li, a, span, div) {
            position: static !important; float: none !important; top: auto !important; left: auto !important; right: auto !important; bottom: auto !important;
            transform: none !important; height: auto !important; min-height: 0 !important; max-height: none !important;
            overflow: visible !important; white-space: normal !important; vertical-align: baseline !important;
            text-indent: 0 !important; clip: auto !important; opacity: 1 !important;
        }
        html.scn #outCat :is(a.outCat_lnk, div.outCat_lnk), html.scn nav[aria-label*="menu" i] li > :is(a, div) {
            position: relative !important; display: flex !important; align-items: center; min-height: 40px !important; box-sizing: border-box !important;
            width: 100% !important; height: auto !important;
            padding: 8px 14px 8px 42px !important; border: 0 !important; border-radius: 9px !important;
            background: transparent !important; color: var(--text) !important; text-decoration: none !important;
            font-size: .82rem !important; font-weight: 500 !important; line-height: 1.35 !important; text-align: left !important;
            transition: background .15s, color .15s;
        }
        html.scn #outCat :is(a.outCat_lnk, div.outCat_lnk)::before, html.scn nav[aria-label*="menu" i] li > :is(a, div)::before {
            content: counter(scnmod, decimal-leading-zero); display: block !important; position: absolute; left: 8px; top: 50%; transform: translateY(-50%);
            min-width: 24px; padding: 1px 0;
            border-radius: 6px; background: var(--soft); border: 1px solid var(--line);
            font-size: .66rem; font-weight: 800; line-height: 1.6; text-align: center; color: var(--muted);
        }
        html.scn #outCat :is(a.outCat_lnk, div.outCat_lnk):hover, html.scn nav[aria-label*="menu" i] li > :is(a, div):hover {
            background: var(--soft) !important; color: var(--ink) !important;
        }
        html.scn #outCat li.outCat_sel_yes > :is(a, div), html.scn nav[aria-label*="menu" i] li.outCat_sel_yes > :is(a, div) {
            background: var(--acc-soft) !important; color: var(--ink) !important; font-weight: 700 !important; box-shadow: inset 3px 0 0 var(--acc);
        }
        html.scn #outCat li.outCat_sel_yes > :is(a, div)::before, html.scn nav[aria-label*="menu" i] li.outCat_sel_yes > :is(a, div)::before {
            background: var(--acc); border-color: var(--acc); color: #000;
        }
        html.scn #outCat a span, html.scn nav[aria-label*="menu" i] a span { color: inherit !important; background: none !important; }

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

        html.scn main, html.scn #main { flex: 1 0 auto; margin: 0 !important; padding: 24px 0 56px !important; background: transparent !important; position: static !important; }
        html.scn .case, html.scn section { max-width: 880px; margin: 0 auto !important; padding: 32px 38px !important; background: var(--card) !important; border: 1px solid var(--line) !important; border-radius: 14px; box-shadow: var(--sh-sm); }
        html.scn #footer { padding: 20px !important; text-align: center; opacity: .5; background: transparent !important; }
        html.scn-dark #footer img { filter: invert(1); }

        /* Titre de page */
        html.scn h1.case_ti.scn-dup { display: none !important; }
        html.scn h1.case_ti {
            margin: 28px 0 0 !important; padding: 0 !important; background: none !important; box-shadow: none !important;
            color: var(--ink) !important; font-size: 1.5rem !important; font-weight: 800 !important;
            letter-spacing: -.4px; line-height: 1.25 !important; text-align: left !important; text-transform: none !important;
        }
        html.scn h1.case_ti * { color: inherit !important; background: none !important; padding: 0 !important; margin: 0 !important; font-size: inherit !important; }

        /* Titres de section H2 */
        html.scn h2, html.scn .part_ti, html.scn .style-20 {
            font-size: 1.55rem !important; font-weight: 800 !important; color: var(--ink) !important;
            margin: 1.6rem 0 1rem !important; padding: 0 0 0 16px !important; position: relative !important;
            line-height: 1.3 !important; letter-spacing: -.3px !important; display: block !important;
        }
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
        .scn-obj-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin: 14px 0 20px; }
        .scn-obj-grid > article.learnOut { margin: 0 !important; height: 100%; display: flex; flex-direction: column; }
        html.scn article.learnOut {
            background: var(--soft) !important; border: 1px solid var(--line) !important; border-radius: 12px !important;
            padding: 16px 18px !important; box-shadow: none !important; position: relative !important;
        }
        html.scn article.learnOut .learnOut_ti { font-size: .95rem !important; font-weight: 700 !important; color: var(--ink) !important; margin: 0 0 6px !important; }
        .scn-lvl {
            display: inline-block; font-size: .68rem; font-weight: 800; letter-spacing: .5px;
            text-transform: uppercase; padding: 2px 8px; border-radius: 6px;
            background: var(--acc-soft); color: var(--acc-ink); border: 1px solid var(--acc-line);
            margin: 0 6px 4px 0; vertical-align: middle;
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
        html.scn img.scn-img { max-width: 100% !important; height: auto !important; border-radius: 10px; border: 1px solid var(--line); box-shadow: var(--sh-sm); margin: 14px auto; display: block; }

        /* Boutons Précédent / Suivant (pageTurner) */
        html.scn nav.pageTurner {
            display: flex; gap: 14px; justify-content: space-between;
            margin: 40px auto 0 !important; max-width: 880px; width: 100%;
            background: none !important; border: 0 !important; padding: 0 !important;
        }
        html.scn a.btnNav {
            flex: 1; max-width: 380px; display: flex; flex-direction: column; justify-content: center;
            padding: 14px 20px !important; border-radius: 14px !important;
            background: var(--card) !important; border: 1px solid var(--line) !important;
            color: var(--ink) !important; text-decoration: none !important;
            box-shadow: var(--sh-sm); transition: all .18s ease; position: relative;
        }
        html.scn a.btnNav:hover { border-color: var(--acc-line) !important; transform: translateY(-2px); box-shadow: var(--sh-md); }
        html.scn a.btnNav.prev { text-align: left; align-items: flex-start; }
        html.scn a.btnNav.next { text-align: right; align-items: flex-end; margin-left: auto; }
        html.scn a.btnNav span { font-size: .78rem !important; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; }
        html.scn a.btnNav::after {
            content: attr(data-sub); display: block; font-size: .92rem; font-weight: 700;
            color: var(--ink); margin-top: 3px; line-height: 1.3;
        }

        /* ---------- Sommaire « Sur cette page » (TOC) ---------- */
        #scn-toc {
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
            html.scn nav.pageTurner { flex-direction: column; padding: 14px 16px !important; }
            html.scn a.btnNav { max-width: none; }
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
                        <div class="scn-logo-badge">CESI</div>
                        <span class="scn-logo-txt">École d'ingénieurs</span>
                    </div>
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
                        ${breadcrumbModule ? `<span class="sep">/</span><span class="${breadcrumbSub ? '' : 'cur'}">${esc(breadcrumbModule)}</span>` : ''}
                        ${breadcrumbSub ? `<span class="sep">/</span><span class="cur">${esc(breadcrumbSub)}</span>` : ''}
                    </div>
                    <button type="button" class="scn-btn" id="scn-theme" title="Mode sombre / clair" aria-label="Basculer le thème">${svg('moon', 'moon')}${svg('sun', 'sun')}</button>
                    <div id="scn-progress"></div>
                </div>
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
        if (tocItems.length >= 2) {
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
                        <div class="scn-logo-badge">CESI</div>
                        <span class="scn-logo-txt">École d'ingénieurs</span>
                    </div>
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

        const sideScroll = shell.querySelector('#scn-side-scroll');
        if (outCat) sideScroll.appendChild(outCat);
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

        if (caseTi && moduleName && clean(caseTi.textContent).toLowerCase() === clean(moduleName).toLowerCase()) {
            caseTi.classList.add('scn-dup');
        }

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
        $$('#content img').forEach((img) => (img.complete ? markImg(img) : img.addEventListener('load', () => markImg(img), { once: true })));

        $$('a.btnNav').forEach((a) => {
            const m = (a.title || '').match(/\((.*)\)\s*$/);
            if (m) a.dataset.sub = a.classList.contains('prev') ? `← ${m[1]}` : `${m[1]} →`;
        });

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

        const turner = $('nav.pageTurner');
        if (turner) main.after(turner);

        const openBtn = $('#tools .cbkOpenBtn');
        const closeBtn = $('#tools .cbkCloseBtn');
        const btnOpen = $('#scn-open'), btnClose = $('#scn-close');
        if (openBtn) btnOpen.addEventListener('click', () => openBtn.click()); else btnOpen?.remove();
        if (closeBtn) btnClose.addEventListener('click', () => closeBtn.click()); else btnClose?.remove();

        removeClass('scn-loading');
        setupInteractions(shell, toc, tocLinks, $, $$);
        }

        function setupInteractions(shell, toc, tocLinks, $, $$) {
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
            if (bar) bar.style.width = max > 0 ? `${Math.min(100, (scrollY / max) * 100)}%` : '0';
            spy(secLinks, 120);
            const cur = spy(tocLinks, 120);
            if (cur && toc && toc.isConnected) {
                const r = cur.a.getBoundingClientRect(), tr = toc.getBoundingClientRect();
                if (r.top < tr.top + 40 || r.bottom > tr.bottom - 20) toc.scrollTop += r.top - tr.top - tr.height / 3;
            }
        };
        addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
        addEventListener('resize', onScroll);
        onScroll();

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
