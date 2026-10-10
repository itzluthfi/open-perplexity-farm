/**
 * run.js — Interactive Terminal Dashboard Runner
 * Cara pakai: node run.js
 */
import { InteractiveTui } from "./bin/tui.mjs";

const app = new InteractiveTui();
app.start();
