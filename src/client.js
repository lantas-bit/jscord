import WebSocket from "ws";
import fetch from "node-fetch";
import { handleCommand } from "./commandHandler.js";

export class Client {
  constructor(token) {
    this.token = token;
    this.commands = new Map();
    this.ws = null;
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
      const { t, s, op, d } = payload;

      if (op === 10) {
        const { heartbeat_interval } = d;
        this._heartbeat(heartbeat_interval);
        this._identify();
      } else if (t === "MESSAGE_CREATE") {
        handleCommand(this, d);
      }
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
