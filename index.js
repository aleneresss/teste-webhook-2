import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import readline from "readline";
import chalk from "chalk";

const app = express();
const PORT = 4000;

app.use(bodyParser.json());

const accountId = 7;
const token =
  "eyJhY2Nlc3MtdG9rZW4iOiJLc2JJeFc3azROdGk4Snk4bUZFblFRIiwidG9rZW4tdHlwZSI6IkJlYXJlciIsImNsaWVudCI6IjNzMUNyNk9KTEQ1T0QzYmJ2QmNRUWciLCJleHBpcnkiOiIxNzU2ODM1NzYzIiwidWlkIjoiZ3J1cG9kaWdpdGFsc2ZAZ21haWwuY29tIn0=";

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

const timeoutMap = new Map();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function menuConsole() {
  rl.question(
    chalk.cyanBright("\nComando (agendar / cancelar / listar / sair): "),
    (cmd) => {
      switch (cmd.trim()) {
        case "agendar":
          rl.question("ID da conversa: ", (id) => {
            rl.question("Tipo (autorização / saldos): ", (tipo) => {
              if (!id || !tipo) return menuConsole();
              const mensagens =
                tipo === "saldos"
                  ? [
                      "Olá, o seu saldo já está APROVADO e será creditado em até 15 minutos.",
                      "Vi que não tive retorno. Tem alguma dúvida sobre o valor?",
                    ]
                  : [
                      "**Olá, conseguiu autorizar os bancos ? Possui alguma dúvida?**",
                      "Vamos continuar?\n1 AUTORIZADOS\n2 DÚVIDAS\n3 ENCERRAR",
                    ];

              agendarMensagens(id, mensagens, true);
              menuConsole();
            });
          });
          break;

        case "cancelar":
          rl.question("ID da conversa: ", (id) => {
            const sucesso = clearTimeouts(id);
            if (sucesso) {
              console.log(chalk.red(`🔴 Cancelado: ${id}`));
            } else {
              console.log(chalk.yellow(`⚠️ Nada para cancelar: ${id}`));
            }
            menuConsole();
          });
          break;

        case "listar":
          const agendados = Array.from(timeoutMap.entries());
          if (agendados.length === 0) {
            console.log(chalk.gray("📭 Nenhum agendamento ativo."));
          } else {
            console.log(chalk.green("📋 Agendamentos ativos:"));
            agendados.forEach(([id, timeouts]) =>
              console.log(
                `- conversa: ${id} (${timeouts.length} mensagens), ${timeouts[0]}`
              )
            );
          }
          menuConsole();
          break;

        case "sair":
          console.log("👋 Encerrando...");
          rl.close();
          process.exit();

        default:
          console.log(chalk.red("❌ Comando inválido."));
          menuConsole();
      }
    }
  );
}

menuConsole();

app.post("/agendar", async (req, res) => {
  console.log(
    `✅ Follow Up Autorização Iniciado ${req.body.id} consultor ${req.body.messages[0].sender.available_name}`
  );
  const conversationId = req.body.id;
  if (!conversationId)
    return res.status(400).json({ erro: "ID não fornecido" });

  if (timeoutMap.has(conversationId)) {
    return res
      .status(200)
      .json({ status: "já agendado", conversa: conversationId });
  }

  const mensagens = [
    "**Olá, conseguiu autorizar os bancos ? Possui alguma dúvida?**",
    "Olá, eu sigo aguardando para prosseguir com o seu atendimento. Vamos continuar?\n\nResponda\n1 para AUTORIZADOS.\n2 para DÚVIDAS\n3 para ENCERRAR ATENDIMENTO",
  ];

  agendarMensagens(conversationId, mensagens);
  res
    .status(200)
    .json({ status: "mensagens agendadas", conversa: conversationId });
});

app.post("/saldos", (req, res) => {
  console.log(
    `✅ Follow Up Saldos Iniciado ${req.body.id} consultor ${req.body.messages[0].sender.available_name}`
  );
  const conversationId = req.body.id;
  if (!conversationId)
    return res.status(400).json({ erro: "ID não fornecido" });

  if (timeoutMap.has(conversationId)) {
    return res
      .status(200)
      .json({ status: "já agendado", conversa: conversationId });
  }

  const mensagens = [
    "Olá, o seu saldo já está APROVADO e o valor é creditado em até 15 minutos na sua conta\n\nPodemos seguir com a liberação? **",
    "Oi, te mandei algumas informações sobre seu FGTS. \nVi que não tive retorno referente a sua proposta.\n\nGostaria de saber se ficou com alguma dúvida quanto ao valor disponível?",
  ];

  agendarMensagens(conversationId, mensagens);
  res
    .status(200)
    .json({ status: "mensagens agendadas", conversa: conversationId });
});

app.post("/cancelar", (req, res) => {
  const conversationId = req.body.id;
  if (!conversationId)
    return res.status(400).json({ erro: "ID não fornecido" });

  const success = clearTimeouts(conversationId);
  if (success) {
    console.log(
      `🔴 Mensagens canceladas para conversa ${conversationId} consultor ${
        req.body.messages[0].sender.available_name || "N/A"
      }`
    );
    return res
      .status(200)
      .json({ status: "mensagens canceladas", conversa: conversationId });
  } else {
    console.log(
      `⚠️ Nenhuma mensagem agendada para cancelar para conversa ${conversationId} consultor ${
        req.body.messages[0].sender.available_name || "N/A"
      }`
    );
    return res
      .status(404)
      .json({ status: "nenhuma mensagem agendada para cancelar" });
  }
});

function agendarMensagens(conversationId, mensagens, log = false) {
  const timeouts = [];

  mensagens.forEach((mensagem, index) => {
    const delay = (index + 1) * 900000;

    const timeout = setTimeout(() => {
      axios
        .post(
          `https://aesirchat.com/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
          { content: mensagem, private: false },
          { headers }
        )
        .then(() => {
          console.log(
            chalk.blueBright(
              `✅ Mensagem ${index + 1} enviada para ${conversationId}`
            )
          );
        })
        .catch((error) => {
          console.error(
            chalk.red(
              `❌ Erro ao enviar mensagem ${index + 1}:`,
              error.response?.data || error.message
            )
          );
        });
    }, delay);

    timeouts.push(timeout);
  });

  timeoutMap.set(conversationId, timeouts);
  if (log) {
    console.log(
      chalk.green(
        `🕒 ${mensagens.length} mensagens agendadas para ${conversationId}`
      )
    );
  }
}

function clearTimeouts(conversationId) {
  const timeouts = timeoutMap.get(conversationId);
  if (!timeouts) return false;

  timeouts.forEach(clearTimeout);
  timeoutMap.delete(conversationId);
  return true;
}

app.listen(PORT, () => {
  console.log(`Servidor ativo em http://localhost:${PORT}`);
});
