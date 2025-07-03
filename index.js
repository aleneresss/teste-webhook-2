import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

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

app.post("/agendar", async (req, res) => {
  console.log(
    `✅ Follow Up Iniciado ${req.body.id} consultor ${req.body.messages[0].sender.available_name}`
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

app.post("/consulta", (req) => {
  const cpf = req.body.messages[0].content;
  console.log(cpf);
});

function agendarMensagens(conversationId, mensagens) {
  const timeouts = [];

  mensagens.forEach((mensagem, index) => {
    const delay = (index + 1) * 900000; // timer

    const timeout = setTimeout(() => {
      axios
        .post(
          `https://aesirchat.com/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
          { content: mensagem, private: false },
          { headers }
        )
        .then(() => {
          console.log(`Mensagem ${index + 1} enviada para ${conversationId}`);
        })
        .catch((error) => {
          console.error(
            `Erro ao enviar mensagem ${index + 1}:`,
            error.response?.data || error.message
          );
        });
    }, delay);

    timeouts.push(timeout);
  });

  timeoutMap.set(conversationId, timeouts);
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
