"""
Intent Scoring Service
Uses Groq LLM to analyze audited leads and assign potential scores
"""
import json
import requests
import time
import pandas as pd
from typing import Dict, Any, Optional
from datetime import datetime
from config import settings

# Groq Configuration
API_URL = 'https://api.groq.com/openai/v1/chat/completions'
MODEL_NAME = 'llama-3.1-8b-instant'


class IntentScoringService:
    """Service for scoring leads using Groq LLM."""
    
    def __init__(self):
        self.output_dir = settings.OUTPUT_DIR
        self.groq_api_key = settings.GROQ_API_KEY
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.groq_api_key}'
        }
    
    def generate_lead_score(self, audit_data: dict) -> dict:
        """Calls Groq API and returns structured score + justification."""
        
        if not self.groq_api_key or self.groq_api_key == 'YOUR_GROQ_API_KEY_HERE':
            return {'score': 0, 'justification': 'Groq API key missing.'}
        
        structural = json.dumps(audit_data, indent=2)
        
        system_prompt = (
            'You are an Elite SEO Lead Qualification Expert. Analyze the audit data '
            'and output a JSON object with score (1-10) and justification.'
        )
        
        user_msg = f'''
Assign a score 1–10.

- High Potential (8–10): Missing title, missing H1, OR generic content.
- Medium (5–7): Minor structural issues.
- Low (1–4): All elements present and customized.

STRUCTURAL_AUDIT_DATA:
{structural}

Return ONLY JSON with keys "score" and "justification".
'''
        
        payload = {
            'model': MODEL_NAME,
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_msg}
            ],
            'response_format': {'type': 'json_object'},
            'temperature': 0.0,
            'max_tokens': 200
        }
        
        max_retries = 5
        base_delay = 1
        
        for attempt in range(max_retries):
            try:
                resp = requests.post(
                    API_URL, 
                    headers=self.headers, 
                    data=json.dumps(payload), 
                    timeout=20
                )
                resp.raise_for_status()
                result = resp.json()
                
                json_text = result['choices'][0]['message']['content']
                return json.loads(json_text)
            
            except requests.exceptions.HTTPError as e:
                if resp.status_code in [429, 500] and attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    print(f"HTTP {resp.status_code}. Retrying in {delay}s...")
                    time.sleep(delay)
                    continue
                return {'score': 0, 'justification': f'HTTP Error {resp.status_code}'}
            
            except Exception as e:
                return {'score': 0, 'justification': f'LLM parse or network failure: {str(e)}'}
        
        return {'score': 0, 'justification': 'Max retries exceeded'}
    
    def score_leads(self, input_filename: str, limit: int = 100, progress_callback=None) -> Dict[str, Any]:
        """
        Reads audited data and applies intent scoring.
        
        Args:
            input_filename: Name of input CSV file
            limit: Maximum number of leads to score
            progress_callback: Optional callback for progress updates
        """
        input_filepath = f"{self.output_dir}/{input_filename}"
        
        print(f"\nLoading: {input_filepath}")
        print("=" * 80)
        
        try:
            df = pd.read_csv(input_filepath)
        except FileNotFoundError:
            raise FileNotFoundError(f"Input file '{input_filename}' not found")
        
        # Check for required columns (flexible matching)
        required_patterns = {
            'website': ['Website URL', 'Website', 'URL', 'website_url', 'website'],
            'audit_status': ['Audit_Status', 'audit_status', 'Status'],
            'title': ['Title', 'title', 'Title_Tag'],
            'h1': ['H1_Content', 'H1', 'h1_content', 'h1'],
            'meta_desc': ['Meta_Description', 'meta_description', 'Meta Description']
        }
        
        column_mapping = {}
        for key, patterns in required_patterns.items():
            for pattern in patterns:
                if pattern in df.columns:
                    column_mapping[key] = pattern
                    break
        
        # Initialize scoring columns
        df['LLM_Potential_Score'] = None
        df['LLM_Justification'] = None
        
        total = min(limit, len(df))
        print(f"Processing {total} leads...")
        processed_count = 0
        
        for i in range(total):
            row = df.iloc[i]
            
            # Get website URL
            website_url = row.get(column_mapping.get('website', 'Website URL'), 'N/A')
            audit_status = row.get(column_mapping.get('audit_status', 'Audit_Status'), 'Unknown')
            
            print(f"[{i+1}/{total}] Scoring: {website_url}")
            
            # Skip if audit not completed or URL missing
            if audit_status not in ['Completed', 'SUCCESS'] or pd.isna(website_url) or website_url == 'N/A':
                df.loc[df.index[i], 'LLM_Potential_Score'] = 0
                df.loc[df.index[i], 'LLM_Justification'] = f'Skipped: Audit status was {audit_status} or URL missing.'
                processed_count += 1
                if progress_callback:
                    progress_callback(processed_count, total)
                continue
            
            try:
                # Construct audit data for LLM
                audit_data = {
                    'Audit_URL': website_url,
                    'Audit_Status': audit_status,
                    'Title_Content': row.get(column_mapping.get('title', 'Title'), 'MISSING'),
                    'Title_Length': int(row.get('Title_Length', 0)) if pd.notna(row.get('Title_Length')) else 0,
                    'Meta_Desc_Content': row.get(column_mapping.get('meta_desc', 'Meta_Description'), 'MISSING'),
                    'H1_Content': row.get(column_mapping.get('h1', 'H1_Content'), 'MISSING'),
                }
                
                # Call LLM
                result = self.generate_lead_score(audit_data)
                
                df.loc[df.index[i], 'LLM_Potential_Score'] = result.get('score', 0)
                df.loc[df.index[i], 'LLM_Justification'] = result.get('justification', 'No justification provided.')
                
                print(f"  ✓ Score: {result.get('score', 0)}/10")
                
            except Exception as e:
                df.loc[df.index[i], 'LLM_Potential_Score'] = 0
                df.loc[df.index[i], 'LLM_Justification'] = f'Processing error: {str(e)}'
                print(f"  ✗ Error: {str(e)}")
            
            processed_count += 1
            if progress_callback:
                progress_callback(processed_count, total)
            
            # Small delay to avoid rate limiting
            time.sleep(0.5)
        
        # Create output filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"scored_{timestamp}_{input_filename}"
        output_filepath = f"{self.output_dir}/{output_filename}"
        
        # Save results
        df.to_csv(output_filepath, index=False, encoding='utf-8')
        
        # Calculate stats
        scored = df['LLM_Potential_Score'].notna()
        high_intent = (df['LLM_Potential_Score'] >= 8).sum() if scored.any() else 0
        medium_intent = ((df['LLM_Potential_Score'] >= 5) & (df['LLM_Potential_Score'] < 8)).sum() if scored.any() else 0
        low_intent = (df['LLM_Potential_Score'] < 5).sum() if scored.any() else 0
        
        return {
            'total_processed': processed_count,
            'output_filename': output_filename,
            'input_filename': input_filename,
            'high_intent_count': int(high_intent),
            'medium_intent_count': int(medium_intent),
            'low_intent_count': int(low_intent),
            'avg_score': float(df['LLM_Potential_Score'].mean()) if scored.any() else 0
        }


# Singleton instance
intent_scoring_service = IntentScoringService()
