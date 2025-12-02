import requests
import pandas as pd
import os
import time
from datetime import datetime
from typing import Dict, Any, Optional
from bs4 import BeautifulSoup
from config import settings

class StructuralAuditService:
    """Service for auditing websites using BeautifulSoup for structural SEO analysis."""

    def __init__(self):
        self.output_dir = settings.OUTPUT_DIR
        self.headers = {'User-Agent': settings.USER_AGENT}
        self.timeout = settings.REQUEST_TIMEOUT

    def run_structural_audit(self, url: str) -> Dict[str, Any]:
        """Performs a fast scrape of key on-page SEO elements."""
        if not url.startswith('http'):
            url = 'https://' + url
            
        try:
            response = requests.get(url, headers=self.headers, timeout=self.timeout)
            response.raise_for_status() # Raise exception for 4xx or 5xx status codes
            soup = BeautifulSoup(response.content, 'html.parser')

            # 1. Title Tag Check
            title_tag = soup.find('title')
            
            # 2. Meta Description Check
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            
            # 3. H1 Tag Check
            h1_tag = soup.find('h1')

            # 4. Canonical Tag Check
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
        Main function to audit websites from CSV file
        
        Args:
            input_filename: Name of input CSV file in outputs directory
            limit: Maximum number of websites to audit
            progress_callback: Optional callback function
        """
        input_filepath = f"{self.output_dir}/{input_filename}"
        
        print(f"\nReading CSV file: {input_filepath}")
        print("=" * 80)

        # Read the input CSV
        try:
            df = pd.read_csv(input_filepath)
        except FileNotFoundError:
            raise FileNotFoundError(f"Input file '{input_filename}' not found")

        # Check if required columns exist
        if 'Business Name' not in df.columns or 'Website URL' not in df.columns:
            raise ValueError("CSV must contain 'Business Name' and 'Website URL' columns")

        print(f"Found {len(df)} websites to audit. Limit set to: {limit}\n")

        # Add new columns for audit data if they don't exist
        audit_columns = [
            'Title', 'Title_Length', 'Meta_Description', 'Meta_Desc_Length',
            'H1_Content', 'Canonical_Set', 'Audit_Status', 'Audit_Timestamp'
        ]

        for col in audit_columns:
            if col not in df.columns:
                df[col] = ''

        # Process websites up to the limit
        total_to_process = min(limit, len(df))
        processed_count = 0

        for index, row in df.iterrows():
            if processed_count >= total_to_process:
                break

            business_name = row['Business Name']
            website_url = row['Website URL']

            print(f"[{index + 1}/{len(df)}] Auditing: {business_name}")
            print(f"  URL: {website_url}")

            if pd.isna(website_url) or website_url == 'No website available' or website_url == 'Not found' or website_url == 'N/A':
                df.at[index, 'Audit_Status'] = 'Skipped - No URL'
                print("  ⊗ Skipped - No valid URL\n")
                continue

            try:
                # Perform Structural Audit
                audit_results = self.run_structural_audit(website_url)
                
                if audit_results['status'] == 'SUCCESS':
                    df.at[index, 'Title'] = audit_results['title']
                    df.at[index, 'Title_Length'] = audit_results['title_length']
                    df.at[index, 'Meta_Description'] = audit_results['meta_description']
                    df.at[index, 'Meta_Desc_Length'] = audit_results['meta_desc_length']
                    df.at[index, 'H1_Content'] = audit_results['h1_content']
                    df.at[index, 'Canonical_Set'] = audit_results['canonical_set']
                    df.at[index, 'Audit_Status'] = 'Completed'
                    print(f"  ✓ Title: {audit_results['title'][:30]}... | Status: Success\n")
                else:
                    df.at[index, 'Audit_Status'] = audit_results['status']
                    print(f"  ✗ Failed: {audit_results['status']}\n")

                df.at[index, 'Audit_Timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                processed_count += 1
                
                if progress_callback:
                    progress_callback(processed_count, total_to_process)

                # Small delay to be polite
                time.sleep(1)

            except Exception as e:
                df.at[index, 'Audit_Status'] = f'Error: {str(e)}'
                print(f"  ✗ Exception: {str(e)}\n")

        # Create audited filename
        output_filename = f"audited_{input_filename}"
        output_filepath = f"{self.output_dir}/{output_filename}"

        # Save to CSV
        df.to_csv(output_filepath, index=False, encoding='utf-8')

        return {
            'total_processed': processed_count,
            'output_filename': output_filename,
            'input_filename': input_filename
        }
