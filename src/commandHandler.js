export function handleCommand(client, msg) {
  if (!msg.content || !msg.content.startsWith("!")) return;

  const args = msg.content.slice(1).split(/ +/);
  const cmd = args.shift().toLowerCase();

  const run = client.commands.get(cmd);
  if (run) {
    run({
      reply: (content) => {
        fetch(`https://discord.com/api/v10/channels/${msg.channel_id}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${client.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content }),
        });
      },
      message: msg,
      args,
    });
  }
}
