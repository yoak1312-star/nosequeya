const fs = require("fs");
const path = require("path");

module.exports = {
  name: "add",
  execute(client, message, args, lang) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply(lang.no_permission);
    }

    const account = args[0];
    const service = args[1];
    if (!account || !service) return message.reply("Uso: +add mail:pass servicio");

    const filePath = path.join(__dirname, "..", "accounts", `${service}.txt`);
    fs.appendFileSync(filePath, account + "\n");
    message.reply("✅ Cuenta agregada correctamente.");
  }
};
