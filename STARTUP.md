# Startup Instructions

Follow these steps to start the SEO Lead Engine application.

## Prerequisites

- Python 3.11+ installed
- Node.js installed
- **PostgreSQL** installed and running (Port 5432)
- **Redis** installed and running (Port 6379)

## 1. Start the Backend Services

The backend requires three components running in separate terminals:

### Terminal 1: Redis (if not running as service)
If you installed Redis via MSI, it runs automatically. If using a portable version:
```powershell
redis-server
```

### Terminal 2: Celery Worker (Background Tasks)
Navigate to `backend` folder:
```powershell
cd "c:\Univeristy\FYP\SEO Module\backend"
celery -A celery_app worker --loglevel=info --pool=solo
```

### Terminal 3: FastAPI Server (Main API)
Navigate to `backend` folder:
```powershell
cd "c:\Univeristy\FYP\SEO Module\backend"
uvicorn main:app --reload --port 8000
```

## 2. Start the Frontend Application

### Terminal 4: React Frontend
Navigate to `frontend` folder:
```powershell
cd "c:\Univeristy\FYP\SEO Module\frontend"
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

## 3. Database Management

### Check Database Status
You can verify the database is working by checking the `jobs` table:
```powershell
cd "c:\Univeristy\FYP\SEO Module\backend"
python -c "from app.database import SessionLocal; from app.models import Job; print(f'Jobs in DB: {SessionLocal().query(Job).count()}')"
```

### Access Database GUI (pgAdmin)
1.  Search for **pgAdmin 4** in your Windows Start Menu and open it.
2.  In the browser window that opens, expand **Servers**.
3.  If prompted for a master password, set one or enter it.
4.  Expand **PostgreSQL 16** (or your version) > **Databases** > **seo_leads_db**.
5.  Go to **Schemas** > **public** > **Tables** to see your data.

## Troubleshooting

-   **Database Connection Failed**: Check `backend/.env` or `backend/config.py` to ensure the password matches your PostgreSQL installation.
-   **Celery not receiving tasks**: Ensure Redis is running (`netstat -an | findstr 6379`).

