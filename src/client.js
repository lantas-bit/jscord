import WebSocket from "ws";
import fetch from "node-fetch";
import { handleCommand } from "./commandHandler.js";

export class Client {
  constructor(token) {
    this.token = token;
    this.ws = null;
    this.heartbeatInterval = null;
    this.sequence = null;
    this.sessionId = null;
    this.commands = new Map();
  }

  command(name, fn) {
    this.commands.set(name, fn);
  }

  async login() {
    try {
      const gateway = await fetch("https://discord.com/api/v10/gateway/bot", {
        headers: { Authorization: `Bot ${this.token}` },
      }).then((res) => res.json());

      if (!gateway.url) throw new Error("Failed to fetch gateway URL");

      this.ws = new WebSocket(`${gateway.url}?v=10&encoding=json`);
      this.ws.on("open", () => console.log("[JSCORD] ✅ Connected to Gateway"));
      this.ws.on("message", (msg) => this._onMessage(msg));
      this.ws.on("close", (code) => this._onClose(code));
      this.ws.on("error", (err) =>
        console.error("[JSCORD] ❌ WebSocket Error:", err)
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
        console.log("[JSCORD] 🔁 Received HELLO from gateway");
        this._startHeartbeat(d.heartbeat_interval);
        this._identify();
        break;

      case 11: // Heartbeat ACK
        // Pong response
        break;

      case 1: // Heartbeat request from Discord
        this._sendHeartbeat();
        break;
    }

    if (t === "READY") {
      this.sessionId = d.session_id;
      console.log(
        `[JSCORD] 🟢 Logged in as ${d.user.username}#${d.user.discriminator}`
      );
    }

    if (t === "MESSAGE_CREATE") {
      handleCommand(this, d);
    }
  }

  _identify() {
    const payload = {
      op: 2,
      d: {
        token: this.token,
        intents: 513, // GUILDS + GUILD_MESSAGES
        properties: {
          os: "linux",
          browser: "jscord",
          device: "jscord",
        },
      },
    };

    this.ws.send(JSON.stringify(payload));
    console.log("[JSCORD] 🪪 Sent IDENTIFY payload");
  }

  _startHeartbeat(interval) {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(
      () => this._sendHeartbeat(),
      interval
    );
    console.log(`[JSCORD] ❤️ Heartbeat started every ${interval}ms`);
  }

  _sendHeartbeat() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ op: 1, d: this.sequence }));
    }
  }

  _onClose(code) {
    console.warn(`[JSCORD] ⚠️ Gateway closed (${code}). Reconnecting...`);
    clearInterval(this.heartbeatInterval);
    setTimeout(() => this.login(), 5000);
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

      const data = await res.json();
      if (res.status !== 200 && res.status !== 201)
        console.error(`[JSCORD] ⚠️ Send failed:`, data);
      return data;
    } catch (err) {
      console.error("[JSCORD] Send Message Error:", err.message);
    }
  }
}
