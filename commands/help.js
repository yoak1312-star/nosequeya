module.exports = {
  name: "help",
  execute(client, message) {
    message.channel.send(`
📌 **OPS GEN - Comandos**

🎁 +gen <servicio>
📦 +stock [servicio]
📊 +stats

🔐 ADMIN:
➕ +create <servicio>
➕ +add <mail:pass> <servicio>
📢 +restock <servicio> <cantidad>
`);
  }
};

