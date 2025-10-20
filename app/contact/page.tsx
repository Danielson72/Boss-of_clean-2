import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import FormContact from '@/components/FormContact';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Contact Sonz of Thunder Services
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Have questions? Need a quote? We're here to serve you with excellence.
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
                    Get help with your cleaning needs, quotes, or general questions.
                  </p>
                  <a href="mailto:dalvarez@sotsvc.com" className="mt-2 text-blue-600 hover:text-blue-700 font-medium">
                    dalvarez@sotsvc.com
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
                    Speak directly with our team for urgent matters.
                  </p>
                  <a href="tel:+14074616039" className="mt-2 text-blue-600 hover:text-blue-700 font-medium">
                    (407) 461-6039
                  </a>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Service Hours</h3>
                  <p className="mt-1 text-gray-600">
                    Monday - Friday: 8:00 AM - 6:00 PM EST<br />
                    Saturday: 9:00 AM - 3:00 PM EST<br />
                    Sunday: Closed
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
                    Central Florida<br />
                    Orlando • Kissimmee • Winter Park • Altamonte Springs
                  </p>
                </div>
              </div>
            </div>

            {/* Faith Message */}
            <div className="mt-8 p-6 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                Our Commitment
              </h3>
              <p className="text-blue-700 italic">
                "We clean every space as if it were holy ground ✨"
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Send us a Message
            </h2>
            
            <FormContact formType="standalone" />
          </div>
        </div>
      </div>
    </div>
  );
}

