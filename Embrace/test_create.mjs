const BASE_URL = 'http://127.0.0.1:8090';
const EMAIL = 'naolsamuel7@gmail.com';
const PASSWORD = 'Ch@nge@Sabaktani7@';

async function test() {
    let authRes = await fetch(`${BASE_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: EMAIL, password: PASSWORD })
    });
    const { token } = await authRes.json();
    const headers = { 'Content-Type': 'application/json', 'Authorization': token };

    const sysFields = [
        { name: 'created', type: 'autodate', system: true },
        { name: 'updated', type: 'autodate', system: true }
    ];

    const logsData = {
        name: 'logs', type: 'base', listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        fields: [...sysFields, { name: 'admin_email', type: 'text' }, { name: 'action', type: 'text' }, { name: 'target', type: 'text' }]
    };
    let res = await fetch(`${BASE_URL}/api/collections`, { method: 'POST', headers, body: JSON.stringify(logsData) });
    console.log(res.status);
    console.log(await res.text());
}
test();
