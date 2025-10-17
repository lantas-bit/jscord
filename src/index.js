import WebSocket from "ws";
import fetch from "node-fetch";

export class Jscord {
  constructor(token) {
    this.token = token;
    this.user = null;
    this.ws = null;
    this.events = {};
  }

  on(event, fn) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(fn);
  }

  async login() {
    const userRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${this.token}` },
    });

    if (!userRes.ok) throw new Error("Invalid bot token");

    this.user = await userRes.json();
    console.log(`[JSCORD] Logged in as ${this.user.username}#${this.user.discriminator}`);

    const gwRes = await fetch("https://discord.com/api/v10/gateway/bot", {
      headers: { Authorization: `Bot ${this.token}` },
    });

    const { url } = await gwRes.json();
    this._connect(url);
  }

  _connect(url) {
    this.ws = new WebSocket(`${url}/?v=10&encoding=json`);

    this.ws.on("open", () => {
      console.log("[JSCORD] Connected to gateway");
    });

    this.ws.on("message", (msg) => {
      const payload = JSON.parse(msg);
      const { t, op, d } = payload;

      switch (op) {
        case 10:
          this._heartbeat(d.heartbeat_interval);
          this._identify();
          break;
        case 11:
          console.log("[JSCORD] ❤️ Heartbeat ACK");
          break;
      }

      if (t === "READY") {
        if (this.events["ready"]) this.events["ready"].forEach(fn => fn());
      }

      if (t === "MESSAGE_CREATE") {
        if (this.events["messageCreate"]) this.events["messageCreate"].forEach(fn => fn(d));
      }
    });
  }

  _identify() {
    this.ws.send(JSON.stringify({
      op: 2,
      d: {
        token: this.token,
        intents: 513, // GUILD_MESSAGES + DIRECT_MESSAGES
        properties: {
          os: "linux",
          browser: "jscord",
          device: "jscord",
        },
      },
    }));
  }

  _heartbeat(interval) {
    setInterval(() => {
      this.ws.send(JSON.stringify({ op: 1, d: null }));
    }, interval);
  }
}
