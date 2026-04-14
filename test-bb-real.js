const clientId = 'eyJpZCI6IjkxOTIiLCJjb2RpZ29QdWJsaWNhZG9yIjowLCJjb2RpZ29Tb2Z0d2FyZSI6MTc4NTE5LCJzZXF1ZW5jaWFsSW5zdGFsYWNhbyI6MX0';
const clientSecret = 'eyJpZCI6IjcxZjA0YzEtM2MzYy00NDkyLWJmMWItMDYyOTQ5MDRhNGMwIiwiY29kaWdvUHVibGljYWRvciI6MCwiY29kaWdvU29mdHdhcmUiOjE3ODUxOSwic2VxdWVuY2lhbEluc3RhbGFjYW8iOjEsInNlcXVlbmNpYWxDcmVkZW5jaWFsIjoxLCJhbWJpZW50ZSI6ImhvbW9sb2dhY2FvIiwiaWF0IjoxNzc2MTgyMTYwOTE0fQ';
const appKey = '45f2da38f7044302819df079a6d313a3';
const isSandbox = true;

async function checkBB() {
    console.log("Starting test...");
    const credentials = btoa(`${clientId}:${clientSecret}`);
    const tokenUrl = 'https://oauth.sandbox.bb.com.br/oauth/token';

    console.log("Credentials length:", credentials.length);
    
    try {
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
        
        console.log("Status Code:", res.status);
        const text = await res.text();
        console.log("Response text:", text);
    } catch (e) {
        console.log("Fetch Error:", e.message);
    }
}

checkBB();
