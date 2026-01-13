"""
CSV Ranker Service - Ranks already-audited CSVs using PainScore algorithm
"""

import pandas as pd
import numpy as np
from typing import Dict, Any
from datetime import datetime


class CsvRankerService:
    """Service for ranking already-audited CSV files using PainScore algorithm."""
    
    REQUIRED_COLUMNS = [
        'Mobile_Score', 'Desktop_Score',
        'Mobile_FCP', 'Mobile_LCP', 'Mobile_CLS', 'Mobile_TBT', 'Mobile_TTI', 'Mobile_SpeedIndex',
        'Desktop_FCP', 'Desktop_LCP', 'Desktop_CLS', 'Desktop_TBT', 'Desktop_TTI', 'Desktop_SpeedIndex'
    ]
    
    def __init__(self):
        """Initialize the CSV Ranker service."""
        pass
    
    def _convert_to_seconds(self, value: str) -> float:
        """Convert time string to seconds."""
        if pd.isna(value) or value == 'N/A':
            return 0.0
        
        value_str = str(value).strip()
        
        try:
            if 'ms' in value_str:
                return float(value_str.replace('ms', '').replace(',', '').strip()) / 1000
            elif 's' in value_str:
                return float(value_str.replace('s', '').replace(',', '').strip())
            else:
                return float(value_str.replace(',', ''))
        except (ValueError, AttributeError):
            return 0.0
    
    def _calculate_painscore(self, row: pd.Series) -> float:
        """Calculate PainScore for a single row using the provided algorithm."""
        
        # Convert metrics to seconds
        mobile_lcp = self._convert_to_seconds(row.get('Mobile_LCP', 0))
        mobile_fcp = self._convert_to_seconds(row.get('Mobile_FCP', 0))
        mobile_cls = float(row.get('Mobile_CLS', 0)) if not pd.isna(row.get('Mobile_CLS')) else 0
        mobile_tbt = self._convert_to_seconds(row.get('Mobile_TBT', 0))
        mobile_tti = self._convert_to_seconds(row.get('Mobile_TTI', 0))
        mobile_si = self._convert_to_seconds(row.get('Mobile_SpeedIndex', 0))
        
        desktop_lcp = self._convert_to_seconds(row.get('Desktop_LCP', 0))
        desktop_fcp = self._convert_to_seconds(row.get('Desktop_FCP', 0))
        desktop_cls = float(row.get('Desktop_CLS', 0)) if not pd.isna(row.get('Desktop_CLS')) else 0
        desktop_tbt = self._convert_to_seconds(row.get('Desktop_TBT', 0))
        desktop_tti = self._convert_to_seconds(row.get('Desktop_TTI', 0))
        desktop_si = self._convert_to_seconds(row.get('Desktop_SpeedIndex', 0))
        
        mobile_score = float(row.get('Mobile_Score', 0)) if not pd.isna(row.get('Mobile_Score')) else 0
        desktop_score = float(row.get('Desktop_Score', 0)) if not pd.isna(row.get('Desktop_Score')) else 0
        
        # Normalize metrics (0-1 scale)
        mobile_lcp_norm = min(mobile_lcp / 4.0, 1.0)
        mobile_fcp_norm = min(mobile_fcp / 3.0, 1.0)
        mobile_cls_norm = min(mobile_cls / 0.25, 1.0)
        mobile_tbt_norm = min(mobile_tbt / 0.6, 1.0)
        mobile_tti_norm = min(mobile_tti / 7.3, 1.0)
        mobile_si_norm = min(mobile_si / 5.8, 1.0)
        
        desktop_lcp_norm = min(desktop_lcp / 2.5, 1.0)
        desktop_fcp_norm = min(desktop_fcp / 1.8, 1.0)
        desktop_cls_norm = min(desktop_cls / 0.1, 1.0)
        desktop_tbt_norm = min(desktop_tbt / 0.3, 1.0)
        desktop_tti_norm = min(desktop_tti / 3.8, 1.0)
        desktop_si_norm = min(desktop_si / 3.4, 1.0)
        
        # Performance scores (inverse - lower score = higher pain)
        mobile_perf_pain = (100 - mobile_score) / 100
        desktop_perf_pain = (100 - desktop_score) / 100
        
        # Calculate weighted PainScore
        mobile_pain = (
            mobile_lcp_norm * 0.20 +
            mobile_tbt_norm * 0.10 +
            mobile_fcp_norm * 0.10 +
            mobile_tti_norm * 0.10 +
            mobile_cls_norm * 0.05 +
            mobile_si_norm * 0.05
        )
        
        desktop_pain = (
            desktop_lcp_norm * 0.15 +
            desktop_tbt_norm * 0.07 +
            desktop_fcp_norm * 0.05 +
            desktop_tti_norm * 0.05 +
            desktop_cls_norm * 0.02 +
            desktop_si_norm * 0.01
        )
        
        perf_pain = (mobile_perf_pain * 0.25) + (desktop_perf_pain * 0.15)
        
        total_pain = (mobile_pain * 0.60) + (desktop_pain * 0.35) + (perf_pain * 0.40)
        
        return round(total_pain * 100, 2)
    
    def validate_csv(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validate that CSV has required columns."""
        missing_columns = [col for col in self.REQUIRED_COLUMNS if col not in df.columns]
        
        if missing_columns:
            return {
                'valid': False,
                'error': f"Missing required columns: {', '.join(missing_columns)}"
            }
        
        return {'valid': True}
    
    def rank_csv(self, csv_content: bytes) -> Dict[str, Any]:
        """Rank an already-audited CSV file."""
        try:
            # Read CSV
            df = pd.read_csv(pd.io.common.BytesIO(csv_content))
            
            # Validate
            validation = self.validate_csv(df)
            if not validation['valid']:
                return validation
            
            # Calculate PainScore for each row
            df['PainScore'] = df.apply(self._calculate_painscore, axis=1)
            
            # Sort by PainScore (highest first = worst SEO)
            df = df.sort_values('PainScore', ascending=False)
            
            # Add SEO_Rank column
            df['SEO_Rank'] = range(1, len(df) + 1)
            
            # Add timestamp
            df['Ranking_Timestamp'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # Convert to dict for JSON response
            ranked_data = df.to_dict('records')
            
            return {
                'valid': True,
                'data': ranked_data,
                'total_ranked': len(ranked_data)
            }
            
        except Exception as e:
            return {
                'valid': False,
                'error': f"Error processing CSV: {str(e)}"
            }
