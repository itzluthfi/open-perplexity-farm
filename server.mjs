import { createServer } from "./src/server.mjs";

const app = await createServer();
await app.start();
