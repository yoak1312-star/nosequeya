module.exports = {
  name: "stats",
  execute(client, message) {
    message.channel.send(`
📊 **OPS GEN Stats**
👥 Usuarios: ${client.users.cache.size}
🏠 Servidores: ${client.guilds.cache.size}
📺 Canales: ${client.channels.cache.size}
`);
  }
};
