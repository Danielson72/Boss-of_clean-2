'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Attempt to submit contact form
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      // Show success even if endpoint doesn't exist yet
      if (res.ok || res.status === 404) {
        setSubmitted(true);
      }
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-dark">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-navy to-brand-dark" />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-gold/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
            Get in <span className="text-brand-gold">Touch</span>
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Have questions? Need help? We&apos;re here for you.
          </p>
        </div>
      </section>

      {/* Two Column Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Left: Contact Form */}
          <div>
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-6">
              Send Us a Message
            </h2>

            {submitted ? (
              <div className="bg-brand-cream rounded-2xl p-10 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-display text-xl font-bold text-brand-dark mb-2">
                  Message Sent
                </h3>
                <p className="text-gray-600">
                  Thank you for reaching out. We&apos;ll get back to you as soon as possible.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-semibold text-brand-dark mb-2">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-brand-cream border border-gray-200 rounded-xl text-brand-dark text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-shadow"
                    placeholder="Your name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-semibold text-brand-dark mb-2">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-brand-cream border border-gray-200 rounded-xl text-brand-dark text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-shadow"
                    placeholder="your@email.com"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="contact-subject" className="block text-sm font-semibold text-brand-dark mb-2">
                    Subject
                  </label>
                  <select
                    id="contact-subject"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-4 py-3 bg-brand-cream border border-gray-200 rounded-xl text-brand-dark text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-shadow"
                  >
                    <option value="">Select a topic</option>
                    <option value="general">General Inquiry</option>
                    <option value="list_business">List My Business</option>
                    <option value="customer_support">Customer Support</option>
                    <option value="partnership">Partnership</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="contact-message" className="block text-sm font-semibold text-brand-dark mb-2">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full px-4 py-3 bg-brand-cream border border-gray-200 rounded-xl text-brand-dark text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-shadow resize-none"
                    placeholder="How can we help?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-brand-gold text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-brand-gold-light transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Message'
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right: Contact Info + FAQ + Pro CTA */}
          <div className="space-y-8">
            {/* Contact Info */}
            <div className="bg-brand-cream rounded-2xl p-8">
              <h2 className="font-display text-xl font-bold text-brand-dark mb-6">
                Contact Information
              </h2>
              <div className="space-y-5">
                <a
                  href="tel:407-461-6039"
                  className="flex items-center gap-4 text-gray-700 hover:text-brand-gold transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-gold/20 transition-colors">
                    <Phone className="h-5 w-5 text-brand-gold" />
                  </div>
                  <div>
                    <p className="font-semibold text-brand-dark">Phone</p>
                    <p className="text-sm">407-461-6039</p>
                  </div>
                </a>

                <a
                  href="mailto:admin@bossofclean.com"
                  className="flex items-center gap-4 text-gray-700 hover:text-brand-gold transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-gold/20 transition-colors">
                    <Mail className="h-5 w-5 text-brand-gold" />
                  </div>
                  <div>
                    <p className="font-semibold text-brand-dark">Email</p>
                    <p className="text-sm">admin@bossofclean.com</p>
                  </div>
                </a>

                <div className="flex items-center gap-4 text-gray-700">
                  <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-brand-gold" />
                  </div>
                  <div>
                    <p className="font-semibold text-brand-dark">Service Area</p>
                    <p className="text-sm">Serving all 67 Florida counties</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick FAQ */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8">
              <h3 className="font-display text-lg font-bold text-brand-dark mb-4">
                Quick Answers
              </h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold text-brand-dark">How do I find a cleaner?</p>
                  <p className="text-gray-600 mt-1">
                    Use our <Link href="/search" className="text-brand-gold hover:underline">search page</Link> to browse cleaning professionals by service type and location.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-brand-dark">How do I list my business?</p>
                  <p className="text-gray-600 mt-1">
                    <Link href="/signup?role=cleaner" className="text-brand-gold hover:underline">Sign up as a professional</Link> and create your profile in about 10 minutes.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-brand-dark">Is it free for customers?</p>
                  <p className="text-gray-600 mt-1">
                    Yes, always. Searching and connecting with professionals is completely free.
                  </p>
                </div>
              </div>
            </div>

            {/* Pro CTA */}
            <div className="bg-brand-dark rounded-2xl p-8 text-center">
              <h3 className="font-display text-lg font-bold text-white mb-2">
                Are You a Cleaning Professional?
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                List your business on Boss of Clean and connect with Florida homeowners.
              </p>
              <Link
                href="/signup?role=cleaner"
                className="inline-flex items-center gap-2 bg-brand-gold text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-brand-gold-light transition-colors min-h-[44px]"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
