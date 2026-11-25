import { useState, useEffect, useMemo } from "react";
import {
  Activity,
  UserPlus,
  Users,
  BedDouble,
  HeartPulse,
  CheckCircle2,
  Search,
  Filter,
  RotateCcw,
  Pencil,
  Trash2,
  X,
  Calendar,
  Clock,
  Stethoscope,
  Building2,
  AlertCircle,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const GENDERS = ["Male", "Female", "Other"];
const WARDS = ["General Ward", "ICU", "Emergency", "Maternity", "Pediatrics"];
const DEPARTMENTS = ["Cardiology", "Neurology", "Orthopedics", "General Medicine", "Pediatrics"];
const DOCTORS = [
  "Dr. Adithya Sharma", 
  "Dr. Meera Rao", 
  "Dr. Karthik Nair",
  "Dr. Priya Verma", 
  "Dr. Vikram Iyer",
];

const initialFormState = {
  name: "",
  age: "",
  gender: "",
  ward: "",
  department: "",
  doctor: "",
  admission_date: new Date().toISOString().split("T")[0],
  status: "Admitted",
};

// Helper to calculate relative timeline text ("Today", "Yesterday", "X days ago")
function getRelativeAdmissionTime(dateString) {
  if (!dateString) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateString.split("-").map(Number);
  const admitted = new Date(y, m - 1, d);
  const diffDays = Math.round((today - admitted) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1) return `${diffDays} days ago`;
  return "Scheduled";
}

export default function App() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  // Filters & Search
  const [search, setSearch] = useState("");
  const [filterWard, setFilterWard] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("");
  const [statusTab, setStatusTab] = useState("ALL");

  // Add / Edit Form Modal State
  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Custom Centered Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterWard) params.append("ward", filterWard);
      if (filterDept) params.append("department", filterDept);
      if (filterDoctor) params.append("doctor", filterDoctor);

      const res = await fetch(`${API_BASE_URL}/patients?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch patient records.");
      const data = await res.json();
      setPatients(data);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [search, filterWard, filterDept, filterDoctor]);

  // Dashboard Stats
  const stats = useMemo(() => {
    const total = patients.length;
    const admitted = patients.filter((p) => p.status === "Admitted").length;
    const discharged = patients.filter((p) => p.status === "Discharged").length;
    const activeIcu = patients.filter(
      (p) => p.status === "Admitted" && p.ward === "ICU"
    ).length;
    return { total, admitted, discharged, activeIcu };
  }, [patients]);

  const displayedPatients = useMemo(() => {
    if (statusTab === "ALL") return patients;
    return patients.filter((p) => p.status === statusTab);
  }, [patients, statusTab]);

  // Frontend Validation
  const validateForm = () => {
    const errors = {};
    const nameRegex = /^[A-Za-z\s]+$/;

    if (!formData.name.trim()) {
      errors.name = "Patient name is required.";
    } else if (!nameRegex.test(formData.name.trim())) {
      errors.name = "Name must contain letters only.";
    }

    const ageNum = Number(formData.age);
    if (formData.age === "" || isNaN(ageNum)) {
      errors.age = "Age is required.";
    } else if (ageNum < 0 || ageNum > 120) {
      errors.age = "Age must be between 0 and 120.";
    }

    if (!formData.gender) errors.gender = "Select a gender.";
    if (!formData.ward) errors.ward = "Select a ward.";
    if (!formData.department) errors.department = "Select a department.";
    if (!formData.doctor) errors.doctor = "Select a doctor.";

    if (!formData.admission_date) {
      errors.admission_date = "Admission date is required.";
    } else {
      const today = new Date().toISOString().split("T")[0];
      if (formData.admission_date > today) {
        errors.admission_date = "Cannot be a future date.";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    if (!validateForm()) return;

    setSubmitting(true);
    const url = editingId
      ? `${API_BASE_URL}/patients/${editingId}`
      : `${API_BASE_URL}/patients`;
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          name: formData.name.trim(),
          age: Number(formData.age),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.detail?.[0]?.msg || data.detail || "Server rejected the input.";
        throw new Error(msg);
      }

      closeForm();
      fetchPatients();
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (patient) => {
    setEditingId(patient.id);
    setFormData({
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      ward: patient.ward,
      department: patient.department,
      doctor: patient.doctor,
      admission_date: patient.admission_date,
      status: patient.status,
    });
    setFormErrors({});
    setApiError("");
    setIsFormOpen(true);
  };

  const handleDischarge = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${id}/discharge`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to discharge patient.");
      fetchPatients();
    } catch (err) {
      alert(err.message);
    }
  };

  const openDeleteModal = (id, name) => {
    setDeleteTarget({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete patient.");
      setDeleteTarget(null);
      fetchPatients();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setFormErrors({});
    setApiError("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
    setFormErrors({});
  };

  const resetFilters = () => {
    setSearch("");
    setFilterWard("");
    setFilterDept("");
    setFilterDoctor("");
    setStatusTab("ALL");
  };

  const hasActiveFilters =
    search || filterWard || filterDept || filterDoctor || statusTab !== "ALL";

  const getWardBadgeStyle = (ward) => {
    if (ward === "ICU" || ward === "Emergency") {
      return "bg-[#2A1822] text-[#F48FB1] border-[#883955]/50";
    }
    return "bg-[#1C2614] text-[#C6F432] border-[#C6F432]/40";
  };

  return (
    <div className="min-h-screen page-lime-backdrop text-white font-sans antialiased selection:bg-[#C6F432] selection:text-[#08080C]">
      {/* Sticky Dark Header */}
      <header className="sticky top-0 z-30 bg-[#08080C]/85 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#C6F432] flex items-center justify-center text-[#08080C] shadow-[0_0_20px_rgba(198,244,50,0.3)] shrink-0">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="truncate">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-none">
                MedCare <span className="text-[#C6F432]">Admit</span>
              </h1>
              <p className="hidden sm:block text-xs text-zinc-400 mt-0.5">
                Patient Admission Management App
              </p>
            </div>
          </div>

          <button
            onClick={openAddForm}
            className="inline-flex items-center gap-2 bg-[#C6F432] hover:bg-[#d4fa52] active:scale-[0.98] text-[#08080C] text-sm font-bold px-3.5 sm:px-4 py-2.5 rounded-xl shadow-[0_0_20px_rgba(198,244,50,0.25)] transition shrink-0"
          >
            <UserPlus className="w-4 h-4 stroke-[2.2]" />
            <span>Admit Patient</span>
          </button>
        </div>
      </header>

      {/* Top Hero Grid Section */}
      <div className="hero-grid-overlay border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-6">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Stat 1: Total Records */}
            <div className="bg-[#111216] rounded-2xl p-3.5 sm:p-4 border border-white/10 shadow-xl flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 truncate">
                  Total Records
                </span>
                <span className="text-xl sm:text-2xl font-bold text-white">
                  {stats.total}
                </span>
              </div>
            </div>

            {/* Stat 2: Admitted */}
            <div className="bg-[#111216] rounded-2xl p-3.5 sm:p-4 border border-[#C6F432]/30 shadow-xl flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#C6F432]/15 text-[#C6F432] border border-[#C6F432]/30 flex items-center justify-center shrink-0">
                <BedDouble className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 truncate">
                  Admitted
                </span>
                <span className="text-xl sm:text-2xl font-bold text-white">
                  {stats.admitted}
                </span>
              </div>
            </div>

            {/* Stat 3: Active ICU */}
            <div className="bg-[#111216] rounded-2xl p-3.5 sm:p-4 border border-white/10 shadow-xl flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center justify-center shrink-0">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 truncate">
                  Active ICU
                </span>
                <span className="text-xl sm:text-2xl font-bold text-white">
                  {stats.activeIcu}
                </span>
              </div>
            </div>

            {/* Stat 4: Discharged */}
            <div className="bg-[#111216] rounded-2xl p-3.5 sm:p-4 border border-white/10 shadow-xl flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-zinc-500/15 text-zinc-300 border border-zinc-500/25 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 truncate">
                  Discharged
                </span>
                <span className="text-xl sm:text-2xl font-bold text-white">
                  {stats.discharged}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Search & Filter Card */}
        <section className="bg-[#111216] rounded-2xl p-4 sm:p-5 border border-[#C6F432]/25 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Filter className="w-4 h-4 text-[#C6F432]" />
              <span>Search & Filter Patients</span>
            </div>

            {/* Status Segmented Tabs */}
            <div className="inline-flex bg-[#191B20] p-1 rounded-xl border border-white/5 self-start sm:self-auto">
              {[
                { key: "ALL", label: `All (${patients.length})` },
                { key: "Admitted", label: `Admitted (${stats.admitted})` },
                { key: "Discharged", label: `Discharged (${stats.discharged})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusTab(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    statusTab === tab.key
                      ? "bg-[#C6F432] text-[#08080C] shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="relative lg:col-span-4">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by patient name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-[#181A20] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C6F432] focus:ring-1 focus:ring-[#C6F432] transition"
              />
            </div>

            {/* Ward Select */}
            <div className="lg:col-span-2">
              <select
                value={filterWard}
                onChange={(e) => setFilterWard(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#181A20] border border-white/10 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-[#C6F432]"
              >
                <option value="">All Wards</option>
                {WARDS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            {/* Department Select */}
            <div className="lg:col-span-3">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#181A20] border border-white/10 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-[#C6F432]"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Doctor Select */}
            <div className="lg:col-span-2">
              <select
                value={filterDoctor}
                onChange={(e) => setFilterDoctor(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#181A20] border border-white/10 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-[#C6F432]"
              >
                <option value="">All Doctors</option>
                {DOCTORS.map((doc) => (
                  <option key={doc} value={doc}>{doc}</option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            <div className="lg:col-span-1">
              <button
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                title="Reset all filters"
                className="w-full h-full min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#181A20] border border-white/10 text-sm font-medium text-zinc-300 hover:border-[#C6F432]/50 hover:text-[#C6F432] disabled:opacity-35 disabled:pointer-events-none transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="lg:hidden">Reset Filters</span>
              </button>
            </div>
          </div>
        </section>

        {/* Patient Records Display */}
        {loading ? (
          <div className="bg-[#111216] rounded-2xl p-12 border border-white/10 text-center">
            <div className="w-8 h-8 border-2 border-[#C6F432] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-zinc-400 font-medium">Loading patient directory...</p>
          </div>
        ) : displayedPatients.length === 0 ? (
          <div className="bg-[#111216] rounded-2xl p-12 border border-white/10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 text-zinc-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No patient records found</h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
              Try adjusting your search or filter criteria, or admit a new patient.
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#C6F432] hover:underline"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile & Tablet Card View (< 1024px) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
              {displayedPatients.map((p) => {
                const isAdmitted = p.status === "Admitted";
                return (
                  <div
                    key={p.id}
                    className={`bg-[#111216] rounded-2xl p-4 shadow-xl transition ${
                      isAdmitted
                        ? "border border-[#C6F432]/35"
                        : "border border-white/10"
                    }`}
                  >
                    {/* Card Top Row */}
                    <div className="flex items-start justify-between gap-3 mb-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-[#182218] border border-[#C6F432]/35 text-[#C6F432] flex items-center justify-center font-bold text-base shrink-0">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-white text-base truncate">
                            {p.name}
                          </h3>
                          <p className="text-xs text-zinc-400">
                            {p.age} yrs &bull; {p.gender}
                          </p>
                        </div>
                      </div>

                      {isAdmitted ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#182614] text-[#C6F432] border border-[#C6F432]/60 shadow-[0_0_12px_rgba(198,244,50,0.3)] shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C6F432]" />
                          Admitted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#1D222B] text-zinc-300 border border-white/10 shrink-0">
                          Discharged
                        </span>
                      )}
                    </div>

                    {/* Inner Details Box */}
                    <div className="bg-[#181A20] rounded-xl p-3.5 grid grid-cols-2 gap-3 text-xs border border-white/5 mb-3.5">
                      <div>
                        <span className="text-zinc-500 block mb-1">Ward</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getWardBadgeStyle(
                            p.ward
                          )}`}
                        >
                          <Building2 className="w-3 h-3" />
                          {p.ward}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-1">Department</span>
                        <span className="font-semibold text-zinc-200">{p.department}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-1">Attending Doctor</span>
                        <span className="font-semibold text-white truncate block">
                          {p.doctor}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-1">Admission Timeline</span>
                        <span className="font-semibold text-white block">
                          {p.admission_date}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {getRelativeAdmissionTime(p.admission_date)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2">
                      {isAdmitted && (
                        <button
                          onClick={() => handleDischarge(p.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A2414] hover:bg-[#23311B] text-[#C6F432] border border-[#C6F432]/45 text-xs font-semibold transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Discharge
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(p)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#182232] hover:bg-[#1f2d42] text-blue-400 border border-blue-500/25 text-xs font-semibold transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteModal(p.id, p.name)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2A1619] hover:bg-[#381c20] text-rose-400 border border-rose-500/25 text-xs font-semibold transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= 1024px) */}
            <div className="hidden lg:block bg-[#111216] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#16181E] border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <th className="py-4 px-5">Patient</th>
                    <th className="py-4 px-4">Ward & Department</th>
                    <th className="py-4 px-4">Attending Doctor</th>
                    <th className="py-4 px-4">Admission Timeline</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.07] text-sm">
                  {displayedPatients.map((p) => {
                    const isAdmitted = p.status === "Admitted";
                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition">
                        {/* Column 1: Patient */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-[#182018] border border-[#C6F432]/30 text-[#C6F432] flex items-center justify-center font-bold text-sm shrink-0">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-white text-[15px]">
                                {p.name}
                              </div>
                              <div className="text-xs text-zinc-400 mt-0.5">
                                {p.age} yrs &bull; {p.gender}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Ward & Department */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getWardBadgeStyle(
                              p.ward
                            )}`}
                          >
                            <Building2 className="w-3 h-3" />
                            {p.ward}
                          </span>
                          <div className="text-xs text-zinc-400 mt-1.5 pl-0.5">
                            {p.department}
                          </div>
                        </td>

                        {/* Column 3: Attending Doctor */}
                        <td className="py-4 px-4">
                          <div className="inline-flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#192319] border border-[#C6F432]/25 text-[#C6F432] flex items-center justify-center shrink-0">
                              <Stethoscope className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-semibold text-zinc-100">
                              {p.doctor}
                            </span>
                          </div>
                        </td>

                        {/* Column 4: Admission Timeline */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-zinc-100 text-xs font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{p.admission_date}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mt-1">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            <span>{getRelativeAdmissionTime(p.admission_date)}</span>
                          </div>
                        </td>

                        {/* Column 5: Status Pill */}
                        <td className="py-4 px-4">
                          {isAdmitted ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#182614] text-[#C6F432] border border-[#C6F432]/65 shadow-[0_0_15px_rgba(198,244,50,0.28)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#C6F432]" />
                              Admitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#1B222C] text-zinc-300 border border-white/10">
                              Discharged
                            </span>
                          )}
                        </td>

                        {/* Column 6: Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {isAdmitted && (
                              <button
                                onClick={() => handleDischarge(p.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A2414] hover:bg-[#23311B] text-[#C6F432] border border-[#C6F432]/45 text-xs font-semibold transition"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Discharge
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(p)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#182232] hover:bg-[#1f2d42] text-blue-400 border border-blue-500/25 text-xs font-semibold transition"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => openDeleteModal(p.id, p.name)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2A1619] hover:bg-[#381c20] text-rose-400 border border-rose-500/25 text-xs font-semibold transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* Add / Edit Patient Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#111216] w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-[#C6F432]/30 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 bg-[#16181E] border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {editingId ? "Edit Patient Record" : "Admit New Patient"}
                </h2>
                <p className="text-xs text-zinc-400">
                  All fields marked with * are mandatory
                </p>
              </div>
              <button
                onClick={closeForm}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {apiError && (
                <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-3.5 py-2.5 rounded-xl text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{apiError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Patient Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Virat Kohli"
                  className="w-full px-3.5 py-2.5 bg-[#181A20] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C6F432]"
                />
                {formErrors.name && (
                  <p className="text-rose-400 text-xs mt-1">{formErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Age *
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="0 - 120"
                    className="w-full px-3.5 py-2.5 bg-[#181A20] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C6F432]"
                  />
                  {formErrors.age && (
                    <p className="text-rose-400 text-xs mt-1">{formErrors.age}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Gender *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#181A20] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#C6F432]"
                  >
                    <option value="">Select</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  {formErrors.gender && (
                    <p className="text-rose-400 text-xs mt-1">{formErrors.gender}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Ward *
                  </label>
                  <select
                    value={formData.ward}
                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#181A20] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#C6F432]"
                  >
                    <option value="">Select Ward</option>
                    {WARDS.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                  {formErrors.ward && (
                    <p className="text-rose-400 text-xs mt-1">{formErrors.ward}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Department *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#181A20] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#C6F432]"
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {formErrors.department && (
                    <p className="text-rose-400 text-xs mt-1">{formErrors.department}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Assigned Doctor *
                  </label>
                  <select
                    value={formData.doctor}
                    onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#181A20] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#C6F432]"
                  >
                    <option value="">Select Doctor</option>
                    {DOCTORS.map((doc) => (
                      <option key={doc} value={doc}>{doc}</option>
                    ))}
                  </select>
                  {formErrors.doctor && (
                    <p className="text-rose-400 text-xs mt-1">{formErrors.doctor}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Admission Date *
                  </label>
                  <input
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    value={formData.admission_date}
                    onChange={(e) =>
                      setFormData({ ...formData, admission_date: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-[#181A20] border border-white/10 rounded-xl text-sm text-white [color-scheme:dark] focus:outline-none focus:border-[#C6F432]"
                  />
                  {formErrors.admission_date && (
                    <p className="text-rose-400 text-xs mt-1">{formErrors.admission_date}</p>
                  )}
                </div>
              </div>

              {editingId && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#181A20] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#C6F432]"
                  >
                    <option value="Admitted">Admitted</option>
                    <option value="Discharged">Discharged</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#C6F432] hover:bg-[#d4fa52] text-[#08080C] shadow-[0_0_20px_rgba(198,244,50,0.25)] disabled:opacity-50 transition"
                >
                  {submitting
                    ? "Saving..."
                    : editingId
                    ? "Save Changes"
                    : "Admit Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Centered Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          onClick={() => !deleting && setDeleteTarget(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111216] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-6 text-center space-y-5"
          >
            {/* Trash Icon Box */}
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            {/* Title & Message */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">
                Delete Patient Record?
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Are you sure you want to permanently remove{" "}
                <span className="font-semibold text-white">
                  {deleteTarget.name}
                </span>
                ? This action cannot be undone.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#181A20] hover:bg-[#22252E] text-zinc-300 border border-white/10 text-sm font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold shadow-[0_0_20px_rgba(225,29,72,0.3)] transition disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}