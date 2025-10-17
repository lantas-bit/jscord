export class Jscord {
  constructor(token) {
    this.token = token;
  }

  login() {
    console.log(`[JSCORD] Logged in with token: ${this.token}`);
  }

  on(event, handler) {
    console.log(`[JSCORD] Listening to ${event}`);
    if (event === "ready") handler();
  }
}
