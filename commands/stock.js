const fs = require("fs");
const path = require("path");

module.exports = {
  name: "stock",
  execute(client, message, args) {

    const accountsDir = path.join(__dirname, "..", "accounts");

    // 📌 Si NO pasa servicio → mostrar TODOS
    if (!args[0]) {
      if (!fs.existsSync(accountsDir)) {
        return message.reply("❌ No existe la carpeta de cuentas.");
      }

      const files = fs.readdirSync(accountsDir).filter(f => f.endsWith(".txt"));

      if (files.length === 0) {
        return message.reply("📦 No hay servicios creados todavía.");
      }

      let response = "📦 **Stock disponible:**\n\n";

      files.forEach(file => {
        const filePath = path.join(accountsDir, file);
        const data = fs.readFileSync(filePath, "utf8");
        const count = data.split("\n").filter(l => l.trim() !== "").length;
        const serviceName = file.replace(".txt", "");

        response += `• **${serviceName}** → ${count} cuenta(s)\n`;
      });

      return message.channel.send(response);
    }

    // 📌 Si pasa UN servicio
    const service = args[0];
    const filePath = path.join(accountsDir, `${service}.txt`);

    if (!fs.existsSync(filePath)) {
      return message.reply("❌ Ese servicio no existe.");
    }

    const data = fs.readFileSync(filePath, "utf8");
    const count = data.split("\n").filter(l => l.trim() !== "").length;

    message.channel.send(`📦 **Stock de ${service}:** ${count} cuenta(s)`);
  }
};
