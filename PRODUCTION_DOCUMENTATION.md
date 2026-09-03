# COMPLETE PRODUCTION-LEVEL PROJECT DOCUMENTATION: SCHOOL MANAGEMENT ERP

**Version 2.0** | Architecture, Production Workflows, Database, Security, Payments, ER Model and Deployment

---

## 1. EXECUTIVE SUMMARY

This project is a production-oriented School Management ERP for managing students, staff, academic years, attendance, fees, accounts, payments, leave, daily work updates, school website content and careers. It is designed around Supabase PostgreSQL as the relational source of truth and uses role-based access control (RBAC) so each user sees only the functions and executed workflows appropriate to their role.

The application supports:
- Multi-tenant architecture foundation (`school_id` on all tenant entities)
- Multi-academic-year lifecycle with non-destructive historical data retention
- Real-time PostgreSQL metrics and real-time dashboard analytics
- Complete CMS with `Draft → Preview → Publish` workflow
- Dynamic careers application suite with custom form fields and resume storage
- Automated UPI/Gateway fee payment workflows, manual verification queues, and instant PDF receipt generation
- Role-based attendance authorization matrix with duplicate date protection
- Automated transactional email dispatch for credential setup, leave approvals, receipts, and announcements
- Immutable system audit logging for all sensitive transactions
- **Zero Static/Mock Fallbacks**: All tables, metrics, cards, and forms render clean empty states when zero database records exist and flow end-to-end dynamically upon user interaction.

---

## 2. OBJECTIVES AND SCOPE

- **Centralized ERP System**: Replace fragmented paper/spreadsheet workflows with a unified, role-based platform.
- **Five Dedicated Role Portals**: Provide tailored interfaces for `SUPER_ADMIN`, `ADMIN`, `ACCOUNTS`, `STAFF`, and `USER` (Student/Parent).
- **Academic History Preservation**: Maintain multi-year student and financial records without hard deletes (`ACTIVE`, `TRANSFERRED`, `GRADUATED`, `LEFT`, `SUSPENDED`).
- **Financial Workflow Automation**: Automate fee structures, invoice generation, partial payments, manual verification queues, PDF receipts, and balance calculations.
- **Granular Attendance Control**: Restrict attendance marking permissions to authorized staff per class/section/date.
- **Public CMS & Careers**: Full database-driven school website and recruitment management.
- **Zero Hardcoded Data**: All metrics, charts, tables, and statistics are computed dynamically from database queries.

---

## 3. USER ROLES & RESPONSIBILITIES

| Role | Primary Responsibility |
| :--- | :--- |
| **`SUPER_ADMIN`** | Complete school oversight, CMS publishing, careers management, global financial metrics, leave approvals, audit log inspection, and system settings. |
| **`ADMIN`** | Operational management of students, staff onboarding with activation links, academic years, class/section assignments, and attendance authorization permissions. |
| **`ACCOUNTS`** | Fee structures, invoice issuance, manual UPI payment verification queue, receipt management, and financial reporting. |
| **`STAFF`** | Permitted class attendance marking, daily work update submission, and leave request submission. |
| **`USER` (Student/Parent)** | Personal profile, attendance records, fee ledger inspection, online/UPI fee payment, and PDF receipt download. |

---

## 4. END-TO-END PRODUCTION WORKFLOWS

1. **CMS Landing Page Workflow**:
   - Super Admin edits Hero/About text in CMS dashboard (`/dashboard/super-admin`).
   - Saves Draft → Previews at `/?preview=true` → Clicks Publish → Live website updates at `/`.

2. **Careers & Application Workflow**:
   - Visitor navigates to `/careers` → views active job openings → fills out dynamic application form → attaches resume → submits.
   - Database creates `CareerApplication` record → transactional acknowledgment email sent to applicant → Super Admin reviews profile & updates status (`APPLIED`, `UNDER_REVIEW`, `SHORTLISTED`, `INTERVIEW`, `SELECTED`, `REJECTED`, `WITHDRAWN`).

3. **Student Admission Workflow**:
   - Admin opens Admission form in `/dashboard/admin` → inputs student name, email, phone → system generates unique `StudentCode` and `AdmissionNumber` → creates `Profile`, `Student`, and `StudentEnrollment` records in database → Student Roster updates dynamically across Admin & Super Admin dashboards.

4. **Staff Onboarding Workflow**:
   - Admin inputs staff details in `/dashboard/admin` → system generates unique `EmployeeCode` → dispatches account activation invitation email with setup link (never plaintext passwords) → Staff Roster updates dynamically.

5. **Attendance Authorization & Marking Workflow**:
   - Admin assigns attendance authorization for Class 10-A to a staff member.
   - Authorized staff logs into `/dashboard/staff` → selects Class 10-A → system loads enrolled students from database → teacher marks statuses (`PRESENT`, `ABSENT`, `LATE`, `HALF_DAY`) → clicks Save & Lock → system checks authorization, saves records, and enforces unique `[studentId, date]` constraint to prevent duplicate entries.

6. **Fee Invoice & UPI Payment Verification Workflow**:
   - Accounts team issues fee invoice in `/dashboard/accounts` → subtotal, discount, total, and balance are calculated and saved in database.
   - Student/Parent logs into `/dashboard/user` → views active invoice & balance → enters payment amount & UPI Reference/UTR number → clicks Pay → payment record created with status `PENDING_VERIFICATION`.
   - Accounts team opens UPI Verification Queue in `/dashboard/accounts` → inspects reference code → clicks Approve → payment status becomes `VERIFIED` → invoice `paidAmount` and `balanceAmount` update in database → system generates PDF receipt via `jspdf` → student clicks Download PDF Receipt on `/dashboard/user`.

7. **Leave Request & Approval Workflow**:
   - Staff member submits leave request in `/dashboard/staff` with start date, end date, and reason → status set to `PENDING`.
   - Admin/Super Admin reviews request in dashboard → approves or rejects with review notes → status updates in database → email notification sent to staff member → leave history updates.

8. **Daily Work Log Workflow**:
   - Staff member logs daily academic work summary and hours worked in `/dashboard/staff` → saved in database → Admin/Super Admin reviews logged entries.

9. **Real-time Analytics Engine**:
   - `/api/reports` executes live PostgreSQL/Prisma counts and sum aggregations for total students, active students, left students, fee collection, pending fees, today's attendance, pending verifications, and pending leaves.

10. **Immutable Audit Logging**:
    - Every sensitive action (login, student creation, status change, fee structure, invoice issuance, payment verification, leave decision, CMS publication) automatically creates an `AuditLog` record with timestamp, user role, action, entity ID, previous value, new value, and IP address.

---

## 5. DATABASE SCHEMA (39 RELATIONAL MODELS)

Located in [`prisma/schema.prisma`](file:///c:/Users/Sai%20Sudheer/Desktop/school/prisma/schema.prisma):

1. `School` (Multi-tenant foundation with `school_id`)
2. `AcademicYear` (e.g. "2026-27", `isActive`)
3. `Role` (`SUPER_ADMIN`, `ADMIN`, `ACCOUNTS`, `STAFF`, `USER`)
4. `Permission` & `RolePermission` (Centralized RBAC)
5. `Profile` (Auth user identity & metadata)
6. `Department`, `Class`, `Section`, `Subject`
7. `Student` (Code, roll number, admission number, status: `ACTIVE`, `TRANSFERRED`, `GRADUATED`, `LEFT`, `SUSPENDED`)
8. `StudentEnrollment`
9. `Parent` & `StudentParent`
10. `StudentDocument` & `StaffDocument`
11. `Staff` (Employee code, designation, qualification, base salary)
12. `StaffAssignment`
13. `AttendancePermission` (Granular attendance authorization)
14. `Attendance` (Unique constraint on `[studentId, date]`)
15. `StaffAttendance`
16. `FeeStructure` & `FeeItem`
17. `StudentFeeAssignment`
18. `Invoice` & `InvoiceItem` (`subtotal`, `discount`, `lateFee`, `totalAmount`, `paidAmount`, `balanceAmount`, `status`)
19. `Payment` (`transactionNumber`, `provider`, `amount`, `status`: `INITIATED`, `PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`)
20. `PaymentVerification`
21. `Receipt` (`receiptNumber`, `pdfPath`)
22. `LeaveType` & `LeaveRequest` (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`)
23. `DailyWorkUpdate`
24. `SiteSetting`, `LandingSection`, `JobOpening`, `CareerApplication`
25. `Notification`, `AuditLog`

---

## 6. PERMISSION MATRIX

| Module | Super Admin | Admin | Accounts | Staff | User |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Students** | Full | Full | View Limited | View Assigned | Own Profile |
| **Staff** | Full | Manage | View Limited | Own Profile | None |
| **Attendance** | Full | Full | View | Assigned Classes | Own Record |
| **Fees & Invoices** | Full | Limited | Full | View Limited | Own Ledger |
| **Payments** | Full | View | Full (Verify) | None | Pay Own Fees |
| **Leave** | Full | Approve | View | Request / Own | None |
| **Daily Work** | Full | Review | None | Submit / Own | None |
| **CMS** | Full | None | None | None | None |
| **Careers** | Manage Jobs | None | None | None | Apply Public |
| **Reports** | Full | Operational | Financial | Class Summary | Student Card |
| **Audit Logs** | Complete Logs| Action Logs | Financial Logs| Own Actions | Own Actions |

---

## 7. DEPLOYMENT & VERIFICATION SUMMARY

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Sync database schema & seed initial development records
npx prisma db push
npm run db:seed

# 3. Start development server
npm run dev
```

### Production Build Verification
- `npx tsc --noEmit`: 0 errors
- `npm run build`: Compiled all 26 routes with exit code 0.
