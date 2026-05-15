const { Client } = require('pg');

// Intentar con diferentes combinaciones de credenciales
const credentials = [
    { user: 'myuser', password: 'mypassword', database: 'freetouria' },
    { user: 'postgres', password: 'postgres', database: 'freetouria' },
    { user: 'postgres', password: 'mypassword', database: 'freetouria' },
    { user: 'myuser', password: 'postgres', database: 'freetouria' },
];

async function testCredentials() {
    console.log('🔍 Testing different credential combinations...\n');

    for (const cred of credentials) {
        const client = new Client({
            host: 'localhost',
            port: 5432,
            user: cred.user,
            password: cred.password,
            database: cred.database,
        });

        try {
            await client.connect();
            console.log(`✅ SUCCESS with:`);
            console.log(`   User: ${cred.user}`);
            console.log(`   Password: ${cred.password}`);
            console.log(`   Database: ${cred.database}`);
            console.log(`\n📝 Update your .env file with:`);
            console.log(`DATABASE_URL="postgresql://${cred.user}:${cred.password}@localhost:5432/${cred.database}?schema=public"\n`);
            await client.end();
            return;
        } catch (err) {
            console.log(`❌ Failed with user: ${cred.user}, password: ${cred.password}`);
        }
    }

    console.log('\n⚠️  None of the credential combinations worked.');
    console.log('Please recreate the Docker container with:');
    console.log('  docker compose down -v');
    console.log('  docker compose up -d');
}

testCredentials();
