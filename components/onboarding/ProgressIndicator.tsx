'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { STEP_LABELS } from './types'

interface ProgressIndicatorProps {
  currentStep: number
  completedSteps: number[]
}

export default function ProgressIndicator({ currentStep, completedSteps }: ProgressIndicatorProps) {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1
          const isCompleted = completedSteps.includes(stepNumber)
          const isCurrent = currentStep === stepNumber
          const isPast = stepNumber < currentStep

          return (
            <div key={stepNumber} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-1">
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
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center hidden sm:block',
                    isCurrent ? 'text-blue-600' : isPast ? 'text-green-600' : 'text-gray-500'
                  )}
                >
                  {label}
                </span>
              </div>
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
