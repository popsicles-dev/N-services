import requests
import pandas as pd
import os
import time
from datetime import datetime
from typing import Dict, Any, Optional
from config import settings

class SeoAuditService:
    """Service for auditing websites using Google PageSpeed Insights API."""

    # Google PageSpeed Insights API Configuration
    # Using the key provided by the user
    PAGESPEED_API_KEY = "AIzaSyAdE5WmAS5Cew1vcHRplzj3A3iCBVZXbvQ"
    PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"

    def __init__(self):
        self.output_dir = settings.OUTPUT_DIR

    def audit_website(self, url: str, strategy: str = 'mobile') -> Dict[str, Any]:
        """
        Audit a website using Google PageSpeed Insights API

        Args:
            url: Website URL to audit
            strategy: 'mobile' or 'desktop'

        Returns:
            Dictionary containing performance metrics
        """
        # Ensure URL has proper protocol
        if not url.startswith('http'):
            url = 'https://' + url

        # API parameters
        params = {
            'url': url,
            'key': self.PAGESPEED_API_KEY,
            'strategy': strategy,
            'category': 'performance'
        }

        # Retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                print(f"    Auditing {strategy} (Attempt {attempt + 1}/{max_retries})...")
                
                # Increased timeout to 180 seconds (3 minutes)
                response = requests.get(self.PAGESPEED_API_URL, params=params, timeout=180)

                if response.status_code == 200:
                    data = response.json()

                    # Extract Lighthouse results
                    lighthouse = data.get('lighthouseResult', {})
                    audits = lighthouse.get('audits', {})
                    categories = lighthouse.get('categories', {})

                    # Extract performance score (0-1, multiply by 100 for percentage)
                    performance_score = categories.get('performance', {}).get('score', 0)
                    if performance_score is not None:
                        performance_score = round(performance_score * 100, 1)
                    else:
                        performance_score = 'N/A'

                    # Extract Core Web Vitals and other metrics
                    metrics = {
                        'score': performance_score,
                        'fcp': audits.get('first-contentful-paint', {}).get('displayValue', 'N/A'),
                        'lcp': audits.get('largest-contentful-paint', {}).get('displayValue', 'N/A'),
                        'cls': audits.get('cumulative-layout-shift', {}).get('displayValue', 'N/A'),
                        'tbt': audits.get('total-blocking-time', {}).get('displayValue', 'N/A'),
                        'tti': audits.get('interactive', {}).get('displayValue', 'N/A'),
                        'speed_index': audits.get('speed-index', {}).get('displayValue', 'N/A'),
                    }

                    return metrics

                else:
                    print(f"    ✗ API Error: Status {response.status_code}")
                    if attempt == max_retries - 1:
                        return {
                            'score': f'Error {response.status_code}',
                            'fcp': 'Error', 'lcp': 'Error', 'cls': 'Error',
                            'tbt': 'Error', 'tti': 'Error', 'speed_index': 'Error'
                        }
                    time.sleep(2) # Wait before retry

            except requests.Timeout:
                print(f"    ✗ Timeout error (Attempt {attempt + 1})")
                if attempt == max_retries - 1:
                    return {
                        'score': 'Timeout',
                        'fcp': 'Timeout', 'lcp': 'Timeout', 'cls': 'Timeout',
                        'tbt': 'Timeout', 'tti': 'Timeout', 'speed_index': 'Timeout'
                    }
                time.sleep(2)
            except Exception as e:
                print(f"    ✗ Exception: {str(e)}")
                if attempt == max_retries - 1:
                    return {
                        'score': 'Error',
                        'fcp': 'Error', 'lcp': 'Error', 'cls': 'Error',
                        'tbt': 'Error', 'tti': 'Error', 'speed_index': 'Error'
                    }
                time.sleep(2)
        
        return {
            'score': 'Error',
            'fcp': 'Error', 'lcp': 'Error', 'cls': 'Error',
            'tbt': 'Error', 'tti': 'Error', 'speed_index': 'Error'
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
            'Mobile_Score', 'Mobile_FCP', 'Mobile_LCP', 'Mobile_CLS',
            'Mobile_TBT', 'Mobile_TTI', 'Mobile_SpeedIndex',
            'Desktop_Score', 'Desktop_FCP', 'Desktop_LCP', 'Desktop_CLS',
            'Desktop_TBT', 'Desktop_TTI', 'Desktop_SpeedIndex',
            'Audit_Status', 'Audit_Timestamp'
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
                # Audit for Mobile
                mobile_metrics = self.audit_website(website_url, strategy='mobile')
                df.at[index, 'Mobile_Score'] = mobile_metrics['score']
                df.at[index, 'Mobile_FCP'] = mobile_metrics['fcp']
                df.at[index, 'Mobile_LCP'] = mobile_metrics['lcp']
                df.at[index, 'Mobile_CLS'] = mobile_metrics['cls']
                df.at[index, 'Mobile_TBT'] = mobile_metrics['tbt']
                df.at[index, 'Mobile_TTI'] = mobile_metrics['tti']
                df.at[index, 'Mobile_SpeedIndex'] = mobile_metrics['speed_index']

                # Wait 2 seconds between requests to avoid rate limiting
                time.sleep(2)

                # Audit for Desktop
                desktop_metrics = self.audit_website(website_url, strategy='desktop')
                df.at[index, 'Desktop_Score'] = desktop_metrics['score']
                df.at[index, 'Desktop_FCP'] = desktop_metrics['fcp']
                df.at[index, 'Desktop_LCP'] = desktop_metrics['lcp']
                df.at[index, 'Desktop_CLS'] = desktop_metrics['cls']
                df.at[index, 'Desktop_TBT'] = desktop_metrics['tbt']
                df.at[index, 'Desktop_TTI'] = desktop_metrics['tti']
                df.at[index, 'Desktop_SpeedIndex'] = desktop_metrics['speed_index']

                # Set audit status and timestamp
                df.at[index, 'Audit_Status'] = 'Completed'
                df.at[index, 'Audit_Timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                print(f"  ✓ Mobile Score: {mobile_metrics['score']} | Desktop Score: {desktop_metrics['score']}")
                print(f"  ✓ Mobile LCP: {mobile_metrics['lcp']} | Desktop LCP: {desktop_metrics['lcp']}\n")

                processed_count += 1
                
                if progress_callback:
                    progress_callback(processed_count, total_to_process)

                # Wait 2 seconds before next website (if we were looping)
                time.sleep(2)

            except Exception as e:
                df.at[index, 'Audit_Status'] = f'Error: {str(e)}'
                print(f"  ✗ Failed to audit: {str(e)}\n")

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
