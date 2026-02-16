require('dotenv').config({ path: __dirname + '/.env' });
const { google } = require('googleapis');

async function fetchSheetSample() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    console.log('\n=== theory_basic 샘플 데이터 ===\n');
    const theoryBasic = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'theory_basic!A1:Z10',
    });
    console.log(JSON.stringify(theoryBasic.data.values, null, 2));

    console.log('\n\n=== interpretation_rules 샘플 데이터 ===\n');
    const interpretationRules = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'interpretation_rules!A1:Z10',
    });
    console.log(JSON.stringify(interpretationRules.data.values, null, 2));
}

fetchSheetSample().catch(console.error);
