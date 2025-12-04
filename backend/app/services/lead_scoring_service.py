import pandas as pd
import json
import time
from typing import Dict, Any
from config import settings
from app.services.rag_service import rag_service

class LeadScoringService:
    """Service for scoring leads using LLM based on structural audit data."""

    def __init__(self):
        self.output_dir = settings.OUTPUT_DIR

    def run_scoring(self, input_filename: str, progress_callback=None) -> Dict[str, Any]:
        """
        Reads audited CSV, runs LLM scoring on successful audits.
        """
        input_filepath = f"{self.output_dir}/{input_filename}"
        
        try:
            df = pd.read_csv(input_filepath)
        except FileNotFoundError:
            raise FileNotFoundError(f"Input file '{input_filename}' not found")
        
        if 'Website URL' not in df.columns:
            raise ValueError("CSV must contain 'Website URL' column")

        # Define new scoring columns if they don't exist
        if 'LLM_Potential_Score' not in df.columns:
            df['LLM_Potential_Score'] = 'N/A'
        if 'LLM_Justification' not in df.columns:
            df['LLM_Justification'] = 'N/A'

        # Ensure we have raw data
        if 'Audit_Raw_Data' not in df.columns:
            # If missing, we can't score properly without re-auditing, but we assume input is from stage 1
            raise ValueError("Input CSV missing 'Audit_Raw_Data'. Run Structural Audit first.")

        total_to_process = len(df)
        processed_count = 0

        for index, row in df.iterrows():
            website_url = row['Website URL']
            
            # Skip invalid URLs
            if not pd.notna(website_url) or website_url in ['No website available', 'Not found', 'N/A']:
                processed_count += 1
                continue
                
            # Get Raw Audit Data
            raw_data_json = row.get('Audit_Raw_Data')
            if pd.isna(raw_data_json) or not raw_data_json:
                processed_count += 1
                continue

            try:
                audit_data = json.loads(raw_data_json)
                
                # Only score if audit was successful
                if audit_data.get('status') == 'SUCCESS':
                    # Call LLM
                    llm_response = rag_service.generate_lead_score(audit_data)
                    
                    score = llm_response.get('score', 0)
                    justification = llm_response.get('justification', 'N/A')
                    
                    df.at[index, 'LLM_Potential_Score'] = score
                    df.at[index, 'LLM_Justification'] = justification
                    
            except json.JSONDecodeError:
                print(f"Error decoding JSON for {website_url}")
            except Exception as e:
                print(f"Error scoring {website_url}: {e}")

            processed_count += 1
            if progress_callback:
                progress_callback(processed_count, total_to_process)
            
            # Rate limit protection for LLM
            time.sleep(0.5) 

        output_filename = f"scored_{input_filename.replace('audited_', '')}"
        output_filepath = f"{self.output_dir}/{output_filename}"
        df.to_csv(output_filepath, index=False, encoding='utf-8')

        return {
            'total_processed': processed_count,
            'output_filename': output_filename,
            'input_filename': input_filename
        }
