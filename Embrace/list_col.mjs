const BASE_URL = 'http://127.0.0.1:8090';
const EMAIL = 'naolsamuel7@gmail.com';
const PASSWORD = 'Ch@nge@Sabaktani7@';

async function list() {
    let authRes = await fetch(`${BASE_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: EMAIL, password: PASSWORD })
    });
    const { token } = await authRes.json();

    const colRes = await fetch(`${BASE_URL}/api/collections`, {
        headers: { 'Authorization': token }
    });
    const colList = await colRes.json();
    
    // Write just the names of the collections
    console.log("Collections: ", colList.items ? colList.items.map(c => c.name) : colList.map(c => c.name));
    
    // Write full products collection to see if it's malformed
    let p = (colList.items || colList).find(c => c.name === 'products');
    if (p) {
        console.log("Products fields:", JSON.stringify(p.fields, null, 2));
    } else {
        console.log("Products not found.");
    }
}
list();
