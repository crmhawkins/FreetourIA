const WebSocket = require('ws');

const AGENT_ID = 'agent_6801kp1hvhpnf2aawt8a01jmw4b5';
const url = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`;

console.log('Connecting...');
const ws = new WebSocket(url);
let audioChunks = [];
let types = {};

ws.on('open', () => {
    console.log('✅ Connected');
    ws.send(JSON.stringify({ type: 'conversation_initiation_client_data' }));
});

ws.on('message', (raw) => {
    const data = JSON.parse(raw.toString());
    types[data.type] = (types[data.type] || 0) + 1;

    if (data.type === 'audio') {
        const chunk = data.audio_event?.audio_base_64;
        if (chunk) {
            audioChunks.push(chunk);
            if (audioChunks.length === 1) {
                const bytes = Buffer.from(chunk, 'base64');
                console.log(`🎵 First chunk: ${bytes.length} bytes | hex[0-8]: ${bytes.slice(0,8).toString('hex')}`);
            }
        }
    } else if (data.type === 'agent_response') {
        const text = data.agent_response_event?.agent_response;
        const totalBytes = audioChunks.reduce((s,c)=>s+Buffer.from(c,'base64').length,0);
        console.log(`💬 Text: "${text}"\n   chunks:${audioChunks.length} totalBytes:${totalBytes}`);
    } else if (data.type === 'conversation_initiation_metadata') {
        const meta = data.conversation_initiation_metadata_event;
        console.log('📋 Metadata:', JSON.stringify(meta).slice(0,400));
    } else if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', event_id: data.ping_event?.event_id }));
    } else {
        console.log(`MSG ${data.type}:`, JSON.stringify(data).slice(0,150));
    }
});

ws.on('close', (code, r) => { console.log(`Closed ${code}`); console.log('Types:', types); });
ws.on('error', e => console.error('ERR:', e.message));

setTimeout(() => { console.log('Types so far:', types, 'chunks:', audioChunks.length); ws.close(); }, 18000);
