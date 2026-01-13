import axios from 'axios';
import Papa from 'papaparse';

const API_BASE_URL = 'http://localhost:8000/api/leads';

class AuditService {
    async listFiles() {
        const response = await axios.get(`${API_BASE_URL}/list-files`);
        return response.data;
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_BASE_URL}/audit/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }

    async runAudit(filename, limit) {
        const response = await axios.post(`${API_BASE_URL}/audit/run`, {
            input_filename: filename,
            limit: parseInt(limit)
        });
        return response.data;
    }

    async getAuditStatus(jobId) {
        const response = await axios.get(`${API_BASE_URL}/audit/job/${jobId}`);
        return response.data;
    }

    async fetchAuditPreview(jobId) {
        const response = await axios.get(`${API_BASE_URL}/audit/download/${jobId}`, {
            responseType: 'text'
        });

        return new Promise((resolve, reject) => {
            Papa.parse(response.data, {
                complete: (results) => {
                    const rows = results.data.filter(row => row.length > 1 && row.some(cell => cell !== ''));
                    resolve(rows);
                },
                header: false,
                skipEmptyLines: true,
                error: (err) => reject(err)
            });
        });
    }

    getDownloadUrl(jobId) {
        return `${API_BASE_URL}/audit/download/${jobId}`;
    }

    async validateCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    Papa.parse(text, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (results) => {
                            const headers = results.meta.fields?.map(h => h.toLowerCase().trim()) || [];

                            if (headers.length === 0) {
                                resolve({
                                    valid: false,
                                    error: 'CSV file has no headers',
                                    missing_columns: ['business_name', 'website']
                                });
                                return;
                            }

                            // Check for business name column
                            const businessVariants = ['business name', 'business_name', 'name', 'company', 'company name', 'company_name', 'business', 'title'];
                            const websiteVariants = ['website', 'website url', 'website_url', 'url', 'link', 'web', 'site', 'homepage', 'domain'];

                            const businessCol = businessVariants.find(v => headers.includes(v));
                            const websiteCol = websiteVariants.find(v => headers.includes(v));

                            const missing = [];
                            if (!businessCol) missing.push('business_name');
                            if (!websiteCol) missing.push('website');

                            if (missing.length > 0) {
                                resolve({
                                    valid: false,
                                    error: `Missing required columns: ${missing.join(', ')}`,
                                    missing_columns: missing,
                                    found_headers: headers
                                });
                            } else {
                                resolve({
                                    valid: true,
                                    business_name_column: businessCol,
                                    website_column: websiteCol,
                                    headers: headers,
                                    row_count: results.data.length,
                                    message: `CSV is valid with ${results.data.length} rows`
                                });
                            }
                        },
                        error: (err) => {
                            resolve({
                                valid: false,
                                error: `Invalid CSV format: ${err.message}`
                            });
                        }
                    });
                } catch (err) {
                    resolve({
                        valid: false,
                        error: `Error reading file: ${err.message}`
                    });
                }
            };
            reader.onerror = () => {
                resolve({
                    valid: false,
                    error: 'Failed to read file'
                });
            };
            reader.readAsText(file);
        });
    }
}

export default new AuditService();
