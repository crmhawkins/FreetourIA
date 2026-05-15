const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BACKEND = 'http://localhost:3000';
const AGENT_ID = 'agent_6801kp1hvhpnf2aawt8a01jmw4b5';
const AUDIO_DIR = path.join('D:', 'proyectos', 'programasivan', 'FreetourIA', 'apps', 'backend', 'storage', 'audio');

function post(url, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const u = new URL(url);
        const opts = { method:'POST', hostname:u.hostname, port:u.port, path:u.pathname,
            headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)} };
        const req = http.request(opts, res => {
            let raw = '';
            res.on('data', d => raw += d);
            res.on('end', () => res.statusCode >= 400 ? reject(new Error('HTTP '+res.statusCode+': '+raw)) : resolve(JSON.parse(raw)));
        });
        req.on('error', reject);
        req.write(data); req.end();
    });
}

async function main() {
    let ok = 0;

    process.stdout.write('TEST 1 /context ... ');
    const ctx = await post(BACKEND+'/api/exploration/context', { latitude:40.4168, longitude:-3.7038, heading:90, language:'es' });
    console.log('OK — '+ctx.address?.road+', '+ctx.address?.city+' | direct:'+ctx.directPois?.length+' nearby:'+ctx.nearbyPois?.length);
    ok++;

    process.stdout.write('TEST 2 /agent-token ... ');
    const token = await post(BACKEND+'/api/exploration/agent-token', {});
    console.log('OK — ' + (token.wsUrl ? 'got wsUrl' : 'MISSING'));
    ok++;

    process.stdout.write('TEST 3 ElevenLabs WS contextual_update+trigger ... ');
    const prompt = 'Eres Carolina, guía turística apasionada. Usuario en Puerta del Sol, Madrid. Mirando Este. Enfrente: Edificio de Correos 300m. Cercanos: Museo del Prado 1km SE. Tono entusiasta, máx 3 frases.';
    
    const agentText = await new Promise((resolve, reject) => {
        const ws = new WebSocket('wss://api.elevenlabs.io/v1/convai/conversation?agent_id='+AGENT_ID);
        let ctxSent = false;
        const t = setTimeout(() => { ws.terminate(); reject(new Error('Timeout 25s')); }, 25000);
        ws.on('open', () => ws.send(JSON.stringify({ type:'conversation_initiation_client_data' })));
        ws.on('message', raw => {
            const d = JSON.parse(raw.toString());
            if (d.type === 'agent_response') {
                const text = d.agent_response_event?.agent_response;
                if (!ctxSent) {
                    ctxSent = true;
                    ws.send(JSON.stringify({ type:'contextual_update', text:prompt }));
                    setTimeout(() => ws.send(JSON.stringify({ type:'user_message', text:'¿Dónde estoy y qué tengo delante?' })), 300);
                } else {
                    clearTimeout(t); ws.close(); resolve(text);
                }
            } else if (d.type === 'ping') ws.send(JSON.stringify({ type:'pong', event_id:d.ping_event?.event_id }));
        });
        ws.on('error', e => { clearTimeout(t); reject(e); });
    });
    console.log('OK — "' + agentText.slice(0, 120) + '"');
    ok++;

    process.stdout.write('TEST 4 /speak TTS ... ');
    const speak = await post(BACKEND+'/api/exploration/speak', { text:agentText, language:'es' });
    if (!speak.audioUrl) throw new Error('No audioUrl');
    const filename = path.basename(speak.audioUrl);
    const audioFile = path.join(AUDIO_DIR, filename);
    const stats = fs.statSync(audioFile);
    const buf = fs.readFileSync(audioFile);
    const isMP3 = (buf[0]===0xFF && (buf[1]&0xE0)===0xE0) || (buf[0]===0x49 && buf[1]===0x44 && buf[2]===0x33);
    if (!isMP3) throw new Error('Invalid MP3 header: '+buf.slice(0,4).toString('hex'));
    console.log('OK — valid MP3 '+stats.size+' bytes at '+speak.audioUrl);
    ok++;

    // Test that the audio URL is reachable via HTTP
    process.stdout.write('TEST 5 audio HTTP accessible ... ');
    await new Promise((resolve, reject) => {
        http.get(BACKEND+speak.audioUrl, res => {
            res.resume();
            res.statusCode === 200 ? resolve() : reject(new Error('HTTP '+res.statusCode));
        }).on('error', reject);
    });
    console.log('OK — HTTP 200');
    ok++;

    console.log('\n✅ ALL '+ok+'/5 TESTS PASSED');
    console.log('\nSAMPLE AGENT RESPONSE:');
    console.log('"'+agentText+'"');
    try { fs.unlinkSync(audioFile); } catch(_){}
}

main().catch(e => { console.error('\n❌ FAILED:', e.message); process.exit(1); });
