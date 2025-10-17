export function handleCommand(client, message) {
  const content = message.content.trim();
  const prefix = client.prefix;

  if (!content.startsWith(prefix)) return;

  const args = content.slice(prefix.length).split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(`${prefix}${commandName}`);
  if (!command) return;

  const reply = async (text) => {
    await client.sendMessage(message.channel_id, text);
  };

  command({ message, args, reply, client });
}
