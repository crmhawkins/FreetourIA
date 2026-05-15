const { Client } = require('pg');

async function testWithoutPassword() {
    console.log('Probando conexion SIN enviar contraseña (trust mode)...\n');

    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'myuser',
        database: 'freetouria',
        // NO password field
    });

    try {
        console.log('Conectando...');
        await client.connect();
        console.log('✅ Conectado exitosamente SIN contraseña!');

        const res = await client.query('SELECT current_database(), current_user');
        console.log('\nInformacion:');
        console.log('Database:', res.rows[0].current_database);
        console.log('User:', res.rows[0].current_user);

        await client.end();
        console.log('\n🎉 Trust mode funciona!');
        console.log('\nActualiza tu .env para NO incluir contraseña:');
        console.log('DATABASE_URL="postgresql://myuser@localhost:5432/freetouria?schema=public"');
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error('\nProbando forzar recarga de configuracion...');
    }
}

testWithoutPassword();
