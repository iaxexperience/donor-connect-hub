const clientId = 'eyJpZCI6IjkxOTIiLCJjb2RpZ29QdWJsaWNhZG9yIjowLCJjb2RpZ29Tb2Z0d2FyZSI6MTc4NTE5LCJzZXF1ZW5jaWFsSW5zdGFsYWNhbyI6MX0';
const clientSecret = 'eyJpZCI6IjcxZjA0YzEtM2MzYy00NDkyLWJmMWItMDYyOTQ5MDRhNGMwIiwiY29kaWdvUHVibGljYWRvciI6MCwiY29kaWdvU29mdHdhcmUiOjE3ODUxOSwic2VxdWVuY2lhbEluc3RhbGFjYW8iOjEsInNlcXVlbmNpYWxDcmVkZW5jaWFsIjoxLCJhbWJpZW50ZSI6ImhvbW9sb2dhY2FvIiwiaWF0IjoxNzc2MTgyMTYwOTE0fQ';
const appKey = '45f2da38f7044302819df079a6d313a3';
const isSandbox = true;

async function checkBB() {
    const credentials = btoa(`${clientId}:${clientSecret}`);
    const tokenUrl = isSandbox
      ? 'https://oauth.sandbox.bb.com.br/oauth/token'
      : 'https://oauth.bb.com.br/oauth/token';

    console.log("Testing with real user keys...");
    
    // Attempt 1: Standard with scope
    try {
        console.log("--- Attempt 1 (with scope) ---");
        const res = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'gw-dev-app-key': appKey,
                'Accept': 'application/json'
            },
            body: new URLSearchParams({
                'grant_type': 'client_credentials',
                'scope': 'extrato.read'
            }).toString()
        });
        console.log("Status:", res.status);
        console.log("Body:", await res.text());
    } catch (e) { console.error(e); }

    // Attempt 2: WITHOUT scope (some BB apps don't use scope)
    try {
        console.log("--- Attempt 2 (no scope) ---");
        const res = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'gw-dev-app-key': appKey,
                'Accept': 'application/json'
            },
            body: new URLSearchParams({
                'grant_type': 'client_credentials'
            }).toString()
        });
        console.log("Status:", res.status);
        console.log("Body:", await res.text());
    } catch (e) { console.error(e); }
}

checkBB();
