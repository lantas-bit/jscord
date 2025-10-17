import WebSocket from "ws";
import fetch from "node-fetch";
import { handleCommand } from "./commandHandler.js";

export class Client {
  constructor(token) {
    this.token = token;
    this.ws = null;
    this.commands = new Map();
    this.sessionId = null;
    this.sequence = null;
  }

  command(name, fn) {
    this.commands.set(name, fn);
  }

  async login() {
    try {
      const gateway = await fetch("https://discord.com/api/v10/gateway/bot", {
        headers: { Authorization: `Bot ${this.token}` },
      }).then((res) => res.json());

      if (!gateway.url) throw new Error("Failed to fetch gateway URL.");

      this.ws = new WebSocket(`${gateway.url}?v=10&encoding=json`);

      this.ws.on("open", () => console.log("[JSCORD] Connected to Gateway."));
      this.ws.on("message", (msg) => this._onMessage(msg));
      this.ws.on("close", (code) =>
        console.warn(`[JSCORD] Gateway closed: ${code}`)
      );
      this.ws.on("error", (err) =>
        console.error("[JSCORD] WebSocket Error:", err)
      );
    } catch (err) {
      console.error("[JSCORD] Login failed:", err.message);
    }
  }

  _onMessage(message) {
    let payload;
    try {
      payload = JSON.parse(message);
    } catch {
      return;
    }

    const { t, s, op, d } = payload;
    if (s) this.sequence = s;

    switch (op) {
      case 10: // Hello
        this._heartbeat(d.heartbeat_interval);
        this._identify();
        break;
      case 11: // Heartbeat ACK
        // pong received
        break;
    }

    if (t === "READY") {
      this.sessionId = d.session_id;
      console.log(`[JSCORD] Logged in as ${d.user.username}`);
    }

    if (t === "MESSAGE_CREATE") {
      handleCommand(this, d);
    }
  }

  _identify() {
    const identifyPayload = {
      op: 2,
      d: {
        token: this.token,
        intents: 513, // Guilds + Guild Messages
        properties: {
          os: "linux",
          browser: "jscord",
          device: "jscord",
        },
      },
    };

    this.ws.send(JSON.stringify(identifyPayload));
  }

  _heartbeat(interval) {
    setInterval(() => {
      this.ws.send(JSON.stringify({ op: 1, d: this.sequence }));
    }, interval);
  }

  async sendMessage(channelId, content) {
    try {
      const res = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bot ${this.token}`,
          },
          body: JSON.stringify({ content }),
        }
      );

      return await res.json();
    } catch (err) {
      console.error("[JSCORD] Send Message Error:", err.message);
    }
  }
}
