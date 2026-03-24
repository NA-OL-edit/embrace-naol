const BASE_URL = 'http://127.0.0.1:8090';
const EMAIL = 'naolsamuel7@gmail.com';
const PASSWORD = 'Ch@nge@Sabaktani7@';

async function testFetch() {
    let authRes = await fetch(`${BASE_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: EMAIL, password: PASSWORD })
    });
    const { token } = await authRes.json();

    const headers = { 'Authorization': `Bearer ${token}` };

    for (const path of [
        '/api/collections/products/records?perPage=5&sort=-created',
        '/api/collections/categories/records?perPage=1',
        '/api/collections/logs/records?perPage=1'
    ]) {
        let res = await fetch(`${BASE_URL}${path}`, { headers });
        if (!res.ok) {
            console.error(`Failed ${path}:`, res.status, await res.text());
        } else {
            console.log(`Success ${path}`);
        }
    }
}
testFetch();
