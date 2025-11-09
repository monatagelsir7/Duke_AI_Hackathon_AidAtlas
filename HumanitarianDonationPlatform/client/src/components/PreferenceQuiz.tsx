import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Star } from "lucide-react";

interface QuizQuestion {
  id: string;
  question: string;
  description?: string;
  options: string[];
  multi?: boolean;
  ranked?: boolean;
  maxRanked?: number;
}

interface PreferenceQuizProps {
  onComplete: (preferences: Record<string, string | string[]>) => void;
}

const QUESTIONS: QuizQuestion[] = [
  {
    id: "regions",
    question: "Which regions would you like to support?",
    description: "Select all that interest you",
    options: ["Middle East", "Africa", "Asia", "Eastern Europe", "Latin America", "No Preference"],
    multi: true,
  },
  {
    id: "causes",
    question: "What causes are most important to you?",
    description: "Select and rank your top 3",
    options: ["Healthcare", "Education", "Food Security", "Shelter", "Clean Water", "Women's Rights", "Refugee Support", "Child Protection"],
    ranked: true,
    maxRanked: 3,
  },
];

export default function PreferenceQuiz({ onComplete }: PreferenceQuizProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const currentQuestion = QUESTIONS[currentStep];
  const currentAnswer = answers[currentQuestion.id] || (currentQuestion.multi || currentQuestion.ranked ? [] : "");

  const toggleOption = (option: string) => {
    if (currentQuestion.ranked) {
      const current = currentAnswer as string[];
      const maxRanked = currentQuestion.maxRanked || 3;
      
      if (current.includes(option)) {
        // Remove from ranking
        setAnswers({
          ...answers,
          [currentQuestion.id]: current.filter((o) => o !== option),
        });
      } else if (current.length < maxRanked) {
        // Add to ranking
        setAnswers({
          ...answers,
          [currentQuestion.id]: [...current, option],
        });
      }
    } else if (currentQuestion.multi) {
      const current = currentAnswer as string[];
      setAnswers({
        ...answers,
        [currentQuestion.id]: current.includes(option)
          ? current.filter((o) => o !== option)
          : [...current, option],
      });
    } else {
      setAnswers({ ...answers, [currentQuestion.id]: option });
    }
  };

  const removeRankedOption = (option: string) => {
    if (currentQuestion.ranked) {
      const current = currentAnswer as string[];
      setAnswers({
        ...answers,
        [currentQuestion.id]: current.filter((o) => o !== option),
      });
    }
  };

  const canContinue = () => {
    if (currentQuestion.ranked) {
      const maxRanked = currentQuestion.maxRanked || 3;
      return (currentAnswer as string[]).length === maxRanked;
    } else if (currentQuestion.multi) {
      return (currentAnswer as string[]).length > 0;
    } else {
      return currentAnswer !== "";
    }
  };

  const handleNext = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(answers);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const rankedItems = currentQuestion.ranked ? (currentAnswer as string[]) : [];

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-center gap-3 mb-10">
        {QUESTIONS.map((_, index) => (
          <div
            key={index}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              index <= currentStep 
                ? "w-16 bg-gradient-to-r from-primary to-chart-1 shadow-lg shadow-primary/30" 
                : "w-2.5 bg-muted"
            }`}
            data-testid={`progress-step-${index}`}
          />
        ))}
      </div>

      <Card className="p-10 shadow-2xl border-2 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative">
          <div className="inline-block mb-4 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <p className="text-xs font-medium text-primary">Step {currentStep + 1} of {QUESTIONS.length}</p>
          </div>
          
          <h2 className="text-4xl font-display font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {currentQuestion.question}
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-6 font-medium">
            {currentQuestion.description || (currentQuestion.multi ? "Select all that apply" : "Choose one option")}
            {currentQuestion.ranked && (
              <span className="block mt-2 text-xs text-primary font-semibold">
                You must select exactly {currentQuestion.maxRanked || 3} causes
              </span>
            )}
          </p>

          {currentQuestion.ranked && rankedItems.length > 0 && (
            <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs font-semibold text-primary mb-3">Your Ranking ({rankedItems.length}/{currentQuestion.maxRanked})</p>
              <div className="flex flex-wrap gap-2">
                {rankedItems.map((item, index) => (
                  <Badge
                    key={item}
                    variant="default"
                    className="gap-2 pl-2 pr-3 py-2"
                    data-testid={`ranked-item-${index + 1}`}
                  >
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-background/20 text-xs font-bold">
                      {index + 1}
                    </div>
                    <span>{item}</span>
                    <button
                      onClick={() => removeRankedOption(item)}
                      className="ml-1 hover:text-destructive transition-colors"
                      data-testid={`remove-ranked-${index + 1}`}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-10">
            {currentQuestion.options.map((option) => {
              const isSelected = currentQuestion.ranked
                ? rankedItems.includes(option)
                : currentQuestion.multi
                ? (currentAnswer as string[]).includes(option)
                : currentAnswer === option;
              
              const rankIndex = currentQuestion.ranked ? rankedItems.indexOf(option) : -1;
              const isRanked = rankIndex !== -1;

              return (
                <button
                  key={option}
                  onClick={() => toggleOption(option)}
                  disabled={currentQuestion.ranked && !isRanked && rankedItems.length >= (currentQuestion.maxRanked || 3)}
                  className={`p-5 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg relative ${
                    isSelected
                      ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-md shadow-primary/20"
                      : "border-border hover:border-primary/30"
                  } ${currentQuestion.ranked && !isRanked && rankedItems.length >= (currentQuestion.maxRanked || 3) ? "opacity-40 cursor-not-allowed hover:scale-100" : ""}`}
                  data-testid={`option-${option.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {isRanked && (
                    <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg">
                      {rankIndex + 1}
                    </div>
                  )}
                  <Badge
                    variant={isSelected ? "default" : "secondary"}
                    className="w-full justify-center text-sm py-2 font-medium"
                  >
                    {option}
                  </Badge>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handleBack}
                data-testid="button-back"
                className="px-6"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <Button
              className="flex-1 bg-gradient-to-r from-primary to-chart-1 shadow-lg shadow-primary/30 px-8"
              onClick={handleNext}
              disabled={!canContinue()}
              data-testid="button-next"
            >
              {currentStep < QUESTIONS.length - 1 ? "Next" : "Complete Setup"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
