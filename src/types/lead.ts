export interface Lead {
  id: string;
  name: string;
  contactNumber: string;
  email: string;
  source: 'Website' | 'Referral' | 'Social Media' | 'Cold Call' | 'Other';
  leadStage: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const LEAD_SOURCES = [
  'Website',
  'Referral',
  'Social Media',
  'Cold Call',
  'Other'
] as const;

export const LEAD_STAGES = [
  'New',
  'Contacted',
  'Viewing',
  'Offer Made',
  'Closed',
  'Lost'
] as const;

export const LEAD_STAGE_COLORS = {
  'New': 'bg-blue-100 text-blue-800 border-blue-200',
  'Contacted': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Qualified': 'bg-green-100 text-green-800 border-green-200',
  'Proposal': 'bg-purple-100 text-purple-800 border-purple-200',
  'Negotiation': 'bg-orange-100 text-orange-800 border-orange-200',
  'Closed Won': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Closed Lost': 'bg-red-100 text-red-800 border-red-200'
} as const;