const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });
const PORT = process.env.PORT || 3000;

// Najpierw definiujemy mapę pokojów, żeby /health i logika działały poprawnie
const rooms = new Map();

app.use(express.static('public'));
app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));

const WORDS = [
  'PINGWIN','WULKAN','HARRY POTTER','PIZZA','ŻYRAFA','SPIDERMAN','KOSMONAUTA','KAPIBARA','WAKACJE','MIKROFON','GITARA','ZOMBIE','KROKODYL','DISCO POLO','KSIĘŻYC','PIŁKARZ','LODÓWKA','BATMAN','REKIN','NALEŚNIKI','DINOZAUR','KSIĄŻĘ','POLICJANT','TIKTOK','KAKTUS','PARASOL','BIEDRONKA','CZARODZIEJ','KOMPUTER','GOFRY','SŁOŃ','KLAUN','ROWER','WIEDŹMIN','PANDA','SUPERMAN','STRAŻAK','WAMPIR','TELEWIZOR','PIRAT','TRĄBKA','ŚLIMAK','SZAMPON','KOSZYKÓWKA','SMOK','ŻELKI','ODKURZACZ','JEDNOROŻEC','KARUZELA','KELNER'
];

const code = () => Math.random().toString(36).slice(2,7).toUpperCase();
const pick = (used=[]) => { const a=WORDS.filter(w=>!used.includes(w)); return a.length?a[Math.floor(Math.random()*a.length)]:WORDS[Math.floor(Math.random()*WORDS.length)]; };

function publicRoom(room, viewerId) {
  return { 
    code: room.code, 
    hostId: room.hostId, 
    round: room.round, 
    phase: room.phase, 
    activeId: room.activeId,
    players: room.players.map(p => ({
      id: p.id, 
      name: p.name, 
      score: p.score, 
      word: p.id === viewerId ? null : p.word, 
      connected: true
    })),
    you: viewerId 
  };
}

function emitRoom(room) { 
  for(const p of room.players) {
    io.to(p.id).emit('room:state', publicRoom(room, p.id)); 
  }
}

function getRoom(socket) { 
  const c = socket.data.room; 
  return c ? rooms.get(c) : null; 
}

function advance(room, socketId, scored) {
  const p = room.players.find(x => x.id === socketId);
  if(!p || room.activeId !== socketId) return false;
  if(scored) p.score++;
  p.word = pick(room.used); 
  room.used.push(p.word);
  const idx = room.players.findIndex(x => x.id === socketId);
  room.activeId = room.players[(idx+1)%room.players.length]?.id || socketId;
  if(room.activeId === room.players[0]?.id) room.round++;
  return true;
}

io.on('connection', socket => {
  socket.on('room:create', ({name}, cb = () => {}) => {
    let c = code(); 
    while(rooms.has(c)) c = code();
    const player = { id: socket.id, name: String(name||'Gracz').slice(0,20), score: 0, word: pick() };
    const room = { code: c, hostId: socket.id, players: [player], round: 1, phase: 'playing', activeId: socket.id, used: [player.word] };
    rooms.set(c, room); 
    socket.data.room = c; 
    cb({ ok: true, code: c }); 
    emitRoom(room);
  });

  socket.on('room:join', ({code:c, name}, cb = () => {}) => {
    c = String(c||'').toUpperCase().trim(); 
    const room = rooms.get(c);
    if(!room) return cb({ ok: false, error: 'Nie znaleziono pokoju o takim kodzie.' });
    if(room.players.length >= 8) return cb({ ok: false, error: 'Pokój jest pełny (maks. 8 osób).' });
    if(room.players.some(p => p.id === socket.id)) return cb({ ok: true, code: c });
    
    room.players.push({ id: socket.id, name: String(name||'Gracz').slice(0,20), score: 0, word: pick(room.used) });
    room.used.push(room.players.at(-1).word); 
    socket.data.room = c; 
    cb({ ok: true, code: c }); 
    emitRoom(room);
  });

  socket.on('game:score', () => {
    const r = getRoom(socket);
    if(r && advance(r, socket.id, true)) {
      emitRoom(r);
      io.to(r.code).emit('game:toast', { text: 'Punkt! Następna osoba zgaduje.' });
    }
  });

  socket.on('game:pass', () => {
    const r = getRoom(socket);
    if(r && advance(r, socket.id, false)) {
      emitRoom(r);
      io.to(r.code).emit('game:toast', { text: 'Hasło pominięte. Kolejka przechodzi dalej.' });
    }
  });

  socket.on('game:restart', () => {
    const r = getRoom(socket);
    if(!r || r.hostId !== socket.id) return;
    r.round = 1;
    r.used = [];
    r.players.forEach(p => {
      p.score = 0;
      p.word = pick(r.used);
      r.used.push(p.word);
    });
    r.activeId = r.players[0]?.id;
    emitRoom(r);
  });

  socket.on('rtc:signal', ({to, data}) => {
    if(typeof to === 'string') io.to(to).emit('rtc:signal', { from: socket.id, data });
  });    

  socket.on('disconnect', () => {
    const r = getRoom(socket); 
    if(!r) return;
    r.players = r.players.filter(p => p.id !== socket.id);
    if(!r.players.length) { 
      rooms.delete(r.code); 
      return; 
    }
    if(r.hostId === socket.id) r.hostId = r.players[0].id;
    if(r.activeId === socket.id) r.activeId = r.players[0].id;
    emitRoom(r);
  });
});

server.listen(PORT, () => console.log(`Czółko online listening on ${PORT}`));
