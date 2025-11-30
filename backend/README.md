# SEO Lead Generation Backend

This is the FastAPI backend for the SEO Lead Generation module.

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your configuration:

```bash
cp .env.example .env
```

Edit `.env` with your settings:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `SCRAPINGDOG_API_KEY`: Your ScrapingDog API key

### 3. Start Services

**Start Redis** (if not already running):
```bash
redis-server
```

**Start Celery Worker**:
```bash
celery -A celery_app worker --loglevel=info --pool=solo
```

**Start FastAPI Server**:
```bash
uvicorn main:app --reload
```

## API Endpoints

### URL Extraction
- `POST /api/leads/extract-urls` - Start URL extraction job
- Request body:
  ```json
  {
    "business_type": "plumber",
    "location": "Dallas Texas",
    "num_pages": 2
  }
  ```

### Contact Enrichment
- `POST /api/leads/enrich-contacts` - Start contact enrichment job
- Request body:
  ```json
  {
    "input_filename": "plumber_in_Dallas_Texas_20231127_120000.csv"
  }
  ```

### Job Management
- `GET /api/leads/job/{job_id}` - Get job status
- `GET /api/leads/download/{job_id}` - Download result CSV
- `GET /api/leads/list-files` - List all CSV files

## Interactive API Documentation

Visit `http://localhost:8000/docs` for interactive API documentation.

## Project Structure

```
backend/
├── app/
│   ├── models/          # Database models
│   ├── routers/         # API endpoints
│   ├── services/        # Business logic
│   ├── tasks/           # Celery tasks
│   └── database.py      # Database configuration
├── outputs/             # Generated CSV files
├── main.py              # FastAPI application
├── celery_app.py        # Celery configuration
├── config.py            # Settings management
└── requirements.txt     # Python dependencies
```
