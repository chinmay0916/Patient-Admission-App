import os
import re
import sqlite3
from datetime import date
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

app = FastAPI(title="Patient Admission Management API")

# Allow the React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Check if a cloud PostgreSQL URL is provided (for Render/Neon deployment); otherwise use local SQLite
DATABASE_URL = os.environ.get("DATABASE_URL")
SQLITE_FILE = "patients.db"

# Strict dropdown options enforced on the backend
ALLOWED_GENDERS = ["Male", "Female", "Other"]
ALLOWED_WARDS = ["General Ward", "ICU", "Emergency", "Maternity", "Pediatrics"]
ALLOWED_DEPARTMENTS = ["Cardiology", "Neurology", "Orthopedics", "General Medicine", "Pediatrics"]
ALLOWED_DOCTORS = ["Dr. Adithya Sharma", "Dr. Meera Rao", "Dr. Karthik Nair", "Dr. Priya Verma", "Dr. Vikram Iyer"]
ALLOWED_STATUSES = ["Admitted", "Discharged"]


def get_connection():
    if DATABASE_URL:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return conn, True
    else:
        conn = sqlite3.connect(SQLITE_FILE)
        conn.row_factory = sqlite3.Row
        return conn, False


def init_db():
    conn, is_pg = get_connection()
    cursor = conn.cursor()
    if is_pg:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS patients (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                age INTEGER NOT NULL,
                gender TEXT NOT NULL,
                ward TEXT NOT NULL,
                department TEXT NOT NULL,
                doctor TEXT NOT NULL,
                admission_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Admitted'
            )
        """)
    else:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS patients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                age INTEGER NOT NULL,
                gender TEXT NOT NULL,
                ward TEXT NOT NULL,
                department TEXT NOT NULL,
                doctor TEXT NOT NULL,
                admission_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Admitted'
            )
        """)
    conn.commit()
    conn.close()


# Initialize table on startup
init_db()


# Pydantic Schema: Enforces ALL validation rules required by the task PDF
class PatientSchema(BaseModel):
    name: str
    age: int
    gender: str
    ward: str
    department: str
    doctor: str
    admission_date: date
    status: str = "Admitted"

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str):
        v = v.strip()
        if not v:
            raise ValueError("Patient name is required.")
        if not re.match(r"^[A-Za-z\s]+$", v):
            raise ValueError("Name must contain letters and spaces only (no numbers or symbols).")
        return v

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: int):
        if v < 0 or v > 120:
            raise ValueError("Age must be a valid number between 0 and 120.")
        return v

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str):
        if v not in ALLOWED_GENDERS:
            raise ValueError("Please select a valid Gender from the list.")
        return v

    @field_validator("ward")
    @classmethod
    def validate_ward(cls, v: str):
        if v not in ALLOWED_WARDS:
            raise ValueError("Please select a valid Ward from the list.")
        return v

    @field_validator("department")
    @classmethod
    def validate_department(cls, v: str):
        if v not in ALLOWED_DEPARTMENTS:
            raise ValueError("Please select a valid Department from the list.")
        return v

    @field_validator("doctor")
    @classmethod
    def validate_doctor(cls, v: str):
        if v not in ALLOWED_DOCTORS:
            raise ValueError("Please select a valid Doctor from the list.")
        return v

    @field_validator("admission_date")
    @classmethod
    def validate_admission_date(cls, v: date):
        if v > date.today():
            raise ValueError("Admission date cannot be in the future.")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str):
        if v not in ALLOWED_STATUSES:
            raise ValueError("Status must be either 'Admitted' or 'Discharged'.")
        return v


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Patient Admission API is running"}


# 1. View all patients + Search by name + Filter by Ward, Department, Doctor
@app.get("/api/patients")
def get_patients(
    search: Optional[str] = None,
    ward: Optional[str] = None,
    department: Optional[str] = None,
    doctor: Optional[str] = None,
):
    conn, is_pg = get_connection()
    cursor = conn.cursor()
    placeholder = "%s" if is_pg else "?"

    query = "SELECT * FROM patients WHERE 1=1"
    params = []

    if search:
        query += f" AND LOWER(name) LIKE {placeholder}"
        params.append(f"%{search.strip().lower()}%")
    if ward:
        query += f" AND ward = {placeholder}"
        params.append(ward)
    if department:
        query += f" AND department = {placeholder}"
        params.append(department)
    if doctor:
        query += f" AND doctor = {placeholder}"
        params.append(doctor)

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


# 2. Add a new patient
@app.post("/api/patients", status_code=201)
def add_patient(patient: PatientSchema):
    conn, is_pg = get_connection()
    cursor = conn.cursor()

    if is_pg:
        cursor.execute(
            """
            INSERT INTO patients (name, age, gender, ward, department, doctor, admission_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """,
            (
                patient.name,
                patient.age,
                patient.gender,
                patient.ward,
                patient.department,
                patient.doctor,
                patient.admission_date.isoformat(),
                patient.status,
            ),
        )
        new_id = cursor.fetchone()["id"]
    else:
        cursor.execute(
            """
            INSERT INTO patients (name, age, gender, ward, department, doctor, admission_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                patient.name,
                patient.age,
                patient.gender,
                patient.ward,
                patient.department,
                patient.doctor,
                patient.admission_date.isoformat(),
                patient.status,
            ),
        )
        new_id = cursor.lastrowid

    conn.commit()
    conn.close()
    return {"id": new_id, **patient.model_dump()}


# 3. Edit an existing patient
@app.put("/api/patients/{patient_id}")
def update_patient(patient_id: int, patient: PatientSchema):
    conn, is_pg = get_connection()
    cursor = conn.cursor()
    placeholder = "%s" if is_pg else "?"

    cursor.execute(f"SELECT id FROM patients WHERE id = {placeholder}", (patient_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Patient record not found.")

    cursor.execute(
        f"""
        UPDATE patients
        SET name={placeholder}, age={placeholder}, gender={placeholder},
            ward={placeholder}, department={placeholder}, doctor={placeholder},
            admission_date={placeholder}, status={placeholder}
        WHERE id={placeholder}
        """,
        (
            patient.name,
            patient.age,
            patient.gender,
            patient.ward,
            patient.department,
            patient.doctor,
            patient.admission_date.isoformat(),
            patient.status,
            patient_id,
        ),
    )
    conn.commit()
    conn.close()
    return {"id": patient_id, **patient.model_dump()}


# 4. Mark a patient as Discharged
@app.patch("/api/patients/{patient_id}/discharge")
def discharge_patient(patient_id: int):
    conn, is_pg = get_connection()
    cursor = conn.cursor()
    placeholder = "%s" if is_pg else "?"

    cursor.execute(f"SELECT id FROM patients WHERE id = {placeholder}", (patient_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Patient record not found.")

    cursor.execute(
        f"UPDATE patients SET status = 'Discharged' WHERE id = {placeholder}",
        (patient_id,),
    )
    conn.commit()
    conn.close()
    return {"message": "Patient marked as Discharged."}


# 5. Delete a patient
@app.delete("/api/patients/{patient_id}")
def delete_patient(patient_id: int):
    conn, is_pg = get_connection()
    cursor = conn.cursor()
    placeholder = "%s" if is_pg else "?"

    cursor.execute(f"SELECT id FROM patients WHERE id = {placeholder}", (patient_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Patient record not found.")

    cursor.execute(f"DELETE FROM patients WHERE id = {placeholder}", (patient_id,))
    conn.commit()
    conn.close()
    return {"message": "Patient deleted successfully."}