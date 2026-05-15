const WebSocket = require('ws');
const AGENT_ID = 'agent_6801kp1hvhpnf2aawt8a01jmw4b5';
const ws = new WebSocket(`wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`);
let chunks = [], done = false;

ws.on('open', () => ws.send(JSON.stringify({ type: 'conversation_initiation_client_data' })));
ws.on('message', (raw) => {
    const d = JSON.parse(raw.toString());
    if (d.type === 'audio') chunks.push(d.audio_event?.audio_base_64||'');
    else if (d.type === 'agent_response') {
        const t = d.agent_response_event?.agent_response;
        const b = chunks.reduce((s,c)=>s+Buffer.from(c,'base64').length,0);
        console.log(`💬 "${t}" | audio:${b}b ${done?'(NARRACIÓN)':''}`);
        chunks=[];
        if (!done) {
            done = true;
            setTimeout(() => {
                // 1) inject context silently
                ws.send(JSON.stringify({ type:'contextual_update', text:'Estás en la Puerta del Sol, Madrid. Mirando al Este. Enfrente tienes el Edificio de Correos a 300m. Eres Carolina, guía entusiasta.' }));
                // 2) trigger narration via user_message (invisible trigger)
                setTimeout(() => {
                    console.log('Sending user_message trigger...');
                    ws.send(JSON.stringify({ type:'user_message', text:'¿Qué tengo delante?' }));
                }, 300);
            }, 800);
        }
    } else if (d.type === 'ping') {
        ws.send(JSON.stringify({ type:'pong', event_id:d.ping_event?.event_id }));
    } else if (d.type === 'internal_tentative_agent_response') {
        console.log('...thinking...');
    }
});
ws.on('close', c => console.log('Closed', c));
setTimeout(() => ws.close(), 25000);
