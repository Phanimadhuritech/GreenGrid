import React, { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { commonStyles } from "../theme";

export default function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");

  // Modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [txnRef, setTxnRef] = useState("");
  const [notes, setNotes] = useState("");
  const [recording, setRecording] = useState(false);

  const canRecordPayment = ["PLATFORM_ADMIN", "FINANCE_OFFICER", "FACILITY_MANAGER"].includes(user?.role);

  useEffect(() => {
    if (!user) return;
    fetchPayments();
    if (canRecordPayment) {
      fetchPendingInvoices();
    }
  }, [user]);

  const fetchPayments = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = user?.role === "UNIT_USER" ? "/payments/my" : "/payments";
      const res = await API.get(endpoint);
      setPayments(res.data.payments || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvoices = async () => {
    try {
      const res = await API.get("/invoices?status=PENDING");
      const pending = res.data.invoices || [];
      setInvoices(pending);
      if (pending.length > 0) {
        setSelectedInvoiceId(pending[0]._id);
        setAmount(pending[0].totalAmount);
      }
    } catch (err) {
      console.error("Failed to load pending invoices:", err);
    }
  };

  const handleInvoiceSelect = (invId) => {
    setSelectedInvoiceId(invId);
    const found = invoices.find((i) => i._id === invId);
    if (found) {
      setAmount(found.totalAmount);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setRecording(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await API.post("/payments", {
        invoiceId: selectedInvoiceId,
        amount: Number(amount),
        paymentMethod,
        transactionReference: txnRef,
        notes,
      });

      setSuccessMsg(`Payment of ₹${amount} recorded! Invoice is now ${res.data.invoiceStatus}.`);
      setShowRecordModal(false);
      setTxnRef("");
      setNotes("");
      fetchPayments();
      fetchPendingInvoices();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record payment.");
    } finally {
      setRecording(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (methodFilter !== "ALL" && p.paymentMethod !== methodFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const refMatch = p.transactionReference?.toLowerCase().includes(q);
      const invMatch = p.invoice?.invoiceNumber?.toLowerCase().includes(q);
      const unitMatch = p.invoice?.unit?.unitNumber?.toLowerCase().includes(q);
      if (!refMatch && !invMatch && !unitMatch) return false;
    }
    return true;
  });

  const totalCollected = payments.filter((p) => p.status === "RECORDED").reduce((s, p) => s + (p.amount || 0), 0);
  const upiTotal = payments.filter((p) => p.paymentMethod === "UPI").reduce((s, p) => s + (p.amount || 0), 0);
  const bankTotal = payments.filter((p) => p.paymentMethod === "BANK_TRANSFER").reduce((s, p) => s + (p.amount || 0), 0);
  const cashTotal = payments.filter((p) => p.paymentMethod === "CASH").reduce((s, p) => s + (p.amount || 0), 0);

  const getMethodBadge = (method) => {
    switch (method) {
      case "UPI":
        return <span style={{ ...commonStyles.badgeActive, backgroundColor: "#E0F2FE", color: "#0369A1" }}>📱 UPI</span>;
      case "BANK_TRANSFER":
        return <span style={{ ...commonStyles.badgeActive, backgroundColor: "#EDE9FE", color: "#6D28D9" }}>🏦 Bank Transfer</span>;
      case "CARD":
        return <span style={{ ...commonStyles.badgeActive, backgroundColor: "#FEF3C7", color: "#B45309" }}>💳 Card</span>;
      case "CASH":
        return <span style={{ ...commonStyles.badgeActive, backgroundColor: "#DCFCE7", color: "#166534" }}>💵 Cash</span>;
      default:
        return <span style={commonStyles.badgeNeutral}>{method}</span>;
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <div style={commonStyles.pageHeader}>
        <div style={commonStyles.titleGroup}>
          <h1 style={commonStyles.pageTitle}>Payments & Transactions</h1>
          <p style={commonStyles.pageSubtitle}>
            {user?.role === "UNIT_USER"
              ? "Your electricity bill payment history and payment receipts."
              : "Financial ledger of all recorded electricity bill collections."}
          </p>
        </div>
        <div style={commonStyles.headerActions}>
          {canRecordPayment && (
            <button
              onClick={() => {
                setTxnRef(`TXN-${Date.now().toString().slice(-6)}`);
                setShowRecordModal(true);
              }}
              style={commonStyles.primaryBtn}
            >
              <span>+</span>
              <span>Record Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
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

      {/* Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Total Collected</div>
          <div style={{ ...commonStyles.statValue, color: "#166534" }}>
            ₹{totalCollected.toLocaleString()}
          </div>
          <div style={commonStyles.statSubtext}>{payments.length} verified transactions</div>
        </div>

        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>UPI Payments</div>
          <div style={{ ...commonStyles.statValue, color: "#0369A1" }}>
            ₹{upiTotal.toLocaleString()}
          </div>
          <div style={{ ...commonStyles.statSubtext, color: "#0369A1" }}>
            {payments.filter((p) => p.paymentMethod === "UPI").length} transactions
          </div>
        </div>

        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Bank Transfers</div>
          <div style={{ ...commonStyles.statValue, color: "#6D28D9" }}>
            ₹{bankTotal.toLocaleString()}
          </div>
          <div style={{ ...commonStyles.statSubtext, color: "#6D28D9" }}>
            {payments.filter((p) => p.paymentMethod === "BANK_TRANSFER").length} transactions
          </div>
        </div>

        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Cash Deposits</div>
          <div style={{ ...commonStyles.statValue, color: "#166534" }}>
            ₹{cashTotal.toLocaleString()}
          </div>
          <div style={commonStyles.statSubtext}>
            {payments.filter((p) => p.paymentMethod === "CASH").length} transactions
          </div>
        </div>
      </div>

      {/* Filters */}
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
          placeholder="Search by Txn Ref, Invoice, Unit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...commonStyles.input, maxWidth: "320px" }}
        />

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>Method:</span>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            style={{ ...commonStyles.input, width: "auto" }}
          >
            <option value="ALL">All Methods</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CARD">Card</option>
            <option value="CASH">Cash</option>
          </select>
        </div>

        <button
          onClick={() => {
            setSearch("");
            setMethodFilter("ALL");
          }}
          style={commonStyles.outlineBtn}
        >
          Reset Filters
        </button>
      </div>

      {/* Payments Table */}
      <div style={commonStyles.tableContainer}>
        {loading ? (
          <div style={commonStyles.loadingSpinner}>
            <span>⚡</span> Loading payment records...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div style={commonStyles.emptyState}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>💳</div>
            <h3 style={{ color: "#17221B", margin: "0 0 6px" }}>No Payment Records Found</h3>
            <p style={{ margin: 0 }}>
              {search || methodFilter !== "ALL"
                ? "Try adjusting your search criteria."
                : "No payments have been recorded in the system yet."}
            </p>
          </div>
        ) : (
          <table style={commonStyles.table}>
            <thead>
              <tr>
                <th style={commonStyles.th}>Transaction Ref</th>
                <th style={commonStyles.th}>Invoice #</th>
                <th style={commonStyles.th}>Unit</th>
                <th style={commonStyles.th}>Amount Paid</th>
                <th style={commonStyles.th}>Method</th>
                <th style={commonStyles.th}>Date & Time</th>
                <th style={commonStyles.th}>Recorded By</th>
                <th style={commonStyles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p._id} style={{ borderBottom: "1px solid #EBF1ED" }}>
                  <td style={commonStyles.td}>
                    <div style={{ fontWeight: "700", color: "#17221B", fontFamily: "monospace" }}>
                      {p.transactionReference || `TXN-${p._id.slice(-6).toUpperCase()}`}
                    </div>
                  </td>
                  <td style={commonStyles.td}>
                    <div style={{ fontWeight: "600", color: "#166534" }}>
                      {p.invoice?.invoiceNumber || "Invoice"}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>
                      Period: {p.invoice?.billingPeriod}
                    </div>
                  </td>
                  <td style={commonStyles.td}>
                    <div style={{ fontWeight: "600" }}>
                      Unit {p.invoice?.unit?.unitNumber || "N/A"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748B" }}>
                      {p.invoice?.unit?.building?.name || "Building"}
                    </div>
                  </td>
                  <td style={commonStyles.td}>
                    <div style={{ fontSize: "15px", fontWeight: "800", color: "#166534" }}>
                      ₹{p.amount?.toLocaleString()}
                    </div>
                  </td>
                  <td style={commonStyles.td}>{getMethodBadge(p.paymentMethod)}</td>
                  <td style={commonStyles.td}>
                    <span style={{ fontSize: "13px", color: "#475569" }}>
                      {p.paymentDate ? new Date(p.paymentDate).toLocaleString() : "N/A"}
                    </span>
                  </td>
                  <td style={commonStyles.td}>
                    <span style={{ fontSize: "13px", color: "#17221B" }}>
                      {p.recordedBy?.name || "System"}
                    </span>
                  </td>
                  <td style={commonStyles.td}>
                    <span style={commonStyles.badgeActive}>✓ RECORDED</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Record Payment Modal */}
      {showRecordModal && (
        <div style={commonStyles.modalOverlay}>
          <div style={commonStyles.modalContent}>
            <div style={commonStyles.cardHeader}>
              <h2 style={commonStyles.cardTitle}>Record Payment</h2>
              <button
                onClick={() => setShowRecordModal(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {invoices.length === 0 ? (
              <div style={commonStyles.emptyState}>
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>✓</div>
                <p>All generated invoices are currently fully paid! No pending invoices available.</p>
                <button
                  onClick={() => setShowRecordModal(false)}
                  style={{ ...commonStyles.outlineBtn, marginTop: "16px" }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecordPayment}>
                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Select Pending Invoice *</label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => handleInvoiceSelect(e.target.value)}
                    style={commonStyles.input}
                    required
                  >
                    {invoices.map((inv) => (
                      <option key={inv._id} value={inv._id}>
                        {inv.invoiceNumber} - Unit {inv.unit?.unitNumber} ({inv.billingPeriod}) - Total: ₹{inv.totalAmount}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Payment Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={commonStyles.input}
                    required
                  />
                </div>

                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
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
                    value={txnRef}
                    onChange={(e) => setTxnRef(e.target.value)}
                    placeholder="e.g. UPI-928374928"
                    style={commonStyles.input}
                  />
                </div>

                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Paid in full via payment counter"
                    style={{ ...commonStyles.input, minHeight: "60px" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                  <button
                    type="button"
                    onClick={() => setShowRecordModal(false)}
                    style={commonStyles.outlineBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recording}
                    style={commonStyles.primaryBtn}
                  >
                    {recording ? "Recording..." : "Save Payment Record"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
