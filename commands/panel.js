const fs = require("fs");
const path = require("path");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

// 🔎 Obtener lista de servicios
function getServices() {
  const dir = path.join(__dirname, "..", "accounts");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith(".txt"));
}

// 📦 Obtener stock de un servicio
function getStock(fileName) {
  const filePath = path.join(__dirname, "..", "accounts", fileName);
  if (!fs.existsSync(filePath)) return 0;
  const data = fs.readFileSync(filePath, "utf8");
  return data.split("\n").filter(l => l.trim() !== "").length;
}

module.exports = {
  name: "panel",
  execute(client, message) {

    const services = getServices();

    if (services.length === 0) {
      return message.reply("📦 No hay servicios disponibles.");
    }

    let description = "";
    const rows = [];

    let currentRow = new ActionRowBuilder();
    let buttonsInRow = 0;
    let totalButtons = 0;

    services.forEach(file => {
      if (totalButtons >= 25) return; // 🔒 Límite Discord

      const service = file.replace(".txt", "");
      const stock = getStock(file);

      description += `• **${service}** → ${stock} cuenta(s)\n`;

      const button = new ButtonBuilder()
        .setCustomId(`gen_${service}`)
        .setLabel(stock > 0 ? `🎁 ${service}` : `🚫 ${service}`)
        .setStyle(stock > 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(stock === 0);

      currentRow.addComponents(button);
      buttonsInRow++;
      totalButtons++;

      // Máximo 5 botones por fila
      if (buttonsInRow === 5) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder();
        buttonsInRow = 0;
      }
    });

    // Agregar última fila si quedó algo
    if (buttonsInRow > 0) {
      rows.push(currentRow);
    }

    // 🔘 Fila de controles
    const controlRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("refresh_panel")
        .setLabel("🔄 Actualizar")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("total_panel")
        .setLabel("📊 Total")
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setTitle("📦 OPS GEN – Panel de Generación")
      .setDescription(description)
      .setColor(0x00ff99)
      .setFooter({ text: "Generá cuentas usando los botones" })
      .setTimestamp();

    message.channel.send({
      embeds: [embed],
      components: [...rows, controlRow]
    });
  }
};
