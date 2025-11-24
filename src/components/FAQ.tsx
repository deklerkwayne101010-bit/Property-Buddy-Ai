import React from 'react';

const FAQ = () => {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is Stagefy?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Stagefy is an AI-powered real estate marketing platform designed specifically for South African property professionals. It combines AI tools for property descriptions, photo editing, video creation, and CRM management in one comprehensive platform."
        }
      },
      {
        "@type": "Question",
        "name": "How does the AI property description generator work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our AI analyzes your property details, photos, and specifications to generate compelling, SEO-optimized property descriptions. Simply input your property information, and our AI creates professional marketing copy tailored for South African real estate listings."
        }
      },
      {
        "@type": "Question",
        "name": "Can I edit photos professionally without design skills?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Our AI photo editor allows you to enhance property photos with professional adjustments including brightness, contrast, color correction, and virtual staging. No design experience required - our AI does the work for you."
        }
      },
      {
        "@type": "Question",
        "name": "What video tools are available?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Stagefy offers AI-powered video creation tools including property walkthrough videos, virtual tours, and marketing videos. Upload photos and our AI generates professional real estate videos with voiceover options."
        }
      },
      {
        "@type": "Question",
        "name": "Is there a CRM system included?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, Stagefy includes a comprehensive CRM system designed for real estate agents. Track leads, manage properties, schedule viewings, and maintain client relationships all in one place."
        }
      },
      {
        "@type": "Question",
        "name": "What are the pricing plans?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We offer flexible pricing starting from R299/month for basic plans, with premium options up to R999/month for unlimited usage. All plans include access to our AI tools and CRM system. Contact us for custom enterprise solutions."
        }
      },
      {
        "@type": "Question",
        "name": "Is my data secure?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolutely. We use enterprise-grade security with SSL encryption, secure data centers in South Africa, and comply with POPIA regulations. Your property data and client information are protected with the highest security standards."
        }
      },
      {
        "@type": "Question",
        "name": "Can I cancel my subscription anytime?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, you can cancel your subscription at any time through your account dashboard. We offer a 30-day money-back guarantee, and there are no long-term contracts or cancellation fees."
        }
      }
    ]
  };

  const faqs = [
    {
      question: "What is Stagefy?",
      answer: "Stagefy is an AI-powered real estate marketing platform designed specifically for South African property professionals. It combines AI tools for property descriptions, photo editing, video creation, and CRM management in one comprehensive platform."
    },
    {
      question: "How does the AI property description generator work?",
      answer: "Our AI analyzes your property details, photos, and specifications to generate compelling, SEO-optimized property descriptions. Simply input your property information, and our AI creates professional marketing copy tailored for South African real estate listings."
    },
    {
      question: "Can I edit photos professionally without design skills?",
      answer: "Yes! Our AI photo editor allows you to enhance property photos with professional adjustments including brightness, contrast, color correction, and virtual staging. No design experience required - our AI does the work for you."
    },
    {
      question: "What video tools are available?",
      answer: "Stagefy offers AI-powered video creation tools including property walkthrough videos, virtual tours, and marketing videos. Upload photos and our AI generates professional real estate videos with voiceover options."
    },
    {
      question: "Is there a CRM system included?",
      answer: "Yes, Stagefy includes a comprehensive CRM system designed for real estate agents. Track leads, manage properties, schedule viewings, and maintain client relationships all in one place."
    },
    {
      question: "What are the pricing plans?",
      answer: "We offer flexible pricing starting from R299/month for basic plans, with premium options up to R999/month for unlimited usage. All plans include access to our AI tools and CRM system. Contact us for custom enterprise solutions."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use enterprise-grade security with SSL encryption, secure data centers in South Africa, and comply with POPIA regulations. Your property data and client information are protected with the highest security standards."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel your subscription at any time through your account dashboard. We offer a 30-day money-back guarantee, and there are no long-term contracts or cancellation fees."
    }
  ];

  return (
    <>
      {/* FAQ Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600">
            Everything you need to know about Stagefy
          </p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {faq.question}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Still have questions? We&apos;re here to help!
          </p>
          <a
            href="/contact"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            Contact Support
          </a>
        </div>
      </div>
    </>
  );
};

export default FAQ;
