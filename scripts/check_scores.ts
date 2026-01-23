
const API_URL = 'http://localhost:3001/api';

async function login(email, password = 'password123') {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error(`Login failed: ${res.status}`);
    return (await res.json()).accessToken;
}

async function checkScores() {
    try {
        const token = await login('admin@acmecorp.com');
        const res = await fetch(`${API_URL}/leads?limit=5`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        console.log('Leads Sample:', JSON.stringify(data.leads, null, 2));
    } catch (e) {
        console.error(e);
    }
}

checkScores();
