import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Contact Boss of Clean
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Have questions? Need help with your account? We're here to help you succeed.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Get in Touch
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Email Support</h3>
                  <p className="mt-1 text-gray-600">
                    Get help with your account, technical issues, or general questions.
                  </p>
                  <a href="mailto:support@bossofclean.com" className="mt-2 text-blue-600 hover:text-blue-700 font-medium">
                    support@bossofclean.com
                  </a>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Phone Support</h3>
                  <p className="mt-1 text-gray-600">
                    Speak directly with our support team for urgent matters.
                  </p>
                  <a href="tel:+1-855-BOSS-CLEAN" className="mt-2 text-blue-600 hover:text-blue-700 font-medium">
                    1-855-BOSS-CLEAN (2677)
                  </a>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Support Hours</h3>
                  <p className="mt-1 text-gray-600">
                    Monday - Friday: 8:00 AM - 8:00 PM EST<br />
                    Saturday - Sunday: 9:00 AM - 5:00 PM EST
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Service Area</h3>
                  <p className="mt-1 text-gray-600">
                    All 67 counties in Florida<br />
                    Orlando • Miami • Tampa • Jacksonville • Fort Lauderdale • Tallahassee
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ Link */}
            <div className="mt-8 p-6 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                Frequently Asked Questions
              </h3>
              <p className="text-blue-700 mb-3">
                Find quick answers to common questions about our platform.
              </p>
              <a href="#faq" className="text-blue-600 hover:text-blue-700 font-medium">
                View FAQ →
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Send us a Message
            </h2>
            
            <form className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  I am a... *
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Please select</option>
                  <option value="customer">Customer looking for cleaning services</option>
                  <option value="cleaner">Cleaning business owner</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  rows={6}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Please describe your question or issue in detail..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition duration-300"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}