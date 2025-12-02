import requests
import pandas as pd
import time
from datetime import datetime
from typing import Dict, Any, Callable, Optional
from config import settings


class SeoRankingService:
    """Service for ranking leads based on SEO performance metrics."""

    # Google PageSpeed Insights API Configuration
    PAGESPEED_API_KEY = "AIzaSyAdE5WmAS5Cew1vcHRplzj3A3iCBVZXbvQ"
    PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"

    def __init__(self):
        self.output_dir = settings.OUTPUT_DIR

    def audit_website_mobile(self, url: str) -> Dict[str, Any]:
        """
        Audit a website using Google PageSpeed Insights API (mobile only for speed)

        Args:
            url: Website URL to audit

        Returns:
            Dictionary containing performance metrics
        """
        # Ensure URL has proper protocol
        if not url.startswith('http'):
            url = 'https://' + url

        # API parameters - mobile only for faster ranking
        params = {
            'url': url,
            'key': self.PAGESPEED_API_KEY,
            'strategy': 'mobile',
            'category': 'performance'
        }

        # Retry logic
        max_retries = 2  # Reduced retries for faster ranking
        for attempt in range(max_retries):
            try:
                print(f"    Auditing mobile (Attempt {attempt + 1}/{max_retries})...")
                
                # Timeout set to 120 seconds
                response = requests.get(self.PAGESPEED_API_URL, params=params, timeout=120)

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
                        performance_score = 0

                    # Extract Core Web Vitals
                    metrics = {
                        'score': performance_score,
                        'fcp': audits.get('first-contentful-paint', {}).get('displayValue', 'N/A'),
                        'lcp': audits.get('largest-contentful-paint', {}).get('displayValue', 'N/A'),
                        'cls': audits.get('cumulative-layout-shift', {}).get('displayValue', 'N/A'),
                        'tbt': audits.get('total-blocking-time', {}).get('displayValue', 'N/A'),
                        'speed_index': audits.get('speed-index', {}).get('displayValue', 'N/A'),
                    }

                    return metrics

                else:
                    print(f"    ✗ API Error: Status {response.status_code}")
                    if attempt == max_retries - 1:
                        return {
                            'score': 0,
                            'fcp': 'Error', 'lcp': 'Error', 'cls': 'Error',
                            'tbt': 'Error', 'speed_index': 'Error'
                        }
                    time.sleep(1)

            except requests.Timeout:
                print(f"    ✗ Timeout error (Attempt {attempt + 1})")
                if attempt == max_retries - 1:
                    return {
                        'score': 0,
                        'fcp': 'Timeout', 'lcp': 'Timeout', 'cls': 'Timeout',
                        'tbt': 'Timeout', 'speed_index': 'Timeout'
                    }
                time.sleep(1)
            except Exception as e:
                print(f"    ✗ Exception: {str(e)}")
                if attempt == max_retries - 1:
                    return {
                        'score': 0,
                        'fcp': 'Error', 'lcp': 'Error', 'cls': 'Error',
                        'tbt': 'Error', 'speed_index': 'Error'
                    }
                time.sleep(1)
        
        return {
            'score': 0,
            'fcp': 'Error', 'lcp': 'Error', 'cls': 'Error',
            'tbt': 'Error', 'speed_index': 'Error'
        }

    def rank_leads(self, input_filename: str, progress_callback: Optional[Callable] = None) -> Dict[str, Any]:
        """
        Rank leads based on SEO performance using PainScore algorithm

        Args:
            input_filename: Name of input CSV file in outputs directory
            progress_callback: Optional callback function for progress updates

        Returns:
            Dictionary with results including output filename and total processed
        """
        input_filepath = f"{self.output_dir}/{input_filename}"
        
        print(f"\nReading CSV file: {input_filepath}")
        print("=" * 80)

        # Read the input CSV
        try:
            df = pd.read_csv(input_filepath)
        except FileNotFoundError:
            raise FileNotFoundError(f"Input file '{input_filename}' not found")

        # Check if required column exists
        if 'Website URL' not in df.columns:
            raise ValueError("CSV must contain 'Website URL' column")

        print(f"Found {len(df)} leads to rank.\n")

        # Add new columns for SEO ranking data
        ranking_columns = [
            'Mobile_Score', 'Mobile_FCP', 'Mobile_LCP', 'Mobile_CLS',
            'Mobile_TBT', 'Mobile_TTI', 'Mobile_SpeedIndex',
            'Desktop_Score', 'Desktop_FCP', 'Desktop_LCP', 'Desktop_CLS',
            'Desktop_TBT', 'Desktop_TTI', 'Desktop_SpeedIndex',
            'PainScore', 'SEO_Rank', 'Ranking_Timestamp'
        ]

        for col in ranking_columns:
            if col not in df.columns:
                df[col] = ''

        # Process all websites
        total_to_process = len(df)
        processed_count = 0

        for index, row in df.iterrows():
            website_url = row.get('Website URL', '')

            print(f"[{index + 1}/{len(df)}] Ranking: {row.get('Business Name', 'Unknown')}")
            print(f"  URL: {website_url}")

            # Skip if no valid URL
            if pd.isna(website_url) or website_url == 'No website available' or website_url == 'Not found' or website_url == 'N/A' or website_url == '':
                df.at[index, 'Mobile_Score'] = 0
                df.at[index, 'Desktop_Score'] = 0
                print("  ⊗ Skipped - No valid URL\n")
                processed_count += 1
                if progress_callback:
                    progress_callback(processed_count, total_to_process)
                continue

            try:
                # Audit for Mobile
                mobile_metrics = self.audit_website_mobile(website_url)
                df.at[index, 'Mobile_Score'] = mobile_metrics['score']
                df.at[index, 'Mobile_FCP'] = mobile_metrics['fcp']
                df.at[index, 'Mobile_LCP'] = mobile_metrics['lcp']
                df.at[index, 'Mobile_CLS'] = mobile_metrics['cls']
                df.at[index, 'Mobile_TBT'] = mobile_metrics['tbt']
                df.at[index, 'Mobile_TTI'] = mobile_metrics.get('tti', 'N/A')
                df.at[index, 'Mobile_SpeedIndex'] = mobile_metrics['speed_index']

                # Wait 2 seconds between requests
                time.sleep(2)

                # Audit for Desktop
                desktop_metrics = self.audit_website(website_url, strategy='desktop')
                df.at[index, 'Desktop_Score'] = desktop_metrics['score']
                df.at[index, 'Desktop_FCP'] = desktop_metrics['fcp']
                df.at[index, 'Desktop_LCP'] = desktop_metrics['lcp']
                df.at[index, 'Desktop_CLS'] = desktop_metrics['cls']
                df.at[index, 'Desktop_TBT'] = desktop_metrics['tbt']
                df.at[index, 'Desktop_TTI'] = desktop_metrics.get('tti', 'N/A')
                df.at[index, 'Desktop_SpeedIndex'] = desktop_metrics['speed_index']

                df.at[index, 'Ranking_Timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                print(f"  ✓ Mobile Score: {mobile_metrics['score']} | Desktop Score: {desktop_metrics['score']}")
                print(f"  ✓ Mobile LCP: {mobile_metrics['lcp']} | Desktop LCP: {desktop_metrics['lcp']}\n")

                processed_count += 1
                
                if progress_callback:
                    progress_callback(processed_count, total_to_process)

                # Wait 2 seconds before next website
                if index < len(df) - 1:
                    time.sleep(2)

            except Exception as e:
                df.at[index, 'Mobile_Score'] = 0
                df.at[index, 'Desktop_Score'] = 0
                print(f"  ✗ Failed to rank: {str(e)}\n")
                processed_count += 1
                if progress_callback:
                    progress_callback(processed_count, total_to_process)

        # Apply PainScore ranking algorithm
        print("\nCalculating PainScore rankings...")
        df = self._calculate_painscore(df)

        # Create ranked filename
        output_filename = f"ranked_{input_filename}"
        output_filepath = f"{self.output_dir}/{output_filename}"

        # Save to CSV
        df.to_csv(output_filepath, index=False, encoding='utf-8')

        print(f"\n✓ Ranking complete! Saved to: {output_filename}")
        print(f"Total leads ranked: {processed_count}")

        return {
            'total_processed': processed_count,
            'output_filename': output_filename,
            'input_filename': input_filename
        }

    def audit_website(self, url: str, strategy: str = 'desktop') -> Dict[str, Any]:
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
        max_retries = 2
        for attempt in range(max_retries):
            try:
                print(f"    Auditing {strategy} (Attempt {attempt + 1}/{max_retries})...")
                
                response = requests.get(self.PAGESPEED_API_URL, params=params, timeout=120)

                if response.status_code == 200:
                    data = response.json()

                    # Extract Lighthouse results
                    lighthouse = data.get('lighthouseResult', {})
                    audits = lighthouse.get('audits', {})
                    categories = lighthouse.get('categories', {})

                    # Extract performance score
                    performance_score = categories.get('performance', {}).get('score', 0)
                    if performance_score is not None:
                        performance_score = round(performance_score * 100, 1)
                    else:
                        performance_score = 0

                    # Extract Core Web Vitals
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
                            'score': 0,
                            'fcp': 'Error', 'lcp': 'Error', 'cls': 'Error',
                            'tbt': 'Error', 'tti': 'Error', 'speed_index': 'Error'
                        }
                    time.sleep(1)

            except requests.Timeout:
                print(f"    ✗ Timeout error")
                if attempt == max_retries - 1:
                    return {
                        'score': 0,
                        'fcp': 'Timeout', 'lcp': 'Timeout', 'cls': 'Timeout',
                        'tbt': 'Timeout', 'tti': 'Timeout', 'speed_index': 'Timeout'
                    }
                time.sleep(1)
            except Exception as e:
                print(f"    ✗ Exception: {str(e)}")
                if attempt == max_retries - 1:
                    return {
                        'score': 0,
                        'fcp': 'Error', 'lcp': 'Error', 'cls': 'Error',
                        'tbt': 'Error', 'tti': 'Error', 'speed_index': 'Error'
                    }
                time.sleep(1)
        
        return {
            'score': 0,
            'fcp': 'Error', 'lcp': 'Error', 'cls': 'Error',
            'tbt': 'Error', 'tti': 'Error', 'speed_index': 'Error'
        }

    def _convert_to_seconds(self, value):
        """Convert time strings to seconds for normalization"""
        if isinstance(value, str):
            v = value.strip().replace("Â", "").replace(" ", "").replace(",", "")

            # Handle non-numeric values
            if v.lower() in ["timeout", "na", "n/a", "-", "", "error"]:
                return 30.0  # extremely slow fallback score

            if v.endswith("ms"):
                try:
                    return float(v.replace("ms", "")) / 1000
                except:
                    return 30.0

            if v.endswith("s"):
                try:
                    return float(v.replace("s", ""))
                except:
                    return 30.0

            try:
                return float(v)
            except:
                return 30.0

        # If already numeric
        try:
            return float(value)
        except:
            return 30.0

    def _calculate_painscore(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate PainScore for each lead based on SEO metrics
        Higher PainScore = Worse SEO (more pain)
        """
        import numpy as np

        score_cols = ["Mobile_Score", "Desktop_Score"]
        time_cols = [
            "Mobile_FCP", "Mobile_LCP", "Mobile_CLS", "Mobile_TBT",
            "Mobile_TTI", "Mobile_SpeedIndex",
            "Desktop_FCP", "Desktop_LCP", "Desktop_CLS", "Desktop_TBT",
            "Desktop_TTI", "Desktop_SpeedIndex"
        ]

        # Convert time-based metrics to seconds
        for col in time_cols:
            df[col] = df[col].apply(self._convert_to_seconds)

        # Normalize score metrics (0-100 to 0-1)
        df["Mobile_Score_norm"] = pd.to_numeric(df["Mobile_Score"], errors='coerce').fillna(0) / 100
        df["Desktop_Score_norm"] = pd.to_numeric(df["Desktop_Score"], errors='coerce').fillna(0) / 100

        # Normalize time metrics (higher = worse)
        for col in time_cols:
            col_norm = col + "_norm"
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(30.0)
            min_v = df[col].min()
            max_v = df[col].max()
            df[col_norm] = (df[col] - min_v) / (max_v - min_v + 1e-9)

        # Calculate PainScore using weighted formula
        df["PainScore"] = (
            # Mobile Factors (60% weight)
            0.20 * df["Mobile_LCP_norm"] +
            0.10 * df["Mobile_FCP_norm"] +
            0.05 * df["Mobile_CLS_norm"] +
            0.10 * df["Mobile_TBT_norm"] +
            0.10 * df["Mobile_TTI_norm"] +
            0.05 * df["Mobile_SpeedIndex_norm"] +

            # Desktop Factors (35% weight)
            0.10 * df["Desktop_LCP_norm"] +
            0.05 * df["Desktop_FCP_norm"] +
            0.05 * df["Desktop_CLS_norm"] +
            0.10 * df["Desktop_TBT_norm"] +
            0.10 * df["Desktop_TTI_norm"] +
            0.05 * df["Desktop_SpeedIndex_norm"] +

            # Inverse scores (bad = high pain) (40% weight)
            0.20 * (1 - df["Mobile_Score_norm"]) +
            0.20 * (1 - df["Desktop_Score_norm"])
        )

        # Ranking: highest PainScore = worst SEO (rank 1 = worst)
        df["SEO_Rank"] = df["PainScore"].rank(method="dense", ascending=False).astype(int)

        # Sort by rank (worst first)
        df = df.sort_values("SEO_Rank")

        # Clean up temporary normalized columns
        norm_cols = [col + "_norm" for col in time_cols] + ["Mobile_Score_norm", "Desktop_Score_norm"]
        df = df.drop(columns=norm_cols, errors='ignore')

        return df
