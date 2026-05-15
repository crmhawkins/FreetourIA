const { Client } = require('pg');

async function testDifferentHosts() {
    const hosts = ['localhost', '127.0.0.1', 'host.docker.internal'];

    console.log('🔍 Probando diferentes hosts...\n');

    for (const host of hosts) {
        const client = new Client({
            host: host,
            port: 5432,
            user: 'myuser',
            password: 'mypassword',
            database: 'freetouria',
        });

        try {
            console.log(`Probando ${host}...`);
            await client.connect();
            console.log(`✅ EXITO con host: ${host}\n`);
            console.log(`Actualiza tu .env con:`);
            console.log(`DATABASE_URL="postgresql://myuser:mypassword@${host}:5432/freetouria?schema=public"\n`);
            await client.end();
            return;
        } catch (err) {
            console.log(`❌ Fallo con ${host}: ${err.message}`);
        }
    }

    console.log('\n⚠️  Ninguno de los hosts funciono.');
    console.log('Esto puede ser un problema de firewall de Windows.');
    console.log('\nIntenta:');
    console.log('1. Desactivar temporalmente el firewall de Windows');
    console.log('2. Reiniciar Docker Desktop');
    console.log('3. Verificar en Docker Desktop -> Settings -> Resources -> Network');
}

testDifferentHosts();
