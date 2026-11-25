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
<img width="750" alt="Desktop View" src="https://github.com/user-attachments/assets/8ed62662-0d5a-4df6-9c90-ba53d38b4257" />

### Admit / Edit Patient Modal
<img width="750" alt="Admitting New Patient" src="https://github.com/user-attachments/assets/9d5152d8-36b4-45e0-a30b-d2507cbfbb1a" />
<br/><br/>
<img width="750" alt="Editing Patient Record" src="https://github.com/user-attachments/assets/6049363d-db4e-4199-9e54-d47f2d498207" />


### Delete Confirmation Dialog
<img width="750" alt="Deleting Patient Record" src="https://github.com/user-attachments/assets/e43d3df5-5165-4a19-bcaf-f040c4554479" />



### Mobile Responsive View
<p>
<img width="280" alt="Mobile View 1" src="https://github.com/user-attachments/assets/8a7323bc-8dcb-411c-9639-ad38d11c30f1" />
&nbsp;&nbsp;&nbsp;
<img width="280" alt="Mobile View 2" src="https://github.com/user-attachments/assets/5af7225c-33c5-4337-a698-beba19803d56" />
</p>


