# SEO Lead Engine

A full-stack web application for lead generation, contact enrichment, and SEO auditing. Built with React (Vite) frontend and FastAPI backend with Celery for background processing.

## Features

### 🎯 Lead Generation
- Extract business leads from Google Maps based on business type and location
- Real-time scraping with progress tracking
- Smart caching to avoid redundant requests
- Filter leads by available contact information
- Select specific leads for enrichment or audit

### 📧 Contact Enrichment
- Enrich leads with emails, phone numbers, and social media profiles
- Support for Facebook, Instagram, Twitter, and LinkedIn
- Batch processing with progress tracking
- Selective enrichment for chosen leads

### 🔍 SEO Audit
- Comprehensive website SEO analysis
- Performance metrics via Google PageSpeed API
- Batch auditing with configurable limits
- Detailed reports with actionable insights

### 💾 State Persistence
- Maintains search results when navigating between pages
- Preserves selections and filters
- Automatic restoration on page return

## Tech Stack

### Frontend
- **React** with Vite
- **React Router** for navigation
- **Axios** for API calls
- **PapaParse** for CSV handling
- **Tailwind CSS** for styling

### Backend
- **FastAPI** for REST API
- **Celery** for background job processing
- **Redis** for task queue
- **PostgreSQL** for database
- **SQLAlchemy** for ORM
- **ScrapingDog API** for web scraping
- **Google PageSpeed API** for SEO metrics

## Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL
- Redis

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/popsicles-dev/N-services
cd "SEO Module"
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys and database credentials
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install
```

### 4. Database Setup
```bash
# Create PostgreSQL database
createdb seo_leads_db

# Run migrations (if applicable)
# The app will auto-create tables on first run
```

## Running the Application

### Start Backend Services

**Terminal 1 - FastAPI Server:**
```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Celery Worker:**
```bash
cd backend
venv\Scripts\activate
celery -A celery_app worker --loglevel=info --pool=solo
```

**Terminal 3 - Redis:**
```bash
redis-server
```

### Start Frontend

**Terminal 4 - Vite Dev Server:**
```bash
cd frontend
npm run dev
```

Access the application at `http://localhost:5173`

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/seo_leads_db
REDIS_URL=redis://localhost:6379/0
SCRAPINGDOG_API_KEY=your_scrapingdog_key
PAGESPEED_API_KEY=your_google_pagespeed_key
GROQ_API_KEY=your_groq_key  # For chatbot (optional)
```

## Project Structure

```
SEO Module/
├── backend/
│   ├── app/
│   │   ├── models/          # Database models
│   │   ├── routers/         # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── tasks/           # Celery tasks
│   │   └── database.py      # Database configuration
│   ├── config.py            # Application settings
│   ├── main.py              # FastAPI app entry point
│   └── celery_app.py        # Celery configuration
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service classes
│   │   └── App.jsx          # Main app component
│   └── public/              # Static assets
└── outputs/                 # Generated CSV files
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Features in Detail

### Result Caching
The system automatically caches completed jobs. If you request the same search parameters again, it returns cached results instantly instead of re-scraping.

### Selective Operations
- **Selective Enrichment**: Choose specific leads to enrich instead of processing all
- **Selective Audit**: Transfer only selected leads to SEO audit
- **Smart Filtering**: Filter by email, phone, or social media availability

### Background Processing
All heavy operations (scraping, enrichment, auditing) run as Celery background tasks with real-time progress updates.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- ScrapingDog for web scraping API
- Google PageSpeed for SEO metrics
- The open-source community for amazing tools and libraries
