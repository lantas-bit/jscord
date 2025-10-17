import WebSocket from "ws";
import fetch from "node-fetch";
import { handleCommand } from "./commandHandler.js";
export { Client } from "./client.js";

export class Jscord {
  constructor(token, options = {}) {
    this.token = token;
    this.prefix = options.prefix || "!";
    this.commands = new Map();
  }

  command(name, fn) {
    this.commands.set(name, fn);
  }

  async login() {
    const gateway = await fetch("https://discord.com/api/v10/gateway/bot", {
      headers: { Authorization: `Bot ${this.token}` },
    }).then((res) => res.json());

    this.ws = new WebSocket(`${gateway.url}/?v=10&encoding=json`);

    this.ws.on("message", (msg) => {
      const payload = JSON.parse(msg);
      const { t, op, d } = payload;

      if (op === 10) {
        this._heartbeat(d.heartbeat_interval);
        this._identify();
      } else if (t === "MESSAGE_CREATE" && d.content) {
        handleCommand(this, d);
      }
    });
  }

  async sendMessage(channelId, content) {
    return fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${this.token}`,
      },
      body: JSON.stringify({ content }),
    });
  }

  _identify() {
    this.ws.send(
      JSON.stringify({
        op: 2,
        d: {
          token: this.token,
          intents: 513,
          properties: {
            os: "linux",
            browser: "jscord",
            device: "jscord",
          },
        },
      })
    );
  }

  _heartbeat(ms) {
    setInterval(() => {
      this.ws.send(JSON.stringify({ op: 1, d: null }));
    }, ms);
  }
}
