'use client'

import { useState } from 'react'
import { StepProps } from './types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  ArrowRight, ArrowLeft, PlayCircle, CheckCircle2,
  BookOpen, Users, Shield, Star
} from 'lucide-react'

const TRAINING_SECTIONS = [
  {
    id: 'platform-overview',
    title: 'Platform Overview',
    description: 'Learn how Boss of Clean works and how to get the most out of your profile',
    icon: BookOpen,
    duration: '5 min read',
    content: [
      'How customers find and contact cleaners',
      'Understanding your dashboard and analytics',
      'Managing your profile and availability',
      'Responding to quote requests effectively'
    ]
  },
  {
    id: 'customer-communication',
    title: 'Customer Communication',
    description: 'Best practices for communicating with potential customers',
    icon: Users,
    duration: '3 min read',
    content: [
      'Responding promptly to inquiries',
      'Setting clear expectations',
      'Handling special requests professionally',
      'Following up after service completion'
    ]
  },
  {
    id: 'safety-guidelines',
    title: 'Safety & Guidelines',
    description: 'Important safety protocols and platform guidelines',
    icon: Shield,
    duration: '4 min read',
    content: [
      'Safety protocols for cleaning services',
      'Insurance and liability requirements',
      'Platform rules and community guidelines',
      'Reporting issues or concerns'
    ]
  },
  {
    id: 'success-tips',
    title: 'Tips for Success',
    description: 'Strategies to grow your cleaning business on our platform',
    icon: Star,
    duration: '4 min read',
    content: [
      'Optimizing your profile for visibility',
      'Building positive reviews',
      'Pricing strategies',
      'Expanding your service areas'
    ]
  }
]

export default function TrainingModule({ data, onChange, onNext, onBack, isSubmitting }: StepProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('platform-overview')

  const completedSections = data.training_videos_watched || []

  const handleSectionComplete = (sectionId: string) => {
    const newCompleted = completedSections.includes(sectionId)
      ? completedSections.filter((id) => id !== sectionId)
      : [...completedSections, sectionId]

    onChange({
      ...data,
      training_videos_watched: newCompleted,
      training_completed: newCompleted.length >= 2 // Require at least 2 sections
    })
  }

  const allSectionsComplete = completedSections.length === TRAINING_SECTIONS.length
  const minimumComplete = completedSections.length >= 2

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Platform Training</h2>
        <p className="text-gray-600 mt-1">
          Complete at least 2 training sections to continue
        </p>
      </div>

      {/* Progress indicator */}
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Training Progress
          </span>
          <span className="text-sm text-gray-600">
            {completedSections.length} / {TRAINING_SECTIONS.length} completed
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-600 transition-all duration-300"
            style={{ width: `${(completedSections.length / TRAINING_SECTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Training sections */}
      <div className="space-y-4">
        {TRAINING_SECTIONS.map((section) => {
          const isComplete = completedSections.includes(section.id)
          const isExpanded = expandedSection === section.id
          const Icon = section.icon

          return (
            <div
              key={section.id}
              className={`border rounded-lg overflow-hidden transition-colors ${
                isComplete ? 'border-green-200 bg-green-50/50' : ''
              }`}
            >
              <button
                type="button"
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50"
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
              >
                <div className={`p-2 rounded-lg ${isComplete ? 'bg-green-100' : 'bg-blue-100'}`}>
                  {isComplete ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  ) : (
                    <Icon className="h-6 w-6 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{section.title}</h3>
                  <p className="text-sm text-gray-500">{section.description}</p>
                </div>
                <span className="text-xs text-gray-400">{section.duration}</span>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t bg-white">
                  <div className="pt-4 space-y-3">
                    <h4 className="font-medium text-gray-800">What you'll learn:</h4>
                    <ul className="space-y-2">
                      {section.content.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                          <PlayCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>

                    <div className="pt-4 flex items-center gap-3">
                      <Checkbox
                        id={`complete-${section.id}`}
                        checked={isComplete}
                        onCheckedChange={() => handleSectionComplete(section.id)}
                      />
                      <Label
                        htmlFor={`complete-${section.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        I have read and understood this section
                      </Label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!minimumComplete && (
        <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
          Please complete at least 2 training sections to continue
        </p>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!minimumComplete || isSubmitting}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
