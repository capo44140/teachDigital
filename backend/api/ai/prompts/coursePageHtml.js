/**
 * Modèle de prompt : page HTML d'entraînement générée à partir des photos d'une leçon / d'un contrôle
 * La page produite est publiée telle quelle dans « Pages de cours » (table course_pages)
 */

// Sépare la page HTML du résumé destiné au parent dans la réponse du modèle
const SUMMARY_MARKER = '===RESUME_PARENT===';
// Le prénom de l'enfant n'est pas envoyé au service IA : le modèle écrit ce marqueur à la place,
// remplacé par fillChildName() une fois la page reçue
const CHILD_NAME_PLACEHOLDER = '{{PRENOM}}';

const clean = value => String(value || '').replace(/\s+/g, ' ').trim();

/**
 * Construit le prompt de génération
 * @param {Object} options
 * @param {Object} options.childProfile - Profil de l'enfant (level ; le prénom n'est pas envoyé)
 * @param {string} [options.subject] - Matière (maths, français, SVT…)
 * @param {string} [options.topic] - Sujet de l'interro (ex. « le théorème de Pythagore »)
 * @param {string} [options.instructions] - Consignes libres du parent
 * @param {number} options.photoCount - Nombre de photos jointes
 * @returns {string}
 */
function buildCoursePagePrompt({ childProfile = {}, subject, topic, instructions, photoCount }) {
    const level = clean(childProfile.level) || 'non précisée';
    const subjectText = clean(subject) || 'à déduire des photos';
    const topicText = clean(topic) ? `« ${clean(topic)} »` : 'à déduire des photos';
    const extra = clean(instructions);

    return `Je joins ${photoCount} photo${photoCount > 1 ? 's' : ''} de la leçon / du contrôle de mon enfant, en classe : ${level}, matière : ${subjectText}. Sujet de l'interro : ${topicText}.

Crée une page HTML d'entraînement, livrée sous forme d'un fichier HTML unique et autonome, en suivant ce modèle :

1. EN-TÊTE style cahier (lignes Seyès, marge rouge), titre court, une phrase d'intro qui s'adresse à l'enfant (tutoiement). Pour son prénom, écris exactement ${CHILD_NAME_PLACEHOLDER} (il sera remplacé) ; n'écris jamais un prénom lu sur les photos.

2. « À CORRIGER » (seulement si les photos montrent des erreurs ou un contrôle corrigé) : reprends ses vraies erreurs, une carte par erreur, avec ce qu'il/elle a écrit (barré en rouge) → la bonne réponse (en vert) et une explication en une phrase. Signale aussi les erreurs de la leçon recopiée.

3. LA LEÇON : reprends fidèlement le cours des photos (mêmes définitions, mêmes exemples, mêmes couleurs si possible). Ajoute un bouton « Me tester : cacher les mots clés » où l'enfant touche une case pour révéler le mot.

4. UN ÉLÉMENT INTERACTIF propre au sujet (curseur, schéma animé, simulation, droite graduée, écoute audio pour les langues avec speechSynthesis…), dessiné en SVG ou canvas. Ne copie pas les illustrations protégées des fiches : dessine les tiennes.

5. « LES PIÈGES » : un encadré rouge avec les 3 à 5 erreurs classiques sur ce sujet.

6. L'ENTRAÎNEMENT :
- 4 à 6 modes d'exercices différents + un mode « Tout mélangé » ;
- questions générées au hasard quand c'est possible (calculs), sinon une banque d'au moins 40 questions sans répétition ;
- réponses à choix (touches 1 à 4) ou tapées au clavier pour le calcul ;
- après chaque réponse : juste / faux, la bonne réponse, l'explication pas à pas, et un message ciblé si l'erreur est une erreur classique ;
- score, série de bonnes réponses, bouton « Question suivante » (touche Entrée).

CONTRAINTES : tout en français (sauf la langue étudiée), niveau adapté à l'âge, contenu fidèle au cours de la photo (en cas de doute sur une règle officielle, applique la règle officielle et signale-le dans le résumé), fonctionne sur téléphone et tablette, mode clair et sombre, pas de dépendance externe sauf Google Fonts. Vérifie les réponses de ta banque de questions avant de répondre.
${extra ? `\nCONSIGNES SUPPLÉMENTAIRES DU PARENT : ${extra}\n` : ''}
CONTRAINTES TECHNIQUES (la page est affichée dans l'application TeachDigital, dans une iframe isolée) :
- Document complet de <!DOCTYPE html> à </html>, CSS et JavaScript intégrés dans la page.
- Une balise <title> courte (le titre de la fiche) et une balise <meta name="description"> d'une phrase.
- Le score DOIT être affiché dans trois éléments portant exactement ces identifiants, mis à jour après chaque réponse : id="sOk" (bonnes réponses), id="sTot" (questions répondues), id="sStreak" (série en cours). Ils contiennent uniquement un nombre entier.
- N'utilise ni localStorage, ni sessionStorage, ni cookies, ni fetch : ils sont bloqués dans l'iframe.
- Le mode sombre suit prefers-color-scheme.

FORMAT DE RÉPONSE (obligatoire) :
- Commence directement par <!DOCTYPE html>, sans bloc de code markdown ni texte avant.
- Après </html>, écris une ligne contenant exactement ${SUMMARY_MARKER} puis, en quelques lignes en français destinées au parent : ce que contient la page, quelles erreurs tu as repérées, et ce qu'il doit vérifier (un prénom ou une date mal lus, par exemple).`;
}

/**
 * Remplace le marqueur du prénom dans la page ou le résumé reçus du modèle.
 * Le prénom est réduit à des lettres, espaces, tirets et apostrophes typographiques :
 * il peut ainsi apparaître sans risque dans du HTML, un attribut ou une chaîne JavaScript.
 * @param {string} text
 * @param {string} [childName]
 * @returns {string}
 */
function fillChildName(text, childName) {
    const safeName = String(childName || '')
        .normalize('NFC')
        .replace(/'/g, '’')
        .replace(/[^\p{L}\p{M}\s’-]/gu, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 50);
    return String(text || '').split(CHILD_NAME_PLACEHOLDER).join(safeName);
}

/**
 * Sépare la page HTML et le résumé dans la réponse brute du modèle
 * @param {string} rawText
 * @returns {{ html: string, summary: string, complete: boolean }}
 */
function parseCoursePageResponse(rawText) {
    let text = String(rawText || '');
    let summary = '';

    const markerIndex = text.indexOf(SUMMARY_MARKER);
    if (markerIndex !== -1) {
        summary = text.slice(markerIndex + SUMMARY_MARKER.length).trim();
        text = text.slice(0, markerIndex);
    }

    // Retirer un éventuel bloc de code markdown et tout texte autour du document
    const start = text.search(/<!DOCTYPE html|<html[\s>]/i);
    if (start > 0) text = text.slice(start);
    const endMatch = /<\/html\s*>/i.exec(text);
    const complete = Boolean(endMatch);
    if (endMatch) {
        const trailing = text.slice(endMatch.index + endMatch[0].length).replace(/```/g, '').trim();
        if (!summary && trailing) summary = trailing;
        text = text.slice(0, endMatch.index + endMatch[0].length);
    }
    const html = text.replace(/^\s*```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

    return { html, summary: summary.replace(/```/g, '').trim(), complete };
}

module.exports = {
    SUMMARY_MARKER,
    CHILD_NAME_PLACEHOLDER,
    buildCoursePagePrompt,
    parseCoursePageResponse,
    fillChildName
};
