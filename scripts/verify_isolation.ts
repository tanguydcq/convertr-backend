
const API_URL = 'http://localhost:3001/api';

async function login(email, password = 'password123') {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!res.ok) {
            throw new Error(`Login failed with status ${res.status}`);
        }
        const data = await res.json();
        return data.accessToken;
    } catch (e) {
        console.error(`Login failed for ${email}:`, e.message);
        process.exit(1);
    }
}

async function getLeads(token) {
    try {
        const res = await fetch(`${API_URL}/leads?limit=100`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        return data.leads || [];
    } catch (e) {
        console.error(`Get leads failed:`, e.message);
        return [];
    }
}

async function main() {
    const acmeEmail = process.argv[2];
    const randomEmail = process.argv[3];

    if (!acmeEmail || !randomEmail) {
        console.error('Usage: tsx verify_isolation.ts <email1> <email2>');
        process.exit(1);
    }

    console.log(`Testing isolation between ${acmeEmail} and ${randomEmail}`);

    const acmeToken = await login(acmeEmail);
    const randomToken = await login(randomEmail);

    const acmeLeads = await getLeads(acmeToken);
    const randomLeads = await getLeads(randomToken);

    console.log(`Acme Leads: ${acmeLeads.length}`);
    console.log(`Random Leads: ${randomLeads.length}`);

    const acmeIds = new Set(acmeLeads.map(l => l.id));
    const randomIds = new Set(randomLeads.map(l => l.id));

    // Check intersection
    let overlap = 0;
    for (const id of acmeIds) {
        if (randomIds.has(id)) overlap++;
    }

    if (overlap === 0) {
        console.log('SUCCESS: No lead overlap between accounts.');
    } else {
        console.error(`FAILURE: Found ${overlap} overlapping leads!`);
        process.exit(1);
    }

    // Extra check: Can Acme access a Random lead by ID?
    if (randomLeads.length > 0) {
        const targetId = randomLeads[0].id;
        const res = await fetch(`${API_URL}/leads/${targetId}`, {
            headers: { Authorization: `Bearer ${acmeToken}` }
        });

        if (res.status === 404) {
            console.log('SUCCESS: Acme matches 404 when accessing Random lead.');
        } else {
            console.error(`FAILURE: Acme was able to access Random lead ${targetId}, status: ${res.status}`);
            process.exit(1);
        }
    }
}

main().catch(console.error);
