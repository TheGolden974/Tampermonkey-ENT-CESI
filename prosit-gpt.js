// ==UserScript==
// @name         CESI Scenari - GPT Aller (Prosit)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Ajoute un bouton "GPT Aller" sur les pages Scenari CESI contenant une catégorie "Sujet", extrait le sujet, ouvre ChatGPT, colle le texte et génère un Prosit Aller.
// @author       Maxence
// @match        *://scenari.cesi.fr/*
// @match        *://moodle.cesi.fr/pluginfile.php/*/mod_resource/content/*
// @match        https://chatgpt.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_openInTab
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const AI_CONFIG = {
        id: 'gpt',
        buttonLabel: 'GPT Aller',
        targetUrl: 'https://chatgpt.com/',
        matchHost: 'chatgpt.com',
        pendingKey: 'prosit_gpt_pending_prompt',
        accentBg: '#10a37f',
        accentBorder: 'rgba(16, 163, 127, .7)',
        accentColor: '#ffffff'
    };

    const host = location.hostname;
    const path = location.pathname;

    /* =====================================================================
       1. CÔTÉ CHATGPT (https://chatgpt.com/*)
       ===================================================================== */
    if (host.includes(AI_CONFIG.matchHost)) {
        handleAiWeb();
        return;
    }

    function getPendingPrompt() {
        try {
            const pending = GM_getValue(AI_CONFIG.pendingKey, null);
            if (!pending || !pending.prompt) return null;
            if (Date.now() - (pending.ts || 0) > 120000) {
                GM_setValue(AI_CONFIG.pendingKey, null);
                return null;
            }
            return pending;
        } catch {
            return null;
        }
    }

    function handleAiWeb() {
        const pending = getPendingPrompt();
        if (!pending) return;

        let started = false;

        const findEditor = () => {
            const candidates = [
                '#prompt-textarea[contenteditable="true"]',
                'div.ProseMirror[contenteditable="true"]',
                'textarea#prompt-textarea',
                'div[contenteditable="true"][role="textbox"]'
            ];
            for (const sel of candidates) {
                const el = document.querySelector(sel);
                if (el && el.offsetParent !== null) return el;
            }
            return null;
        };

        const findSendButton = () => {
            const candidates = [
                'button[data-testid="send-button"]',
                'button[aria-label*="Envoyer" i]',
                'button[aria-label*="Send" i]'
            ];
            for (const sel of candidates) {
                const btn = document.querySelector(sel);
                if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true' && btn.offsetParent !== null) {
                    return btn;
                }
            }
            return null;
        };

        let attempts = 0;
        const timer = setInterval(() => {
            if (started) { clearInterval(timer); return; }
            attempts++;
            const editor = findEditor();
            if (editor && document.readyState === 'complete') {
                started = true;
                clearInterval(timer);
                setTimeout(() => fillAndSubmit(editor, pending.prompt, findEditor, findSendButton), 600);
                return;
            }
            if (attempts >= 60) clearInterval(timer);
        }, 300);
    }

    function insertTextIntoEditor(editor, text) {
        editor.focus();

        if (editor.tagName === 'TEXTAREA') {
            const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
            if (setter) setter.call(editor, text);
            else editor.value = text;
            editor.dispatchEvent(new Event('input', { bubbles: true }));
            editor.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editor);
        sel.removeAllRanges();
        sel.addRange(range);

        try {
            const dt = new DataTransfer();
            dt.setData('text/plain', text);
            editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
        } catch { /* ignore */ }

        if ((editor.textContent || '').trim().length >= Math.min(20, text.length)) return;

        try {
            document.execCommand('insertText', false, text);
        } catch { /* ignore */ }

        if ((editor.textContent || '').trim().length >= Math.min(20, text.length)) return;

        editor.innerHTML = '';
        text.split('\n').forEach((line) => {
            const p = document.createElement('p');
            p.textContent = line || '\u200B';
            editor.appendChild(p);
        });
        editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function fillAndSubmit(initialEditor, text, findEditor, findSendButton) {
        let editor = findEditor() || initialEditor;
        insertTextIntoEditor(editor, text);

        let sendAttempts = 0;
        const sendTimer = setInterval(() => {
            sendAttempts++;
            editor = findEditor() || editor;

            if (editor && (editor.textContent || '').trim().length < Math.min(20, text.length)) {
                insertTextIntoEditor(editor, text);
                return;
            }

            const btn = findSendButton();
            if (btn) {
                clearInterval(sendTimer);
                btn.click();
                try { GM_setValue(AI_CONFIG.pendingKey, null); } catch { /* ignore */ }
                return;
            }

            if (sendAttempts >= 30) clearInterval(sendTimer);
        }, 250);
    }

    /* =====================================================================
       2. CÔTÉ SCENARI : DÉTECTION CATÉGORIE "SUJET" & EXTRACTION
       ===================================================================== */
    if (/\/player\.xhtml$/i.test(path)) return;

    const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

    function findSujetCategory() {
        const headings = Array.from(document.querySelectorAll('h3.part_ti, .part_ti'));
        for (const h of headings) {
            if (/^sujet$/i.test(clean(h.textContent))) {
                const boxEl = h.closest('section.part, section') || h.parentElement;
                if (boxEl) {
                    return { label: clean(h.textContent), boxEl };
                }
            }
        }
        return null;
    }

    function extractTextFromRoot(rootEl) {
        if (!rootEl) return '';
        const clone = rootEl.cloneNode(true);
        clone.querySelectorAll('script, style, noscript, nav, .pageTurner, .btnNav, #scn-toc, #scn-side, #scn-bar, .scn-dup').forEach((el) => el.remove());
        clone.querySelectorAll('[style*="display: none"], [style*="display:none"], .collapsed_closed').forEach((el) => {
            el.style.display = 'block';
        });

        const blocks = [];
        const walk = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const t = clean(node.nodeValue);
                if (t) blocks.push(t);
                return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return;

            const tag = node.tagName;
            if (/^(H1|H2|H3|H4|H5|H6)$/.test(tag)) {
                const t = clean(node.textContent);
                if (t) blocks.push(`\n## ${t}\n`);
                return;
            }
            if (tag === 'LI') {
                const t = clean(node.textContent);
                if (t) blocks.push(`- ${t}`);
                return;
            }
            if (tag === 'TR') {
                const cells = Array.from(node.querySelectorAll('th, td')).map((c) => clean(c.textContent)).filter(Boolean);
                if (cells.length) blocks.push(`| ${cells.join(' | ')} |`);
                return;
            }
            if (/^(P|DIV|SECTION|ARTICLE|BLOCKQUOTE)$/.test(tag)) {
                const hasBlockChildren = node.querySelector('p, h1, h2, h3, h4, h5, h6, ul, ol, table, section, article, div');
                if (!hasBlockChildren) {
                    const t = clean(node.textContent);
                    if (t) blocks.push(t);
                    return;
                }
            }
            node.childNodes.forEach(walk);
            if (/^(P|SECTION|ARTICLE|UL|OL|TABLE)$/.test(tag)) blocks.push('');
        };

        walk(clone);

        let bodyText = blocks.join('\n').replace(/\n{3,}/g, '\n\n').trim();
        if (!bodyText) {
            bodyText = (rootEl.innerText || rootEl.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
        }

        const MAX_CHARS = 45000;
        if (bodyText.length > MAX_CHARS) {
            bodyText = bodyText.slice(0, MAX_CHARS) + '\n\n[... contenu tronqué ...]';
        }
        return bodyText;
    }

    async function extractSujetContent(sujetInfo) {
        const courseTitle = clean(document.querySelector('#title h1, .scn-brand-title, h1.case_ti')?.textContent) || clean(document.title);
        return {
            title: `${courseTitle} — ${sujetInfo.label}`,
            text: extractTextFromRoot(sujetInfo.boxEl)
        };
    }

    function buildPrositPrompt(pageData) {
        return `Tu es un étudiant ingénieur au CESI. Tu dois rédiger un "Prosit Aller" (trace écrite courte de brainstorming) à partir de l'énoncé ci-dessous.

RÈGLES STRICTES (À RESPECTER IMPÉRATIVEMENT) :
- NE RÉSOUS PAS le problème : complète uniquement les catégories ci-dessous.
- Utilise au maximum les mots présents dans l'énoncé.
- Sois ULTRA CONCIS : chaque catégorie doit rester courte, jamais de longs paragraphes ni de listes à rallonge.
- Réponds directement avec le Prosit Aller, sans phrase d'introduction ni commentaire.

STRUCTURE ET FORMAT OBLIGATOIRES :

Titre : [Nom de la matière / module] - Prosit [Numéro si identifiable]

Mots-clés (5 à 8 points max, 1 à 3 mots par point, tirés de l'énoncé, SANS définition) :
- ...

Contexte (MAXIMUM 1 seule phrase courte résumant l'énoncé) :
...

Problématique (1 seule question claire résumant le problème à résoudre) :
...

Contraintes (3 à 6 points max, 1 à 2 mots par point, pas de phrases) :
- ...

Livrables (2 à 5 points max, 1 à 3 mots par point, pas de phrases) :
- ...

Généralisation (3 à 6 points max, 1 à 2 mots par point décrivant les grands domaines) :
- ...

Pistes de solutions (4 à 6 points max, actions courtes à l'infinitif, 3 à 5 mots max par point) :
- ...

Plan d’actions (6 à 10 étapes max numérotées dans l'ordre, 3 à 6 mots max par étape ; DOIT commencer par "1. Définir les mots-clés", puis les étapes pour "Régler la problématique" jusqu'au livrable final) :
1. Définir les mots-clés
2. ...

---
CONTENU DU SUJET (${pageData.title}) :
${pageData.text}`;
    }

    /* =====================================================================
       3. BOUTON SUR LA PAGE SCENARI
       ===================================================================== */
    const BTN_ID = `scn-prosit-btn-${AI_CONFIG.id}`;
    const CSS = `
        .scn-prosit-btn-${AI_CONFIG.id} {
            display: inline-flex; align-items: center; gap: 6px;
            height: 36px; padding: 0 12px; border-radius: 10px;
            border: 1px solid ${AI_CONFIG.accentBorder};
            background: ${AI_CONFIG.accentBg}; color: ${AI_CONFIG.accentColor} !important;
            font: 700 12.5px/1 'Inter', system-ui, -apple-system, sans-serif !important;
            cursor: pointer; flex-shrink: 0; white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0, 0, 0, .12);
            transition: transform .15s ease, filter .15s ease, box-shadow .15s ease;
        }
        .scn-prosit-btn-${AI_CONFIG.id}:hover { filter: brightness(0.95); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 0, 0, .18); }
        .scn-prosit-btn-${AI_CONFIG.id}:active { transform: translateY(0); }
        .scn-prosit-btn-${AI_CONFIG.id} svg { width: 15px; height: 15px; fill: currentColor; flex-shrink: 0; }
        .scn-prosit-fab-wrap {
            position: fixed; right: 20px; bottom: 20px; z-index: 99990;
            display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
        }
        .scn-prosit-fab-wrap > button {
            height: 40px; padding: 0 15px; border-radius: 999px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, .24);
        }
    `;

    const SPARKLE_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.1 5.9L20 10l-5.9 2.1L12 18l-2.1-5.9L4 10l5.9-2.1L12 2zm7 13l1.1 2.9L23 19l-2.9 1.1L19 23l-1.1-2.9L15 19l2.9-1.1L19 15zM5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14z"/></svg>`;

    function injectStyles() {
        const styleId = `scn-prosit-style-${AI_CONFIG.id}`;
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = CSS;
        (document.head || document.documentElement).appendChild(style);
    }

    async function sendSujetToAi(btn) {
        const sujetInfo = findSujetCategory();
        if (!sujetInfo) {
            alert('Aucune catégorie "Sujet" détectée sur cette page.');
            return;
        }

        const label = btn.querySelector('span');
        if (label) label.textContent = 'Extraction...';
        btn.disabled = true;

        try {
            const pageData = await extractSujetContent(sujetInfo);
            if (!pageData.text) {
                alert('Impossible d’extraire le texte de la catégorie "Sujet".');
                return;
            }

            const prompt = buildPrositPrompt(pageData);
            try { GM_setClipboard(prompt, 'text'); } catch { /* ignore */ }
            GM_setValue(AI_CONFIG.pendingKey, { prompt, ts: Date.now() });
            GM_openInTab(AI_CONFIG.targetUrl, { active: true });

            if (label) {
                label.textContent = 'Envoyé !';
                setTimeout(() => { label.textContent = AI_CONFIG.buttonLabel; }, 2000);
            }
        } catch (err) {
            alert(`Erreur : ${err.message}`);
            if (label) label.textContent = AI_CONFIG.buttonLabel;
        } finally {
            btn.disabled = false;
        }
    }

    function getFabWrap() {
        let wrap = document.getElementById('scn-prosit-fab-wrap');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.id = 'scn-prosit-fab-wrap';
            wrap.className = 'scn-prosit-fab-wrap';
            document.body.appendChild(wrap);
        }
        return wrap;
    }

    function tryMountButton() {
        if (document.getElementById(BTN_ID)) return true;
        const sujetInfo = findSujetCategory();
        if (!sujetInfo) return false;

        injectStyles();

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = BTN_ID;
        btn.className = `scn-prosit-btn-${AI_CONFIG.id}`;
        btn.title = `Envoyer "${sujetInfo.label}" vers ${AI_CONFIG.buttonLabel}`;
        btn.innerHTML = `${SPARKLE_SVG}<span>${AI_CONFIG.buttonLabel}</span>`;
        btn.addEventListener('click', () => sendSujetToAi(btn));

        const placeInBar = () => {
            const bar = document.getElementById('scn-bar');
            if (!bar) return false;
            const themeBtn = document.getElementById('scn-theme');
            if (themeBtn && themeBtn.parentElement === bar) {
                bar.insertBefore(btn, themeBtn);
            } else {
                bar.appendChild(btn);
            }
            const wrap = document.getElementById('scn-prosit-fab-wrap');
            if (wrap && !wrap.children.length) wrap.remove();
            return true;
        };

        if (!placeInBar()) {
            getFabWrap().appendChild(btn);

            const barObs = new MutationObserver(() => {
                if (placeInBar()) barObs.disconnect();
            });
            barObs.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => barObs.disconnect(), 4000);
        }
        return true;
    }

    function initScenari() {
        if (tryMountButton()) return;
        const obs = new MutationObserver(() => {
            if (tryMountButton()) obs.disconnect();
        });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => obs.disconnect(), 4000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScenari, { once: true });
    } else {
        initScenari();
    }
})();
