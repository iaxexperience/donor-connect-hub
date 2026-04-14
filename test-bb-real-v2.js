const clientId = 'eyJpZCI6IjkxOTIiLCJjb2RpZ29QdWJsaWNhZG9yIjowLCJjb2RpZ29Tb2Z0d2FyZSI6MTc4NTE5LCJzZXF1ZW5jaWFsSW5zdGFsYWNhbyI6MX0';
const clientSecret = 'eyJpZCI6IjcxZjA0YzEtM2MzYy00NDkyLWJmMWItMDYyOTQ5MDRhNGMwIiwiY29kaWdvUHVibGljYWRvciI6MCwiY29kaWdvU29mdHdhcmUiOjE3ODUxOSwic2VxdWVuY2lhbEluc3RhbGFjYW8iOjEsInNlcXVlbmNpYWxDcmVkZW5jaWFsIjoxLCJhbWJpZW50ZSI6ImhvbW9sb2dhY2FvIiwiaWF0IjoxNzc2MTgyMTYwOTE0fQ';
const appKey = '45f2da38f7044302819df079a6d313a3';
const userBasic = 'ZXlKcFpDSTZJamt4T1RJaUxDSmpiMlJwWjI5UWRXSnNhV05oWkc5eUlqb3dMQ0pqYjJScFoyOVRiMlowZDJGeVpTSTZNVGM0TlRFNUxDSnpaWEYxWlc1amFXRnNTVzV6ZEdGc1lXTmhieUk2TVgwOmV5SnBaQ0k2SWpjeFpqQTBZekV0TTJNell5MDBORGt5TFdKbU1XSXRNRFl5T1RRNU1EUmhOR013SWl3aVkyOWthV2R2VUhWaWJHbGpZV1J2Y2lJNk1Dd2lZMjlrYVdkdlUyOW1kSGRoY21VaU9qRTNPRFV4T1N3aWMyVnhkV1Z1WTJsaGJFbHVjM1JoYkdGallXOGlPakVzSW5ObGNYVmxibU5wWVd4RGNtVmtaVzVqYVdGc0lqb3hMQ0poYldKcFpXNTBaU0k2SWmhdWJXOXNiMmRoWTJGdklpd2lhV0YwSWpveE56Ym1lYmdsa2xs';

async function test(name, auth, headers, body) {
    try {
        console.log(`[${name}]...`);
        const res = await fetch('https://oauth.sandbox.bb.com.br/oauth/token', {
            method: 'POST',
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/x-www-form-urlencoded',
                ...headers
            },
            body: new URLSearchParams(body).toString()
        });
        const txt = await res.text();
        console.log(`  RESULT: ${res.status} - ${txt.substring(0, 50)}`);
    } catch (e) { console.log(`  ERROR: ${e.message}`); }
}

async function run() {
    const basic = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
    const basicProv = `Basic ${userBasic}`;
    
    await test("Variation 1: Basic(Code), All Headers, All Body", basic, { 'gw-dev-app-key': appKey }, { grant_type: 'client_credentials', scope: 'extrato.read' });
    await test("Variation 2: Basic(User), All Headers, All Body", basicProv, { 'gw-dev-app-key': appKey }, { grant_type: 'client_credentials', scope: 'extrato.read' });
    await test("Variation 3: Basic(Code), No Scope", basic, { 'gw-dev-app-key': appKey }, { grant_type: 'client_credentials' });
    await test("Variation 4: Basic(Code), No AppKey", basic, {}, { grant_type: 'client_credentials', scope: 'extrato.read' });
    await test("Variation 5: Basic(Code), No AppKey, No Scope", basic, {}, { grant_type: 'client_credentials' });
    await test("Variation 6: Basic(Code), Extra Scope", basic, { 'gw-dev-app-key': appKey }, { grant_type: 'client_credentials', scope: 'extrato.read-extrato' });
}

run();
