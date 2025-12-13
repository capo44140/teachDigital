/**
 * Validation & normalisation du format de quiz pour l'intégration TeachDigital
 *
 * Format attendu (frontend QuizGenerator):
 * {
 *   title: string,
 *   description?: string,
 *   questions: Array<{
 *     question: string,
 *     options: string[4],
 *     correctAnswer: number, // index 0..3
 *     explanation?: string
 *   }>
 * }
 */

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toCleanString(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\r/g, '').trim();
}

function normalizeCorrectAnswer(raw, options, warnings, path) {
  // number index 0..3
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw >= 0 && raw <= 3) return raw;
    // 1..4 => 0..3
    if (raw >= 1 && raw <= 4) {
      warnings.push({ path, message: 'correctAnswer converti de 1..4 vers 0..3' });
      return raw - 1;
    }
  }

  // string -> index
  if (typeof raw === 'string') {
    const s = toCleanString(raw);
    if (s === '') return null;

    // "A"/"B"/"C"/"D"
    const upper = s.toUpperCase();
    if (upper === 'A' || upper === 'B' || upper === 'C' || upper === 'D') {
      warnings.push({ path, message: 'correctAnswer converti de lettre A-D vers index 0..3' });
      return { A: 0, B: 1, C: 2, D: 3 }[upper];
    }

    // "0".."3" / "1".."4"
    const maybeNum = Number(s);
    if (Number.isFinite(maybeNum)) {
      if (maybeNum >= 0 && maybeNum <= 3) return maybeNum;
      if (maybeNum >= 1 && maybeNum <= 4) {
        warnings.push({ path, message: 'correctAnswer converti de 1..4 vers 0..3' });
        return maybeNum - 1;
      }
    }

    // match texte d'option
    const idx = options.findIndex(o => toCleanString(o).toLowerCase() === s.toLowerCase());
    if (idx >= 0) {
      warnings.push({ path, message: 'correctAnswer converti depuis le texte de l’option' });
      return idx;
    }
  }

  return null;
}

function validateAndNormalizeQuiz(rawQuiz, opts = {}) {
  const expectedQuestionCount = Number.isFinite(opts.expectedQuestionCount) ? opts.expectedQuestionCount : null;

  const errors = [];
  const warnings = [];

  if (!isPlainObject(rawQuiz)) {
    return {
      ok: false,
      errors: [{ path: '$', message: 'Quiz doit être un objet JSON' }],
      warnings
    };
  }

  const title = toCleanString(rawQuiz.title || rawQuiz.titre || rawQuiz.name);
  const description = toCleanString(rawQuiz.description || rawQuiz.desc || rawQuiz.resume);
  const rawQuestions = rawQuiz.questions || rawQuiz.items || rawQuiz.quiz || [];

  if (!Array.isArray(rawQuestions)) {
    errors.push({ path: '$.questions', message: 'questions doit être un tableau' });
  }

  const questions = Array.isArray(rawQuestions) ? rawQuestions : [];

  const normalizedQuestions = [];
  questions.forEach((q, i) => {
    const qPath = `$.questions[${i}]`;
    if (!isPlainObject(q)) {
      errors.push({ path: qPath, message: 'Question doit être un objet' });
      return;
    }

    const questionText = toCleanString(q.question || q.prompt || q.text || q.enonce);
    if (!questionText) {
      errors.push({ path: `${qPath}.question`, message: 'question est requis' });
      return;
    }

    const rawOptions = q.options || q.choices || q.answers || q.reponses;
    if (!Array.isArray(rawOptions)) {
      errors.push({ path: `${qPath}.options`, message: 'options doit être un tableau de 4 éléments' });
      return;
    }

    const options = rawOptions.map(o => toCleanString(o)).filter(Boolean);
    if (options.length !== 4) {
      errors.push({ path: `${qPath}.options`, message: `options doit contenir exactement 4 éléments (actuel: ${options.length})` });
      return;
    }

    const correct = normalizeCorrectAnswer(q.correctAnswer ?? q.correct_answer ?? q.answer ?? q.correct, options, warnings, `${qPath}.correctAnswer`);
    if (correct === null || correct < 0 || correct > 3) {
      errors.push({ path: `${qPath}.correctAnswer`, message: 'correctAnswer doit être un index 0..3 (ou convertible)' });
      return;
    }

    const explanation = toCleanString(q.explanation || q.explication || q.explain);

    normalizedQuestions.push({
      question: questionText,
      options,
      correctAnswer: correct,
      explanation
    });
  });

  if (!title) {
    warnings.push({ path: '$.title', message: 'title manquant -> fallback "Quiz"' });
  }

  if (normalizedQuestions.length === 0) {
    errors.push({ path: '$.questions', message: 'Aucune question valide' });
  }

  if (expectedQuestionCount && normalizedQuestions.length !== expectedQuestionCount) {
    warnings.push({
      path: '$.questions',
      message: `Nombre de questions différent de la demande (attendu: ${expectedQuestionCount}, reçu: ${normalizedQuestions.length})`
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  return {
    ok: true,
    quiz: {
      title: title || 'Quiz',
      description,
      questions: normalizedQuestions
    },
    warnings
  };
}

module.exports = {
  validateAndNormalizeQuiz
};


