import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useExercises, Exercise } from '@/hooks/useExercises';
import { useGenerateExercise } from '@/hooks/useGenerateExercise';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { Loader2, Brain, CheckCircle, XCircle, Eye, EyeOff, Plus, RotateCcw, Printer } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMathExpression } from '@/lib/fractionUtils';

interface ExerciseListProps {
  lessonId?: string;
  onExerciseSelect?: (exercise: Exercise) => void;
}

export const ExerciseList = ({ lessonId, onExerciseSelect }: ExerciseListProps) => {
  const { exercises, loading, error, refetch } = useExercises(lessonId);
  const { generateExercise, isGenerating } = useGenerateExercise();
  const { completeExercise } = useActivityTracking();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({});
  const [showAnswers, setShowAnswers] = useState<{ [key: string]: boolean }>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<{ [key: string]: boolean }>({});
  const [answerFeedback, setAnswerFeedback] = useState<{ [key: string]: { isCorrect: boolean; feedback: string; explanationSteps?: string[] } }>({});
  const [fractionInput, setFractionInput] = useState<{ [key: string]: { numerator: string; denominator: string; isEditing: boolean } }>({});

  const handleExerciseClick = (exercise: Exercise) => {
    setSelectedExercise(selectedExercise === exercise.id ? null : exercise.id);
    onExerciseSelect?.(exercise);
    
    // Initialize fraction input state for this exercise
    if (!fractionInput[exercise.id]) {
      setFractionInput(prev => ({
        ...prev,
        [exercise.id]: { numerator: '', denominator: '', isEditing: false }
      }));
    }
  };

  const handleAnswerChange = (exerciseId: string, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [exerciseId]: answer
    }));
  };

  const handleFractionInput = (exerciseId: string, field: 'numerator' | 'denominator', value: string) => {
    setFractionInput(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        [field]: value
      }
    }));
  };

  const handleInsertFraction = (exerciseId: string) => {
    const fraction = fractionInput[exerciseId];
    if (!fraction.numerator || !fraction.denominator) return;

    const fractionText = `\\frac{${fraction.numerator}}{${fraction.denominator}}`;
    
    // Add the fraction to the current answer
    const currentAnswer = userAnswers[exerciseId] || '';
    const newAnswer = currentAnswer + fractionText;
    
    handleAnswerChange(exerciseId, newAnswer);
    
    // Reset fraction input
    setFractionInput(prev => ({
      ...prev,
      [exerciseId]: { numerator: '', denominator: '', isEditing: false }
    }));
  };

  const toggleFractionEditor = (exerciseId: string) => {
    setFractionInput(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        isEditing: !prev[exerciseId]?.isEditing
      }
    }));
  };

  const insertCommonFraction = (exerciseId: string, fraction: string) => {
    const currentAnswer = userAnswers[exerciseId] || '';
    const newAnswer = currentAnswer + fraction;
    handleAnswerChange(exerciseId, newAnswer);
  };

  const handleSubmitAnswer = async (exerciseId: string) => {
    const userAnswer = userAnswers[exerciseId]?.trim();
    if (!userAnswer) return;

    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    // Enhanced answer checking with detailed explanations
    const normalizeAnswer = (answer: string) => 
      answer.trim().toLowerCase().replace(/\s+/g, '');
    
    const correctAnswer = normalizeAnswer(exercise.answer);
    const submittedAnswer = normalizeAnswer(userAnswer);
    
    // Generate step-by-step explanation
    const generateExplanation = (original: string, normalized: string, isUserAnswer: boolean) => {
      const steps = [];
      const label = isUserAnswer ? "Your answer" : "Correct answer";
      
      steps.push(`📝 ${label}: "${original}"`);
      
      if (original !== original.trim()) {
        steps.push(`🧹 Remove extra spaces: "${original.trim()}"`);
      }
      
      if (original.trim() !== original.trim().toLowerCase()) {
        steps.push(`🔤 Convert to lowercase: "${original.trim().toLowerCase()}"`);
      }
      
      if (original.trim().toLowerCase() !== normalized) {
        steps.push(`📐 Remove all spaces: "${normalized}"`);
      }
      
      // Mathematical normalization explanations
      if (normalized.includes('x') && !normalized.match(/\d+x/)) {
        steps.push(`🔢 Note: "x" is treated as "1x" (coefficient of 1 is implied)`);
      }
      
      if (normalized.includes('y') && !normalized.match(/\d+y/)) {
        steps.push(`🔢 Note: "y" is treated as "1y" (coefficient of 1 is implied)`);
      }
      
      return steps;
    };
    
    const isCorrect = correctAnswer === submittedAnswer || 
                     correctAnswer.includes(submittedAnswer) ||
                     submittedAnswer.includes(correctAnswer);

    // Generate detailed feedback with explanations
    let feedback = "";
    let explanationSteps = [];
    
    if (isCorrect) {
      feedback = "🎉 Excellent work! You got it right!";
    } else {
      feedback = "Let me show you how I process answers:";
      explanationSteps = [
        ...generateExplanation(userAnswer, submittedAnswer, true),
        "",
        ...generateExplanation(exercise.answer, correctAnswer, false),
        "",
        "🔍 Comparison result:",
        `   Your processed answer: "${submittedAnswer}"`,
        `   Correct processed answer: "${correctAnswer}"`,
        `   Match: ${correctAnswer === submittedAnswer ? "✅ Yes" : "❌ No"}`,
        "",
        "💡 Tip: Answers are checked ignoring spaces and letter case!"
      ];
    }

    setSubmittedAnswers(prev => ({
      ...prev,
      [exerciseId]: true
    }));

    setAnswerFeedback(prev => ({
      ...prev,
      [exerciseId]: {
        isCorrect,
        feedback,
        explanationSteps
      }
    }));

    // Track the exercise completion
    const score = isCorrect ? 100 : 0;
    await completeExercise(
      `${exercise.question.substring(0, 30)}...`,
      score,
      'Mathematics'
    );

    // Auto-show answer after submission
    setShowAnswers(prev => ({
      ...prev,
      [exerciseId]: true
    }));
  };

  const toggleShowAnswer = (exerciseId: string) => {
    setShowAnswers(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  const handleGenerateExercise = async () => {
    const newExercises = await generateExercise({
      lessonId,
      topic: 'mathematics',
      difficulty: 'medium',
      count: 2,
    });
    
    if (newExercises) {
      refetch();
    }
  };

  const handleResetExercises = () => {
    setSelectedExercise(null);
    setUserAnswers({});
    setShowAnswers({});
    setSubmittedAnswers({});
    setAnswerFeedback({});
    setFractionInput({});
  };

  const handlePrintExercises = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Math Exercises - Print</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .exercise { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            .question { font-weight: bold; margin-bottom: 10px; }
            .answer-space { border-bottom: 1px solid #999; min-height: 60px; margin: 15px 0; }
            .difficulty { background: #f0f0f0; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Math Exercises</h1>
            <p>Total Problems: ${exercises.length}</p>
            <p>Date: ${new Date().toLocaleDateString()}</p>
          </div>
          ${exercises.map((exercise, index) => `
            <div class="exercise">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3>Problem ${index + 1}</h3>
                ${exercise.difficulty ? `<span class="difficulty">${exercise.difficulty}</span>` : ''}
              </div>
              <div class="question">${formatMathExpression(exercise.question)}</div>
              <div class="answer-space">
                <strong>Answer:</strong>
              </div>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <XCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
            <p>Failed to load exercises: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (exercises.length === 0) {
    return (
      <Card>
      <CardContent className="pt-6">
        <div className="text-center text-muted-foreground">
          <Brain className="w-8 h-8 mx-auto mb-2" />
          <p>No exercises available yet.</p>
          <p className="text-sm">Ask the AI tutor to create some practice problems!</p>
        </div>
      </CardContent>
    </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Math Exercises</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{exercises.length} problems</Badge>
          <Button
            onClick={handlePrintExercises}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <Button
            onClick={handleResetExercises}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button
            onClick={handleGenerateExercise}
            disabled={isGenerating}
            size="sm"
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {isGenerating ? 'Generating...' : 'Add More'}
          </Button>
        </div>
      </div>

      {exercises.map((exercise, index) => (
        <Card 
          key={exercise.id} 
          className={`cursor-pointer transition-all ${
            selectedExercise === exercise.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
          }`}
          onClick={() => handleExerciseClick(exercise)}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Problem {index + 1}</CardTitle>
              <div className="flex items-center gap-2">
                {exercise.difficulty && (
                  <Badge className={getDifficultyColor(exercise.difficulty)}>
                    {exercise.difficulty}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <p className="text-foreground whitespace-pre-wrap">{formatMathExpression(exercise.question)}</p>
            </div>

            {selectedExercise === exercise.id && (
              <div className="space-y-4 border-t pt-4" onClick={(e) => e.stopPropagation()}>
                <div>
                  <label className="text-sm font-medium mb-2 block">Your Answer:</label>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {/* Common fractions */}
                      {['½', '⅓', '⅔', '¼', '¾', '⅛', '⅜', '⅝', '⅞'].map((fraction) => (
                        <Button
                          key={fraction}
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            insertCommonFraction(exercise.id, fraction);
                          }}
                          className="h-8 w-8 p-0 text-sm font-mono"
                        >
                          {fraction}
                        </Button>
                      ))}
                      
                      {/* Fraction editor toggle */}
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFractionEditor(exercise.id);
                        }}
                        className="h-8 px-2 text-sm"
                      >
                        {fractionInput[exercise.id]?.isEditing ? 'Close' : 'Create Fraction'}
                      </Button>
                      
                      {/* Other math symbols */}
                      {['∞', '√', '%', 'π', '∑', '∫', '(', ')', '[', ']', '≠', '≤', '≥', '±', '×', '÷'].map((symbol) => (
                        <Button
                          key={symbol}
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const currentAnswer = userAnswers[exercise.id] || '';
                            handleAnswerChange(exercise.id, currentAnswer + symbol);
                          }}
                          className="h-8 w-8 p-0 text-sm font-mono"
                        >
                          {symbol}
                        </Button>
                      ))}
                    </div>
                    
                    {/* Fraction editor */}
                    {fractionInput[exercise.id]?.isEditing && (
                      <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-md">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Num"
                            value={fractionInput[exercise.id]?.numerator || ''}
                            onChange={(e) => handleFractionInput(exercise.id, 'numerator', e.target.value)}
                            className="w-12 h-8 text-center border rounded"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span>/</span>
                          <input
                            type="text"
                            placeholder="Den"
                            value={fractionInput[exercise.id]?.denominator || ''}
                            onChange={(e) => handleFractionInput(exercise.id, 'denominator', e.target.value)}
                            className="w-12 h-8 text-center border rounded"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInsertFraction(exercise.id);
                          }}
                          disabled={!fractionInput[exercise.id]?.numerator || !fractionInput[exercise.id]?.denominator}
                        >
                          Insert Fraction
                        </Button>
                      </div>
                    )}
                    
                    <Textarea
                      placeholder="Write your solution here..."
                      value={userAnswers[exercise.id] || ''}
                      onChange={(e) => handleAnswerChange(exercise.id, e.target.value)}
                      className="min-h-20 font-mono"
                      data-exercise-id={exercise.id}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!submittedAnswers[exercise.id] ? (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubmitAnswer(exercise.id);
                      }}
                      disabled={!userAnswers[exercise.id]?.trim()}
                      size="sm"
                      className="gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Submit Answer
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleShowAnswer(exercise.id);
                      }}
                      className="gap-2"
                    >
                      {showAnswers[exercise.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showAnswers[exercise.id] ? 'Hide Answer' : 'Show Answer'}
                    </Button>
                  )}
                </div>

                {answerFeedback[exercise.id] && (
                  <div className={`p-3 rounded-lg border ${
                    answerFeedback[exercise.id].isCorrect 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {answerFeedback[exercise.id].isCorrect ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <p className="text-sm font-medium">
                        {answerFeedback[exercise.id].isCorrect 
                          ? "🎉 Excellent work! You got it right!" 
                          : answerFeedback[exercise.id].feedback}
                      </p>
                     </div>
                     
                     {answerFeedback[exercise.id].explanationSteps && (
                       <div className="mt-3 p-3 bg-gray-50 border rounded-lg">
                         <h4 className="font-medium text-sm mb-2">📖 Step-by-step answer processing:</h4>
                         <div className="space-y-1 text-xs font-mono">
                           {answerFeedback[exercise.id].explanationSteps.map((step, index) => (
                             <div key={index} className={step === "" ? "h-2" : ""}>
                               {step && <p>{step}</p>}
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                 )}

                {showAnswers[exercise.id] && (
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div>
                      <h4 className="font-medium text-sm mb-1">Correct Answer:</h4>
                      <p className="text-sm whitespace-pre-wrap">{formatMathExpression(exercise.answer)}</p>
                    </div>
                    
                    {exercise.explanation && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">Explanation:</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {formatMathExpression(exercise.explanation)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
