'use client';

import { motion } from 'framer-motion';
import Footer from '../../components/Footer';

export default function TermsPage() {
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </motion.div>
            <motion.h1
              className="text-4xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Terms of
              <motion.span
                className="block bg-gradient-to-r from-slate-600 to-blue-600 bg-clip-text text-transparent"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                Service
              </motion.span>
            </motion.h1>

            <motion.p
              className="text-xl sm:text-2xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              Please read these terms carefully before using our AI-powered real estate marketing platform.
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

            <h2 className="text-2xl font-bold text-slate-900 mb-6">1. Acceptance of Terms</h2>
            <p className="mb-6">
              Welcome to Stagefy (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). These Terms of Service (&quot;Terms&quot;) govern your access to and use of our AI-powered real estate marketing platform, including our website, mobile applications, and related services (collectively, the &quot;Service&quot;).
            </p>
            <p className="mb-6">
              By accessing or using our Service, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our Service.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">2. Description of Service</h2>
            <p className="mb-4">Stagefy provides AI-powered tools for real estate professionals, including:</p>
            <ul className="list-disc pl-6 mb-6">
              <li>AI-generated property descriptions</li>
              <li>Photo editing and enhancement tools</li>
              <li>Video creation and marketing materials</li>
              <li>Property listing templates</li>
              <li>CRM and lead management features</li>
              <li>Marketing materials marketplace</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">3. User Eligibility</h2>
            <p className="mb-6">
              To use our Service, you must be at least 18 years old and have the legal capacity to enter into these Terms. By using our Service, you represent and warrant that you meet these requirements.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">4. Account Registration and Security</h2>
            <p className="mb-4">To access certain features of our Service, you must register for an account. You agree to:</p>
            <ul className="list-disc pl-6 mb-6">
              <li>Provide accurate and complete information during registration</li>
              <li>Maintain the confidentiality of your account credentials</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Be responsible for all activities that occur under your account</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">5. Subscription and Payment Terms</h2>

            <h3 className="text-xl font-semibold text-slate-900 mb-4">5.1 Subscription Plans</h3>
            <p className="mb-4">We offer various subscription plans with different features and pricing. Plan details are available on our website.</p>

            <h3 className="text-xl font-semibold text-slate-900 mb-4">5.2 Billing and Payment</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Subscription fees are billed in advance on a monthly or annual basis</li>
              <li>All fees are non-refundable except as expressly stated in our refund policy</li>
              <li>You are responsible for all applicable taxes</li>
              <li>Payment information is processed securely through third-party providers</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mb-4">5.3 Subscription Cancellation</h3>
            <p className="mb-6">
              You may cancel your subscription at any time. Cancellations take effect at the end of the current billing period. We do not provide refunds for partial billing periods.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">6. Acceptable Use Policy</h2>
            <p className="mb-4">You agree not to use our Service to:</p>
            <ul className="list-disc pl-6 mb-6">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit harmful, offensive, or inappropriate content</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with the proper functioning of our Service</li>
              <li>Use the Service for any illegal or fraudulent purposes</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">7. Content Ownership and Rights</h2>

            <h3 className="text-xl font-semibold text-slate-900 mb-4">7.1 Your Content</h3>
            <p className="mb-4">You retain ownership of content you upload to our Service. By uploading content, you grant us a license to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Process and analyze your content using our AI tools</li>
              <li>Store your content securely in our systems</li>
              <li>Display your content within our platform</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mb-4">7.2 Our Content</h3>
            <p className="mb-6">
              All content generated by our AI tools, templates, and platform features remain our intellectual property. You may use generated content for your business purposes but may not resell or redistribute our proprietary tools or templates.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">8. AI Content Disclaimer</h2>
            <p className="mb-6">
              Our AI-generated content is provided &quot;as is&quot; for informational and marketing purposes. While we strive for accuracy, AI-generated content may contain errors or inaccuracies. You are responsible for reviewing and verifying all generated content before use. We are not liable for any damages resulting from the use of AI-generated content.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">9. Privacy and Data Protection</h2>
            <p className="mb-6">
              Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using our Service, you consent to our data practices as described in our Privacy Policy.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">10. Service Availability and Support</h2>
            <p className="mb-4">We strive to provide reliable service but cannot guarantee:</p>
            <ul className="list-disc pl-6 mb-6">
              <li>Uninterrupted or error-free operation</li>
              <li>Immediate response to support requests</li>
              <li>Compatibility with all devices and browsers</li>
            </ul>
            <p className="mb-6">
              Support is provided via email and our help center. Response times may vary based on support volume.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">11. Limitation of Liability</h2>
            <p className="mb-6">
              To the maximum extent permitted by law, Stagefy shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities arising from your use of our Service.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">12. Indemnification</h2>
            <p className="mb-6">
              You agree to indemnify and hold Stagefy harmless from any claims, damages, losses, or expenses arising from your use of our Service, violation of these Terms, or infringement of any third-party rights.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">13. Termination</h2>
            <p className="mb-4">We may terminate or suspend your account and access to our Service:</p>
            <ul className="list-disc pl-6 mb-6">
              <li>Immediately for violation of these Terms</li>
              <li>With notice for non-payment or extended inactivity</li>
              <li>At our discretion for any other reason</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">14. Governing Law</h2>
            <p className="mb-6">
              These Terms are governed by the laws of South Africa. Any disputes arising from these Terms or your use of our Service shall be resolved in the courts of South Africa.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">15. Changes to Terms</h2>
            <p className="mb-6">
              We reserve the right to modify these Terms at any time. We will notify users of material changes via email or platform notifications. Continued use of our Service after changes constitutes acceptance of the updated Terms.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">16. Contact Information</h2>
            <p className="mb-4">
              If you have questions about these Terms, please contact us:
            </p>
            <div className="bg-slate-50 rounded-lg p-6 mb-6">
              <p className="font-semibold text-slate-900">Stagefy</p>
              <p className="text-slate-600">Email: admin@stagefy.co.za</p>
              <p className="text-slate-600">Phone: 026 695 7151</p>
              <p className="text-slate-600">Address: Durban, South Africa</p>
            </div>

            <p className="text-sm text-slate-500">
              These Terms of Service were last updated on November 19, 2024. By continuing to use our Service, you acknowledge that you have read, understood, and agree to be bound by these Terms.
            </p>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
