const { generateQuizFromMultipleAnalyses } = require('../../api/ai/services/quizGenerator.js');

jest.mock('../../api/ai/services/aiProviders/index.js', () => ({
  generateQuizWithAI: jest.fn(async (analysis) => ({
    title: 'Quiz test',
    description: 'desc',
    questions: [
      { question: 'Q1', options: ['A', 'B', 'C', 'D'], correctAnswer: 0, explanation: 'E1' }
    ],
    _analysisReceived: analysis
  }))
}));

const { generateQuizWithAI } = require('../../api/ai/services/aiProviders/index.js');

describe('quizGenerator - utilisation du texte OCR', () => {
  it('injecte extractedText (OCR) dans l’analyse combinée (keyPoints)', async () => {
    const analyses = [
      {
        type: 'image',
        fileName: 'doc1.png',
        extractedText: 'Ceci est le contenu OCR du document. Détail important: 7x8=56.',
        analysis: { concepts: ['multiplication'], keyPoints: ['révision des tables'] }
      }
    ];

    const childProfile = { age: 9, level: 'CM1' };
    await generateQuizFromMultipleAnalyses(analyses, childProfile, 1);

    expect(generateQuizWithAI).toHaveBeenCalledTimes(1);
    const combinedAnalysis = generateQuizWithAI.mock.calls[0][0];
    expect(combinedAnalysis.keyPoints.join(' ')).toContain('Texte OCR (doc1.png)');
    expect(combinedAnalysis.keyPoints.join(' ')).toContain('7x8=56');
  });
});


