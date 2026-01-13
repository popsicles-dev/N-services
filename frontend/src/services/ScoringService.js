import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/leads';

class ScoringService {
    async runIntentScoring(inputFilename, limit = 100) {
        const response = await axios.post(`${API_BASE_URL}/scoring/run`, {
            input_filename: inputFilename,
            limit: limit
        });
        return response.data;
    }

    async getScoringStatus(jobId) {
        const response = await axios.get(`${API_BASE_URL}/scoring/job/${jobId}`);
        return response.data;
    }

    getDownloadUrl(jobId) {
        return `${API_BASE_URL}/scoring/download/${jobId}`;
    }
}

export default new ScoringService();
