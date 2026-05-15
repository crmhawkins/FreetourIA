const WebSocket = require('ws');
const AGENT_ID = 'agent_6801kp1hvhpnf2aawt8a01jmw4b5';
const ws = new WebSocket(`wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`);
let audioChunks = [], types = {}, ctxSent = false;

ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'conversation_initiation_client_data' }));
    console.log('Connected, sent initiation');
});
ws.on('message', (raw) => {
    const data = JSON.parse(raw.toString());
    types[data.type] = (types[data.type]||0)+1;
    if (data.type === 'audio') { audioChunks.push(data.audio_event?.audio_base_64||''); }
    else if (data.type === 'agent_response') {
        const text = data.agent_response_event?.agent_response;
        const bytes = audioChunks.reduce((s,c)=>s+Buffer.from(c,'base64').length,0);
        console.log(`💬 "${text}" | ${audioChunks.length} chunks, ${bytes} bytes`);
        audioChunks = [];
        if (!ctxSent) {
            ctxSent = true;
            console.log('→ Sending contextual_update with Madrid/Sol context...');
            setTimeout(() => ws.send(JSON.stringify({
                type: 'contextual_update',
                text: `Eres Carolina, guía turística. El usuario está en la Puerta del Sol, Madrid. Mira hacia el Este. Enfrente tiene el Palacio de Correos (300m). Cerca: Museo del Prado a 1km al sureste. INSTRUCCIÓN: Saluda al usuario y describe lo que tiene enfrente de forma entusiasta en 2-3 frases.`
            })), 800);
        }
    } else if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', event_id: data.ping_event?.event_id }));
    } else if (data.type !== 'conversation_initiation_metadata') {
        console.log(`MSG ${data.type}`);
    }
});
ws.on('close', (c) => { console.log('Closed', c); console.log('Types:', types); });
ws.on('error', e => console.error('ERR:', e.message));
setTimeout(() => ws.close(), 20000);
