import requests
import pandas as pd
from datetime import datetime
import re
from typing import Dict, List, Optional
from config import settings


class URLExtractorService:
    """Service for extracting business URLs from Google Maps using ScrapingDog API."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the URL extractor service.
        
        Args:
            api_key: ScrapingDog API key (defaults to settings)
        """
        self.api_key = api_key or settings.SCRAPINGDOG_API_KEY
        self.base_url = "https://api.scrapingdog.com/google_maps"
        
    def extract_urls(
        self,
        business_type: str,
        location: str,
        num_pages: int = 1,
        progress_callback=None
    ) -> Dict:
        """Extract business URLs from Google Maps.
        
        Args:
            business_type: Type of business (e.g., "plumber", "restaurant")
            location: Location to search (e.g., "Dallas Texas")
            num_pages: Number of pages to scrape (1-5 recommended)
            progress_callback: Optional callback function for progress updates
            
        Returns:
            Dictionary with results and metadata
        """
        query = f"{business_type} in {location}"
        all_results = []
        businesses_with_websites = []
        
        from app.database import SessionLocal
        from app.models import Lead
        from sqlalchemy.exc import IntegrityError
        
        db = SessionLocal()
        
        try:
            for page_num in range(num_pages):
                page_offset = page_num * 20
                
                params = {
                    "api_key": self.api_key,
                    "query": query,
                    "page": page_offset
                }
                
                try:
                    response = requests.get(self.base_url, params=params, timeout=30)
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        if 'search_results' in data and len(data['search_results']) > 0:
                            for result in data['search_results']:
                                business_name = result.get('title', 'N/A')
                                website_url = result.get('website', None)
                                
                                # Add to all results
                                all_results.append({
                                    'Business Name': business_name,
                                    'Website URL': website_url if website_url else 'No website available'
                                })
                                
                                # Only add to CSV list if website exists
                                if website_url and website_url.strip():
                                    businesses_with_websites.append({
                                        'Business Name': business_name,
                                        'Website URL': website_url
                                    })
                                    
                                    # Save to Database
                                    try:
                                        # Check if exists first to avoid auto-increment gaps or just try insert
                                        existing_lead = db.query(Lead).filter(Lead.website_url == website_url).first()
                                        if not existing_lead:
                                            new_lead = Lead(
                                                business_name=business_name,
                                                website_url=website_url
                                            )
                                            db.add(new_lead)
                                            db.commit()
                                    except IntegrityError:
                                        db.rollback()
                                    except Exception as e:
                                        db.rollback()
                                        print(f"Error saving lead to DB: {str(e)}")
                            
                            # Call progress callback if provided
                            if progress_callback:
                                progress_callback(page_num + 1, num_pages)
                                
                    else:
                        print(f"Request failed with status code: {response.status_code}")
                        
                except Exception as e:
                    print(f"Error on page {page_num + 1}: {str(e)}")
                    continue
        finally:
            db.close()
        
        return {
            'total_found': len(all_results),
            'with_websites': len(businesses_with_websites),
            'results': businesses_with_websites,
            'query': query
        }
    
    def save_to_csv(self, results: List[Dict], query: str) -> str:
        """Save results to CSV file.
        
        Args:
            results: List of business dictionaries
            query: Search query used
            
        Returns:
            Filename of saved CSV
        """
        if not results:
            raise ValueError("No results to save")
        
        df = pd.DataFrame(results)
        
        # Create filename with search query and timestamp
        clean_query = re.sub(r'[^\w\s-]', '', query).strip().replace(' ', '_')
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{clean_query}_{timestamp}.csv"
        filepath = f"{settings.OUTPUT_DIR}/{filename}"
        
        # Save to CSV
        df.to_csv(filepath, index=False, encoding='utf-8')
        
        return filename
