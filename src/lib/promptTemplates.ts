export interface PromptTemplate {
  platform: string;
  tone: string;
  length: 'Short' | 'Medium' | 'Long';
  template: string;
}

export const promptTemplates: PromptTemplate[] = [
  // Property24
  {
    platform: 'Property24',
    tone: 'Professional',
    length: 'Medium',
    template: `Create a compelling property description for Property24. Focus on key features, location benefits, and investment potential. Use professional language suitable for real estate listings.

Property Details:
- Title: {title}
- Summary: {shortSummary}
- Address: {address}, {suburb}, {city}
- Price: {price}
- Bedrooms: {beds}, Bathrooms: {baths}, Garages: {garages}
- Key Features: {keyFeatures}

Generate a {length} description that highlights the property's best features and appeals to potential buyers or tenants.`
  },
  {
    platform: 'Property24',
    tone: 'Friendly',
    length: 'Medium',
    template: `Write a warm and inviting property description for Property24 that feels like a personal recommendation. Emphasize lifestyle benefits and community appeal.

Property Details:
- Title: {title}
- Summary: {shortSummary}
- Address: {address}, {suburb}, {city}
- Price: {price}
- Bedrooms: {beds}, Bathrooms: {baths}, Garages: {garages}
- Key Features: {keyFeatures}

Create a {length} description that makes potential buyers feel excited about viewing this property.`
  },

  // WhatsApp
  {
    platform: 'WhatsApp',
    tone: 'Casual',
    length: 'Short',
    template: `Hey! Check out this amazing property! 🚀

{title}
📍 {address}, {suburb}, {city}
💰 {price}
🛏️ {beds} beds | 🛁 {baths} baths | 🚗 {garages} garage

{shortSummary}

Key features: {keyFeatures}

DM me for more details or to arrange a viewing! 📱`
  },
  {
    platform: 'WhatsApp',
    tone: 'Professional',
    length: 'Short',
    template: `Professional property listing available:

{title}
Location: {address}, {suburb}, {city}
Price: {price}
Specifications: {beds} bedrooms, {baths} bathrooms, {garages} garage

{shortSummary}

Features include: {keyFeatures}

Contact me for viewing arrangements.`
  },

  // Facebook
  {
    platform: 'Facebook',
    tone: 'Engaging',
    length: 'Medium',
    template: `🏡 FOR SALE: {title} 🏡

📍 Located at {address}, {suburb}, {city}
💰 Price: {price}
🏠 {beds} Bedrooms | {baths} Bathrooms | {garages} Garage

{shortSummary}

✨ Key Features:
{keyFeatures}

This property offers the perfect blend of comfort and convenience. Don't miss out on this opportunity!

Comment below or message me for more information! 💬`
  },
  {
    platform: 'Facebook',
    tone: 'Professional',
    length: 'Medium',
    template: `Property Listing: {title}

Location: {address}, {suburb}, {city}
Price: {price}
Property Type: Residential
Bedrooms: {beds} | Bathrooms: {baths} | Garages: {garages}

{shortSummary}

Property Features:
{keyFeatures}

Ideal for families or investors looking for quality accommodation in a prime location.

Contact for private viewing.`
  },

  // Instagram
  {
    platform: 'Instagram',
    tone: 'Trendy',
    length: 'Short',
    template: `✨ {title} ✨

📍 {address}, {suburb}, {city}
💎 {price}
🏡 {beds}BR | {baths}BA | {garages}G

{shortSummary}

#RealEstate #PropertyForSale #DreamHome #LuxuryLiving #PropertyGoals

DM for details! 💌`
  },
  {
    platform: 'Instagram',
    tone: 'Luxury',
    length: 'Short',
    template: `🏛️ LUXURY LISTING 🏛️

{title}

📍 Prime location: {address}, {suburb}, {city}
💰 {price}
👑 {beds} Bedrooms | {baths} Bathrooms | {garages} Garage

{shortSummary}

Elevate your lifestyle. ✨

#LuxuryRealEstate #PremiumProperty #ExclusiveListing`
  },

  // Email
  {
    platform: 'Email',
    tone: 'Professional',
    length: 'Long',
    template: `Subject: Exclusive Property Listing: {title}

Dear Valued Client,

I am pleased to present this exceptional property listing that may be of interest to you.

Property Details:
- Address: {address}, {suburb}, {city}
- Price: {price}
- Bedrooms: {beds}
- Bathrooms: {baths}
- Garages: {garages}

{shortSummary}

Key Features and Amenities:
{keyFeatures}

This property represents an outstanding opportunity for discerning buyers seeking quality and value in a desirable location.

Please contact me at your earliest convenience to arrange a private viewing or to discuss this opportunity further.

Best regards,
[Your Name]
Real Estate Professional`
  },
  {
    platform: 'Email',
    tone: 'Personal',
    length: 'Medium',
    template: `Subject: I think you'll love this property!

Hi there,

I came across this property and immediately thought of you - it has all the features you're looking for!

{title}
Located at: {address}, {suburb}, {city}
Price: {price}

{shortSummary}

What makes this special:
{keyFeatures}

It's a {beds} bedroom, {baths} bathroom property with {garages} garage parking.

Would you like to schedule a viewing? I'd be happy to show you around!

Best,
[Your Name]`
  },

  // SMS
  {
    platform: 'SMS',
    tone: 'Direct',
    length: 'Short',
    template: `{title} available! {address}, {suburb}. {price}. {beds}BR/{baths}BA/{garages}G. {shortSummary}. Call now for viewing!`
  },
  {
    platform: 'SMS',
    tone: 'Urgent',
    length: 'Short',
    template: `HOT LISTING: {title} at {address}, {suburb}. Only {price}! {beds} beds, {baths} baths. Limited time offer - call immediately!`
  }
];

export function getPromptTemplate(platform: string, tone: string, length: 'Short' | 'Medium' | 'Long'): PromptTemplate | null {
  return promptTemplates.find(template =>
    template.platform === platform &&
    template.tone === tone &&
    template.length === length
  ) || null;
}

export function buildPrompt(template: PromptTemplate, propertyData: Record<string, any>): string {
  let prompt = template.template;

  // Replace placeholders with actual data
  Object.keys(propertyData).forEach(key => {
    const placeholder = `{${key}}`;
    let value = propertyData[key];

    // Handle arrays (like keyFeatures)
    if (Array.isArray(value)) {
      value = value.join(', ');
    }

    prompt = prompt.replace(new RegExp(placeholder, 'g'), value || '');
  });

  return prompt;
}