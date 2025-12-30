'use client';

import React from 'react';
import { motion } from 'framer-motion';
import PropertyCard from './PropertyCard';
import { Property } from '@/types/property';
import { Lead } from '@/types/lead';
import { staggerContainer, staggerItem } from './animations';
import LoadingSpinner from './LoadingSpinner';
import { SkeletonGrid } from './SkeletonLoader';

interface PropertyGridProps {
  properties: Property[];
  leads: Lead[];
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
  onLinkLead: (propertyId: string, leadId: string) => void;
  onUnlinkLead: (propertyId: string, leadId: string) => void;
  loading?: boolean;
}

export default function PropertyGrid({
  properties,
  leads,
  onEdit,
  onDelete,
  onLinkLead,
  onUnlinkLead,
  loading = false
}: PropertyGridProps) {
  if (loading) {
    return (
      <SkeletonGrid
        variant="property-card"
        count={6}
        columns={3}
        className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      />
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No properties yet</h3>
        <p className="text-gray-500">Add your first property to get started.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {properties.map((property, index) => (
        <motion.div key={property.id} variants={staggerItem}>
          <PropertyCard
            property={property}
            leads={leads}
            onEdit={onEdit}
            onDelete={onDelete}
            onLinkLead={onLinkLead}
            onUnlinkLead={onUnlinkLead}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}