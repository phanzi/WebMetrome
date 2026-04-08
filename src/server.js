import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("새로운 기기 연결됨:", socket.id);

  // 방 입장 (SHARE 누른 호스트나 JOIN 누른 멤버 공통)
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`방 입장 완료 - ID: ${socket.id}, Room: ${roomId}`);
  });

  // 메트로놈 제어 신호 중계 (이름을 클라이언트와 맞춤)
  socket.on("metronome_control", (data) => {
    // 호스트를 제외한 나머지 멤버들에게만 신호를 보냄
    socket.to(data.roomId).emit("receive_control", data);
    console.log(
      `신호 중계 중: Room ${data.roomId} -> BPM ${data.bpm}, Playing: ${data.isPlaying}`,
    );
  });

  socket.on("disconnect", () => {
    console.log("연결 종료:", socket.id);
  });
});

const PORT = 4000;

server.listen(PORT, "localhost", () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
  console.log(`📢 외부 접속 IP를 확인하세요 (현재: localhost)`);
});
