'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import LeadsTable from '../../components/LeadsTable';
import AddLeadModal from '../../components/AddLeadModal';
import PropertyGrid from '../../components/PropertyGrid';
import AddPropertyModal from '../../components/AddPropertyModal';
import { Lead } from '../../types/lead';
import { Property } from '../../types/property';
import DashboardLayout from '../../components/DashboardLayout';

export default function CRMPage() {
    const [activeTab, setActiveTab] = useState('leads-clients');
    const [leads, setLeads] = useState<Lead[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [editingProperty, setEditingProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(false);
    const [propertiesLoading, setPropertiesLoading] = useState(false);

    // Search and filter states
    const [leadsSearch, setLeadsSearch] = useState('');
    const [propertiesSearch, setPropertiesSearch] = useState('');
    const [filterStage, setFilterStage] = useState<Lead['leadStage'] | 'All'>('All');
    const [propertyTypeFilter, setPropertyTypeFilter] = useState<Property['propertyType'] | 'All'>('All');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');

   // Fetch leads from API
   const fetchLeads = useCallback(async () => {
     setLoading(true);
     try {
       const params = new URLSearchParams();
       if (filterStage !== 'All') params.append('leadStage', filterStage);
       if (leadsSearch) params.append('search', leadsSearch);

       const response = await fetch(`/api/leads?${params}`);
       const data = await response.json();
       console.log('Leads API response:', data); // Debug log
       if (data.success) {
         setLeads(data.data || []);
       } else {
         console.error('API returned error:', data);
       }
     } catch (error) {
       console.error('Error fetching leads:', error);
     } finally {
       setLoading(false);
     }
   }, [filterStage, leadsSearch]);

   // Fetch properties from API
   const fetchProperties = useCallback(async () => {
     setPropertiesLoading(true);
     try {
       const params = new URLSearchParams();
       if (propertyTypeFilter !== 'All') params.append('propertyType', propertyTypeFilter);
       if (propertiesSearch) params.append('search', propertiesSearch);
       if (minPrice) params.append('minPrice', minPrice);
       if (maxPrice) params.append('maxPrice', maxPrice);

       const response = await fetch(`/api/properties?${params}`);
       const data = await response.json();
       if (data.success) {
         setProperties(data.data);
       }
     } catch (error) {
       console.error('Error fetching properties:', error);
     } finally {
       setPropertiesLoading(false);
     }
   }, [propertyTypeFilter, propertiesSearch, minPrice, maxPrice]);

   // Debounced search functions
   const debouncedFetchLeads = useMemo(
     () => {
       let timeoutId: NodeJS.Timeout;
       return () => {
         clearTimeout(timeoutId);
         timeoutId = setTimeout(fetchLeads, 300);
       };
     },
     [fetchLeads]
   );

   const debouncedFetchProperties = useMemo(
     () => {
       let timeoutId: NodeJS.Timeout;
       return () => {
         clearTimeout(timeoutId);
         timeoutId = setTimeout(fetchProperties, 300);
       };
     },
     [fetchProperties]
   );

   // Load data on mount and when filters change
   useEffect(() => {
     debouncedFetchLeads();
   }, [debouncedFetchLeads]);

   useEffect(() => {
     debouncedFetchProperties();
   }, [debouncedFetchProperties]);

   const handleAddLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
     try {
       // Get the current session to include JWT token
       const { supabase } = await import('../../lib/supabase');
       const { data: { session } } = await supabase.auth.getSession();

       if (!session?.access_token) {
         console.error('No authentication session found');
         return;
       }

       const response = await fetch('/api/leads', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${session.access_token}`
         },
         body: JSON.stringify(leadData)
       });
       const data = await response.json();
       if (data.success) {
         fetchLeads(); // Refresh the list
       }
     } catch (error) {
       console.error('Error adding lead:', error);
     }
   };

   const handleEditLead = (lead: Lead) => {
     setEditingLead(lead);
     setIsModalOpen(true);
   };

   const handleUpdateLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
     if (editingLead) {
       try {
         const response = await fetch(`/api/leads/${editingLead.id}`, {
           method: 'PUT',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(leadData)
         });
         const data = await response.json();
         if (data.success) {
           fetchLeads(); // Refresh the list
         }
       } catch (error) {
         console.error('Error updating lead:', error);
       }
     }
   };

   const handleDeleteLead = async (lead: Lead) => {
     if (confirm(`Are you sure you want to delete ${lead.name}?`)) {
       try {
         const response = await fetch(`/api/leads/${lead.id}`, {
           method: 'DELETE'
         });
         const data = await response.json();
         if (data.success) {
           fetchLeads(); // Refresh the list
         }
       } catch (error) {
         console.error('Error deleting lead:', error);
       }
     }
   };

   const handleSaveLead = (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
     if (editingLead) {
       handleUpdateLead(leadData);
     } else {
       handleAddLead(leadData);
     }
     setEditingLead(null);
   };

   const handleAddProperty = async (propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => {
     try {
       const response = await fetch('/api/properties', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(propertyData)
       });
       const data = await response.json();
       if (data.success) {
         fetchProperties(); // Refresh the list
       }
     } catch (error) {
       console.error('Error adding property:', error);
     }
   };

   const handleEditProperty = (property: Property) => {
     setEditingProperty(property);
     setIsPropertyModalOpen(true);
   };

   const handleUpdateProperty = async (propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => {
     if (editingProperty) {
       try {
         const response = await fetch(`/api/properties/${editingProperty.id}`, {
           method: 'PUT',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(propertyData)
         });
         const data = await response.json();
         if (data.success) {
           fetchProperties(); // Refresh the list
         }
       } catch (error) {
         console.error('Error updating property:', error);
       }
     }
   };

   const handleDeleteProperty = async (property: Property) => {
     if (confirm(`Are you sure you want to delete "${property.title}"?`)) {
       try {
         const response = await fetch(`/api/properties/${property.id}`, {
           method: 'DELETE'
         });
         const data = await response.json();
         if (data.success) {
           fetchProperties(); // Refresh the list
         }
       } catch (error) {
         console.error('Error deleting property:', error);
       }
     }
   };

   const handleSaveProperty = (propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => {
     if (editingProperty) {
       handleUpdateProperty(propertyData);
     } else {
       handleAddProperty(propertyData);
     }
     setEditingProperty(null);
   };

   const handleLinkLeadToProperty = (propertyId: string, leadId: string) => {
     setProperties(prev => prev.map(property =>
       property.id === propertyId
         ? { ...property, linkedLeadIds: [...property.linkedLeadIds, leadId], updatedAt: new Date().toISOString() }
         : property
     ));
   };

   const handleUnlinkLeadFromProperty = (propertyId: string, leadId: string) => {
     setProperties(prev => prev.map(property =>
       property.id === propertyId
         ? { ...property, linkedLeadIds: property.linkedLeadIds.filter(id => id !== leadId), updatedAt: new Date().toISOString() }
         : property
     ));
   };

   const tabs = [
    { id: 'leads-clients', label: 'Leads/Clients' },
    { id: 'properties', label: 'Properties' },
  ];

  return (
    <DashboardLayout>
      <motion.div
        className="bg-gradient-to-br from-slate-50 via-white to-blue-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-teal-600/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center lg:pt-32">
          <motion.div
            className="transition-all duration-1000"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl mb-8 shadow-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.3 }}
            >
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </motion.div>
            <motion.h1
              className="text-4xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              CRM
              <motion.span
                className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                Dashboard
              </motion.span>
            </motion.h1>
            <motion.p
              className="text-xl sm:text-2xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              Manage your leads, clients, and properties all in one place. Track interactions, follow up on opportunities, and grow your business.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 max-w-7xl">


        {/* Navigation Tabs */}
        <div className="mb-12">
          <nav className="flex space-x-1 bg-white/80 backdrop-blur-sm p-2 rounded-3xl shadow-xl border border-white/20 overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 px-4 sm:px-6 text-sm sm:text-base font-semibold rounded-xl transition-all duration-300 min-h-[52px] transform hover:scale-105 ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xl ring-2 ring-emerald-500 ring-opacity-50'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-white hover:bg-opacity-80'
                }`}
              >
                <span className="flex items-center justify-center space-x-2">
                  <span>{tab.label}</span>
                  {tab.id === 'leads-clients' && (
                    <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${
                      activeTab === tab.id ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {leads.length}
                    </span>
                  )}
                  {tab.id === 'properties' && (
                    <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${
                      activeTab === tab.id ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {properties.length}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] animate-in slide-in-from-bottom-4 duration-700">
          {activeTab === 'leads-clients' && (
            <div className="p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Leads & Clients</h2>
                  <p className="text-slate-600">Manage and track your potential customers and existing clients</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl hover:from-emerald-700 hover:to-teal-700 flex items-center space-x-2 w-full sm:w-auto min-h-[52px] font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add New Lead</span>
                </button>
              </div>

              {/* Search and Filter Controls */}
              <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={leadsSearch}
                    onChange={(e) => setLeadsSearch(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                  />
                </div>
                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value as Lead['leadStage'] | 'All')}
                  className="px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                >
                  <option value="All">All Stages</option>
                  {['New', 'Contacted', 'Viewing', 'Offer Made', 'Closed', 'Lost'].map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>

              <LeadsTable
                leads={leads}
                onEdit={handleEditLead}
                onDelete={handleDeleteLead}
                loading={loading}
              />
            </div>
          )}

          {activeTab === 'properties' && (
            <div className="p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Properties</h2>
                  <p className="text-slate-600">Manage your property listings and real estate portfolio</p>
                </div>
                <button
                  onClick={() => setIsPropertyModalOpen(true)}
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-3 rounded-xl hover:from-teal-700 hover:to-cyan-700 flex items-center space-x-2 w-full sm:w-auto min-h-[52px] font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Add New Property</span>
                </button>
              </div>

              {/* Search and Filter Controls */}
              <div className="mb-6 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      placeholder="Search by title or address..."
                      value={propertiesSearch}
                      onChange={(e) => setPropertiesSearch(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                    />
                  </div>
                  <select
                    value={propertyTypeFilter}
                    onChange={(e) => setPropertyTypeFilter(e.target.value as Property['propertyType'] | 'All')}
                    className="px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                  >
                    <option value="All">All Types</option>
                    {['House', 'Apartment', 'Townhouse', 'Condo', 'Land', 'Commercial', 'Other'].map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min Price"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                  />
                  <input
                    type="number"
                    placeholder="Max Price"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                  />
                </div>
              </div>

              <PropertyGrid
                properties={properties}
                leads={leads}
                onEdit={handleEditProperty}
                onDelete={handleDeleteProperty}
                onLinkLead={handleLinkLeadToProperty}
                onUnlinkLead={handleUnlinkLeadFromProperty}
                loading={propertiesLoading}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>

    <AddLeadModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingLead(null);
        }}
        onSave={handleSaveLead}
        editingLead={editingLead}
      />

      <AddPropertyModal
        isOpen={isPropertyModalOpen}
        onClose={() => {
          setIsPropertyModalOpen(false);
          setEditingProperty(null);
        }}
        onSave={handleSaveProperty}
        editingProperty={editingProperty}
      />
    </DashboardLayout>
  );
}