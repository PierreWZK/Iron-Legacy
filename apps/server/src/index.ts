import { createGameServer } from './app';

const port = Number(process.env['PORT'] ?? 2567);
const { gameServer } = createGameServer();
void gameServer.listen(port).then(() => {
  console.log(`[iron-legacy] serveur de duel sur ws://localhost:${port}`);
});
