const WebSocket = require('ws');
const AGENT_ID = 'agent_6801kp1hvhpnf2aawt8a01jmw4b5';
const ws = new WebSocket(`wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`);
let audioChunks = [], ctxSent = false, responses = 0;

ws.on('open', () => { ws.send(JSON.stringify({ type: 'conversation_initiation_client_data' })); });
ws.on('message', (raw) => {
    const data = JSON.parse(raw.toString());
    if (data.type === 'audio') { audioChunks.push(data.audio_event?.audio_base_64||''); }
    else if (data.type === 'agent_response') {
        responses++;
        const text = data.agent_response_event?.agent_response;
        const bytes = audioChunks.reduce((s,c)=>s+Buffer.from(c,'base64').length,0);
        console.log(`[${responses}] 💬 "${text}" | audio:${bytes}b`);
        audioChunks = [];
        if (!ctxSent) {
            ctxSent = true;
            setTimeout(() => {
                console.log('Sending contextual_update...');
                ws.send(JSON.stringify({
                    type: 'contextual_update',
                    text: `Eres Carolina, guía turística apasionada. El usuario está en Puerta del Sol, Madrid, mirando al Este. Enfrente: Palacio de Comunicaciones 300m. INSTRUCCIÓN URGENTE: El usuario acaba de llegar. Nárrale ahora mismo lo que tiene delante.`
                }));
            }, 1000);
        }
    } else if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', event_id: data.ping_event?.event_id }));
    } else if (data.type === 'internal_tentative_agent_response') {
        console.log('Agent thinking...');
    }
});
ws.on('close', (c) => console.log('Closed', c, '| responses:', responses));
ws.on('error', e => console.error('ERR:', e.message));

// Wait 35s
setTimeout(() => {
    console.log('--- 35s reached, responses so far:', responses);
    if (responses < 2) console.log('⚠️  contextual_update did NOT trigger a response');
    ws.close();
}, 35000);
