const clientId = 'eyJpZCI6IjkxOTIiLCJjb2RpZ29QdWJsaWNhZG9yIjowLCJjb2RpZ29Tb2Z0d2FyZSI6MTc4NTE5LCJzZXF1ZW5jaWFsSW5zdGFsYWNhbyI6MX0';
const clientSecret = 'eyJpZCI6IjcxZjA0YzEtM2MzYy00NDkyLWJmMWItMDYyOTQ5MDRhNGMwIiwiY29kaWdvUHVibGljYWRvciI6MCwiY29kaWdvU29mdHdhcmUiOjE3ODUxOSwic2VxdWVuY2lhbEluc3RhbGFjYW8iOjEsInNlcXVlbmNpYWxDcmVkZW5jaWFsIjoxLCJhbWJpZW50ZSI6ImhvbW9sb2dhY2FvIiwiaWF0IjoxNzc2MTgyMTYwOTE0fQ';
const appKey = '45f2da38f7044302819df079a6d313a3';
const credentials = btoa(`${clientId}:${clientSecret}`);
const tokenUrl = 'https://oauth.sandbox.bb.com.br/oauth/token';

async function test(name, headers, body) {
    try {
        console.log(`--- Test: ${name} ---`);
        const res = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                ...headers
            },
            body: new URLSearchParams(body).toString()
        });
        console.log("Status:", res.status);
        console.log("Body:", await res.text());
    } catch (e) { console.log("Error:", e.message); }
}

async function run() {
    // 1. Current logic
    await test("Current (Headers + Scope)", { 'gw-dev-app-key': appKey }, { grant_type: 'client_credentials', scope: 'extrato.read' });
    
    // 2. Without scope
    await test("No Scope", { 'gw-dev-app-key': appKey }, { grant_type: 'client_credentials' });
    
    // 3. Without App Key in header
    await test("No App Key Header", {}, { grant_type: 'client_credentials', scope: 'extrato.read' });

    // 4. Without scope and without App Key
    await test("Minimal", {}, { grant_type: 'client_credentials' });
}

run();
