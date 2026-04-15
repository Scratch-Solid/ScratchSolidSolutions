"use client";

import { useState, useEffect } from "react";
import { getAboutUs, getGalleryImages, getHomeTiles, getPromotions, getContactInfo, getServices, updateAboutUs, updateService, updateHomeTile, updatePromotion, updateContactInfo, updateGalleryImage } from "../directusApi";

export default function AdminDashboard() {
  const [about, setAbout] = useState<any>(null);
  const [aboutEdit, setAboutEdit] = useState<any>(null);
  const [aboutSaving, setAboutSaving] = useState(false);
  const [aboutMsg, setAboutMsg] = useState("");
  const [gallery, setGallery] = useState<any[]>([]);
  const [galleryEdit, setGalleryEdit] = useState<any[]>([]);
  const [gallerySaving, setGallerySaving] = useState(false);
  const [galleryMsg, setGalleryMsg] = useState("");
  const [tiles, setTiles] = useState<any[]>([]);
  const [tilesEdit, setTilesEdit] = useState<any[]>([]);
  const [tilesSaving, setTilesSaving] = useState(false);
  const [tilesMsg, setTilesMsg] = useState("");
  const [promos, setPromos] = useState<any[]>([]);
  const [promosEdit, setPromosEdit] = useState<any[]>([]);
  const [promosSaving, setPromosSaving] = useState(false);
  const [promosMsg, setPromosMsg] = useState("");
  const [contact, setContact] = useState<any>(null);
  const [contactEdit, setContactEdit] = useState<any>(null);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactMsg, setContactMsg] = useState("");
  const [services, setServices] = useState<any[]>([]);
  const [servicesEdit, setServicesEdit] = useState<any[]>([]);
  const [servicesSaving, setServicesSaving] = useState(false);
  const [servicesMsg, setServicesMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAboutUs(),
      getGalleryImages(),
      getHomeTiles(),
      getPromotions(),
      getContactInfo(),
      getServices()
    ]).then(([about, gallery, tiles, promos, contact, services]) => {
      setAbout(about);
      setAboutEdit(about);
      setGallery(gallery);
      setGalleryEdit(gallery.map(g => ({ ...g })));
      setTiles(tiles);
      setTilesEdit(tiles.map(t => ({ ...t })));
      setPromos(promos);
      setPromosEdit(promos.map(p => ({ ...p })));
      setContact(contact);
      setContactEdit(contact);
      setServices(services);
      setServicesEdit(services.map(s => ({ ...s })));
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Content Overview</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-2">About Us</h2>
            {aboutEdit ? (
              <form
                className="space-y-2 bg-zinc-50 p-4 rounded border"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAboutSaving(true);
                  setAboutMsg("");
                  try {
                    await updateAboutUs(aboutEdit);
                    setAbout(aboutEdit);
                    setAboutMsg("Saved!");
                  } catch (err) {
                    setAboutMsg("Error saving");
                  }
                  setAboutSaving(false);
                }}
              >
                <div>
                  <label className="block font-medium">Intro</label>
                  <textarea
                    className="w-full border rounded p-1"
                    value={aboutEdit.intro || ""}
                    onChange={e => setAboutEdit({ ...aboutEdit, intro: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium">Mission</label>
                  <textarea
                    className="w-full border rounded p-1"
                    value={aboutEdit.mission || ""}
                    onChange={e => setAboutEdit({ ...aboutEdit, mission: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium">Vision</label>
                  <textarea
                    className="w-full border rounded p-1"
                    value={aboutEdit.vision || ""}
                    onChange={e => setAboutEdit({ ...aboutEdit, vision: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium">Values (comma separated)</label>
                  <input
                    className="w-full border rounded p-1"
                    value={aboutEdit.values?.join(", ") || ""}
                    onChange={e => setAboutEdit({ ...aboutEdit, values: e.target.value.split(",").map(v => v.trim()) })}
                  />
                </div>
                <div>
                  <label className="block font-medium">Outro</label>
                  <textarea
                    className="w-full border rounded p-1"
                    value={aboutEdit.outro || ""}
                    onChange={e => setAboutEdit({ ...aboutEdit, outro: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium">Slogan</label>
                  <input
                    className="w-full border rounded p-1"
                    value={aboutEdit.slogan || ""}
                    onChange={e => setAboutEdit({ ...aboutEdit, slogan: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
                  disabled={aboutSaving}
                >
                  {aboutSaving ? "Saving..." : "Save"}
                </button>
                {aboutMsg && <span className="ml-4 text-green-700">{aboutMsg}</span>}
              </form>
            ) : (
              <div className="text-zinc-400">No about content found.</div>
            )}
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">Gallery Images</h2>
            {galleryEdit.length > 0 ? (
              <form
                className="space-y-2 bg-zinc-50 p-4 rounded border"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setGallerySaving(true);
                  setGalleryMsg("");
                  try {
                    for (let i = 0; i < galleryEdit.length; i++) {
                      await updateGalleryImage(galleryEdit[i]);
                    }
                    setGallery(galleryEdit.map(g => ({ ...g })));
                    setGalleryMsg("Saved!");
                  } catch (err) {
                    setGalleryMsg("Error saving");
                  }
                  setGallerySaving(false);
                }}
              >
                {galleryEdit.map((img, i) => (
                  <div key={img.id} className="border-b pb-2 mb-2">
                    <label className="block font-medium">Image URL</label>
                    <input
                      className="w-full border rounded p-1 mb-1"
                      value={img.url || img.image || ""}
                      onChange={e => {
                        const next = [...galleryEdit];
                        next[i] = { ...next[i], url: e.target.value, image: e.target.value };
                        setGalleryEdit(next);
                      }}
                    />
                    <label className="block font-medium">Caption</label>
                    <input
                      className="w-full border rounded p-1 mb-1"
                      value={img.caption || ""}
                      onChange={e => {
                        const next = [...galleryEdit];
                        next[i] = { ...next[i], caption: e.target.value };
                        setGalleryEdit(next);
                      }}
                    />
                    <label className="block font-medium">Alt Text</label>
                    <input
                      className="w-full border rounded p-1 mb-1"
                      value={img.alt_text || ""}
                      onChange={e => {
                        const next = [...galleryEdit];
                        next[i] = { ...next[i], alt_text: e.target.value };
                        setGalleryEdit(next);
                      }}
                    />
                  </div>
                ))}
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
                  disabled={gallerySaving}
                >
                  {gallerySaving ? "Saving..." : "Save All"}
                </button>
                {galleryMsg && <span className="ml-4 text-green-700">{galleryMsg}</span>}
              </form>
            ) : (
              <div className="text-zinc-400">No gallery images found.</div>
            )}
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">Home Tiles</h2>
            {tilesEdit.length > 0 ? (
              <form
                className="space-y-2 bg-zinc-50 p-4 rounded border"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setTilesSaving(true);
                  setTilesMsg("");
                  try {
                    for (let i = 0; i < tilesEdit.length; i++) {
                      await updateHomeTile(tilesEdit[i]);
                    }
                    setTiles(tilesEdit.map(t => ({ ...t })));
                    setTilesMsg("Saved!");
                  } catch (err) {
                    setTilesMsg("Error saving");
                  }
                  setTilesSaving(false);
                }}
              >
                {tilesEdit.map((tile, i) => (
                  <div key={tile.id} className="border-b pb-2 mb-2">
                    <label className="block font-medium">Title</label>
                    <input
                      className="w-full border rounded p-1 mb-1"
                      value={tile.title || ""}
                      onChange={e => {
                        const next = [...tilesEdit];
                        next[i] = { ...next[i], title: e.target.value };
                        setTilesEdit(next);
                      }}
                    />
                    <label className="block font-medium">Subtitle</label>
                    <input
                      className="w-full border rounded p-1 mb-1"
                      value={tile.subtitle || ""}
                      onChange={e => {
                        const next = [...tilesEdit];
                        next[i] = { ...next[i], subtitle: e.target.value };
                        setTilesEdit(next);
                      }}
                    />
                    <label className="block font-medium">Image URL</label>
                    <input
                      className="w-full border rounded p-1 mb-1"
                      value={tile.image || ""}
                      onChange={e => {
                        const next = [...tilesEdit];
                        next[i] = { ...next[i], image: e.target.value };
                        setTilesEdit(next);
                      }}
                    />
                    <label className="block font-medium">Link</label>
                    <input
                      className="w-full border rounded p-1 mb-1"
                      value={tile.link || ""}
                      onChange={e => {
                        const next = [...tilesEdit];
                        next[i] = { ...next[i], link: e.target.value };
                        setTilesEdit(next);
                      }}
                    />
                  </div>
                ))}
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
                  disabled={tilesSaving}
                >
                  {tilesSaving ? "Saving..." : "Save All"}
                </button>
                {tilesMsg && <span className="ml-4 text-green-700">{tilesMsg}</span>}
              </form>
            ) : (
              <div className="text-zinc-400">No home tiles found.</div>
            )}
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">Promotions</h2>
            {promosEdit.length > 0 ? (
              <form
                className="space-y-2 bg-zinc-50 p-4 rounded border"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setPromosSaving(true);
                  setPromosMsg("");
                  try {
                    for (let i = 0; i < promosEdit.length; i++) {
                      await updatePromotion(promosEdit[i]);
                    }
                    setPromos(promosEdit.map(p => ({ ...p })));
                    setPromosMsg("Saved!");
                  } catch (err) {
                    setPromosMsg("Error saving");
                  }
                  setPromosSaving(false);
                }}
              >
                {promosEdit.map((promo, i) => (
                  <div key={promo.id} className="border-b pb-2 mb-2">
                    <label className="block font-medium">Title</label>
                    <input
                      className="w-full border rounded p-1 mb-1"
                      value={promo.title || ""}
                      onChange={e => {
                        const next = [...promosEdit];
                        next[i] = { ...next[i], title: e.target.value };
                        setPromosEdit(next);
                      }}
                    />
                    <label className="block font-medium">Description</label>
                    <textarea
                      className="w-full border rounded p-1 mb-1"
                      value={promo.description || ""}
                      onChange={e => {
                        const next = [...promosEdit];
                        next[i] = { ...next[i], description: e.target.value };
                        setPromosEdit(next);
                      }}
                    />
                    <label className="block font-medium">Image URL</label>
                    <input
                      className="w-full border rounded p-1 mb-1"
                      value={promo.image || ""}
                      onChange={e => {
                        const next = [...promosEdit];
                        next[i] = { ...next[i], image: e.target.value };
                        setPromosEdit(next);
                      }}
                    />
                    <label className="block font-medium">Start Date</label>
                    <input
                      type="date"
                      className="w-full border rounded p-1 mb-1"
                      value={promo.start_date ? promo.start_date.slice(0,10) : ""}
                      onChange={e => {
                        const next = [...promosEdit];
                        next[i] = { ...next[i], start_date: e.target.value };
                        setPromosEdit(next);
                      }}
                    />
                    <label className="block font-medium">End Date</label>
                    <input
                      type="date"
                      className="w-full border rounded p-1 mb-1"
                      value={promo.end_date ? promo.end_date.slice(0,10) : ""}
                      onChange={e => {
                        const next = [...promosEdit];
                        next[i] = { ...next[i], end_date: e.target.value };
                        setPromosEdit(next);
                      }}
                    />
                    <label className="block font-medium">Active</label>
                    <input
                      type="checkbox"
                      className="ml-2"
                      checked={!!promo.active}
                      onChange={e => {
                        const next = [...promosEdit];
                        next[i] = { ...next[i], active: e.target.checked };
                        setPromosEdit(next);
                      }}
                    />
                  </div>
                ))}
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
                  disabled={promosSaving}
                >
                  {promosSaving ? "Saving..." : "Save All"}
                </button>
                {promosMsg && <span className="ml-4 text-green-700">{promosMsg}</span>}
              </form>
            ) : (
              <div className="text-zinc-400">No promotions found.</div>
            )}
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">Contact Info</h2>
            {contactEdit ? (
              <form
                className="space-y-2 bg-zinc-50 p-4 rounded border"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setContactSaving(true);
                  setContactMsg("");
                  try {
                    await updateContactInfo(contactEdit);
                    setContact(contactEdit);
                    setContactMsg("Saved!");
                  } catch (err) {
                    setContactMsg("Error saving");
                  }
                  setContactSaving(false);
                }}
              >
                <div>
                  <label className="block font-medium">Phone</label>
                  <input
                    className="w-full border rounded p-1"
                    value={contactEdit.phone || ""}
                    onChange={e => setContactEdit({ ...contactEdit, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium">Email</label>
                  <input
                    className="w-full border rounded p-1"
                    value={contactEdit.email || ""}
                    onChange={e => setContactEdit({ ...contactEdit, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium">WhatsApp Link</label>
                  <input
                    className="w-full border rounded p-1"
                    value={contactEdit.whatsapp_link || ""}
                    onChange={e => setContactEdit({ ...contactEdit, whatsapp_link: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium">Address</label>
                  <input
                    className="w-full border rounded p-1"
                    value={contactEdit.address || ""}
                    onChange={e => setContactEdit({ ...contactEdit, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium">Show Contact Button</label>
                  <input
                    type="checkbox"
                    className="ml-2"
                    checked={!!contactEdit.show_contact_button}
                    onChange={e => setContactEdit({ ...contactEdit, show_contact_button: e.target.checked })}
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
                  disabled={contactSaving}
                >
                  {contactSaving ? "Saving..." : "Save"}
                </button>
                {contactMsg && <span className="ml-4 text-green-700">{contactMsg}</span>}
              </form>
            ) : (
              <div className="text-zinc-400">No contact info found.</div>
            )}
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">Services</h2>
            {servicesEdit.length > 0 ? (
              <form
                className="space-y-2 bg-zinc-50 p-4 rounded border"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setServicesSaving(true);
                  setServicesMsg("");
                  try {
                    for (let i = 0; i < servicesEdit.length; i++) {
                      await updateService(servicesEdit[i]);
                    }
                    setServices(servicesEdit.map(s => ({ ...s })));
                    setServicesMsg("Saved!");
                  } catch (err) {
                    setServicesMsg("Error saving");
                  }
                  setServicesSaving(false);
                }}
              >
                {servicesEdit.map((service, i) => (
                  <div key={service.id} className="border-b pb-2 mb-2">
                    <label className="block font-medium">Title</label>
                    <input
                      className="w-full border rounded p-1 mb-1"
                      value={service.title || ""}
                      onChange={e => {
                        const next = [...servicesEdit];
                        next[i] = { ...next[i], title: e.target.value };
                        setServicesEdit(next);
                      }}
                    />
                    <label className="block font-medium">Description</label>
                    <textarea
                      className="w-full border rounded p-1"
                      value={service.description || ""}
                      onChange={e => {
                        const next = [...servicesEdit];
                        next[i] = { ...next[i], description: e.target.value };
                        setServicesEdit(next);
                      }}
                    />
                  </div>
                ))}
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
                  disabled={servicesSaving}
                >
                  {servicesSaving ? "Saving..." : "Save All"}
                </button>
                {servicesMsg && <span className="ml-4 text-green-700">{servicesMsg}</span>}
              </form>
            ) : (
              <div className="text-zinc-400">No services found.</div>
            )}
          </section>
        </div>
      )}
      <div className="mt-8 text-zinc-500 text-sm">
        <p>To edit content, use the Directus admin panel at <a href="http://localhost:8055" className="text-blue-600 underline">http://localhost:8055</a>.</p>
        <p>Future: Inline editing and uploads will be available here.</p>
      </div>
    </div>
  );
}
