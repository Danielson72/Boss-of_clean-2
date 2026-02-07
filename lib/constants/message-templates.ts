export interface MessageTemplate {
  id: string;
  label: string;
  content: string;
  category: 'availability' | 'pricing' | 'follow_up' | 'thank_you';
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'available',
    label: 'I\'m available',
    content: 'Hi! I\'m available for your requested date. Would you like to go ahead and book?',
    category: 'availability',
  },
  {
    id: 'not_available',
    label: 'Not available',
    content: 'Thanks for reaching out! Unfortunately I\'m not available on that date. Would another day work for you?',
    category: 'availability',
  },
  {
    id: 'pricing',
    label: 'Share pricing',
    content: 'Thanks for your interest! My rate is based on the size of the job and specific services needed. Could you share a few more details so I can give you an accurate quote?',
    category: 'pricing',
  },
  {
    id: 'estimate',
    label: 'Send estimate',
    content: 'Based on what you\'ve described, I\'d estimate the job at around $___. This includes all supplies and equipment. Would you like to proceed?',
    category: 'pricing',
  },
  {
    id: 'more_details',
    label: 'Need more details',
    content: 'Thanks for reaching out! To give you the best service, could you share a few more details? Specifically: the size of the space, any particular areas of focus, and your preferred schedule.',
    category: 'follow_up',
  },
  {
    id: 'confirm_booking',
    label: 'Confirm booking',
    content: 'Great news — you\'re all set! I\'ll be there as scheduled. Please make sure the space is accessible and let me know if anything changes. Looking forward to it!',
    category: 'follow_up',
  },
  {
    id: 'on_the_way',
    label: 'On my way',
    content: 'Hi! Just letting you know I\'m on my way and should arrive within the next 30 minutes.',
    category: 'follow_up',
  },
  {
    id: 'thank_you',
    label: 'Thank you',
    content: 'Thank you for choosing my services! I hope you\'re happy with the results. If you have a moment, I\'d really appreciate a review. Thanks again!',
    category: 'thank_you',
  },
  {
    id: 'follow_up_review',
    label: 'Request review',
    content: 'Hi! I hope you\'re enjoying your clean space. If you have a moment, leaving a review would really help my business grow. Thank you for your support!',
    category: 'thank_you',
  },
];

export const TEMPLATE_CATEGORIES = {
  availability: 'Availability',
  pricing: 'Pricing',
  follow_up: 'Follow-up',
  thank_you: 'Thank You',
} as const;
