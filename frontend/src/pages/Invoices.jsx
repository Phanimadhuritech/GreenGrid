import React, { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { commonStyles } from "../theme";

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [periodFilter, setPeriodFilter] = useState("");

  // Modals
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState(null);

  // Form states
  const [genUnitId, setGenUnitId] = useState("");
  const [genPeriod, setGenPeriod] = useState("");
  const [genDueDate, setGenDueDate] = useState("");
  const [genNotes, setGenNotes] = useState("");
  const [generating, setGenerating] = useState(false);

  // Payment Form states
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("UPI");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [recordingPay, setRecordingPay] = useState(false);

  const canGenerate = ["PLATFORM_ADMIN", "FACILITY_MANAGER", "FINANCE_OFFICER"].includes(user?.role);
  const canRecordPayment = ["PLATFORM_ADMIN", "FINANCE_OFFICER", "FACILITY_MANAGER"].includes(user?.role);

  useEffect(() => {
    if (!user) return;
    fetchInvoices();
    if (canGenerate) {
      fetchUnits();
    }
    // Set default billing period to current YYYY-MM
    const now = new Date();
    const curPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setGenPeriod(curPeriod);

    const due = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setGenDueDate(due);
  }, [user]);

  const fetchInvoices = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = user?.role === "UNIT_USER" ? "/invoices/my" : "/invoices";
      const res = await API.get(endpoint);
      setInvoices(res.data.invoices || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await API.get("/units");
      setUnits(res.data.units || []);
      if (res.data.units?.length > 0) {
        setGenUnitId(res.data.units[0]._id);
      }
    } catch (err) {
      console.error("Failed to load units for invoice generation:", err);
    }
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await API.post("/invoices/generate", {
        unitId: genUnitId,
        billingPeriod: genPeriod,
        dueDate: genDueDate,
        notes: genNotes,
      });

      setSuccessMsg(`Invoice ${res.data.invoice.invoiceNumber} generated successfully!`);
      setShowGenerateModal(false);
      setGenNotes("");
      fetchInvoices();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate invoice.");
    } finally {
      setGenerating(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payingInvoice) return;
    setRecordingPay(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await API.post("/payments", {
        invoiceId: payingInvoice._id,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        transactionReference: payRef,
        notes: payNotes,
      });

      setSuccessMsg(`Payment of ₹${payAmount} recorded successfully! Status: ${res.data.invoiceStatus}`);
      setShowPaymentModal(false);
      setPayingInvoice(null);
      setPayAmount("");
      setPayRef("");
      setPayNotes("");
      fetchInvoices();
      if (selectedInvoice && selectedInvoice._id === payingInvoice._id) {
        // Refresh details modal
        const updated = await API.get(`/invoices/${payingInvoice._id}`);
        setSelectedInvoice(updated.data.invoice);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record payment.");
    } finally {
      setRecordingPay(false);
    }
  };

  const openPaymentModal = (invoice) => {
    setPayingInvoice(invoice);
    setPayAmount(invoice.totalAmount);
    setPayRef(`UPI-TXN-${Date.now().toString().slice(-6)}`);
    setShowPaymentModal(true);
  };

  // Filter calculations
  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
    if (periodFilter && !inv.billingPeriod.includes(periodFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      const numMatch = inv.invoiceNumber?.toLowerCase().includes(q);
      const unitMatch = inv.unit?.unitNumber?.toLowerCase().includes(q);
      const bldMatch = inv.unit?.building?.name?.toLowerCase().includes(q);
      if (!numMatch && !unitMatch && !bldMatch) return false;
    }
    return true;
  });

  // KPI calculations
  const totalInvoiced = invoices.filter((i) => i.status !== "CANCELLED").reduce((s, i) => s + (i.totalAmount || 0), 0);
  const totalPaid = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + (i.totalAmount || 0), 0);
  const totalPending = invoices.filter((i) => i.status === "PENDING").reduce((s, i) => s + (i.totalAmount || 0), 0);
  const totalOverdue = invoices.filter((i) => i.status === "OVERDUE").reduce((s, i) => s + (i.totalAmount || 0), 0);

  const getStatusBadge = (status) => {
    switch (status) {
      case "PAID":
        return <span style={commonStyles.badgeActive}>✓ PAID</span>;
      case "PENDING":
        return <span style={commonStyles.badgeMaintenance}>⏳ PENDING</span>;
      case "OVERDUE":
        return <span style={commonStyles.badgeCritical}>⚠️ OVERDUE</span>;
      case "GENERATED":
        return <span style={commonStyles.badgeNeutral}>📄 GENERATED</span>;
      case "CANCELLED":
        return <span style={{ ...commonStyles.badgeNeutral, color: "#991B1B", backgroundColor: "#FEE2E2" }}>✕ CANCELLED</span>;
      default:
        return <span style={commonStyles.badgeNeutral}>{status}</span>;
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <div style={commonStyles.pageHeader}>
        <div style={commonStyles.titleGroup}>
          <h1 style={commonStyles.pageTitle}>Invoices & Billing</h1>
          <p style={commonStyles.pageSubtitle}>
            {user?.role === "UNIT_USER"
              ? "View and review your utility billing history and payment statements."
              : "Manage electricity billing generation, calculations, and payment statuses."}
          </p>
        </div>
        <div style={commonStyles.headerActions}>
          {canGenerate && (
            <button
              onClick={() => setShowGenerateModal(true)}
              style={commonStyles.primaryBtn}
            >
              <span>+</span>
              <span>Generate Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification banners */}
      {error && (
        <div
          style={{
            padding: "12px 18px",
            backgroundColor: "#FEE2E2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div
          style={{
            padding: "12px 18px",
            backgroundColor: "#DCFCE7",
            border: "1px solid #86EFAC",
            color: "#166534",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          ✓ {successMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Total Billed</div>
          <div style={commonStyles.statValue}>₹{totalInvoiced.toLocaleString()}</div>
          <div style={commonStyles.statSubtext}>{invoices.length} total invoices</div>
        </div>

        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Paid Collected</div>
          <div style={{ ...commonStyles.statValue, color: "#166534" }}>
            ₹{totalPaid.toLocaleString()}
          </div>
          <div style={{ ...commonStyles.statSubtext, color: "#166534" }}>
            {invoices.filter((i) => i.status === "PAID").length} invoices cleared
          </div>
        </div>

        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Pending Receivables</div>
          <div style={{ ...commonStyles.statValue, color: "#D97706" }}>
            ₹{totalPending.toLocaleString()}
          </div>
          <div style={{ ...commonStyles.statSubtext, color: "#D97706" }}>
            {invoices.filter((i) => i.status === "PENDING").length} awaiting payment
          </div>
        </div>

        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Overdue Amount</div>
          <div style={{ ...commonStyles.statValue, color: "#991B1B" }}>
            ₹{totalOverdue.toLocaleString()}
          </div>
          <div style={{ ...commonStyles.statSubtext, color: "#991B1B" }}>
            {invoices.filter((i) => i.status === "OVERDUE").length} overdue bills
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
          padding: "16px 20px",
          borderRadius: "10px",
          border: "1px solid #DCE5DF",
        }}
      >
        <input
          type="text"
          placeholder="Search by invoice # or unit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...commonStyles.input, maxWidth: "280px" }}
        />

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...commonStyles.input, width: "auto" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>Period:</span>
          <input
            type="text"
            placeholder="e.g. 2026-09"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            style={{ ...commonStyles.input, width: "130px" }}
          />
        </div>

        <button
          onClick={() => {
            setSearch("");
            setStatusFilter("ALL");
            setPeriodFilter("");
          }}
          style={commonStyles.outlineBtn}
        >
          Reset Filters
        </button>
      </div>

      {/* Invoices Table */}
      <div style={commonStyles.tableContainer}>
        {loading ? (
          <div style={commonStyles.loadingSpinner}>
            <span>⚡</span> Loading invoices...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div style={commonStyles.emptyState}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🧾</div>
            <h3 style={{ color: "#17221B", margin: "0 0 6px" }}>No Invoices Found</h3>
            <p style={{ margin: 0 }}>
              {search || statusFilter !== "ALL" || periodFilter
                ? "Try adjusting your search criteria or filters."
                : "No invoices have been generated in this system yet."}
            </p>
          </div>
        ) : (
          <table style={commonStyles.table}>
            <thead>
              <tr>
                <th style={commonStyles.th}>Invoice #</th>
                <th style={commonStyles.th}>Unit / Building</th>
                <th style={commonStyles.th}>Billing Period</th>
                <th style={commonStyles.th}>Consumption</th>
                <th style={commonStyles.th}>Total Amount</th>
                <th style={commonStyles.th}>Due Date</th>
                <th style={commonStyles.th}>Status</th>
                <th style={{ ...commonStyles.th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => (
                <tr key={inv._id} style={{ borderBottom: "1px solid #EBF1ED" }}>
                  <td style={commonStyles.td}>
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#166534",
                        fontWeight: "700",
                        cursor: "pointer",
                        textDecoration: "underline",
                        padding: 0,
                        fontSize: "14px",
                      }}
                    >
                      {inv.invoiceNumber}
                    </button>
                  </td>
                  <td style={commonStyles.td}>
                    <div style={{ fontWeight: "600", color: "#17221B" }}>
                      Unit {inv.unit?.unitNumber || "N/A"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748B" }}>
                      {inv.unit?.building?.name || "Building"}
                    </div>
                  </td>
                  <td style={commonStyles.td}>
                    <span
                      style={{
                        backgroundColor: "#F1F5F9",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontWeight: "600",
                        fontSize: "13px",
                      }}
                    >
                      {inv.billingPeriod}
                    </span>
                  </td>
                  <td style={commonStyles.td}>
                    <div style={{ fontWeight: "600", color: "#166534" }}>
                      {inv.consumption || 0} kWh
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>
                      {inv.previousReading} → {inv.currentReading}
                    </div>
                  </td>
                  <td style={commonStyles.td}>
                    <div style={{ fontSize: "15px", fontWeight: "800", color: "#17221B" }}>
                      ₹{inv.totalAmount?.toLocaleString()}
                    </div>
                  </td>
                  <td style={commonStyles.td}>
                    <span style={{ fontSize: "13px", color: "#475569" }}>
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "N/A"}
                    </span>
                  </td>
                  <td style={commonStyles.td}>{getStatusBadge(inv.status)}</td>
                  <td style={{ ...commonStyles.td, textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        style={commonStyles.outlineBtn}
                      >
                        View
                      </button>
                      {canRecordPayment && inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                        <button
                          onClick={() => openPaymentModal(inv)}
                          style={commonStyles.primaryBtn}
                        >
                          Pay
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL 1: Generate Invoice */}
      {showGenerateModal && (
        <div style={commonStyles.modalOverlay}>
          <div style={commonStyles.modalContent}>
            <div style={commonStyles.cardHeader}>
              <h2 style={commonStyles.cardTitle}>Generate New Invoice</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateInvoice}>
              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Select Target Unit *</label>
                <select
                  value={genUnitId}
                  onChange={(e) => setGenUnitId(e.target.value)}
                  style={commonStyles.input}
                  required
                >
                  {units.map((u) => (
                    <option key={u._id} value={u._id}>
                      Unit {u.unitNumber} ({u.building?.name || "Building"}) - Floor {u.floor}
                    </option>
                  ))}
                </select>
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Billing Period (YYYY-MM) *</label>
                <input
                  type="text"
                  value={genPeriod}
                  onChange={(e) => setGenPeriod(e.target.value)}
                  placeholder="e.g. 2026-09"
                  style={commonStyles.input}
                  required
                />
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Due Date *</label>
                <input
                  type="date"
                  value={genDueDate}
                  onChange={(e) => setGenDueDate(e.target.value)}
                  style={commonStyles.input}
                  required
                />
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Invoice Notes (Optional)</label>
                <textarea
                  value={genNotes}
                  onChange={(e) => setGenNotes(e.target.value)}
                  placeholder="e.g. Residential smart meter monthly billing cycle"
                  style={{ ...commonStyles.input, minHeight: "70px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  style={commonStyles.outlineBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  style={commonStyles.primaryBtn}
                >
                  {generating ? "Calculating..." : "Generate & Save Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Full Invoice Details Breakdown */}
      {selectedInvoice && (
        <div style={commonStyles.modalOverlay}>
          <div style={{ ...commonStyles.modalContent, maxWidth: "640px" }}>
            {/* Header branding */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "2px solid #DCE5DF",
                paddingBottom: "16px",
                marginBottom: "20px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "24px" }}>🌿</span>
                  <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#166534", margin: 0 }}>
                    GREEN GRID
                  </h2>
                </div>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                  Smart Utility Electricity Invoice
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#17221B" }}>
                  {selectedInvoice.invoiceNumber}
                </div>
                <div style={{ marginTop: "4px" }}>{getStatusBadge(selectedInvoice.status)}</div>
              </div>
            </div>

            {/* Bill Summary info grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                backgroundColor: "#F8FAF9",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #DCE5DF",
                marginBottom: "20px",
                fontSize: "13px",
              }}
            >
              <div>
                <div style={{ color: "#64748B" }}>Unit Details:</div>
                <div style={{ fontWeight: "700", color: "#17221B" }}>
                  Unit {selectedInvoice.unit?.unitNumber} ({selectedInvoice.unit?.building?.name || "Building"})
                </div>
                <div style={{ color: "#64748B", marginTop: "8px" }}>Meter #:</div>
                <div style={{ fontWeight: "600" }}>{selectedInvoice.meter?.meterNumber || "Smart Meter"}</div>
              </div>

              <div>
                <div style={{ color: "#64748B" }}>Billing Period:</div>
                <div style={{ fontWeight: "700", color: "#17221B" }}>{selectedInvoice.billingPeriod}</div>
                <div style={{ color: "#64748B", marginTop: "8px" }}>Due Date:</div>
                <div style={{ fontWeight: "600", color: "#991B1B" }}>
                  {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString() : "N/A"}
                </div>
              </div>
            </div>

            {/* Reading details */}
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#17221B", marginBottom: "8px" }}>
                Meter Consumption
              </h4>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #DCE5DF",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  fontSize: "13px",
                }}
              >
                <div>
                  <span style={{ color: "#64748B" }}>Previous: </span>
                  <strong>{selectedInvoice.previousReading} kWh</strong>
                </div>
                <div>
                  <span style={{ color: "#64748B" }}>Current: </span>
                  <strong>{selectedInvoice.currentReading} kWh</strong>
                </div>
                <div>
                  <span style={{ color: "#166534", fontWeight: "700" }}>Total Consumption: </span>
                  <strong style={{ color: "#166534" }}>{selectedInvoice.consumption} kWh</strong>
                </div>
              </div>
            </div>

            {/* Slab breakdown if available */}
            {selectedInvoice.slabBreakdown?.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#475569", marginBottom: "8px" }}>
                  Progressive Tariff Slabs
                </h4>
                <div style={{ border: "1px solid #EBF1ED", borderRadius: "8px", overflow: "hidden" }}>
                  {selectedInvoice.slabBreakdown.map((slab, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 14px",
                        fontSize: "12px",
                        backgroundColor: i % 2 === 0 ? "#F8FAF9" : "#FFFFFF",
                        borderBottom: "1px solid #EBF1ED",
                      }}
                    >
                      <span>
                        Slab {slab.slabNumber} ({slab.rangeLabel} @ ₹{slab.rate}/unit):
                      </span>
                      <span>
                        {slab.units} units = <strong>₹{slab.amount}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Totals Breakdown */}
            <div
              style={{
                backgroundColor: "#F8FAF9",
                borderRadius: "8px",
                padding: "16px",
                border: "1px solid #DCE5DF",
                marginBottom: "24px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                <span style={{ color: "#475569" }}>Energy Charges:</span>
                <strong>₹{selectedInvoice.energyCharge}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                <span style={{ color: "#475569" }}>Fixed Charges:</span>
                <strong>₹{selectedInvoice.fixedCharge}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                <span style={{ color: "#475569" }}>Tax (18% GST):</span>
                <strong>₹{selectedInvoice.tax}</strong>
              </div>
              {selectedInvoice.adjustment !== 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                  <span style={{ color: "#475569" }}>Adjustments:</span>
                  <strong>₹{selectedInvoice.adjustment}</strong>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: "2px solid #DCE5DF",
                  fontSize: "18px",
                  fontWeight: "800",
                  color: "#166534",
                }}
              >
                <span>TOTAL AMOUNT:</span>
                <span>₹{selectedInvoice.totalAmount?.toLocaleString()}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={() => setSelectedInvoice(null)}
                style={commonStyles.outlineBtn}
              >
                Close
              </button>

              {canRecordPayment && selectedInvoice.status !== "PAID" && selectedInvoice.status !== "CANCELLED" && (
                <button
                  onClick={() => {
                    openPaymentModal(selectedInvoice);
                  }}
                  style={commonStyles.primaryBtn}
                >
                  Record Payment (₹{selectedInvoice.totalAmount})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Record Payment */}
      {showPaymentModal && payingInvoice && (
        <div style={commonStyles.modalOverlay}>
          <div style={commonStyles.modalContent}>
            <div style={commonStyles.cardHeader}>
              <h2 style={commonStyles.cardTitle}>Record Invoice Payment</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                backgroundColor: "#F8FAF9",
                padding: "14px 18px",
                borderRadius: "8px",
                border: "1px solid #DCE5DF",
                marginBottom: "20px",
                fontSize: "13px",
              }}
            >
              <div>
                Invoice: <strong>{payingInvoice.invoiceNumber}</strong>
              </div>
              <div style={{ marginTop: "4px" }}>
                Total Bill Amount: <strong>₹{payingInvoice.totalAmount}</strong>
              </div>
            </div>

            <form onSubmit={handleRecordPayment}>
              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={payingInvoice.totalAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  style={commonStyles.input}
                  required
                />
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Payment Method *</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  style={commonStyles.input}
                  required
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="BANK_TRANSFER">Bank NEFT / RTGS Transfer</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="CASH">Cash Deposit</option>
                  <option value="OTHER">Other Method</option>
                </select>
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Transaction Reference / UTR</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. UPI-928374928"
                  style={commonStyles.input}
                />
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Payment Notes (Optional)</label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Paid in full via resident portal"
                  style={{ ...commonStyles.input, minHeight: "60px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  style={commonStyles.outlineBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPay}
                  style={commonStyles.primaryBtn}
                >
                  {recordingPay ? "Saving..." : "Confirm & Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
