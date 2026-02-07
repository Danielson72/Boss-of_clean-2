'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Zap } from 'lucide-react';
import { MESSAGE_TEMPLATES, TEMPLATE_CATEGORIES } from '@/lib/constants/message-templates';

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  showTemplates?: boolean;
}

export function MessageInput({ onSend, disabled, placeholder = 'Type a message...', showTemplates = true }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  // Close picker on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowTemplatePicker(false);
      }
    }
    if (showTemplatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTemplatePicker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = content.trim();
    if (!trimmed || sending || disabled) return;

    setSending(true);
    try {
      await onSend(trimmed);
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTemplateSelect = (templateContent: string) => {
    setContent(templateContent);
    setShowTemplatePicker(false);
    textareaRef.current?.focus();
  };

  const categories = Object.entries(TEMPLATE_CATEGORIES);

  return (
    <form onSubmit={handleSubmit} className="border-t bg-white p-4">
      {/* Template Picker */}
      {showTemplatePicker && showTemplates && (
        <div ref={pickerRef} className="mb-3 border rounded-lg bg-white shadow-lg max-h-64 overflow-y-auto">
          {categories.map(([key, label]) => {
            const templates = MESSAGE_TEMPLATES.filter(t => t.category === key);
            if (templates.length === 0) return null;
            return (
              <div key={key}>
                <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky top-0">
                  {label}
                </div>
                {templates.map(template => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateSelect(template.content)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <span className="text-sm font-medium text-gray-900">{template.label}</span>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{template.content}</p>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-end gap-2">
        {showTemplates && (
          <button
            type="button"
            onClick={() => setShowTemplatePicker(!showTemplatePicker)}
            className={`flex-shrink-0 p-2 rounded-lg border transition ${
              showTemplatePicker
                ? 'bg-blue-50 border-blue-300 text-blue-600'
                : 'border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400'
            }`}
            title="Quick replies"
          >
            <Zap className="h-5 w-5" />
          </button>
        )}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || sending}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={!content.trim() || sending || disabled}
          className="flex-shrink-0 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </form>
  );
}
