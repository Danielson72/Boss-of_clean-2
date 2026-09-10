'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { STEP_LABELS } from './types'

interface ProgressIndicatorProps {
  currentStep: number
  completedSteps: number[]
  /** When provided, each step becomes a button that navigates the wizard. */
  onGoToStep?: (step: number) => void
}

export default function ProgressIndicator({ currentStep, completedSteps, onGoToStep }: ProgressIndicatorProps) {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1
          const isCompleted = completedSteps.includes(stepNumber)
          const isCurrent = currentStep === stepNumber
          const isPast = stepNumber < currentStep
          const stateLabel = isCurrent ? 'current step' : isCompleted || isPast ? 'completed' : 'not started'

          const circle = (
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                isCompleted || isPast
                  ? 'bg-green-600 text-white'
                  : isCurrent
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              )}
            >
              {isCompleted || isPast ? (
                <Check className="h-5 w-5" />
              ) : (
                stepNumber
              )}
            </div>
          )

          const caption = (
            <span
              className={cn(
                'mt-2 text-xs font-medium text-center hidden sm:block',
                isCurrent ? 'text-blue-600' : isPast ? 'text-green-600' : 'text-gray-500'
              )}
            >
              {label}
            </span>
          )

          return (
            <div key={stepNumber} className="flex-1 flex items-center">
              {onGoToStep ? (
                <button
                  type="button"
                  onClick={() => onGoToStep(stepNumber)}
                  aria-label={`Go to step ${stepNumber}, ${label} (${stateLabel})`}
                  aria-current={isCurrent ? 'step' : undefined}
                  className="flex flex-col items-center flex-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  {circle}
                  {caption}
                </button>
              ) : (
                <div className="flex flex-col items-center flex-1">
                  {circle}
                  {caption}
                </div>
              )}
              {index < STEP_LABELS.length - 1 && (
                <div
                  className={cn(
                    'h-1 flex-1 mx-2 rounded',
                    stepNumber < currentStep ? 'bg-green-600' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
      {/* Mobile step indicator */}
      <div className="sm:hidden mt-4 text-center">
        <span className="text-sm font-medium text-gray-700">
          Step {currentStep} of {STEP_LABELS.length}: {STEP_LABELS[currentStep - 1]}
        </span>
      </div>
    </div>
  )
}
