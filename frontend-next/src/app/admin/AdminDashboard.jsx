// AdminDashboard.jsx
// Pure dashboard logic, expects session and onSignOut as props

import React, { useEffect, useState } from "react";
import GlassCard from "../components/GlassCard";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";

export default function AdminDashboard({ session, onSignOut }) {
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [newBusiness, setNewBusiness] = useState({ name: "", email: "", password: "", phone: "", address: "" });
  const [bizMsg, setBizMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contractEdit, setContractEdit] = useState(null); // {id, rate, weekend_multiplier}
  const [contractMsg, setContractMsg] = useState("");

  useEffect(() => {
    async function fetchAdminData() {
      setLoading(true);
      setError("");
      try {
        const userRes = await fetch("/admin/users", {
          headers: { Authorization: `Bearer ${session.token}` }
        });
        const userData = await userRes.json();
        setUsers(Array.isArray(userData) ? userData : []);
        const bookingRes = await fetch("/admin/bookings", {
          headers: { Authorization: `Bearer ${session.token}` }
        });
        const bookingData = await bookingRes.json();
        setBookings(Array.isArray(bookingData) ? bookingData : []);
        // Fetch contracts (assume /contracts endpoint exists for admin)
        const contractRes = await fetch("/contracts", {
          headers: { Authorization: `Bearer ${session.token}` }
        });
        const contractData = await contractRes.json();
        setContracts(Array.isArray(contractData) ? contractData : []);
        // Fetch businesses (users with role 'business')
        const bizRes = await fetch("/admin/users", {
          headers: { Authorization: `Bearer ${session.token}` }
        });
        const bizData = await bizRes.json();
        setBusinesses(Array.isArray(bizData) ? bizData.filter(u => u.role === 'business') : []);
      } catch (err) {
        setError("Failed to load admin data.");
      }
      setLoading(false);
    }
    fetchAdminData();
  }, [session.token]);

  // Handle contract edit form
  const handleContractEdit = (contract) => {
    setContractEdit({
      id: contract.id,
      rate: contract.rate,
      weekend_multiplier: contract.weekend_multiplier
    });
    setContractMsg("");
  };

  const handleContractEditChange = e => {
    setContractEdit({ ...contractEdit, [e.target.name]: e.target.value });
  };

  const handleContractEditSubmit = async e => {
    e.preventDefault();
    setContractMsg("");
    try {
      const res = await fetch(`/admin/contracts/${contractEdit.id}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({
          rate: parseFloat(contractEdit.rate),
          weekend_multiplier: parseFloat(contractEdit.weekend_multiplier)
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setContractMsg(data.detail || "Update failed");
        return;
      }
      setContractMsg("Contract updated successfully");
      setContractEdit(null);
      // Refresh contracts
      const contractRes = await fetch("/contracts", {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      const contractData = await contractRes.json();
      setContracts(Array.isArray(contractData) ? contractData : []);
    } catch (err) {
      setContractMsg("Update failed");
    }
  };

  // Handle business registration form
  const handleBizChange = e => {
    setNewBusiness({ ...newBusiness, [e.target.name]: e.target.value });
  };

  const handleBizSubmit = async e => {
    e.preventDefault();
    setBizMsg("");
    try {
      const res = await fetch("/register/business", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
        body: JSON.stringify(newBusiness)
      });
      const data = await res.json();
      if (!res.ok) {
        setBizMsg(data.detail || "Registration failed");
        return;
      }
      setBizMsg("Business registered successfully");
      setNewBusiness({ name: "", email: "", password: "", phone: "", address: "" });
      // Refresh businesses
      const bizRes = await fetch("/admin/users", {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      const bizData = await bizRes.json();
      setBusinesses(Array.isArray(bizData) ? bizData.filter(u => u.role === 'business') : []);
    } catch (err) {
      setBizMsg("Registration failed");
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
      <GlassCard>
        <h2>Admin Dashboard</h2>
        <p>Welcome, {session.username}!</p>
        <PrimaryButton onClick={onSignOut} style={{ marginTop: 16 }}>Sign Out</PrimaryButton>
      </GlassCard>
      <GlassCard>
        <h3>Users</h3>
        {loading ? <p>Loading...</p> : error ? <p style={{color:'red'}}>{error}</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Role</th>
                <th>Name</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.role}</td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>
      <GlassCard>
        <h3>Bookings</h3>
        {loading ? <p>Loading...</p> : error ? <p style={{color:'red'}}>{error}</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>User ID</th>
                <th>Cleaner ID</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{b.status}</td>
                  <td>{b.user_id}</td>
                  <td>{b.cleaner_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>
      <GlassCard>
        <h3>Contracts</h3>
        {loading ? <p>Loading...</p> : error ? <p style={{color:'red'}}>{error}</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Business ID</th>
                <th>Type</th>
                <th>Rate</th>
                <th>Weekend Multiplier</th>
                <th>Immutable</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(c => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.business_id}</td>
                  <td>{c.contract_type}</td>
                  <td>{c.rate}</td>
                  <td>{c.weekend_multiplier}</td>
                  <td>{c.immutable ? 'Yes' : 'No'}</td>
                  <td>
                    <PrimaryButton onClick={() => handleContractEdit(c)} style={{fontSize:12,padding:'2px 8px'}}>Edit</PrimaryButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {contractEdit && (
          <form onSubmit={handleContractEditSubmit} style={{marginTop:16,display:'flex',gap:8,alignItems:'center'}}>
            <span>Edit Contract #{contractEdit.id}:</span>
            <input name="rate" type="number" step="0.01" value={contractEdit.rate} onChange={handleContractEditChange} style={{width:80}} required />
            <input name="weekend_multiplier" type="number" step="0.01" value={contractEdit.weekend_multiplier} onChange={handleContractEditChange} style={{width:80}} required />
            <PrimaryButton type="submit">Save</PrimaryButton>
            <SecondaryButton type="button" onClick={()=>setContractEdit(null)}>Cancel</SecondaryButton>
            {contractMsg && <span style={{marginLeft:8,color:'green'}}>{contractMsg}</span>}
          </form>
        )}
      </GlassCard>
      <GlassCard>
        <h3>Businesses</h3>
        {loading ? <p>Loading...</p> : error ? <p style={{color:'red'}}>{error}</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map(b => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{b.business_name || b.name}</td>
                  <td>{b.email}</td>
                  <td>{b.phone}</td>
                  <td>{b.address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <form onSubmit={handleBizSubmit} style={{marginTop:16,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <span>Register New Business:</span>
          <input name="name" placeholder="Business Name" value={newBusiness.name} onChange={handleBizChange} required />
          <input name="email" type="email" placeholder="Email" value={newBusiness.email} onChange={handleBizChange} required />
          <input name="password" type="password" placeholder="Password" value={newBusiness.password} onChange={handleBizChange} required />
          <input name="phone" placeholder="Phone" value={newBusiness.phone} onChange={handleBizChange} />
          <input name="address" placeholder="Address" value={newBusiness.address} onChange={handleBizChange} />
          <PrimaryButton type="submit">Register</PrimaryButton>
          {bizMsg && <span style={{marginLeft:8,color:bizMsg.includes('success')?'green':'red'}}>{bizMsg}</span>}
        </form>
      </GlassCard>
      <GlassCard>
        <h3>Analytics</h3>
        <p>Coming soon: Booking and revenue analytics.</p>
      </GlassCard>
    </div>
  );
}
