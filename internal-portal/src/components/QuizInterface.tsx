import React, { useState } from 'react';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct answer
}

interface QuizInterfaceProps {
  moduleId: number;
  questions: Question[];
  onComplete: (score: number, total: number) => void;
  onCancel: () => void;
}

export default function QuizInterface({ moduleId, questions, onComplete, onCancel }: QuizInterfaceProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const handleAnswerSelect = (questionId: number, answerIndex: number) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      calculateResults();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const calculateResults = () => {
    let correctCount = 0;
    questions.forEach(q => {
      if (selectedAnswers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setShowResults(true);
    onComplete(correctCount, questions.length);
  };

  const handleRetake = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setShowResults(false);
    setScore(0);
  };

  if (showResults) {
    const percentage = (score / questions.length) * 100;
    const passed = percentage === 100;

    return (
      <div className="w-full max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden border border-stone-100">
        <div className="p-6">
          <h3 className="text-2xl font-bold text-center mb-6" style={{ color: 'var(--text-h)' }}>
            {passed ? '🎉 Congratulations!' : 'Keep Practicing'}
          </h3>
          
          <div className="text-center mb-6">
            <div className={`text-6xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-amber-600'}`}>
              {percentage}%
            </div>
            <p className="text-stone-600">
              {score} out of {questions.length} questions correct
            </p>
          </div>

          {passed ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 text-center">
                Excellent! You have demonstrated mastery of this module.
                Your next module will unlock in 24 hours.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-800 text-center">
                You need 100% correct answers to pass. Review the module content and try again!
              </p>
            </div>
          )}

          <div className="space-y-3">
            {!passed && (
              <button
                onClick={handleRetake}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 px-4 rounded-lg transition duration-150"
              >
                Retake Quiz
              </button>
            )}
            <button
              onClick={onCancel}
              className="w-full bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-medium py-3 px-4 rounded-lg transition duration-150"
            >
              {passed ? 'Continue' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const hasAnswer = selectedAnswers[currentQ.id] !== undefined;

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden border border-stone-100">
      <div className="p-6">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-stone-600">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span className="text-sm font-medium text-stone-600">
              Module {moduleId}
            </span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-2">
            <div
              className="bg-stone-900 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <h3 className="text-xl font-bold mb-6" style={{ color: 'var(--text-h)' }}>
          {currentQ.question}
        </h3>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {currentQ.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(currentQ.id, index)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedAnswers[currentQ.id] === index
                  ? 'border-stone-900 bg-stone-50'
                  : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedAnswers[currentQ.id] === index
                    ? 'border-stone-900 bg-stone-900'
                    : 'border-stone-300'
                }`}>
                  {selectedAnswers[currentQ.id] === index && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </div>
                <span className="font-medium" style={{ color: 'var(--text)' }}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span style={{ color: 'var(--text)' }}>{option}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="flex-1 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-medium py-3 px-4 rounded-lg transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={!hasAnswer}
            className="flex-1 bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 px-4 rounded-lg transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentQuestion === questions.length - 1 ? 'Submit' : 'Next'}
          </button>
        </div>

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="w-full mt-3 text-stone-500 hover:text-stone-700 text-sm py-2 transition duration-150"
        >
          Cancel Quiz
        </button>
      </div>
    </div>
  );
}
