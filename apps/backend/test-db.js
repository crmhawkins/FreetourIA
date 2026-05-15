const { Client } = require('pg');
require('dotenv/config');

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function testConnection() {
    try {
        await client.connect();
        console.log('✅ Connected to database successfully!');
        const res = await client.query('SELECT NOW()');
        console.log('Current time from DB:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        console.error('DATABASE_URL:', process.env.DATABASE_URL);
    }
}

testConnection();
