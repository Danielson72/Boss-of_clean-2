import { Target, Users, Award, MapPin, Phone, Mail } from 'lucide-react';

export default function AboutPage() {
  const team = [
    {
      name: 'David Alvarez',
      role: 'Founder & CEO',
      email: 'dalvarez@sotsvc.com',
      description: 'With over 10 years in the cleaning industry, David founded Boss of Clean to help connect quality cleaning services with customers across Florida.'
    }
  ];

  const values = [
    {
      icon: Target,
      title: 'Our Mission',
      description: 'To connect Florida residents and businesses with trusted, professional cleaning services while helping cleaning businesses grow and succeed.'
    },
    {
      icon: Users,
      title: 'Our Community',
      description: 'We\'ve built a network of over 500 verified cleaning professionals serving all 67 counties across the beautiful state of Florida.'
    },
    {
      icon: Award,
      title: 'Our Standards',
      description: 'Every cleaning professional in our directory is verified, reviewed, and committed to providing exceptional service to our customers.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              About Boss of Clean
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
              Florida's most trusted platform connecting customers with professional cleaning services since 2020
            </p>
          </div>
        </div>
      </div>

      {/* Our Story */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Our Story
            </h2>
            <div className="space-y-4 text-gray-600 text-lg">
              <p>
                Boss of Clean was born from a simple observation: finding reliable, professional cleaning services in Florida was unnecessarily difficult, and quality cleaning businesses struggled to reach their ideal customers.
              </p>
              <p>
                Founded in 2020, we set out to create a solution that would benefit both sides of the equation. For customers, we provide a trusted platform to find verified, reviewed cleaning professionals. For cleaning businesses, we offer a powerful way to connect with customers who value quality service.
              </p>
              <p>
                Today, we're proud to serve as Florida's premier cleaning directory, connecting thousands of customers with hundreds of verified cleaning professionals across all 67 counties in the Sunshine State.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-100 rounded-lg p-8">
            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">500+</div>
                <div className="text-gray-600">Verified Cleaners</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">67</div>
                <div className="text-gray-600">Counties Served</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">10K+</div>
                <div className="text-gray-600">Jobs Completed</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">98%</div>
                <div className="text-gray-600">Customer Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Our Values
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Everything we do is guided by these core principles that shape our platform and community
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-8 text-center">
                <value.icon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {value.title}
                </h3>
                <p className="text-gray-600">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Meet Our Team
            </h2>
            <p className="text-lg text-gray-600">
              The people behind Boss of Clean are committed to your success
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
            {team.map((member, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6 text-center max-w-sm mx-auto">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Users className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {member.name}
                </h3>
                <p className="text-blue-600 font-medium mb-3">
                  {member.role}
                </p>
                <p className="text-gray-600 text-sm mb-4">
                  {member.description}
                </p>
                <div className="flex items-center justify-center">
                  <Mail className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">{member.email}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Get In Touch
            </h2>
            <p className="text-xl text-blue-100">
              Have questions? We're here to help you succeed.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <Phone className="h-8 w-8 mx-auto mb-4 text-blue-200" />
              <h3 className="text-lg font-semibold mb-2">Call Us</h3>
              <p className="text-blue-100">407-461-6039</p>
            </div>
            
            <div>
              <Mail className="h-8 w-8 mx-auto mb-4 text-blue-200" />
              <h3 className="text-lg font-semibold mb-2">Email Us</h3>
              <p className="text-blue-100">dalvarez@sotsvc.com</p>
            </div>
            
            <div>
              <MapPin className="h-8 w-8 mx-auto mb-4 text-blue-200" />
              <h3 className="text-lg font-semibold mb-2">Serving</h3>
              <p className="text-blue-100">All of Florida</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-green-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Join the Boss of Clean Community
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Whether you're looking for cleaning services or want to grow your cleaning business, we're here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-green-600 px-8 py-3 rounded-md font-semibold hover:bg-gray-100 transition duration-300">
              Find a Cleaner
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-md font-semibold hover:bg-white hover:text-green-600 transition duration-300">
              List Your Business
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}