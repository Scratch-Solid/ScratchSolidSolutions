"use client";

import React, { useState } from 'react';
import { Check, PartyPopper, RotateCcw } from 'lucide-react';

interface Question {
  question: string;
  options: string[];
}

interface QuizResult {
  passed: boolean;
  score: number;
  message?: string;
}

interface QuizInterfaceProps {
  moduleTitle: string;
  questions: Question[];
  onSubmit: (answers: number[]) => Promise<QuizResult>;
  onCancel: () => void;
}

export default function QuizInterface({ moduleTitle, questions, onSubmit, onCancel }: QuizInterfaceProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
  };

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      return;
    }
    setSubmitting(true);
    const answers = questions.map((_, index) => selectedAnswers[index]);
    const outcome = await onSubmit(answers);
    setResult(outcome);
    setSubmitting(false);
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) setCurrentQuestion(prev => prev - 1);
  };

  const handleRetake = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setResult(null);
  };

  if (result) {
    return (
      <div className="w-full max-w-xl mx-auto bg-card border border-border rounded-xl shadow-sm p-7 text-center">
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${result.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
          {result.passed ? <PartyPopper className="h-7 w-7" /> : <RotateCcw className="h-7 w-7" />}
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {result.passed ? 'Nice work!' : 'Not quite there yet'}
        </h3>
        <p className="text-sm text-muted-foreground mb-5">
          {result.passed
            ? `You scored ${result.score}% on "${moduleTitle}".`
            : result.message || `You scored ${result.score}%. All questions need to be correct to pass.`}
        </p>
        <div className="space-y-2.5">
          {!result.passed && (
            <button onClick={handleRetake} className="w-full primary-button">
              Retake quiz
            </button>
          )}
          <button onClick={onCancel} className="w-full text-sm text-muted-foreground hover:text-foreground py-2">
            {result.passed ? 'Back to modules' : 'Cancel'}
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const hasAnswer = selectedAnswers[currentQuestion] !== undefined;

  return (
    <div className="w-full max-w-xl mx-auto bg-card border border-border rounded-xl shadow-sm p-7">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2 text-xs font-medium text-muted-foreground">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <span>{moduleTitle}</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-1.5">
          <div
            className="bg-foreground h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-5">{question.question}</h3>

      <div className="space-y-2.5 mb-6">
        {question.options.map((option, index) => {
          const selected = selectedAnswers[currentQuestion] === index;
          return (
            <button
              key={index}
              onClick={() => handleAnswerSelect(currentQuestion, index)}
              className={`w-full text-left p-3.5 rounded-lg border transition-colors ${
                selected ? 'border-foreground bg-secondary/60' : 'border-border hover:bg-secondary/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-5 w-5 shrink-0 rounded-full border flex items-center justify-center ${
                  selected ? 'border-foreground bg-foreground' : 'border-muted-foreground/40'
                }`}>
                  {selected && <Check className="h-3.5 w-3.5 text-background" />}
                </div>
                <span className="text-sm text-foreground">{option}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
          className="flex-1 text-sm font-medium text-muted-foreground border border-border rounded-lg py-2.5 hover:bg-secondary/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          disabled={!hasAnswer || submitting}
          className="flex-1 primary-button disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Checking...' : currentQuestion === questions.length - 1 ? 'Submit' : 'Next'}
        </button>
      </div>

      <button onClick={onCancel} className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground py-1.5">
        Cancel quiz
      </button>
    </div>
  );
}
