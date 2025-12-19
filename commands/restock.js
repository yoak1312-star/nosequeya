module.exports = {
  name: "restock",
  execute(client, message, args, lang) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply(lang.no_permission);
    }

    const service = args[0];
    const amount = args[1];
    if (!service || !amount) return;

    message.channel.send(`
@everyone
📢 **RESTOCK DISPONIBLE**
🎁 Servicio: **${service}**
📦 Cantidad: **${amount}**
`);
  }
};
