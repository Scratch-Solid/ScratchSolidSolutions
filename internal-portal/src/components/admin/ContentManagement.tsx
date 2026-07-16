"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Users, Bot, Image, MessageSquare, Trash2, Edit, Check, X } from "lucide-react";

export default function ContentManagement() {
  const [mode, setMode] = useState<'static' | 'leaders' | 'ai-bot' | 'backgrounds' | 'gallery' | 'reviews'>('static');
  const [contentType, setContentType] = useState<'contact' | 'privacy' | 'terms' | 'services' | 'about' | 'indemnity' | 'consent-form' | 'contract'>('contact');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState<any>({});

  const marketingProxy = (path: string) => `/api/marketing${path}`;

  const [leaders, setLeaders] = useState<any[]>([]);
  const [leaderForm, setLeaderForm] = useState<any>({ id: null, name: '', title: '', description: '', image_url: '', display_order: 0, active: true });

  const [aiItems, setAiItems] = useState<any[]>([]);
  const [aiForm, setAiForm] = useState<any>({ id: null, question: '', response: '', category: '' });

  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [backgroundPreview, setBackgroundPreview] = useState('');

  const [galleryImages, setGalleryImages] = useState<{ url: string; caption?: string }[]>([]);
  const [galleryCaption, setGalleryCaption] = useState('');

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewFilter, setReviewFilter] = useState<'approved' | 'pending' | 'rejected'>('pending');

  useEffect(() => {
    if (mode === 'static') fetchContent();
    if (mode === 'leaders') fetchLeaders();
    if (mode === 'ai-bot') fetchAi();
    if (mode === 'backgrounds') fetchBackground();
    if (mode === 'gallery') fetchGallery();
    if (mode === 'reviews') fetchReviews();
  }, [contentType, mode, reviewFilter]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      if (mode !== 'static') return;
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) {
        setMessage('Authentication required');
        return;
      }
      if (contentType === 'consent-form') {
        const response = await fetch('/api/admin/consent-form', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json() as { title?: string; content?: string; id?: string };
          setFormData(data || {});
          setContent(data?.content || '');
        }
      } else if (contentType === 'contract') {
        const response = await fetch('/api/admin/contract-content', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json() as { title?: string; body?: string; version?: string; id?: string };
          setFormData(data || {});
          setContent(data?.body || '');
        }
      } else {
        if (!token) {
          setMessage('Authentication required to load content');
          return;
        }
        const response = await fetch(marketingProxy(`/content?type=${contentType}`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json() as { content?: string };
          setContent(data.content || '');
        } else {
          setMessage('Failed to load content');
        }
      }
    } catch (error) {
      setMessage('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackground = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) return;
      const res = await fetch(marketingProxy('/content?type=background-image'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json() as { content?: string };
        setBackgroundUrl(data.content || '');
        setBackgroundPreview(data.content || '');
      }
    } catch (err) {
      setMessage('Failed to load background');
    } finally {
      setLoading(false);
    }
  };

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) return;
      const res = await fetch(marketingProxy('/content?type=gallery-images'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json() as { content?: string };
        if (data.content) {
          try {
            const json = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
            const arr = Array.isArray(json) ? json : json?.images || [];
            setGalleryImages(arr.filter((x: any) => x?.url));
          } catch (e) {
            setGalleryImages([]);
          }
        } else {
          setGalleryImages([]);
        }
      }
    } catch (err) {
      setMessage('Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) return;
      const res = await fetch(marketingProxy(`/reviews?status=${reviewFilter}`), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setReviews((data as any)?.results || (Array.isArray(data) ? data : []));
      }
    } catch (err) {
      setMessage('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaders = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) {
        setMessage('Authentication required to load leaders');
        return;
      }
      const res = await fetch(marketingProxy('/leaders'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setLeaders(await res.json());
      } else {
        setMessage('Failed to load leaders');
      }
    } catch (err) {
      setMessage('Failed to load leaders');
    } finally {
      setLoading(false);
    }
  };

  const fetchAi = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) {
        setMessage('Authentication required to load bot content');
        return;
      }
      const res = await fetch(marketingProxy('/ai-responses'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAiItems(await res.json());
      else setMessage('Failed to load bot content');
    } catch (err) {
      setMessage('Failed to load bot content');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) {
      setMessage('Authentication required to upload');
      return;
    }
    try {
      setLoading(true);
      const folder = mode === 'backgrounds' ? 'backgrounds' : mode === 'gallery' ? 'gallery' : 'leaders';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const uploadRes = await fetch(marketingProxy('/upload'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        setMessage(`Upload failed: ${uploadRes.status} - ${errorText}`);
        setLoading(false);
        return;
      }

      const uploadData = await uploadRes.json() as { publicUrl?: string; key?: string };
      if (!uploadData.publicUrl) {
        setMessage('Upload failed: no URL returned');
        setLoading(false);
        return;
      }

      const finalUrl = uploadData.publicUrl;
      if (mode === 'leaders') {
        setLeaderForm((prev: any) => ({ ...prev, image_url: finalUrl }));
      } else if (mode === 'backgrounds') {
        setBackgroundUrl(finalUrl);
        setBackgroundPreview(finalUrl);
      } else if (mode === 'gallery') {
        setGalleryImages(prev => [...prev, { url: finalUrl, caption: galleryCaption }]);
        setGalleryCaption('');
      }
      setMessage('Image uploaded');
    } catch (err) {
      setMessage(`Upload failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900">Content Management</h2>
        <p className="text-stone-500 text-sm mt-1">Manage marketing content, leaders, AI bot responses, and reviews</p>
      </div>

      {message && (
        <Badge variant={message.includes('success') || message.includes('Saved') || message.includes('uploaded') ? 'default' : 'destructive'}>
          {message}
        </Badge>
      )}

      <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="static" className="gap-2">
            <FileText className="h-4 w-4" />
            Static
          </TabsTrigger>
          <TabsTrigger value="leaders" className="gap-2">
            <Users className="h-4 w-4" />
            Leaders
          </TabsTrigger>
          <TabsTrigger value="ai-bot" className="gap-2">
            <Bot className="h-4 w-4" />
            AI Bot
          </TabsTrigger>
          <TabsTrigger value="backgrounds" className="gap-2">
            <Image className="h-4 w-4" />
            Backgrounds
          </TabsTrigger>
          <TabsTrigger value="gallery" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Gallery
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="static" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Static Content</CardTitle>
              <CardDescription>Edit website content pages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Content Type</label>
                  <Select value={contentType} onValueChange={(v) => setContentType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contact">Contact Information</SelectItem>
                      <SelectItem value="privacy">Privacy Policy</SelectItem>
                      <SelectItem value="terms">Terms of Service</SelectItem>
                      <SelectItem value="services">Services Page</SelectItem>
                      <SelectItem value="about">About Page</SelectItem>
                      <SelectItem value="indemnity">Indemnity</SelectItem>
                      <SelectItem value="consent-form">Consent Form</SelectItem>
                      <SelectItem value="contract">Contract Content</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {loading ? (
                  <div className="text-center py-8 text-stone-500">Loading...</div>
                ) : (
                  <div className="space-y-4">
                    {contentType === 'consent-form' ? (
                      <div className="space-y-3">
                        <Input 
                          value={formData.title || ''} 
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                          placeholder="Title" 
                        />
                        <Textarea 
                          value={formData.content || ''} 
                          onChange={(e) => setFormData({ ...formData, content: e.target.value })} 
                          rows={10} 
                          className="font-mono text-sm" 
                          placeholder="Enter consent text" 
                        />
                      </div>
                    ) : contentType === 'contract' ? (
                      <div className="space-y-3">
                        <Input 
                          value={formData.title || ''} 
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                          placeholder="Title" 
                        />
                        <Input 
                          value={formData.version || ''} 
                          onChange={(e) => setFormData({ ...formData, version: e.target.value })} 
                          placeholder="Version" 
                        />
                        <Textarea 
                          value={formData.body || ''} 
                          onChange={(e) => setFormData({ ...formData, body: e.target.value })} 
                          rows={10} 
                          className="font-mono text-sm" 
                          placeholder="Enter contract body" 
                        />
                      </div>
                    ) : (
                      <Textarea 
                        value={content} 
                        onChange={(e) => setContent(e.target.value)} 
                        rows={15} 
                        className="font-mono text-sm" 
                        placeholder="Enter content..." 
                      />
                    )}
                    <Button onClick={() => {}} disabled={loading}>
                      {loading ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaders">
          <Card>
            <CardHeader>
              <CardTitle>Leaders Management</CardTitle>
              <CardDescription>Manage leadership team members</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-stone-500">Loading leaders...</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      value={leaderForm.name} 
                      onChange={(e) => setLeaderForm({ ...leaderForm, name: e.target.value })}
                      placeholder="Name"
                    />
                    <Input 
                      value={leaderForm.title} 
                      onChange={(e) => setLeaderForm({ ...leaderForm, title: e.target.value })}
                      placeholder="Title"
                    />
                  </div>
                  <Textarea 
                    value={leaderForm.description} 
                    onChange={(e) => setLeaderForm({ ...leaderForm, description: e.target.value })}
                    placeholder="Description"
                    rows={3}
                  />
                  <div className="flex items-center gap-4">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                    />
                    {leaderForm.image_url && (
                      <img src={leaderForm.image_url} alt="Preview" className="h-16 w-16 object-cover rounded" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => {}} disabled={loading}>
                      {leaderForm.id ? 'Update' : 'Add'} Leader
                    </Button>
                    {leaderForm.id && (
                      <Button variant="outline" onClick={() => setLeaderForm({ id: null, name: '', title: '', description: '', image_url: '', display_order: 0, active: true })}>
                        Cancel
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 mt-6">
                    {leaders.map((leader: any) => (
                      <div key={leader.id} className="flex items-center justify-between p-3 border rounded-lg bg-stone-50">
                        <div className="flex items-center gap-3">
                          {leader.image_url && (
                            <img src={leader.image_url} alt={leader.name} className="h-10 w-10 object-cover rounded" />
                          )}
                          <div>
                            <div className="font-medium">{leader.name}</div>
                            <div className="text-sm text-stone-500">{leader.title}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setLeaderForm(leader)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => {}}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-bot">
          <Card>
            <CardHeader>
              <CardTitle>AI Bot Content</CardTitle>
              <CardDescription>Manage AI chatbot responses</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-stone-500">Loading...</div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Input 
                      value={aiForm.question} 
                      onChange={(e) => setAiForm({ ...aiForm, question: e.target.value })}
                      placeholder="Question"
                    />
                    <Textarea 
                      value={aiForm.response} 
                      onChange={(e) => setAiForm({ ...aiForm, response: e.target.value })}
                      placeholder="Response"
                      rows={4}
                    />
                    <Input 
                      value={aiForm.category} 
                      onChange={(e) => setAiForm({ ...aiForm, category: e.target.value })}
                      placeholder="Category"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => {}} disabled={loading}>
                      {aiForm.id ? 'Update' : 'Add'} Response
                    </Button>
                    {aiForm.id && (
                      <Button variant="outline" onClick={() => setAiForm({ id: null, question: '', response: '', category: '' })}>
                        Cancel
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 mt-6">
                    {aiItems.map((item: any) => (
                      <div key={item.id} className="p-3 border rounded-lg bg-stone-50">
                        <div className="font-medium">{item.question}</div>
                        <div className="text-sm text-stone-600 mt-1">{item.response}</div>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" onClick={() => setAiForm(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => {}}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backgrounds">
          <Card>
            <CardHeader>
              <CardTitle>Background Images</CardTitle>
              <CardDescription>Manage website background images</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                  <Button variant="outline" onClick={() => backgroundUrl && setBackgroundPreview(backgroundUrl)}>
                    Preview
                  </Button>
                </div>
                {backgroundPreview && (
                  <div className="rounded-lg overflow-hidden border">
                    <img src={backgroundPreview} alt="Background preview" className="w-full h-64 object-cover" />
                  </div>
                )}
                <Button onClick={async () => {}} disabled={loading || !backgroundUrl}>
                  Save Background
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery">
          <Card>
            <CardHeader>
              <CardTitle>Gallery Images</CardTitle>
              <CardDescription>Manage gallery images</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Caption (optional)</label>
                    <Input 
                      value={galleryCaption} 
                      onChange={(e) => setGalleryCaption(e.target.value)} 
                      placeholder="Sparkling kitchen transformation" 
                    />
                  </div>
                  <div>
                    <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {galleryImages.map((img, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden border bg-stone-50">
                      <img src={img.url} alt={img.caption || `Gallery ${idx + 1}`} className="w-full h-40 object-cover" />
                      {img.caption && <div className="p-2 text-sm text-stone-600">{img.caption}</div>}
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="absolute top-2 right-2" 
                        onClick={() => setGalleryImages(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button onClick={async () => {}} disabled={loading}>
                  Save Gallery
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Reviews Management</CardTitle>
              <CardDescription>Moderate customer reviews</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2 items-center">
                  <span className="text-sm font-medium">Filter:</span>
                  {(['pending', 'approved', 'rejected'] as const).map(f => (
                    <Button
                      key={f}
                      size="sm"
                      variant={reviewFilter === f ? 'default' : 'outline'}
                      onClick={() => setReviewFilter(f)}
                    >
                      {f}
                    </Button>
                  ))}
                </div>
                <div className="space-y-3">
                  {reviews.map((rev: any) => (
                    <div key={rev.id} className="p-4 border rounded-lg bg-stone-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{rev.user_name || 'Client'} • {rev.rating}★</div>
                          <div className="text-sm text-stone-500">{rev.service_location || 'Verified Client'}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" onClick={() => {}}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => {}}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {}}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-2 text-stone-700">{rev.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
