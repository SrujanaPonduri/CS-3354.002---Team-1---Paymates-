# git-assignment-
Paymates

### Project description: 
An app that helps people living together manage expenses (budgeting). This includes rent, groceries, furniture, and any other purchases, as well as who paid for which item.

### Objectives / Purpose
When two or more people move in together, they need to distribute costs for belongings that are shared with one another, and distinguish what items are personal. This situation is especially common for college studentsliving in dorms or shared apartments who need to manage limited budgets carefully.

The objective of **Paymates** is to:

- Help roommates establish which items are shared and which are individually owned.
- Track who purchased each item and who is allowed to use it/who owns it.
- Split shared costs fairly and transparently among household members.
- Simplify budgeting by storing household expenses into one centralized platform.
- Provide better visibility over shared payments, personal purchases, and ownership.

### Targeted Users: 
This application targets all households with multiple financially independent residents, mainly college students, to provide ease of managing expenses and purchases. It also targets those who need to track personal versus shared belongings in a household based on who purchased the item.

### Scope:
- Sign up/Log in
 Create a "Room" that can be shared with roommate(s)
- Add an expense
- Add a budget
- Log payments
- Search for payments by person, expense, or budget; purchasers are the owners of the purchase

### Future Scope:
Aagam

### Potential Risks:
- **Undefined Scope** - The scale of features such as splitting payments, tracking based on use and purchase history, and budgeting may reach too far outside scope
- **Calculations** - Errors in payment calculations may result in the incorrect transaction of money from/to the app which can lead to later budgeting and payment splitting info to be inaccurate
- **Resolution** - A clear system for resolving disputes in payment is not fully defined which could lead to arrangements where one user in a group does not pay their share of the bills due
- **Data Security** - If a secure method for storing and reading the data for financial info is not built correctly it could lead to a data breach which would endanger users and break their privacy
- **User Group Creation** - The creation and management of roommate groups to begin the management process is the most important step so any failures in that section will lead to many features being broken and/or non-functional all together

---

## Running the App

### Prerequisites
- **Python 3.9+**
- **Node.js 18+** and **npm**

---

### 1. Clone the repository

```bash
git clone <repo-url>
cd CS-3354.002---Team-1---Paymates-
```

---

### 2. Start the Backend (Flask)

```bash
# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r paymates/backend/requirements.txt

# Run the Flask dev server (port 5001)
cd paymates/backend
python app.py
```

The API will be available at **http://localhost:5001**.  
You can verify it is running by visiting **http://localhost:5001/api/health** — it should return `{"status": "ok"}`.

#### Magic-link email (backend environment)

Set these in your shell before `python app.py` (or use your own process manager / `.env` loader):

| Variable | Required | Description |
|----------|----------|-------------|
| `FRONTEND_BASE_URL` | Yes | Browser origin for links in emails, e.g. `http://localhost:3000` (no trailing slash). |
| `EMAIL_FROM` | For SMTP | `From:` address when using SMTP. |
| `SMTP_HOST` | For SMTP | If unset, magic links are **only printed to the server console** (fine for local dev). |
| `SMTP_PORT` | No | Default `587`. |
| `SMTP_USER` / `SMTP_PASSWORD` | Often | SMTP credentials. |
| `SMTP_USE_TLS` | No | Default `true` (STARTTLS). |
| `SMTP_USE_SSL` | No | Default `false`; set `true` for implicit TLS (e.g. port 465). |
| `MAGIC_LINK_RETURN_TOKEN` | No | If `true`, signup/login responses also include a `token` field so you can use “Verify and continue” on the `/magic-link-sent` page without email. |

Example (console-only links, typical local run):

```bash
export FRONTEND_BASE_URL=http://localhost:5173
cd paymates/backend
python app.py
```

---

### 3. Start the Frontend (Vite + React)

Open a **new terminal** in the project root:

```bash
cd paymates/frontend
npm install        # only needed the first time
npm run dev
```

The app will be available at **http://localhost:5173**.

---

### Quick-start summary

| Terminal | Command | URL |
|----------|---------|-----|
| 1 – Backend | `python paymates/backend/app.py` | http://localhost:5001 |
| 2 – Frontend | `cd paymates/frontend` + `npm run dev` | http://localhost:5173 |

> **Note:** Both servers must be running at the same time for the app to work correctly.
