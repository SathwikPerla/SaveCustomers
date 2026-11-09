import React from 'react';
import { Upload, Eraser, Sparkles, Download, Check } from 'lucide-react';

interface WizardStepperProps {
  currentStep: 1 | 2 | 3 | 4;
  onSelectStep: (step: 1 | 2 | 3 | 4) => void;
  hasImages: boolean;
  hasLogo: boolean;
  isProcessed: boolean;
}

export const WizardStepper: React.FC<WizardStepperProps> = ({
  currentStep,
  onSelectStep,
  hasImages,
  hasLogo,
  isProcessed,
}) => {
  const steps = [
    {
      num: 1,
      title: '1. Add Pictures',
      icon: Upload,
      isDone: hasImages,
      canClick: true,
    },
    {
      num: 2,
      title: '2. Erase Old Logo',
      icon: Eraser,
      isDone: false,
      canClick: hasImages,
    },
    {
      num: 3,
      title: '3. Place Savecus Logo',
      icon: Sparkles,
      isDone: isProcessed,
      canClick: hasImages,
    },
    {
      num: 4,
      title: '4. Download Photos',
      icon: Download,
      isDone: isProcessed,
      canClick: hasImages,
    },
  ];

  return (
    <div className="w-full bg-charcoal-400 border-b border-surface-border px-6 py-3 shrink-0">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {steps.map((s, idx) => {
          const isActive = currentStep === s.num;
          const isDone = s.isDone;

          return (
            <React.Fragment key={s.num}>
              <button
                onClick={() => s.canClick && onSelectStep(s.num as any)}
                disabled={!s.canClick}
                className={`flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all text-left ${
                  isActive
                    ? 'bg-savecus-500 text-charcoal-900 border-savecus-400 shadow-lg shadow-savecus-500/20 font-bold'
                    : isDone
                    ? 'bg-charcoal-200 text-savecus-300 border-savecus-700/60 hover:border-savecus-500'
                    : s.canClick
                    ? 'bg-charcoal-200 text-slate-300 border-surface-border hover:border-savecus-500/60'
                    : 'bg-charcoal-300 text-slate-500 border-charcoal-100 opacity-50 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                    isActive
                      ? 'bg-charcoal-900 text-savecus-500'
                      : isDone
                      ? 'bg-savecus-500 text-charcoal-900'
                      : 'bg-charcoal-100 text-slate-400'
                  }`}
                >
                  {isDone && !isActive ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
                </div>

                <div className="flex flex-col min-w-0">
                  <span className={`text-sm truncate ${isActive ? 'text-charcoal-900 font-bold' : 'text-slate-200 font-medium'}`}>
                    {s.title}
                  </span>
                </div>
              </button>

              {idx < steps.length - 1 && (
                <div className="hidden sm:block w-4 h-0.5 bg-surface-border shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

