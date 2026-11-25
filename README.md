# MedCare Admit — Patient Admission Management App

A full-stack web application built for hospital staff to manage inpatient admissions, track ward and ICU occupancy, filter patient records, and process discharges.

---

## Live Demo & Repository

* **Live Working Application:** [https://patient-admission-app.vercel.app](https://patient-admission-app.vercel.app)
* **GitHub Repository:** [https://github.com/chinmay0916/Patient-Admission-App](https://github.com/chinmay0916/Patient-Admission-App)

---

## Tech Stack

* **Frontend:** React.js (Vite), Tailwind CSS
* **Backend:** Python 3, FastAPI
* **Database:** PostgreSQL
* **Deployment:** Vercel (Frontend) & Render (Backend)

---

## Features Implemented

1. **Admit New Patient:** Add inpatient records with Name, Age, Gender, Ward, Department, Attending Doctor, and Admission Date.
2. **Patient Directory & Dashboard Metrics:** View all patient records alongside real-time counts for Total Records, Admitted, Active ICU, and Discharged patients.
3. **Multi-Criteria Filtering:** Filter patients simultaneously by **Ward**, **Department**, **Doctor**, and **Status** (`All` / `Admitted` / `Discharged`).
4. **Instant Name Search:** Search patient records dynamically by patient name.
5. **Edit Patient Records:** Update existing patient details, ward assignments, or admission dates via modal form.
6. **Delete with Confirmation:** Safely remove patient records using a centered confirmation dialog to prevent accidental deletions.
7. **One-Click Discharge:** Mark an `Admitted` patient as `Discharged` with a single click.
8. **Responsive UI:** Adaptive card-based layout for mobile/tablet devices and a structured data table for desktop screens.

---

## Validation Rules (Frontend & Backend)

All inputs are validated both on the client side (React) and strictly enforced on the server side (FastAPI + Pydantic) with clear HTTP error responses:

| Field | Validation Rule |
| :--- | :--- |
| **Name** | Required; alphabetic characters and spaces only |
| **Age** | Required; integer between `0` and `120` |
| **Gender, Ward, Department, Doctor** | Required; must match predefined valid options |
| **Admission Date** | Required; cannot be a future date |

---

## Steps to Run Locally

### 1. Clone the Repository
```bash
git clone https://github.com/chinmay0916/Patient-Admission-App.git
cd Patient-Admission-App
```

### 2. Start the Backend Server (FastAPI)
```bash
cd backend
python -m venv venv

# Activate virtual environment:
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```
The backend API will run at `[http://127.0.0.1:8000](http://127.0.0.1:8000)`.

### 3. Start the Frontend Application (React + Vite)
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The frontend app will run at `http://localhost:5173`.

---

## Screenshots

### Desktop Dashboard View
![Desktop View](./screenshots/desktop-view.png)

### Admit / Edit Patient Modal
![Admit Patient Modal](./screenshots/admit-modal.png)

### Delete Confirmation Dialog
![Delete Confirmation](./screenshots/delete-modal.png)

### Mobile Responsive View
![Mobile View](./screenshots/mobile-view.png)
