"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import PromoDistributionModal from "@/components/PromoDistributionModal";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Package, DollarSign, Gift, BarChart3, QrCode, Share2, Trash2, Plus } from "lucide-react";

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
  distribution_count?: number;
  last_distributed_at?: string | null;
  distribution_channels?: string;
}

export default function ServicesManagement() {
  const [services, setServices] = useState<Service[]>([]);
  const [servicePricing, setServicePricing] = useState<ServicePricing[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'services' | 'pricing' | 'promos' | 'analytics'>('services');
  
  // QR code modal state
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedPromoCode, setSelectedPromoCode] = useState<PromoCode | null>(null);
  
  // Distribution modal state
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [selectedPromoForDistribution, setSelectedPromoForDistribution] = useState<PromoCode | null>(null);
  
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
        setServices(servicesData as Service[]);
      } else {
        setError('Failed to load services');
      }
      
      if (pricingRes.ok) {
        const pricingData = await pricingRes.json();
        setServicePricing(pricingData as ServicePricing[]);
      } else {
        setError('Failed to load pricing');
      }
      
      if (promosRes.ok) {
        const promosData = await promosRes.json();
        setPromoCodes(promosData as PromoCode[]);
      } else {
        setError('Failed to load promos');
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
      } else {
        setError('Failed to add service');
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
      } else {
        setError('Failed to update service');
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
      } else {
        setError('Failed to delete service');
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
      } else {
        setError('Failed to add pricing');
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
      } else {
        setError('Failed to add promo code');
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
      } else {
        setError('Failed to delete promo code');
      }
    } catch (err) {
      setError('Failed to delete promo code');
    }
  };

  const handleShowQRCode = (promo: PromoCode) => {
    setSelectedPromoCode(promo);
    setShowQRModal(true);
  };

  const handleCloseQRModal = () => {
    setShowQRModal(false);
    setSelectedPromoCode(null);
  };

  const handleShowDistribution = (promo: PromoCode) => {
    setSelectedPromoForDistribution(promo);
    setShowDistributionModal(true);
  };

  const handleCloseDistributionModal = () => {
    setShowDistributionModal(false);
    setSelectedPromoForDistribution(null);
  };

  const handleDistribute = async (data: { channel: string; recipientCount: number; notes: string }) => {
    if (!selectedPromoForDistribution) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/promo-distribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          promoCodeId: selectedPromoForDistribution.id,
          promoCode: selectedPromoForDistribution.code,
          channel: data.channel,
          recipientCount: data.recipientCount,
          notes: data.notes,
        }),
      });

      if (res.ok) {
        fetchData(); // Refresh to show updated distribution data
      } else {
        setError('Failed to distribute promo code');
      }
    } catch (err) {
      setError('Failed to distribute promo code');
    }
  };

  if (loading) return <DashboardLayout title="Services Management" role="admin"><div className="flex items-center justify-center py-12 text-slate-500">Loading...</div></DashboardLayout>;
  if (error) return <DashboardLayout title="Services Management" role="admin"><div className="text-red-500">{error}</div></DashboardLayout>;

  return (
    <DashboardLayout title="Services Management" role="admin">
      <div className="space-y-6">
        {error && <Badge variant="destructive">{error}</Badge>}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="services" className="gap-2">
              <Package className="h-4 w-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="promos" className="gap-2">
              <Gift className="h-4 w-4" />
              Promo Codes
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add New Service
                </CardTitle>
                <CardDescription>Create a new service offering</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Service Name"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})}
                  />
                  <Input
                    placeholder="Icon (emoji)"
                    value={serviceForm.icon}
                    onChange={(e) => setServiceForm({...serviceForm, icon: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Display Order"
                    value={serviceForm.display_order}
                    onChange={(e) => setServiceForm({...serviceForm, display_order: e.target.value})}
                  />
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="service-active"
                      checked={serviceForm.is_active}
                      onCheckedChange={(checked) => setServiceForm({...serviceForm, is_active: checked})}
                    />
                    <label htmlFor="service-active" className="text-sm font-medium">Active</label>
                  </div>
                </div>
                <Textarea
                  placeholder="Description"
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})}
                  rows={3}
                  className="mt-4"
                />
                <Button onClick={handleAddService} className="mt-4">
                  Add Service
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Services</CardTitle>
                <CardDescription>Manage your service offerings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{service.icon}</span>
                        <div>
                          <p className="font-semibold text-slate-900">{service.name}</p>
                          <p className="text-sm text-slate-500">{service.description}</p>
                          <p className="text-xs text-slate-400">Order: {service.display_order} | Active: {service.is_active ? 'Yes' : 'No'}</p>
                        </div>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteService(service.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Service Pricing
                </CardTitle>
                <CardDescription>Configure pricing tiers for services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select value={pricingForm.service_id} onValueChange={(v) => setPricingForm({...pricingForm, service_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(service => (
                        <SelectItem key={service.id} value={service.id.toString()}>{service.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={pricingForm.client_type} onValueChange={(v) => setPricingForm({...pricingForm, client_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Price (R)"
                    value={pricingForm.price}
                    onChange={(e) => setPricingForm({...pricingForm, price: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Min Quantity"
                    value={pricingForm.min_quantity}
                    onChange={(e) => setPricingForm({...pricingForm, min_quantity: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Max Quantity (optional)"
                    value={pricingForm.max_quantity}
                    onChange={(e) => setPricingForm({...pricingForm, max_quantity: e.target.value})}
                  />
                  <Input
                    placeholder="Unit (e.g., service, hour)"
                    value={pricingForm.unit}
                    onChange={(e) => setPricingForm({...pricingForm, unit: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Input
                    type="number"
                    placeholder="Special Price (optional)"
                    value={pricingForm.special_price}
                    onChange={(e) => setPricingForm({...pricingForm, special_price: e.target.value})}
                  />
                  <Input
                    placeholder="Special Label (e.g., Summer Special)"
                    value={pricingForm.special_label}
                    onChange={(e) => setPricingForm({...pricingForm, special_label: e.target.value})}
                  />
                </div>
                <Button onClick={handleAddPricing} className="mt-4">
                  Add Pricing
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Pricing</CardTitle>
                <CardDescription>View current pricing configurations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {servicePricing.map((pricing) => {
                    const service = services.find(s => s.id === pricing.service_id);
                    return (
                      <div key={pricing.id} className="p-3 border rounded-lg bg-slate-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-slate-900">{service?.name || 'Unknown Service'}</p>
                            <p className="text-sm text-slate-600">R{pricing.price} per {pricing.unit} | {pricing.client_type}</p>
                            <p className="text-xs text-slate-500">Min: {pricing.min_quantity} | Max: {pricing.max_quantity || 'Unlimited'}</p>
                            {pricing.special_price && (
                              <p className="text-xs text-green-600">Special: R{pricing.special_price} ({pricing.special_label})</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Generate Promo Code
                </CardTitle>
                <CardDescription>Create promotional discount codes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Promo Code"
                    value={promoForm.code}
                    onChange={(e) => setPromoForm({...promoForm, code: e.target.value.toUpperCase()})}
                  />
                  <Input
                    placeholder="Description"
                    value={promoForm.description}
                    onChange={(e) => setPromoForm({...promoForm, description: e.target.value})}
                  />
                  <Select value={promoForm.discount_type} onValueChange={(v) => setPromoForm({...promoForm, discount_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (R)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Discount Value"
                    value={promoForm.discount_value}
                    onChange={(e) => setPromoForm({...promoForm, discount_value: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Min Amount (optional)"
                    value={promoForm.min_amount}
                    onChange={(e) => setPromoForm({...promoForm, min_amount: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Max Uses (optional)"
                    value={promoForm.max_uses}
                    onChange={(e) => setPromoForm({...promoForm, max_uses: e.target.value})}
                  />
                  <Input
                    type="datetime-local"
                    placeholder="Valid From"
                    value={promoForm.valid_from}
                    onChange={(e) => setPromoForm({...promoForm, valid_from: e.target.value})}
                  />
                  <Input
                    type="datetime-local"
                    placeholder="Valid Until"
                    value={promoForm.valid_until}
                    onChange={(e) => setPromoForm({...promoForm, valid_until: e.target.value})}
                  />
                </div>
                <div className="flex items-center space-x-2 mt-4">
                  <Switch
                    id="promo-active"
                    checked={promoForm.is_active}
                    onCheckedChange={(checked) => setPromoForm({...promoForm, is_active: checked})}
                  />
                  <label htmlFor="promo-active" className="text-sm font-medium">Active</label>
                </div>
                <Button onClick={handleAddPromo} className="mt-4">
                  Generate Promo Code
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Promo Codes</CardTitle>
                <CardDescription>Manage promotional codes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {promoCodes.map((promo) => (
                    <div key={promo.id} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                      <div>
                        <p className="font-semibold text-slate-900">{promo.code}</p>
                        <p className="text-sm text-slate-600">{promo.description}</p>
                        <p className="text-xs text-slate-500">
                          {promo.discount_type === 'percentage' ? `${promo.discount_value}% off` : `R${promo.discount_value} off`}
                          {promo.max_uses && ` | Max uses: ${promo.max_uses}`}
                          {promo.used_count > 0 && ` | Used: ${promo.used_count}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          Active: {promo.is_active ? 'Yes' : 'No'}
                          {promo.valid_until && ` | Expires: ${new Date(promo.valid_until).toLocaleDateString()}`}
                        </p>
                        {(promo.distribution_count || 0) > 0 && (
                          <p className="text-xs text-green-600 mt-1">
                            Distributed: {promo.distribution_count}x
                            {promo.last_distributed_at && ` | Last: ${new Date(promo.last_distributed_at).toLocaleDateString()}`}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleShowDistribution(promo)}>
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleShowQRCode(promo)}>
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeletePromo(promo.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* QR Code Modal */}
      {showQRModal && selectedPromoCode && (
        <QRCodeDisplay
          promoCode={selectedPromoCode.code}
          shareUrl={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://scratchsolidsolutions.org'}/services?promo=${selectedPromoCode.code}`}
          onClose={handleCloseQRModal}
        />
      )}
      
      {/* Distribution Modal */}
      {showDistributionModal && selectedPromoForDistribution && (
        <PromoDistributionModal
          promoCode={selectedPromoForDistribution}
          onClose={handleCloseDistributionModal}
          onDistribute={handleDistribute}
        />
      )}
    </DashboardLayout>
  );
}
