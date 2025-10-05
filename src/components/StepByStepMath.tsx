import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, X, Send, Trash2 } from "lucide-react";

interface MathStep {
  id: number;
  input: string;
  element?: HTMLDivElement;
}

interface StepByStepMathProps {
  question?: string;
  onSubmit?: (steps: string[]) => void;
  placeholder?: string;
}

declare global {
  interface Window {
    MathJax?: {
      typesetPromise: (elements?: HTMLElement[]) => Promise<void>;
    };
  }
}

export const StepByStepMath = ({ 
  question = "Type your math problem and show your work step by step",
  onSubmit,
  placeholder = "Type your step..."
}: StepByStepMathProps) => {
  const [steps, setSteps] = useState<MathStep[]>([{ id: 0, input: "" }]);
  const [stepCounter, setStepCounter] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Typeset math when component mounts or steps change
    if (window.MathJax) {
      window.MathJax.typesetPromise([containerRef.current!]).catch((err) => 
        console.error('MathJax typesetting failed:', err)
      );
    }
  }, [steps]);

  const convertToLatex = (input: string): string => {
    if (!input || input.trim() === '') {
      return '\\text{...}';
    }

    let latex = input;
    
    // Handle fractions - both (num)/(den) and num/den
    latex = latex.replace(/(\d+\.?\d*|\([^)]+\))\/(\d+\.?\d*|\([^)]+\))/g, '\\frac{$1}{$2}');
    
    // Handle square root
    latex = latex.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
    
    // Handle powers
    latex = latex.replace(/(\d+|\w+)\^(\d+|\w+|\([^)]+\))/g, '$1^{$2}');
    
    // Replace * with times
    latex = latex.replace(/\*/g, '\\times');
    
    return latex;
  };

  const addStep = () => {
    setSteps([...steps, { id: stepCounter, input: "" }]);
    setStepCounter(stepCounter + 1);
  };

  const deleteStep = (id: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter(step => step.id !== id));
    }
  };

  const updateStep = (id: number, value: string) => {
    setSteps(steps.map(step => 
      step.id === id ? { ...step, input: value } : step
    ));
  };

  const clearAll = () => {
    setSteps([{ id: stepCounter, input: "" }]);
    setStepCounter(stepCounter + 1);
  };

  const handleSubmit = () => {
    const filledSteps = steps
      .map(s => s.input.trim())
      .filter(s => s.length > 0);
    
    if (filledSteps.length > 0 && onSubmit) {
      onSubmit(filledSteps);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, stepId: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const currentIndex = steps.findIndex(s => s.id === stepId);
      if (currentIndex === steps.length - 1) {
        addStep();
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto" ref={containerRef}>
      <Card className="p-6 bg-card border shadow-sm">
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-2">Question</div>
          <div 
            className="text-lg text-gray-900 min-h-[2rem]"
            dangerouslySetInnerHTML={{ __html: `\\(${question}\\)` }}
          />
        </div>

        <div className="mb-4">
          <div className="text-sm font-semibold text-gray-700 mb-3">
            Show your work (step by step):
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm text-gray-600 border">
            <strong className="text-blue-600">Quick tips:</strong> 
            <div className="mt-1 flex flex-wrap gap-2">
              <span>Use</span>
              <code className="bg-white px-2 py-1 rounded border text-sm">23/12</code>
              <span>for fractions,</span>
              <code className="bg-white px-2 py-1 rounded border text-sm">2^4</code>
              <span>for powers,</span>
              <code className="bg-white px-2 py-1 rounded border text-sm">sqrt(16)</code>
              <span>for square roots</span>
            </div>
          </div>

          <div className="space-y-4 mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col gap-2 p-3 border rounded-lg bg-white">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex-shrink-0 mt-1">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={placeholder}
                      value={step.input}
                      onChange={(e) => updateStep(step.id, e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, step.id)}
                      autoFocus={index === steps.length - 1}
                    />
                    
                    {step.input && (
                      <div 
                        className="mt-2 p-2 bg-gray-50 rounded border min-h-[2rem] text-gray-700"
                        dangerouslySetInnerHTML={{ 
                          __html: `\\(${convertToLatex(step.input)}\\)` 
                        }}
                      />
                    )}
                  </div>

                  {steps.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => deleteStep(step.id)}
                      className="h-8 w-8 rounded-full flex-shrink-0 border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addStep}
            className="w-full mb-4 border-dashed border-gray-300 hover:border-solid"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Step
          </Button>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={clearAll}
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={steps.every(s => !s.input.trim())}
            >
              <Send className="h-4 w-4 mr-2" />
              Submit Work
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
