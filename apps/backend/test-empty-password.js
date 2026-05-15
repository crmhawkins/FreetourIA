const { Client } = require('pg');

async function testWithEmptyPassword() {
    console.log('Probando con contraseña vacia...\n');

    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'myuser',
        password: '', // Empty string
        database: 'freetouria',
    });

    try {
        console.log('Conectando...');
        await client.connect();
        console.log('✅ Conectado exitosamente!');

        const res = await client.query('SELECT current_database(), current_user, version()');
        console.log('\nInformacion de la base de datos:');
        console.log('Database:', res.rows[0].current_database);
        console.log('User:', res.rows[0].current_user);
        console.log('Version:', res.rows[0].version.split(',')[0]);

        await client.end();
        console.log('\n🎉 La conexion funciona!');
        console.log('\nActualiza tu .env con:');
        console.log('DATABASE_URL="postgresql://myuser:@localhost:5432/freetouria?schema=public"');
        console.log('\nO simplemente:');
        console.log('DATABASE_URL="postgresql://myuser@localhost:5432/freetouria?schema=public"');
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error('Codigo:', err.code);
    }
}

testWithEmptyPassword();
