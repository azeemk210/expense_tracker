# Expense Tracker

A full-stack expense tracker app with a FastAPI backend and React frontend.

---

## Features
- Add, edit, delete, and filter expenses
- Upload proof (image/pdf) for each expense
- Floor selection (Basement, Ground, 1st, 2nd, etc.)
- Dashboard with stats and filtering
- File uploads and downloads
- Responsive UI

---

## Project Structure

```
expense_tracker/
├── backend/
│   ├── app/
│   ├── requirements.txt
│   └── ...
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
├── .gitignore
├── README.md
└── ...
```

---

## Getting Started

### 1. Clone the repository
```sh
git clone https://github.com/azeemk210/expense_tracker.git
cd expense_tracker
```

### 2. Setup Python backend
```sh
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
# source venv/bin/activate  # On Linux/Mac
pip install -r requirements.txt
```

#### 2.1. (Optional) Initialize the database
- The app uses SQLite by default. The database will be created automatically on first run.
- If you need to add the `floor` column manually:
  1. Open SQLite CLI: `sqlite3 app/data/expenses.db`
  2. Run: `ALTER TABLE expense ADD COLUMN floor TEXT;`

### 3. Run the backend server
```sh
uvicorn app.main:app --reload
```

- The API will be available at `http://localhost:8000/api/expenses`

### 4. Setup React frontend
```sh
cd ../frontend
npm install
```

### 5. Run the frontend
```sh
npm run dev
```
- The app will be available at `http://localhost:5173`

---

## Deployment

### Deploying on Hostinger (VPS recommended)
1. Upload your project files to the server.
2. Install Python, Node.js, and SQLite if not present.
3. Set up the backend as above (create venv, install requirements).
4. Set up the frontend as above (npm install, npm run build).
5. Use a process manager (e.g., `pm2`, `gunicorn`, or `systemd`) to run the backend.
6. Serve the frontend build with Nginx or another web server.
7. Configure Nginx to reverse proxy API requests to the backend.

### Using GitHub
- Push your code to GitHub for version control:
```sh
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/azeemk210/expense_tracker.git
git push -u origin main
```
- You can deploy from GitHub by cloning the repo on your server.

---

## Notes
- All CSV, Excel, WhatsApp chat, and upload files are ignored by git (see `.gitignore`).
- For production, set up environment variables and secure your API.
- For any issues, check the backend logs and frontend console for errors.

---

## License
MIT
