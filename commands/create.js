const fs = require("fs");
const path = require("path");

module.exports = {
  name: "create",
  execute(client, message, args, lang) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply(lang.no_permission);
    }

    const service = args[0];
    if (!service) return message.reply(lang.no_service);

    const filePath = path.join(__dirname, "..", "accounts", `${service}.txt`);
    fs.writeFileSync(filePath, "");
    message.reply(`✅ Servicio **${service}** creado correctamente.`);
  }
};
