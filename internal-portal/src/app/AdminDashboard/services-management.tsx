"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from "@/components/DashboardLayout";

interface Service {
  id: number;
  name: string;
  description: string;
  detailed_description: string;
  base_price: number;
  room_multiplier: number;
  is_active: number;
  icon: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface ServicePricing {
  id: number;
  service_id: number;
  min_quantity: number;
  max_quantity: number | null;
  price: number;
  unit: string;
  client_type: string;
  special_price: number | null;
  special_label: string;
  special_valid_from: string | null;
  special_valid_until: string | null;
}

interface PromoCode {
  id: number;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_amount: number | null;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export default function ServicesManagement() {
  const [services, setServices] = useState<Service[]>([]);
  const [servicePricing, setServicePricing] = useState<ServicePricing[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'services' | 'pricing' | 'promos'>('services');
  
  // Service form state
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    detailed_description: '',
    base_price: '',
    room_multiplier: '',
    icon: '',
    display_order: '',
    is_active: true
  });
  
  // Pricing form state
  const [pricingForm, setPricingForm] = useState({
    service_id: '',
    min_quantity: '',
    max_quantity: '',
    price: '',
    unit: 'service',
    client_type: 'all',
    special_price: '',
    special_label: '',
    special_valid_from: '',
    special_valid_until: ''
  });
  
  // Promo form state
  const [promoForm, setPromoForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    min_amount: '',
    max_uses: '',
    valid_from: '',
    valid_until: '',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const [servicesRes, pricingRes, promosRes] = await Promise.all([
        fetch('/api/services', { headers }),
        fetch('/api/service-pricing', { headers }),
        fetch('/api/promo-codes', { headers })
      ]);

      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setServices(servicesData);
      }
      
      if (pricingRes.ok) {
        const pricingData = await pricingRes.json();
        setServicePricing(pricingData);
      }
      
      if (promosRes.ok) {
        const promosData = await promosRes.json();
        setPromoCodes(promosData);
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: serviceForm.name,
          description: serviceForm.description,
          icon: serviceForm.icon,
          display_order: parseInt(serviceForm.display_order) || 0,
          active: serviceForm.is_active
        })
      });

      if (res.ok) {
        fetchData();
        setServiceForm({
          name: '',
          description: '',
          detailed_description: '',
          base_price: '',
          room_multiplier: '',
          icon: '',
          display_order: '',
          is_active: true
        });
      }
    } catch (err) {
      setError('Failed to add service');
    }
  };

  const handleUpdateService = async (id: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/services', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id,
          name: serviceForm.name,
          description: serviceForm.description,
          icon: serviceForm.icon,
          display_order: parseInt(serviceForm.display_order) || 0,
          active: serviceForm.is_active
        })
      });

      if (res.ok) {
        fetchData();
        setServiceForm({
          name: '',
          description: '',
          detailed_description: '',
          base_price: '',
          room_multiplier: '',
          icon: '',
          display_order: '',
          is_active: true
        });
      }
    } catch (err) {
      setError('Failed to update service');
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm('Are you sure you want to delete this service? This will affect all pricing and quotes.')) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/services?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      setError('Failed to delete service');
    }
  };

  const handleAddPricing = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/service-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          service_id: parseInt(pricingForm.service_id),
          min_quantity: parseInt(pricingForm.min_quantity) || 1,
          max_quantity: pricingForm.max_quantity ? parseInt(pricingForm.max_quantity) : null,
          price: parseFloat(pricingForm.price),
          unit: pricingForm.unit,
          client_type: pricingForm.client_type,
          special_price: pricingForm.special_price ? parseFloat(pricingForm.special_price) : null,
          special_label: pricingForm.special_label,
          special_valid_from: pricingForm.special_valid_from || null,
          special_valid_until: pricingForm.special_valid_until || null
        })
      });

      if (res.ok) {
        fetchData();
        setPricingForm({
          service_id: '',
          min_quantity: '',
          max_quantity: '',
          price: '',
          unit: 'service',
          client_type: 'all',
          special_price: '',
          special_label: '',
          special_valid_from: '',
          special_valid_until: ''
        });
      }
    } catch (err) {
      setError('Failed to add pricing');
    }
  };

  const handleAddPromo = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/promo-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: promoForm.code.toUpperCase(),
          description: promoForm.description,
          discount_type: promoForm.discount_type,
          discount_value: parseFloat(promoForm.discount_value),
          min_amount: promoForm.min_amount ? parseFloat(promoForm.min_amount) : null,
          max_uses: promoForm.max_uses ? parseInt(promoForm.max_uses) : null,
          valid_from: promoForm.valid_from || null,
          valid_until: promoForm.valid_until || null,
          is_active: promoForm.is_active
        })
      });

      if (res.ok) {
        fetchData();
        setPromoForm({
          code: '',
          description: '',
          discount_type: 'percentage',
          discount_value: '',
          min_amount: '',
          max_uses: '',
          valid_from: '',
          valid_until: '',
          is_active: true
        });
      }
    } catch (err) {
      setError('Failed to add promo code');
    }
  };

  const handleDeletePromo = async (id: number) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/promo-codes?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      setError('Failed to delete promo code');
    }
  };

  if (loading) return <DashboardLayout title="Services Management" role="admin"><div className="animate-pulse">Loading...</div></DashboardLayout>;
  if (error) return <DashboardLayout title="Services Management" role="admin"><div className="text-red-500">{error}</div></DashboardLayout>;

  return (
    <DashboardLayout title="Services Management" role="admin">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex space-x-4 border-b border-white/20 pb-2">
          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'services' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'}`}
          >
            Services
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'pricing' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'}`}
          >
            Pricing
          </button>
          <button
            onClick={() => setActiveTab('promos')}
            className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'promos' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'}`}
          >
            Promo Codes
          </button>
        </div>

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            {/* Add Service Form */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Add New Service</h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Service Name"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white placeholder-white/50"
                />
                <input
                  type="text"
                  placeholder="Icon (emoji)"
                  value={serviceForm.icon}
                  onChange={(e) => setServiceForm({...serviceForm, icon: e.target.value})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white placeholder-white/50"
                />
                <input
                  type="number"
                  placeholder="Display Order"
                  value={serviceForm.display_order}
                  onChange={(e) => setServiceForm({...serviceForm, display_order: e.target.value})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white placeholder-white/50"
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="service-active"
                    checked={serviceForm.is_active}
                    onChange={(e) => setServiceForm({...serviceForm, is_active: e.target.checked})}
                    className="rounded"
                  />
                  <label htmlFor="service-active" className="text-white text-sm">Active</label>
                </div>
              </div>
              <textarea
                placeholder="Description"
                value={serviceForm.description}
                onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})}
                rows={3}
                className="w-full mt-3 px-3 py-2 border border-white/20 rounded bg-white/10 text-white placeholder-white/50"
              />
              <button
                onClick={handleAddService}
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Service
              </button>
            </div>

            {/* Services List */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Existing Services</h3>
              <div className="space-y-3">
                {services.map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{service.icon}</span>
                      <div>
                        <p className="font-semibold text-white">{service.name}</p>
                        <p className="text-sm text-white/60">{service.description}</p>
                        <p className="text-xs text-white/40">Order: {service.display_order} | Active: {service.is_active ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="text-red-400 hover:text-red-300 px-3 py-1 border border-red-500/30 rounded transition-all"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            {/* Add Pricing Form */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Add Service Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={pricingForm.service_id}
                  onChange={(e) => setPricingForm({...pricingForm, service_id: e.target.value})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white"
                >
                  <option value="">Select Service</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id} className="text-black">{service.name}</option>
                  ))}
                </select>
                <select
                  value={pricingForm.client_type}
                  onChange={(e) => setPricingForm({...pricingForm, client_type: e.target.value})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white"
                >
                  <option value="all" className="text-black">All Clients</option>
                  <option value="individual" className="text-black">Individual</option>
                  <option value="business" className="text-black">Business</option>
                </select>
                <input
                  type="number"
                  placeholder="Price (R)"
                  value={pricingForm.price}
                  onChange={(e) => setPricingForm({...pricingForm, price: e.target.value})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white placeholder-white/50"
                />
                <input
                  type="number"
                  placeholder="Min Quantity"
                  value={pricingForm.min_quantity}
                  onChange={(e) => setPricingForm({...pricingForm, min_quantity: e.target.value})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white placeholder-white/50"
                />
                <input
                  type="number"
                  placeholder="Max Quantity (optional)"
                  value={pricingForm.max_quantity}
                  onChange={(e) => setPricingForm({...pricingForm, max_quantity: e.target.value})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white placeholder-white/50"
                />
                <input
                  type="text"
                  placeholder="Unit (e.g., service, hour)"
                  value={pricingForm.unit}
                  onChange={(e) => setPricingForm({...pricingForm, unit: e.target.value})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white placeholder-white/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <input
                  type="number"
                  placeholder="Special Price (optional)"
                  value={pricingForm.special_price}
                  onChange={(e) => setPricingForm({...pricingForm, special_price: e.target.value})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white placeholder-white/50"
                />
                <input
                  type="text"
                  placeholder="Special Label (e.g., Summer Special)"
                  value={pricingForm.special_label}
                  onChange={(e) => setPricingForm({...pricingForm, special_label: e.target.value})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white placeholder-white/50"
                />
              </div>
              <button
                onClick={handleAddPricing}
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Pricing
              </button>
            </div>

            {/* Pricing List */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Existing Pricing</h3>
              <div className="space-y-2">
                {servicePricing.map((pricing) => {
                  const service = services.find(s => s.id === pricing.service_id);
                  return (
                    <div key={pricing.id} className="p-3 bg-white/5 border border-white/10 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-white">{service?.name || 'Unknown Service'}</p>
                          <p className="text-sm text-white/60">R{pricing.price} per {pricing.unit} | {pricing.client_type}</p>
                          <p className="text-xs text-white/40">Min: {pricing.min_quantity} | Max: {pricing.max_quantity || 'Unlimited'}</p>
                          {pricing.special_price && (
                            <p className="text-xs text-green-400">Special: R{pricing.special_price} ({pricing.special_label})</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Promo Codes Tab */}
        {activeTab === 'promos' && (
          <div className="space-y-6">
            {/* Add Promo Form */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Generate Promo Code</h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Promo Code"
                  value={promoForm.code}
                  onChange={(e) => setPromoForm({...promoForm, code: e.target.value.toUpperCase()})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white placeholder-white/50"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={promoForm.description}
                  onChange={(e) => setPromoForm({...promoForm, description: e.target.value})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white placeholder-white/50"
                />
                <select
                  value={promoForm.discount_type}
                  onChange={(e) => setPromoForm({...promoForm, discount_type: e.target.value})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white"
                >
                  <option value="percentage" className="text-black">Percentage (%)</option>
                  <option value="fixed" className="text-black">Fixed Amount (R)</option>
                </select>
                <input
                  type="number"
                  placeholder="Discount Value"
                  value={promoForm.discount_value}
                  onChange={(e) => setPromoForm({...promoForm, discount_value: e.target.value})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white placeholder-white/50"
                />
                <input
                  type="number"
                  placeholder="Min Amount (optional)"
                  value={promoForm.min_amount}
                  onChange={(e) => setPromoForm({...promoForm, min_amount: e.target.value})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white placeholder-white/50"
                />
                <input
                  type="number"
                  placeholder="Max Uses (optional)"
                  value={promoForm.max_uses}
                  onChange={(e) => setPromoForm({...promoForm, max_uses: e.target.value})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white placeholder-white/50"
                />
                <input
                  type="datetime-local"
                  placeholder="Valid From"
                  value={promoForm.valid_from}
                  onChange={(e) => setPromoForm({...promoForm, valid_from: e.target.value})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white placeholder-white/50"
                />
                <input
                  type="datetime-local"
                  placeholder="Valid Until"
                  value={promoForm.valid_until}
                  onChange={(e) => setPromoForm({...promoForm, valid_until: e.target.value})}
                  className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white placeholder-white/50"
                />
              </div>
              <div className="flex items-center space-x-2 mt-3">
                <input
                  type="checkbox"
                  id="promo-active"
                  checked={promoForm.is_active}
                  onChange={(e) => setPromoForm({...promoForm, is_active: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="promo-active" className="text-white text-sm">Active</label>
              </div>
              <button
                onClick={handleAddPromo}
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Generate Promo Code
              </button>
            </div>

            {/* Promo Codes List */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Existing Promo Codes</h3>
              <div className="space-y-2">
                {promoCodes.map((promo) => (
                  <div key={promo.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded">
                    <div>
                      <p className="font-semibold text-white">{promo.code}</p>
                      <p className="text-sm text-white/60">{promo.description}</p>
                      <p className="text-xs text-white/40">
                        {promo.discount_type === 'percentage' ? `${promo.discount_value}% off` : `R${promo.discount_value} off`}
                        {promo.max_uses && ` | Max uses: ${promo.max_uses}`}
                        {promo.used_count > 0 && ` | Used: ${promo.used_count}`}
                      </p>
                      <p className="text-xs text-white/40">
                        Active: {promo.is_active ? 'Yes' : 'No'}
                        {promo.valid_until && ` | Expires: ${new Date(promo.valid_until).toLocaleDateString()}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeletePromo(promo.id)}
                      className="text-red-400 hover:text-red-300 px-3 py-1 border border-red-500/30 rounded transition-all"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
