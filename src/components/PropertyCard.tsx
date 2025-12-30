'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Property } from '@/types/property';
import { Lead } from '@/types/lead';
import { hoverLift } from './animations';

interface PropertyCardProps {
  property: Property;
  leads: Lead[];
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
  onLinkLead: (propertyId: string, leadId: string) => void;
  onUnlinkLead: (propertyId: string, leadId: string) => void;
}

const PropertyCard = memo(function PropertyCard({
  property,
  leads,
  onEdit,
  onDelete,
  onLinkLead,
  onUnlinkLead
}: PropertyCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const linkedLeads = leads.filter(lead => property.linkedLeadIds.includes(lead.id));
  const availableLeads = leads.filter(lead => !property.linkedLeadIds.includes(lead.id));

  return (
    <motion.div
      className="bg-white rounded-xl shadow-soft hover:shadow-medium transition-shadow duration-200 overflow-hidden border border-neutral-200"
      {...hoverLift}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Property Image */}
      <div className="relative h-48 bg-neutral-200">
        {property.photos.length > 0 ? (
          <img
            src={property.photos[0]}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        )}
        <div className="absolute top-2 right-2 flex space-x-1">
          <motion.button
            onClick={() => onEdit(property)}
            className="bg-white bg-opacity-80 hover:bg-opacity-100 p-3 rounded-full shadow-soft transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Edit Property"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </motion.button>
          <motion.button
            onClick={() => onDelete(property)}
            className="bg-white bg-opacity-80 hover:bg-opacity-100 p-3 rounded-full shadow-soft transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Delete Property"
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-5 h-5 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Property Details */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-neutral-900 mb-1">{property.title}</h3>
        <p className="text-sm text-neutral-600 mb-2">{property.address}</p>

        <div className="flex items-center justify-between mb-3">
          <span className="text-xl font-bold text-primary-600">{formatPrice(property.listingPrice)}</span>
          <span className="text-sm text-neutral-500 bg-neutral-100 px-2 py-1 rounded">{property.propertyType}</span>
        </div>

        {/* Property Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <div className="text-sm font-medium text-neutral-900">{property.bedrooms}</div>
            <div className="text-xs text-neutral-500">Bedrooms</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-neutral-900">{property.bathrooms}</div>
            <div className="text-xs text-neutral-500">Bathrooms</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-neutral-900">{property.parking}</div>
            <div className="text-xs text-neutral-500">Parking</div>
          </div>
        </div>

        {/* Size */}
        <div className="text-sm text-neutral-600 mb-3">
          <span className="font-medium">{property.size} m²</span>
        </div>

        {/* Linked Leads */}
        {linkedLeads.length > 0 && (
          <div className="mb-3">
            <h4 className="text-sm font-medium text-neutral-700 mb-2">Linked Leads:</h4>
            <div className="space-y-1">
              {linkedLeads.map(lead => (
                <div key={lead.id} className="flex items-center justify-between bg-neutral-50 px-2 py-1 rounded text-sm">
                  <span className="text-neutral-700">{lead.name}</span>
                  <motion.button
                    onClick={() => onUnlinkLead(property.id, lead.id)}
                    className="text-error-500 hover:text-error-700"
                    title="Unlink Lead"
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link New Lead */}
        {availableLeads.length > 0 && (
          <div className="mb-3">
            <h4 className="text-sm font-medium text-neutral-700 mb-2">Link Lead:</h4>
            <motion.select
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                if (e.target.value) {
                  onLinkLead(property.id, e.target.value);
                  e.target.value = '';
                }
              }}
              className="w-full text-sm border border-neutral-300 rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[44px]"
              defaultValue=""
              whileFocus={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <option value="">Select a lead...</option>
              {availableLeads.map(lead => (
                <option key={lead.id} value={lead.id}>{lead.name}</option>
              ))}
            </motion.select>
          </div>
        )}

        {/* Description */}
        {property.description && (
          <p className="text-sm text-neutral-600 line-clamp-2">{property.description}</p>
        )}
      </div>
    </motion.div>
  );
});

PropertyCard.displayName = 'PropertyCard';

export default PropertyCard;