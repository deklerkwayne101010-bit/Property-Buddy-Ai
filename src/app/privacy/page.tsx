'use client';

import { motion } from 'framer-motion';
import Footer from '../../components/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-600/5 to-blue-600/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center lg:pt-32">
          <motion.div
            className="transition-all duration-1000"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-500 to-blue-600 rounded-xl mb-8 shadow-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.3 }}
            >
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </motion.div>
            <motion.h1
              className="text-4xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Privacy
              <motion.span
                className="block bg-gradient-to-r from-slate-600 to-blue-600 bg-clip-text text-transparent"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                Policy
              </motion.span>
            </motion.h1>

            <motion.p
              className="text-xl sm:text-2xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              Your privacy is important to us. Learn how we collect, use, and protect your personal information.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 lg:p-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="prose prose-lg max-w-none text-slate-700">
            <p className="text-sm text-slate-500 mb-8">Last updated: November 19, 2024</p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">1. Introduction</h2>
            <p className="mb-6">
              Welcome to Stagefy ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered real estate marketing platform.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold text-slate-900 mb-4">2.1 Personal Information</h3>
            <p className="mb-4">We may collect the following personal information:</p>
            <ul className="list-disc pl-6 mb-6">
              <li>Name and contact information (email address, phone number)</li>
              <li>Account credentials (username, password)</li>
              <li>Company information (company name, business address)</li>
              <li>Payment information (processed securely through third-party providers)</li>
              <li>Communication preferences</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mb-4">2.2 Usage Information</h3>
            <p className="mb-4">We automatically collect certain information when you use our platform:</p>
            <ul className="list-disc pl-6 mb-6">
              <li>Device information (IP address, browser type, operating system)</li>
              <li>Usage data (pages visited, features used, time spent)</li>
              <li>Performance metrics (error logs, loading times)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mb-4">2.3 Content Information</h3>
            <p className="mb-6">
              When you upload property images, descriptions, or other content to our platform, we process this information to provide our AI-powered services. This content is used solely for generating marketing materials and is not shared with third parties without your consent.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">3. How We Use Your Information</h2>
            <p className="mb-4">We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-6 mb-6">
              <li>Provide and maintain our AI-powered real estate marketing services</li>
              <li>Process payments and manage subscriptions</li>
              <li>Communicate with you about your account and our services</li>
              <li>Improve our platform through analytics and user feedback</li>
              <li>Provide customer support and technical assistance</li>
              <li>Send marketing communications (with your consent)</li>
              <li>Ensure platform security and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">4. Information Sharing and Disclosure</h2>
            <p className="mb-4">We do not sell, trade, or otherwise transfer your personal information to third parties, except in the following circumstances:</p>
            <ul className="list-disc pl-6 mb-6">
              <li><strong>Service Providers:</strong> We may share information with trusted third-party service providers who assist us in operating our platform (payment processors, cloud hosting, analytics)</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights and safety</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred</li>
              <li><strong>Consent:</strong> With your explicit consent for specific purposes</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">5. Data Security</h2>
            <p className="mb-6">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:
            </p>
            <ul className="list-disc pl-6 mb-6">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication requirements</li>
              <li>Secure data centers and cloud infrastructure</li>
              <li>Employee training on data protection</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">6. Data Retention</h2>
            <p className="mb-6">
              We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law. When we no longer need your information, we will securely delete or anonymize it.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">7. Your Rights</h2>
            <p className="mb-4">You have the following rights regarding your personal information:</p>
            <ul className="list-disc pl-6 mb-6">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal requirements)</li>
              <li><strong>Portability:</strong> Request transfer of your data in a structured format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Restriction:</strong> Request limitation of how we process your information</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">8. Cookies and Tracking Technologies</h2>
            <p className="mb-6">
              We use cookies and similar technologies to enhance your experience, analyze usage patterns, and provide personalized content. You can control cookie preferences through your browser settings, though this may affect platform functionality.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">9. Third-Party Services</h2>
            <p className="mb-6">
              Our platform integrates with third-party services for payment processing, analytics, and AI functionality. These services have their own privacy policies, and we encourage you to review them. We only share the minimum information necessary for these services to function.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">10. International Data Transfers</h2>
            <p className="mb-6">
              Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data during international transfers.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">11. Children's Privacy</h2>
            <p className="mb-6">
              Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">12. Changes to This Privacy Policy</h2>
            <p className="mb-6">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of our services after such changes constitutes acceptance of the updated policy.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">13. Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-slate-50 rounded-lg p-6 mb-6">
              <p className="font-semibold text-slate-900">Stagefy</p>
              <p className="text-slate-600">Email: admin@stagefy.co.za</p>
              <p className="text-slate-600">Phone: 026 695 7151</p>
              <p className="text-slate-600">Address: Durban, South Africa</p>
            </div>

            <p className="text-sm text-slate-500">
              This privacy policy is governed by the laws of South Africa and is compliant with the Protection of Personal Information Act (POPIA).
            </p>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}