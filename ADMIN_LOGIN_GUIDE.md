# ADMINISTRATOR LOGIN & CREDENTIALS GUIDE
**Perfume ERP, Inventory Management & POS Web System**  
**Role:** System Administrator Handover Guide  

---

## 1. Where Admin Credentials Are Configured

Administrator credentials are **never hardcoded** in the source code or exposed to the client-side bundle. They are defined strictly on the backend host via environment variables:

In `server/.env`:
```env
ADMIN_NAME=Administrator
ADMIN_EMAIL=client-admin@example.com
ADMIN_PASSWORD=CHANGE_THIS_TO_A_STRONG_UNIQUE_PASSWORD
ADMIN_ROLE=ADMIN
```

### Security Rules:
1. **Confidentiality:** Keep `ADMIN_PASSWORD` secret. Do not commit `.env` to GitHub.
2. **Work Factor:** Passwords are automatically hashed using **bcrypt** with salt rounds = 12 before being stored in the PostgreSQL database.
3. **Validation:** Passwords must be at least **8 characters long**.

---

## 2. Initial Administrator Creation (Bootstrap Process)

The administrator account is created automatically during deployment or can be triggered manually using the idempotent bootstrap script:

### Automatic Creation during Seeding:
```bash
cd server
node prisma/seed.js
```

### Dedicated Standalone Command:
```bash
cd server
node scripts/bootstrap-admin.js
```

### Idempotency Behavior:
- **First Run:** Creates the administrator account and records it in the database.
- **Subsequent Runs:** Detects that the account already exists and safely exits:
  ```text
  [ADMIN BOOTSTRAP] Admin user "client-admin@example.com" already exists (ID: usr-..., Role: ADMIN). Preserving existing credentials.
  ```
  It **never overwrites** an existing password or creates duplicate records.

---

## 3. How to Log In

1. Open your browser and navigate to the application login page:
   ```text
   http://localhost:3000/login  (or your live domain: https://your-domain.com/login)
   ```
2. Enter your administrator email (as configured in `ADMIN_EMAIL`).
3. Enter your administrator password (as configured in `ADMIN_PASSWORD`).
4. Click **Sign In to Terminal**.
5. Upon successful verification, you will be redirected to the **Executive Business Dashboard** (`/dashboard`).

---

## 4. How to Change Your Password After First Login

For maximum security, you should change your password immediately after logging in for the first time:

### Method A: Through the Web Interface (Recommended)
1. In the sidebar, click on **Settings** (`/settings`).
2. Click on **Tab 6: Admin & Security**.
3. Under **Change Administrator Password**:
   - Enter your **Current Password**.
   - Enter your **New Password** (minimum 8 characters).
   - Re-enter your **Confirm New Password**.
4. Click **Update Password**. A confirmation notification will appear.

### Method B: Self-Service API Endpoint
Send an authenticated `POST` request to `/api/v1/auth/change-password`:
```json
{
  "currentPassword": "OLD_PASSWORD",
  "newPassword": "NEW_SECURE_PASSWORD"
}
```

---

## 5. How to Create Additional Cashiers & Staff

Administrators have full authority to create role-based accounts for boutique staff:

1. In the sidebar, click on **Employees & Users** (`/users`).
2. Click **Add New User**.
3. Fill in:
   - **Full Name:** (e.g., Jane Cashier)
   - **Email Address:** (e.g., cashier1@yourperfumestore.com)
   - **Password:** (Initial temporary password, min. 6 characters)
   - **Role:** Select `USER` (Cashier/Sales Associate) or `ADMIN` (Store Manager)
4. Click **Create User**.

> [!NOTE]
> Cashiers assigned the `USER` role can operate the POS terminal, process sales, search fragrances, and record stock-in/out, but are **authoritatively blocked (HTTP 403)** from viewing financial analytics, altering VAT rates, deleting products, or accessing system activity logs.

---

## 6. Access Recovery & Emergency Password Reset

If you ever lose access to your administrator account:

1. Connect to your backend server host or Railway dashboard console.
2. In `server/.env`, set a new temporary value for `ADMIN_PASSWORD`.
3. Run the admin reset command:
   ```bash
   cd server
   node -e "
     const prisma = require('./src/config/prisma');
     const bcrypt = require('bcrypt');
     const env = require('./src/config/env');
     (async () => {
       const salt = await bcrypt.genSalt(12);
       const hash = await bcrypt.hash(env.ADMIN_PASSWORD, salt);
       await prisma.user.update({
         where: { email: env.ADMIN_EMAIL },
         data: { passwordHash: hash }
       });
       console.log('Admin password updated successfully for ' + env.ADMIN_EMAIL);
       process.exit(0);
     })();
   "
   ```
4. Log in immediately and change your password in the **Settings** menu.
