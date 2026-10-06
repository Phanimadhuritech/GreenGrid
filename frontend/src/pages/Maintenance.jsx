import React, { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { commonStyles } from "../theme";

export default function Maintenance() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [units, setUnits] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Form states - Create
  const [reqTitle, setReqTitle] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  const [reqPriority, setReqPriority] = useState("MEDIUM");
  const [reqUnitId, setReqUnitId] = useState("");
  const [creating, setCreating] = useState(false);

  // Form states - Assign
  const [assignTechId, setAssignTechId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Form states - Resolve
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  const isResident = user?.role === "UNIT_USER";
  const isTechnician = user?.role === "TECHNICIAN";
  const isManager = user?.role === "FACILITY_MANAGER" || user?.role === "PLATFORM_ADMIN";

  useEffect(() => {
    if (!user) return;
    fetchRequests();
    if (isManager) {
      fetchUnits();
      fetchTechnicians();
    }
    if (isResident && user?.unit) {
      setReqUnitId(user.unit._id || user.unit);
    }
  }, [user, isResident, isManager]);

  const fetchRequests = async () => {
    setLoading(true);
    setError("");
    try {
      let endpoint = "/maintenance";
      if (isResident) endpoint = "/maintenance/my";
      else if (isTechnician) endpoint = "/maintenance/assigned";

      const res = await API.get(endpoint);
      setRequests(res.data.requests || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load maintenance requests.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await API.get("/units");
      setUnits(res.data.units || []);
      if (res.data.units?.length > 0) {
        setReqUnitId(res.data.units[0]._id);
      }
    } catch (err) {
      console.error("Failed to load units:", err);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const res = await API.get("/maintenance/technicians");
      if (res?.data?.technicians) {
        setTechnicians(res.data.technicians);
        if (res.data.technicians.length > 0) setAssignTechId(res.data.technicians[0]._id);
      }
    } catch (err) {
      console.error("Failed to load technicians:", err);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const targetUnit = reqUnitId || user?.unit?._id || user?.unit;
    if (isResident && !targetUnit) {
      setError("You do not currently have an assigned residential unit. Please contact your Facility Manager to link your unit before submitting maintenance requests.");
      return;
    }

    if (!reqTitle.trim()) {
      setError("Please enter a maintenance request title.");
      return;
    }

    if (!reqDesc.trim()) {
      setError("Please enter an issue description.");
      return;
    }

    setCreating(true);

    try {
      const payload = {
        title: reqTitle.trim(),
        description: reqDesc.trim(),
        priority: reqPriority,
      };
      if (targetUnit) {
        payload.unitId = targetUnit;
      }

      await API.post("/maintenance", payload);
      setSuccessMsg("Maintenance request submitted successfully!");
      setShowCreateModal(false);
      setReqTitle("");
      setReqDesc("");
      setReqPriority("MEDIUM");
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create maintenance request.");
    } finally {
      setCreating(false);
    }
  };

  const handleAssignTechnician = async (e) => {
    e.preventDefault();
    if (!selectedRequest || !assignTechId) return;
    setAssigning(true);
    setError("");
    setSuccessMsg("");

    try {
      await API.put(`/maintenance/${selectedRequest._id}/assign`, {
        technicianId: assignTechId,
        notes: assignNotes,
      });

      setSuccessMsg(`Technician assigned to request ${selectedRequest.title}!`);
      setShowAssignModal(false);
      setSelectedRequest(null);
      setAssignNotes("");
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to assign technician.");
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusChange = async (requestId, newStatus) => {
    try {
      await API.put(`/maintenance/${requestId}`, { status: newStatus });
      setSuccessMsg(`Status updated to ${newStatus}!`);
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status.");
    }
  };

  const handleResolveRequest = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setResolving(true);
    setError("");
    setSuccessMsg("");

    try {
      await API.put(`/maintenance/${selectedRequest._id}`, {
        status: "RESOLVED",
        resolutionNotes,
      });

      setSuccessMsg("Request marked as RESOLVED with resolution notes.");
      setShowResolveModal(false);
      setSelectedRequest(null);
      setResolutionNotes("");
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resolve request.");
    } finally {
      setResolving(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (priorityFilter !== "ALL" && r.priority !== priorityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const titleMatch = r.title?.toLowerCase().includes(q);
      const descMatch = r.description?.toLowerCase().includes(q);
      const unitMatch = r.unit?.unitNumber?.toLowerCase().includes(q);
      const bldMatch = r.building?.name?.toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !unitMatch && !bldMatch) return false;
    }
    return true;
  });

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "URGENT":
        return <span style={{ ...commonStyles.badgeCritical, fontWeight: "700" }}>🚨 URGENT</span>;
      case "HIGH":
        return <span style={{ ...commonStyles.badgeMaintenance, fontWeight: "700" }}>⚡ HIGH</span>;
      case "MEDIUM":
        return <span style={{ ...commonStyles.badgeActive, backgroundColor: "#E0F2FE", color: "#0369A1" }}>MEDIUM</span>;
      case "LOW":
        return <span style={commonStyles.badgeNeutral}>LOW</span>;
      default:
        return <span style={commonStyles.badgeNeutral}>{priority}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "OPEN":
        return <span style={{ ...commonStyles.badgeMaintenance, backgroundColor: "#FEF3C7", color: "#92400E" }}>OPEN</span>;
      case "ASSIGNED":
        return <span style={{ ...commonStyles.badgeActive, backgroundColor: "#DBEAFE", color: "#1E40AF" }}>ASSIGNED</span>;
      case "IN_PROGRESS":
        return <span style={{ ...commonStyles.badgeActive, backgroundColor: "#F3E8FF", color: "#6B21A8" }}>IN PROGRESS</span>;
      case "RESOLVED":
        return <span style={commonStyles.badgeActive}>✓ RESOLVED</span>;
      case "CLOSED":
        return <span style={{ ...commonStyles.badgeNeutral, backgroundColor: "#E2E8F0", color: "#334155" }}>🔒 CLOSED</span>;
      default:
        return <span style={commonStyles.badgeNeutral}>{status}</span>;
    }
  };

  const openCount = requests.filter((r) => r.status === "OPEN").length;
  const inProgressCount = requests.filter((r) => ["ASSIGNED", "IN_PROGRESS"].includes(r.status)).length;
  const resolvedCount = requests.filter((r) => ["RESOLVED", "CLOSED"].includes(r.status)).length;
  const urgentCount = requests.filter((r) => r.priority === "URGENT" && !["RESOLVED", "CLOSED"].includes(r.status)).length;

  return (
    <AppLayout>
      {/* Header */}
      <div style={commonStyles.pageHeader}>
        <div style={commonStyles.titleGroup}>
          <h1 style={commonStyles.pageTitle}>Maintenance & Field Services</h1>
          <p style={commonStyles.pageSubtitle}>
            {isResident
              ? "Submit maintenance tickets for meter issues, wiring, or utility troubleshooting."
              : isTechnician
              ? "Your assigned on-site work orders, repair dispatches, and diagnostic notes."
              : "Manage building maintenance tickets, assign field technicians, and track SLAs."}
          </p>
        </div>
        <div style={commonStyles.headerActions}>
          {(isResident || isManager) && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={commonStyles.primaryBtn}
            >
              <span>+</span>
              <span>Create Request</span>
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
          <div style={commonStyles.statLabel}>Total Requests</div>
          <div style={commonStyles.statValue}>{requests.length}</div>
          <div style={commonStyles.statSubtext}>Across all units</div>
        </div>

        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Open Tickets</div>
          <div style={{ ...commonStyles.statValue, color: "#D97706" }}>{openCount}</div>
          <div style={{ ...commonStyles.statSubtext, color: "#D97706" }}>Awaiting triage</div>
        </div>

        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>In Progress</div>
          <div style={{ ...commonStyles.statValue, color: "#2563EB" }}>{inProgressCount}</div>
          <div style={{ ...commonStyles.statSubtext, color: "#2563EB" }}>Assigned & active</div>
        </div>

        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Resolved / Closed</div>
          <div style={{ ...commonStyles.statValue, color: "#166534" }}>{resolvedCount}</div>
          <div style={{ ...commonStyles.statSubtext, color: "#166534" }}>Completed fixes</div>
        </div>

        {urgentCount > 0 && (
          <div style={{ ...commonStyles.statCard, borderLeft: "4px solid #991B1B" }}>
            <div style={{ ...commonStyles.statLabel, color: "#991B1B" }}>Urgent Attention</div>
            <div style={{ ...commonStyles.statValue, color: "#991B1B" }}>{urgentCount}</div>
            <div style={{ ...commonStyles.statSubtext, color: "#991B1B" }}>Critical priority</div>
          </div>
        )}
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
          placeholder="Search by title, description, unit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...commonStyles.input, maxWidth: "320px" }}
        />

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...commonStyles.input, width: "auto" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ ...commonStyles.input, width: "auto" }}
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <button
          onClick={() => {
            setSearch("");
            setStatusFilter("ALL");
            setPriorityFilter("ALL");
          }}
          style={commonStyles.outlineBtn}
        >
          Reset Filters
        </button>
      </div>

      {/* Requests Table */}
      <div style={commonStyles.tableContainer}>
        {loading ? (
          <div style={commonStyles.loadingSpinner}>
            <span>⚡</span> Loading maintenance requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div style={commonStyles.emptyState}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔧</div>
            <h3 style={{ color: "#17221B", margin: "0 0 6px" }}>No Maintenance Requests</h3>
            <p style={{ margin: 0 }}>
              {search || statusFilter !== "ALL" || priorityFilter !== "ALL"
                ? "No tickets match your filter criteria."
                : "No maintenance requests are currently logged."}
            </p>
          </div>
        ) : (
          <table style={commonStyles.table}>
            <thead>
              <tr>
                <th style={commonStyles.th}>Ticket / Title</th>
                <th style={commonStyles.th}>Unit & Building</th>
                <th style={commonStyles.th}>Priority</th>
                <th style={commonStyles.th}>Status</th>
                <th style={commonStyles.th}>Assigned Tech</th>
                <th style={commonStyles.th}>Created Date</th>
                <th style={{ ...commonStyles.th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((r) => (
                <tr key={r._id} style={{ borderBottom: "1px solid #EBF1ED" }}>
                  <td style={commonStyles.td}>
                    <div style={{ fontWeight: "700", color: "#17221B", fontSize: "14px" }}>
                      {r.title}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748B",
                        maxWidth: "280px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginTop: "2px",
                      }}
                    >
                      {r.description}
                    </div>
                    {r.resolutionNotes && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#166534",
                          backgroundColor: "#DCFCE7",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          marginTop: "4px",
                          display: "inline-block",
                        }}
                      >
                        Note: {r.resolutionNotes}
                      </div>
                    )}
                  </td>
                  <td style={commonStyles.td}>
                    <div style={{ fontWeight: "600" }}>Unit {r.unit?.unitNumber || "N/A"}</div>
                    <div style={{ fontSize: "12px", color: "#64748B" }}>
                      {r.building?.name || "Building"}
                    </div>
                  </td>
                  <td style={commonStyles.td}>{getPriorityBadge(r.priority)}</td>
                  <td style={commonStyles.td}>{getStatusBadge(r.status)}</td>
                  <td style={commonStyles.td}>
                    {r.assignedTechnician ? (
                      <div>
                        <div style={{ fontWeight: "600", color: "#17221B" }}>
                          {r.assignedTechnician.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748B" }}>
                          {r.assignedTechnician.email}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: "#94A3B8", fontStyle: "italic", fontSize: "13px" }}>
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td style={commonStyles.td}>
                    <span style={{ fontSize: "13px", color: "#475569" }}>
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A"}
                    </span>
                  </td>
                  <td style={{ ...commonStyles.td, textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                      {/* Manager actions */}
                      {isManager && r.status === "OPEN" && (
                        <button
                          onClick={() => {
                            setSelectedRequest(r);
                            setShowAssignModal(true);
                          }}
                          style={commonStyles.primaryBtn}
                        >
                          Assign Tech
                        </button>
                      )}

                      {/* Technician actions */}
                      {isTechnician && r.status === "ASSIGNED" && (
                        <button
                          onClick={() => handleStatusChange(r._id, "IN_PROGRESS")}
                          style={commonStyles.primaryBtn}
                        >
                          Start Work
                        </button>
                      )}

                      {isTechnician && r.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => {
                            setSelectedRequest(r);
                            setShowResolveModal(true);
                          }}
                          style={commonStyles.secondaryBtn}
                        >
                          Resolve Ticket
                        </button>
                      )}

                      {/* Resident close action */}
                      {isResident && r.status === "RESOLVED" && (
                        <button
                          onClick={() => handleStatusChange(r._id, "CLOSED")}
                          style={{ ...commonStyles.outlineBtn, color: "#166534", border: "1px solid #86EFAC" }}
                        >
                          Close Ticket
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

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div style={commonStyles.modalOverlay}>
          <div style={commonStyles.modalContent}>
            <div style={commonStyles.cardHeader}>
              <h2 style={commonStyles.cardTitle}>New Maintenance Request</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#991B1B",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  fontSize: "13px",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleCreateRequest}>
              {isResident && user?.unit && (
                <div
                  style={{
                    backgroundColor: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                    fontSize: "13px",
                    color: "#166534",
                  }}
                >
                  <div style={{ fontWeight: "600" }}>
                    🏢 Assigned Unit: {user.unit.unitNumber || "Your Unit"}
                    {user.unit.floor ? ` (Floor ${user.unit.floor})` : ""}
                  </div>
                  <div style={{ fontSize: "12px", color: "#15803D", marginTop: "2px" }}>
                    {user.unit.building?.name || user.organization?.name || "Verified residential property"}
                  </div>
                </div>
              )}

              {isResident && !user?.unit && (
                <div
                  style={{
                    backgroundColor: "#FEF2F2",
                    border: "1px solid #FECACA",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                    fontSize: "13px",
                    color: "#991B1B",
                  }}
                >
                  <strong>⚠️ No Unit Assigned:</strong> Your resident account is not currently linked to a residential unit. Please contact your Facility Manager to assign a unit to your profile before submitting maintenance requests.
                </div>
              )}

              {!isResident && (
                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Target Unit *</label>
                  <select
                    value={reqUnitId}
                    onChange={(e) => setReqUnitId(e.target.value)}
                    style={commonStyles.input}
                    required
                  >
                    {units.map((u) => (
                      <option key={u._id} value={u._id}>
                        Unit {u.unitNumber} ({u.building?.name || "Building"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Request Title *</label>
                <input
                  type="text"
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  placeholder="e.g. Smart meter digital display blank"
                  style={commonStyles.input}
                  required
                />
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Issue Description *</label>
                <textarea
                  value={reqDesc}
                  onChange={(e) => setReqDesc(e.target.value)}
                  placeholder="Describe the issue, symptoms, and urgency in detail..."
                  style={{ ...commonStyles.input, minHeight: "90px" }}
                  required
                />
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Priority Level *</label>
                <select
                  value={reqPriority}
                  onChange={(e) => setReqPriority(e.target.value)}
                  style={commonStyles.input}
                  required
                >
                  <option value="LOW">Low (Routine checkup / non-urgent)</option>
                  <option value="MEDIUM">Medium (Minor defect / functional)</option>
                  <option value="HIGH">High (Power outage / critical meter fault)</option>
                  <option value="URGENT">Urgent (Safety hazard / sparking)</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={commonStyles.outlineBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={commonStyles.primaryBtn}
                >
                  {creating ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN MODAL */}
      {showAssignModal && selectedRequest && (
        <div style={commonStyles.modalOverlay}>
          <div style={commonStyles.modalContent}>
            <div style={commonStyles.cardHeader}>
              <h2 style={commonStyles.cardTitle}>Assign Field Technician</h2>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                backgroundColor: "#F8FAF9",
                padding: "14px 16px",
                borderRadius: "8px",
                border: "1px solid #DCE5DF",
                marginBottom: "20px",
                fontSize: "13px",
              }}
            >
              <div>
                Ticket: <strong>{selectedRequest.title}</strong>
              </div>
              <div style={{ marginTop: "4px" }}>
                Unit: <strong>{selectedRequest.unit?.unitNumber}</strong> (
                {selectedRequest.building?.name})
              </div>
            </div>

            <form onSubmit={handleAssignTechnician}>
              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Select Field Technician *</label>
                <select
                  value={assignTechId}
                  onChange={(e) => setAssignTechId(e.target.value)}
                  style={commonStyles.input}
                  required
                >
                  {technicians.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Assignment Instructions (Optional)</label>
                <textarea
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="e.g. Please bring replacement current transformer and meter testing kit."
                  style={{ ...commonStyles.input, minHeight: "70px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  style={commonStyles.outlineBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  style={commonStyles.primaryBtn}
                >
                  {assigning ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLVE MODAL */}
      {showResolveModal && selectedRequest && (
        <div style={commonStyles.modalOverlay}>
          <div style={commonStyles.modalContent}>
            <div style={commonStyles.cardHeader}>
              <h2 style={commonStyles.cardTitle}>Complete Maintenance Ticket</h2>
              <button
                onClick={() => setShowResolveModal(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolveRequest}>
              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Resolution Notes & Work Summary *</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe the diagnostics conducted and the fix applied..."
                  style={{ ...commonStyles.input, minHeight: "100px" }}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  style={commonStyles.outlineBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  style={commonStyles.primaryBtn}
                >
                  {resolving ? "Saving..." : "Mark as RESOLVED"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
