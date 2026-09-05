# 📋 Blood Bank Management System (BBMS) — Development Document (Web + Mobile)

## 1. Project Overview

* **Project Name**: Blood Bank Management System (BBMS) / BloodConnect
* **Platform**: Web Application (React + Vite) + Mobile Application (React Native / PWA Mobile Simulation)
* **Purpose**: Ek centralized digital platform jo blood banks, hospitals, donors aur recipients ke beech real-time blood inventory tracking, component management (Whole Blood, Plasma, Platelets, RBC), appointment booking, and emergency SOS dispatch ko automate kare.

### Target Users & Roles
1. **Donor**: Register with eligibility screening, book donation appointments, track donation history & badges, receive local emergency SOS alerts.
2. **Recipient / Hospital**: Search real-time stock levels across branches, submit emergency/normal blood requests, track request fulfillment status.
3. **Blood Bank Admin & Staff**: Manage blood units, component extraction, expiry alerts, transfer stock between centers, and verify appointments.
4. **Super Admin**: Multi-branch telemetry, system audit logs, compliance oversight, and reporting.

---

## 2. Core Objectives

* 🩸 **Real-Time Blood Inventory Tracking**: Blood group wise (A+, A-, B+, B-, O+, O-, AB+, AB-) & component wise (Whole Blood, Plasma, Platelets, RBC) with expiry telemetry.
* 👤 **Donor Management & 90-Day Eligibility Engine**: Medical screening (Age >= 18, Weight >= 50kg, Hb >= 12.5g/dL, 90-day cooldown period).
* 📅 **Blood Request & Appointment System**: Slot-based appointment booking at nearest verified blood centers.
* 🚨 **Priority Emergency SOS**: Sub-second push/SMS broadcast for urgent blood requirements.
* 📊 **Reports & Analytics**: Daily/monthly stock levels, donation metrics, and branch utilization.

---

## 3. System Architecture & High-Level Design

```
[ Mobile App (React Native / PWA) ]        [ Web App (React + Vite) ]
                \                                  /
                 \                                /
                  ▼                              ▼
      [ REST API & WebSocket Gateway (Node.js + Express) ]
                             │
                             ├─► [ PostgreSQL / MongoDB Multi-Store ]
                             ├─► [ Gemini 2.5 AI Triage & Matching ]
                             ├─► [ Supabase Cloud Storage & Sync ]
                             └─► [ Twilio / FCM Notification Queues ]
```

---

## 4. Database Schema (Core Entities)

### 4.1 Users Table
| Field | Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | UUID | Primary Key | Unique user identifier |
| `name` | String | Not Null | Full legal name |
| `email` | String | Unique | Email address |
| `phone` | String | Unique | Verified phone number |
| `role` | Enum | `Admin`, `Staff`, `Donor`, `Recipient` | Role-based access control |
| `blood_group` | String | Optional | e.g. `O+`, `A-`, `B+` |
| `created_at` | Timestamp | Default Now | Account registration timestamp |

### 4.2 Donors Table
| Field | Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `donor_id` | UUID | Primary Key | Unique donor profile ID |
| `user_id` | UUID | FK → Users | Associated user account |
| `last_donation_date` | Date | Nullable | Last successful blood donation date |
| `eligibility_status` | Boolean | Default True | Calculated (Age >= 18, 90 days gap) |
| `trust_score` | Integer | Range 0–100 | Verified donation reliability rating |
| `medical_notes` | Text | Encrypted | Deferrals or health notes |

### 4.3 Blood Inventory Table
| Field | Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `unit_id` | UUID | Primary Key | Unique barcode / RFID identifier |
| `blood_group` | String | Not Null | `A+`, `A-`, `B+`, `B-`, `O+`, `O-`, `AB+`, `AB-` |
| `component_type` | Enum | `Whole Blood`, `Plasma`, `Platelets`, `RBC` | Fractionated component type |
| `quantity_ml` | Integer | Standard 350ml / 450ml | Volume per bag |
| `collection_date` | Date | Not Null | Date of draw |
| `expiry_date` | Date | Not Null | Expiry deadline (Platelets: 5 days, RBC: 42 days) |
| `branch_id` | UUID | FK → Branches | Current location center |
| `status` | Enum | `Available`, `Reserved`, `Used`, `Expired` | State machine status |

### 4.4 Blood Requests Table
| Field | Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `request_id` | UUID | Primary Key | Request ticket tracking ID |
| `recipient_id` | UUID | FK → Users | Requesting hospital or patient user |
| `blood_group` | String | Not Null | Required blood group |
| `component_type` | Enum | `Whole Blood`, `Plasma`, `Platelets`, `RBC` | Required component |
| `quantity_needed` | Integer | Units count | Number of bags required |
| `urgency` | Enum | `Normal`, `Emergency` | Priority triage level |
| `status` | Enum | `Pending`, `Approved`, `Fulfilled`, `Rejected` | Order processing status |
| `created_at` | Timestamp | Default Now | Request submission time |

### 4.5 Appointments Table
| Field | Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `appointment_id` | UUID | Primary Key | Booking confirmation code |
| `donor_id` | UUID | FK → Donors | Booked donor |
| `branch_id` | UUID | FK → Branches | Blood bank donation center |
| `appointment_date` | DateTime | Not Null | Scheduled slot date & time |
| `status` | Enum | `Scheduled`, `Completed`, `Cancelled` | Booking state |

### 4.6 Branches Table
| Field | Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `branch_id` | UUID | Primary Key | Facility code (e.g. `NGP-01`) |
| `name` | String | Not Null | Facility center name |
| `address` | String | Not Null | Street address & area |
| `latitude` | Float | GPS Coord | Geo location lat |
| `longitude` | Float | GPS Coord | Geo location lng |
| `contact_number` | String | Verified Phone | Helpline phone |

---

## 5. API Endpoints Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | User registration with OTP support |
| `POST` | `/api/v1/auth/login` | JWT authenticated user login |
| `GET` | `/api/v1/inventory` | Real-time stock levels & component filters |
| `POST` | `/api/v1/inventory` | Add new collection unit to inventory |
| `GET` | `/api/v1/inventory/expiring-soon` | Units expiring within 7 days |
| `GET` | `/api/v1/donors/eligible` | Search eligible donors by group & radius |
| `POST` | `/api/v1/requests` | Submit hospital / patient blood request |
| `PUT` | `/api/v1/requests/:id/status` | Update blood request state |
| `POST` | `/api/v1/appointments` | Book donor appointment slot |
| `GET` | `/api/v1/appointments` | List donor / branch appointments |
| `GET` | `/api/v1/branches/nearby` | Geolocation radius search for branches |
| `GET` | `/api/v1/reports/stock` | Generate stock telemetry summary |
| `GET` | `/api/v1/reports/donations` | Generate historical donation trend report |

---

## 6. Non-Functional & Security Standards

* **Data Encryption**: AES-256 for PII / medical data; bcrypt (12 rounds) for credentials.
* **Response Times**: `< 300ms` for inventory search; `< 50ms` for in-memory geo-radius lookup.
* **Audit Trail**: Append-only cryptographic ledger tracking every blood unit from donor arm to recipient vein.
