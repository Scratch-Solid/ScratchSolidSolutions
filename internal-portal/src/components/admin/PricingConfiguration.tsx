"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { DollarSign, Info } from "lucide-react";

export default function PricingConfiguration() {
  const [pricingMatrix, setPricingMatrix] = useState<any[]>([]);
  const [transportFees, setTransportFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const response = await fetch('/api/v2/pricing/matrix', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPricingMatrix(data.pricing || []);
        setTransportFees(data.transport || []);
      }
    } catch (error) {
      setMessage('Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const handleCellEdit = (id: string, field: string, value: string) => {
    setEditingCell({ id, field });
    setEditValue(value);
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const response = await fetch('/api/v2/pricing/matrix', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceType: editingCell.id,
          [editingCell.field]: parseFloat(editValue)
        })
      });
      if (response.ok) {
        setMessage('Pricing updated successfully');
        fetchPricingData();
      } else {
        setMessage('Failed to update pricing');
      }
    } catch (error) {
      setMessage('Failed to update pricing');
    } finally {
      setEditingCell(null);
      setEditValue('');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-stone-500">Loading pricing configuration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Dynamic Pricing Matrix</h2>
          <p className="text-stone-500 text-sm mt-1">Configure service pricing and transport fees</p>
        </div>
        {message && (
          <Badge variant={message.includes('success') ? 'default' : 'destructive'}>
            {message}
          </Badge>
        )}
      </div>

      {/* Pricing Configuration Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Service Pricing Configuration</CardTitle>
          <CardDescription>Click on any value to edit. Changes are saved immediately.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Base Price (R)</TableHead>
                  <TableHead>Transport Fee (R)</TableHead>
                  <TableHead>Weekend Surcharge (%)</TableHead>
                  <TableHead>Holiday Surcharge (%)</TableHead>
                  <TableHead>Rush Surcharge (%)</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricingMatrix.map((item: any) => (
                  <TableRow key={item.serviceType}>
                    <TableCell className="font-medium">{item.serviceType}</TableCell>
                    <TableCell>
                      {editingCell?.id === item.serviceType && editingCell?.field === 'basePrice' ? (
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          className="w-24"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-[#2E1F16] font-medium"
                          onClick={() => handleCellEdit(item.serviceType, 'basePrice', item.basePrice?.toString() || '')}
                        >
                          R{item.basePrice?.toFixed(2) || '0.00'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingCell?.id === item.serviceType && editingCell?.field === 'transportFee' ? (
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          className="w-24"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-[#2E1F16] font-medium"
                          onClick={() => handleCellEdit(item.serviceType, 'transportFee', item.transportFee?.toString() || '')}
                        >
                          R{item.transportFee?.toFixed(2) || '0.00'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingCell?.id === item.serviceType && editingCell?.field === 'weekendSurcharge' ? (
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          className="w-20"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-[#2E1F16] font-medium"
                          onClick={() => handleCellEdit(item.serviceType, 'weekendSurcharge', item.weekendSurcharge?.toString() || '')}
                        >
                          {item.weekendSurcharge || 0}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingCell?.id === item.serviceType && editingCell?.field === 'holidaySurcharge' ? (
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          className="w-20"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-[#2E1F16] font-medium"
                          onClick={() => handleCellEdit(item.serviceType, 'holidaySurcharge', item.holidaySurcharge?.toString() || '')}
                        >
                          {item.holidaySurcharge || 0}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingCell?.id === item.serviceType && editingCell?.field === 'rushSurcharge' ? (
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          className="w-20"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-[#2E1F16] font-medium"
                          onClick={() => handleCellEdit(item.serviceType, 'rushSurcharge', item.rushSurcharge?.toString() || '')}
                        >
                          {item.rushSurcharge || 0}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-stone-500 text-sm">
                      {item.lastUpdated ? new Date(item.lastUpdated).toLocaleString() : 'Never'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex items-start gap-2 text-sm text-stone-500 bg-stone-50 p-3 rounded-lg">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>Changes are saved immediately and cached for 5 minutes.</p>
          </div>
        </CardContent>
      </Card>

      {/* Transport Fees Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Suburb Transport Fees</CardTitle>
          <CardDescription>View transport fees by area</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area Name</TableHead>
                  <TableHead>Base Transport Fee (R)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transportFees.map((item: any) => (
                  <TableRow key={item.areaName}>
                    <TableCell className="font-medium">{item.areaName}</TableCell>
                    <TableCell className="font-medium text-stone-700">
                      R{item.baseTransportFee?.toFixed(2) || '0.00'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
