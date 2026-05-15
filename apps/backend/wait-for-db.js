const { Client } = require('pg');

async function waitForPostgres() {
    const maxAttempts = 10;
    const delayMs = 2000;

    const cred = {
        host: 'localhost',
        port: 5432,
        user: 'myuser',
        password: 'mypassword',
        database: 'freetouria',
    };

    console.log('⏳ Esperando a que PostgreSQL esté listo...\n');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const client = new Client(cred);

        try {
            await client.connect();
            console.log(`✅ PostgreSQL está listo! (intento ${attempt}/${maxAttempts})`);
            console.log(`\n📝 Credenciales correctas:`);
            console.log(`   User: ${cred.user}`);
            console.log(`   Password: ${cred.password}`);
            console.log(`   Database: ${cred.database}`);
            console.log(`\n🎉 Ahora puedes ejecutar las migraciones:`);
            console.log(`   npx prisma migrate dev --name init\n`);
            await client.end();
            return true;
        } catch (err) {
            console.log(`⏱️  Intento ${attempt}/${maxAttempts} - PostgreSQL aún no está listo...`);
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    console.log('\n❌ PostgreSQL no respondió después de varios intentos.');
    console.log('Verifica que el contenedor esté corriendo con: docker ps');
    return false;
}

waitForPostgres();
