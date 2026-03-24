const BASE_URL = 'http://127.0.0.1:8090';
const EMAIL = 'naolsamuel7@gmail.com';
const PASSWORD = 'Ch@nge@Sabaktani7@';

async function verify() {
    let authRes = await fetch(`${BASE_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: EMAIL, password: PASSWORD })
    });
    const { token } = await authRes.json();

    const colRes = await fetch(`${BASE_URL}/api/collections/products`, {
        headers: { 'Authorization': token }
    });
    const col = await colRes.json();
    
    console.log(JSON.stringify(col, null, 2));
}
verify();
