import requests
import pandas as pd
import time
import json
from datetime import datetime
from typing import Dict, Any
from bs4 import BeautifulSoup
from config import settings

class StructuralAuditService:
    """Service for auditing websites using BeautifulSoup for structural SEO analysis."""

    def __init__(self):
        self.output_dir = settings.OUTPUT_DIR
        self.headers = {'User-Agent': settings.USER_AGENT}
        self.timeout = settings.REQUEST_TIMEOUT

    def _get_page_data(self, url: str) -> Dict[str, Any]:
        """Performs a fast scrape of key on-page SEO elements."""
        if not url.startswith('http'):
            url = 'https://' + url
            
        try:
            response = requests.get(url, headers=self.headers, timeout=self.timeout)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')

            title_tag = soup.find('title')
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            h1_tag = soup.find('h1')
            canonical = soup.find('link', attrs={'rel': 'canonical'})
            
            return {
                'url': url,
                'title': title_tag.text.strip() if title_tag else 'MISSING',
                'title_length': len(title_tag.text.strip()) if title_tag else 0,
                'meta_description': meta_desc.get('content', 'MISSING').strip() if meta_desc and meta_desc.get('content') else 'MISSING',
                'meta_desc_length': len(meta_desc.get('content', '').strip()) if meta_desc and meta_desc.get('content') else 0,
                'h1_content': h1_tag.text.strip() if h1_tag else 'MISSING',
                'canonical_set': bool(canonical),
                'status': 'SUCCESS'
            }
        except Exception as e:
            return {
                'url': url, 
                'status': f'ERROR: {str(e)}',
                'title': 'Error',
                'title_length': 0,
                'meta_description': 'Error',
                'meta_desc_length': 0,
                'h1_content': 'Error',
                'canonical_set': False
            }

    def run_audit(self, input_filename: str, limit: int = 1, progress_callback=None) -> Dict[str, Any]:
        """
        Main function to audit websites from CSV file.
        Saves structural data and raw JSON for next stage.
        """
        input_filepath = f"{self.output_dir}/{input_filename}"
        
        try:
            df = pd.read_csv(input_filepath)
        except FileNotFoundError:
            raise FileNotFoundError(f"Input file '{input_filename}' not found")

        if 'Website URL' not in df.columns:
            raise ValueError("CSV must contain 'Website URL' column")

        # Add new columns
        audit_columns = [
            'Title', 'Title_Length', 'Meta_Description', 'Meta_Desc_Length',
            'H1_Content', 'Canonical_Set', 'Audit_Status', 'Audit_Timestamp',
            'Audit_Raw_Data'  # New column for JSON data
        ]

        for col in audit_columns:
            if col not in df.columns:
                df[col] = ''

        total_to_process = min(limit, len(df))
        processed_count = 0
        
        from app.database import SessionLocal
        from app.models import Lead, LeadAudit
        db = SessionLocal()

        try:
            for index, row in df.iterrows():
                if processed_count >= total_to_process:
                    break

                website_url = row['Website URL']
                
                if pd.isna(website_url) or website_url in ['No website available', 'Not found', 'N/A']:
                    df.at[index, 'Audit_Status'] = 'Skipped - No URL'
                    continue

                try:
                    # Perform Structural Audit
                    audit_results = self._get_page_data(website_url)
                    
                    # Save to CSV columns
                    if audit_results['status'] == 'SUCCESS':
                        df.at[index, 'Title'] = audit_results['title']
                        df.at[index, 'Title_Length'] = audit_results['title_length']
                        df.at[index, 'Meta_Description'] = audit_results['meta_description']
                        df.at[index, 'Meta_Desc_Length'] = audit_results['meta_desc_length']
                        df.at[index, 'H1_Content'] = audit_results['h1_content']
                        df.at[index, 'Canonical_Set'] = audit_results['canonical_set']
                        df.at[index, 'Audit_Status'] = 'Completed'
                        
                        # Save Raw Data as JSON string for next stage
                        df.at[index, 'Audit_Raw_Data'] = json.dumps(audit_results)
                        
                        # Save to Database (Legacy support)
                        try:
                            lead = db.query(Lead).filter(Lead.website_url == website_url).first()
                            if lead:
                                existing_audit = db.query(LeadAudit).filter(LeadAudit.lead_id == lead.id).first()
                                if not existing_audit:
                                    new_audit = LeadAudit(
                                        lead_id=lead.id,
                                        title_tag=audit_results['title'],
                                        meta_description=audit_results['meta_description'],
                                        h1_content=audit_results['h1_content'],
                                        raw_audit_data=audit_results
                                    )
                                    db.add(new_audit)
                                else:
                                    existing_audit.title_tag = audit_results['title']
                                    existing_audit.meta_description = audit_results['meta_description']
                                    existing_audit.h1_content = audit_results['h1_content']
                                    existing_audit.raw_audit_data = audit_results
                                
                                db.commit()
                        except Exception as e:
                            db.rollback()
                            print(f"Error saving audit to DB: {str(e)}")
                            
                    else:
                        df.at[index, 'Audit_Status'] = audit_results['status']
                        df.at[index, 'Audit_Raw_Data'] = json.dumps(audit_results)

                    df.at[index, 'Audit_Timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    processed_count += 1
                    
                    if progress_callback:
                        progress_callback(processed_count, total_to_process)

                    time.sleep(1)

                except Exception as e:
                    df.at[index, 'Audit_Status'] = f'Error: {str(e)}'

        finally:
            db.close()

        output_filename = f"audited_{input_filename}"
        output_filepath = f"{self.output_dir}/{output_filename}"
        df.to_csv(output_filepath, index=False, encoding='utf-8')

        return {
            'total_processed': processed_count,
            'output_filename': output_filename,
            'input_filename': input_filename
        }
