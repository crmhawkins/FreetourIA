const { Client } = require('pg');
require('dotenv/config');

async function testConnection() {
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    console.log('\nProbando conexion con opciones detalladas...\n');

    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'myuser',
        password: 'mypassword',
        database: 'freetouria',
        connectionTimeoutMillis: 10000,
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
        console.log('\n🎉 La conexion funciona correctamente!');
        console.log('Ahora puedes ejecutar: npx prisma migrate dev --name init');
    } catch (err) {
        console.error('❌ Error de conexion:');
        console.error('Codigo:', err.code);
        console.error('Mensaje:', err.message);
        console.error('\nDetalles completos del error:');
        console.error(err);
    }
}

testConnection();
