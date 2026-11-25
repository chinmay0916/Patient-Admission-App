import { useState, useEffect, useMemo } from "react";
import {
  Activity,
  UserPlus,
  Search,
  Filter,
  RotateCcw,
  Edit3,
  Trash2,
  CheckCircle2,
  Stethoscope,
  Building2,
  Calendar,
  AlertCircle,
  X,
  Users,
  BedDouble,
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

const getTodayDate = () => new Date().toISOString().split("T")[0];

const initialFormState = {
  name: "",
  age: "",
  gender: "",
  ward: "",
  department: "",
  doctor: "",
  admission_date: getTodayDate(),
  status: "Admitted",
};

export default function App() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");

  // Search & Filter states
  const [search, setSearch] = useState("");
  const [filterWard, setFilterWard] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("");

  // Add/Edit Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation Modal state
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Fetch patients from backend
  const fetchPatients = async () => {
    setLoading(true);
    setGlobalError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (filterWard) params.append("ward", filterWard);
      if (filterDept) params.append("department", filterDept);
      if (filterDoctor) params.append("doctor", filterDoctor);

      const res = await fetch(`${API_BASE_URL}/patients?${params.toString()}`);
      if (!res.ok) throw new Error("Unable to connect to the server. Make sure the backend is running.");
      const data = await res.json();
      setPatients(data);
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients();
    }, 200); // Small debounce for smooth typing
    return () => clearTimeout(timer);
  }, [search, filterWard, filterDept, filterDoctor]);

  // Dashboard Summary Metrics
  const stats = useMemo(() => {
    const total = patients.length;
    const admitted = patients.filter((p) => p.status === "Admitted").length;
    const discharged = patients.filter((p) => p.status === "Discharged").length;
    const icu = patients.filter((p) => p.ward === "ICU" && p.status === "Admitted").length;
    return { total, admitted, discharged, icu };
  }, [patients]);

  // Strict Frontend Validation
  const validateForm = () => {
    const errors = {};
    const lettersOnlyRegex = /^[A-Za-z\s]+$/;

    if (!formData.name.trim()) {
      errors.name = "Patient name is required.";
    } else if (!lettersOnlyRegex.test(formData.name.trim())) {
      errors.name = "Name must contain letters only (no numbers or special characters).";
    }

    const ageVal = Number(formData.age);
    if (formData.age === "" || formData.age === null || isNaN(ageVal)) {
      errors.age = "Age is required.";
    } else if (!Number.isInteger(ageVal) || ageVal < 0 || ageVal > 120) {
      errors.age = "Age must be a whole number between 0 and 120.";
    }

    if (!formData.gender) errors.gender = "Please select a gender.";
    if (!formData.ward) errors.ward = "Please select a ward.";
    if (!formData.department) errors.department = "Please select a department.";
    if (!formData.doctor) errors.doctor = "Please assign a doctor.";

    if (!formData.admission_date) {
      errors.admission_date = "Admission date is required.";
    } else if (formData.admission_date > getTodayDate()) {
      errors.admission_date = "Admission date cannot be in the future.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ ...initialFormState, admission_date: getTodayDate() });
    setFormErrors({});
    setServerError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (patient) => {
    setEditingId(patient.id);
    setFormData({
      name: patient.name,
      age: String(patient.age),
      gender: patient.gender,
      ward: patient.ward,
      department: patient.department,
      doctor: patient.doctor,
      admission_date: patient.admission_date,
      status: patient.status,
    });
    setFormErrors({});
    setServerError("");
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validateForm()) return;

    setSubmitting(true);
    const url = editingId ? `${API_BASE_URL}/patients/${editingId}` : `${API_BASE_URL}/patients`;
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
          Array.isArray(data.detail) && data.detail[0]?.msg
            ? data.detail[0].msg.replace("Value error, ", "")
            : data.detail || "Invalid input rejected by server.";
        throw new Error(msg);
      }

      setIsModalOpen(false);
      fetchPatients();
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDischarge = async (patient) => {
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${patient.id}/discharge`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to discharge patient.");
      fetchPatients();
    } catch (err) {
      setGlobalError(err.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete patient.");
      setDeleteTarget(null);
      fetchPatients();
    } catch (err) {
      setGlobalError(err.message);
      setDeleteTarget(null);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setFilterWard("");
    setFilterDept("");
    setFilterDoctor("");
  };

  const hasActiveFilters = search || filterWard || filterDept || filterDoctor;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal-600 p-2 rounded-xl text-white shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                MedCare <span className="text-teal-600">Admit</span>
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Hospital Inpatient & Ward Management System
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Admit Patient</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        {/* Global Error Banner */}
        {globalError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{globalError}</span>
          </div>
        )}

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Showing Records</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <BedDouble className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Admitted</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.admitted}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active ICU</p>
              <p className="text-2xl font-bold text-amber-600">{stats.icu}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Discharged</p>
              <p className="text-2xl font-bold text-slate-700">{stats.discharged}</p>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Filter className="w-4 h-4 text-teal-600" />
              <span>Search & Filter Patients</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear all filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search by Name */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by patient name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
              />
            </div>

            {/* Filter by Ward */}
            <select
              value={filterWard}
              onChange={(e) => setFilterWard(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            >
              <option value="">All Wards</option>
              {WARDS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>

            {/* Filter by Department */}
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Filter by Doctor */}
            <select
              value={filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            >
              <option value="">All Doctors</option>
              {DOCTORS.map((doc) => (
                <option key={doc} value={doc}>{doc}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Patient Records List */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-sm font-medium">Loading patient directory...</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No patients found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {hasActiveFilters
                ? "No patient records match your current search or filter criteria."
                : "Get started by admitting your first patient into the hospital system."}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition cursor-pointer"
              >
                Reset Filters
              </button>
            ) : (
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Admit First Patient
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop & Tablet Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-5">Patient Details</th>
                      <th className="py-3.5 px-4">Ward & Department</th>
                      <th className="py-3.5 px-4">Assigned Doctor</th>
                      <th className="py-3.5 px-4">Admission Date</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {patients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-700 font-bold flex items-center justify-center text-sm shrink-0">
                              {patient.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{patient.name}</p>
                              <p className="text-xs text-slate-500">
                                {patient.age} yrs &bull; {patient.gender}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md mb-1 ${
                              patient.ward === "ICU" || patient.ward === "Emergency"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {patient.ward}
                          </span>
                          <p className="text-xs text-slate-600">{patient.department}</p>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Stethoscope className="w-4 h-4 text-teal-600 shrink-0" />
                            <span>{patient.doctor}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>{patient.admission_date}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              patient.status === "Admitted"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                patient.status === "Admitted" ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            ></span>
                            {patient.status}
                          </span>
                        </td>

                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {patient.status === "Admitted" && (
                              <button
                                onClick={() => handleDischarge(patient)}
                                title="Mark as Discharged"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Discharge
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEdit(patient)}
                              title="Edit Patient"
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(patient)}
                              title="Delete Patient"
                              className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 font-bold flex items-center justify-center">
                        {patient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{patient.name}</h3>
                        <p className="text-xs text-slate-500">
                          {patient.age} yrs &bull; {patient.gender}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        patient.status === "Admitted"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {patient.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
                    <div>
                      <span className="text-slate-400 block">Ward</span>
                      <span className="font-semibold text-slate-700">{patient.ward}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Department</span>
                      <span className="font-semibold text-slate-700">{patient.department}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Doctor</span>
                      <span className="font-semibold text-slate-700">{patient.doctor}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Admitted On</span>
                      <span className="font-semibold text-slate-700">{patient.admission_date}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {patient.status === "Admitted" && (
                      <button
                        onClick={() => handleDischarge(patient)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-xl"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Discharge
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEdit(patient)}
                      className="px-3 py-2 text-xs font-semibold bg-blue-50 text-blue-700 rounded-xl inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(patient)}
                      className="px-3 py-2 text-xs font-semibold bg-red-50 text-red-700 rounded-xl inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Add / Edit Patient Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-100 text-teal-700 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingId ? "Edit Patient Record" : "New Patient Admission"}
                  </h2>
                  <p className="text-xs text-slate-500">All fields marked with * are mandatory</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {serverError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Rohan Kulkarni"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                    formErrors.name
                      ? "border-red-400 focus:ring-red-400 bg-red-50/30"
                      : "border-slate-200 focus:ring-teal-500"
                  }`}
                />
                {formErrors.name && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>
                )}
              </div>

              {/* Age & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Age (0 - 120) *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 34"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                      formErrors.age
                        ? "border-red-400 focus:ring-red-400 bg-red-50/30"
                        : "border-slate-200 focus:ring-teal-500"
                    }`}
                  />
                  {formErrors.age && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.age}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 ${
                      formErrors.gender
                        ? "border-red-400 focus:ring-red-400"
                        : "border-slate-200 focus:ring-teal-500"
                    }`}
                  >
                    <option value="">Select Gender</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  {formErrors.gender && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.gender}</p>
                  )}
                </div>
              </div>

              {/* Ward & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ward *</label>
                  <select
                    value={formData.ward}
                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 ${
                      formErrors.ward
                        ? "border-red-400 focus:ring-red-400"
                        : "border-slate-200 focus:ring-teal-500"
                    }`}
                  >
                    <option value="">Select Ward</option>
                    {WARDS.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                  {formErrors.ward && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.ward}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 ${
                      formErrors.department
                        ? "border-red-400 focus:ring-red-400"
                        : "border-slate-200 focus:ring-teal-500"
                    }`}
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {formErrors.department && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.department}</p>
                  )}
                </div>
              </div>

              {/* Doctor & Admission Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Doctor *
                  </label>
                  <select
                    value={formData.doctor}
                    onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 ${
                      formErrors.doctor
                        ? "border-red-400 focus:ring-red-400"
                        : "border-slate-200 focus:ring-teal-500"
                    }`}
                  >
                    <option value="">Select Doctor</option>
                    {DOCTORS.map((doc) => (
                      <option key={doc} value={doc}>{doc}</option>
                    ))}
                  </select>
                  {formErrors.doctor && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.doctor}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admission Date *
                  </label>
                  <input
                    type="date"
                    max={getTodayDate()}
                    value={formData.admission_date}
                    onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                      formErrors.admission_date
                        ? "border-red-400 focus:ring-red-400"
                        : "border-slate-200 focus:ring-teal-500"
                    }`}
                  />
                  {formErrors.admission_date && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.admission_date}</p>
                  )}
                </div>
              </div>

              {/* Status (Visible when editing) */}
              {editingId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Admitted">Admitted</option>
                    <option value="Discharged">Discharged</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving..." : editingId ? "Update Record" : "Admit Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Delete Patient Record?</h3>
              <p className="text-sm text-slate-500">
                Are you sure you want to permanently remove{" "}
                <span className="font-semibold text-slate-800">{deleteTarget.name}</span>? This
                action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}