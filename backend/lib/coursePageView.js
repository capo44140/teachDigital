/**
 * Affichage isolé des pages de cours HTML (générées par l'IA ou déposées par le parent).
 *
 * Ces pages embarquent leur propre JavaScript inline (quiz). Plutôt que de les injecter
 * en srcdoc (l'iframe hériterait alors de la CSP de l'application, qu'il faudrait
 * affaiblir avec 'unsafe-inline'), elles sont servies par une URL dédiée :
 *   GET /api/course-pages/render?t=<jeton>
 * La réponse porte sa propre CSP avec la directive « sandbox » (sans allow-same-origin) :
 * la page s'exécute dans une origine opaque, sans accès au jeton ni au localStorage
 * de l'application, même ouverte directement dans un onglet.
 *
 * L'iframe ne peut pas envoyer d'en-tête Authorization : l'accès passe par un jeton
 * signé, à courte durée de vie, limité à une page (ou à un aperçu) et inutilisable
 * comme jeton d'API (scope distinct, refusé par authenticateToken).
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('./auth.js');

const VIEW_TOKEN_SCOPE = 'course-page-view';
// Le temps que l'iframe charge la page (elle ne la recharge pas ensuite)
const VIEW_TOKEN_EXPIRES_IN_SECONDS = 5 * 60;

// Aperçus de pages non publiées (brouillons du parent), gardés en mémoire
const PREVIEW_TTL_MS = 10 * 60 * 1000;
const MAX_PREVIEWS = 20;
const MAX_PREVIEW_LENGTH = 5 * 1024 * 1024;

// Les pages générées chargent éventuellement Google Fonts ; tout le reste est inline.
// connect-src 'none' : la page ne peut rien envoyer (le score remonte par postMessage).
const COURSE_PAGE_CSP = [
    'sandbox allow-scripts allow-forms allow-modals',
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline' https://fonts.googleapis.com",
    'font-src data: https://fonts.gstatic.com',
    'img-src data: blob: https:',
    'media-src data: blob:',
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    "frame-ancestors 'self'"
].join('; ');

const PROGRESS_MESSAGE_TYPE = 'teachdigital:quiz-progress';

// Script ajouté à la page isolée : remonte le score du quiz à l'application.
// Deux sources : les compteurs #sOk / #sTot / #sStreak des pages générées,
// ou un appel explicite à window.TeachDigital.report(ok, total, streak).
// Le format du message est validé côté application (parseProgressMessage).
const PROGRESS_BRIDGE = `<script>(function(){
if(window.parent===window)return;
var last=null;
function num(id){var el=document.getElementById(id);if(!el)return null;var v=parseInt(el.textContent,10);return isNaN(v)?null:v}
function send(ok,total,streak){if(!(total>0)||!(ok>=0)||ok>total)return;var key=ok+'/'+total;if(key===last)return;last=key;
window.parent.postMessage({type:'${PROGRESS_MESSAGE_TYPE}',ok:ok,total:total,streak:streak>0?streak:0},'*')}
window.TeachDigital={report:function(ok,total,streak){send(+ok,+total,+streak)}};
function fromDom(){var ok=num('sOk'),total=num('sTot');if(ok!==null&&total!==null)send(ok,total,num('sStreak')||0)}
function watch(){var el=document.getElementById('sTot');if(!el)return false;
new MutationObserver(fromDom).observe(el,{childList:true,characterData:true,subtree:true});return true}
if(!watch())document.addEventListener('DOMContentLoaded',watch);
})();</script>`;

// Ajoute le pont de progression (avant </body> si présent)
function withProgressBridge(html) {
    const match = /<\/body\s*>/i.exec(html);
    if (!match) return html + PROGRESS_BRIDGE;
    return html.slice(0, match.index) + PROGRESS_BRIDGE + html.slice(match.index);
}

const previews = new Map();

function purgeExpiredPreviews(now = Date.now()) {
    for (const [id, preview] of previews) {
        if (preview.expiresAt <= now) previews.delete(id);
    }
}

// Enregistre un aperçu et renvoie son identifiant. Les plus anciens sont évincés au-delà de MAX_PREVIEWS.
function createPreview(html, now = Date.now()) {
    if (typeof html !== 'string' || !html.trim()) {
        throw new Error('Contenu HTML manquant');
    }
    if (html.length > MAX_PREVIEW_LENGTH) {
        throw new Error('Contenu HTML trop volumineux');
    }
    purgeExpiredPreviews(now);
    while (previews.size >= MAX_PREVIEWS) {
        previews.delete(previews.keys().next().value);
    }
    const id = crypto.randomBytes(16).toString('hex');
    previews.set(id, { html, expiresAt: now + PREVIEW_TTL_MS });
    return id;
}

function getPreview(id, now = Date.now()) {
    const preview = previews.get(id);
    if (!preview) return null;
    if (preview.expiresAt <= now) {
        previews.delete(id);
        return null;
    }
    return preview.html;
}

function clearPreviews() {
    previews.clear();
}

/**
 * Jeton d'affichage : { pageId } pour une page enregistrée, { previewId } pour un aperçu.
 * requirePublished (enfant, jeton famille) : la page doit encore être publiée au rendu,
 * pour qu'une page dépubliée entre-temps ne soit plus servie.
 */
function signViewToken(target) {
    const payload = { scope: VIEW_TOKEN_SCOPE };
    if (target.pageId) {
        payload.pageId = target.pageId;
        if (target.requirePublished) payload.requirePublished = true;
    } else if (target.previewId) {
        payload.previewId = target.previewId;
    } else {
        throw new Error('Cible d\'affichage manquante');
    }
    return jwt.sign(payload, getJwtSecret(), { expiresIn: VIEW_TOKEN_EXPIRES_IN_SECONDS, algorithm: 'HS256' });
}

// Renvoie { pageId, requirePublished } ou { previewId }, ou null si le jeton est invalide ou expiré
function verifyViewToken(token) {
    if (typeof token !== 'string' || !token) return null;
    let decoded;
    try {
        decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    } catch (_) {
        return null;
    }
    if (decoded.scope !== VIEW_TOKEN_SCOPE) return null;
    if (Number.isInteger(decoded.pageId) && decoded.pageId > 0) {
        return { pageId: decoded.pageId, requirePublished: decoded.requirePublished === true };
    }
    if (typeof decoded.previewId === 'string' && /^[0-9a-f]{32}$/.test(decoded.previewId)) {
        return { previewId: decoded.previewId };
    }
    return null;
}

function viewUrl(token) {
    return `/api/course-pages/render?t=${encodeURIComponent(token)}`;
}

function sendCoursePageHtml(res, html) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Security-Policy', COURSE_PAGE_CSP);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.status(200).send(withProgressBridge(html));
}

function sendRenderError(res, status, message) {
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'self'");
    res.setHeader('Cache-Control', 'no-store');
    res.status(status).type('text/plain; charset=utf-8').send(message);
}

module.exports = {
    COURSE_PAGE_CSP,
    PROGRESS_MESSAGE_TYPE,
    VIEW_TOKEN_EXPIRES_IN_SECONDS,
    MAX_PREVIEW_LENGTH,
    withProgressBridge,
    createPreview,
    getPreview,
    clearPreviews,
    signViewToken,
    verifyViewToken,
    viewUrl,
    sendCoursePageHtml,
    sendRenderError
};
