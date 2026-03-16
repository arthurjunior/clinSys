// SisClyn - Front-end em HTML/CSS/JS puro
// --------------------------------------------------
// Este arquivo concentra a lógica de:
// - Navegação entre seções (Dashboard, Pacientes, etc.)
// - CRUD em memória/localStorage para o MVP
// - Camada "api" mockada, pronta para ser trocada por chamadas
//   reais a uma API Flask (via fetch) no futuro.

// ---------------------- CAMADA DE DADOS / API ----------------------

const ApiMock = (() => {
  // Estrutura básica do estado do sistema
  const state = {
    pacientes: [],
    agendamentos: [],
    atendimentos: [],
    financeiro: [],
    nextId: {
      paciente: 1,
      agendamento: 1,
      atendimento: 1,
      financeiro: 1,
    },
  };

  // Carrega dados do localStorage (se existirem)
  const STORAGE_KEY = "sisclyn-mvp-data";

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      Object.assign(state, parsed);
    } catch (err) {
      console.warn("Não foi possível carregar dados do localStorage:", err);
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("Não foi possível salvar dados no localStorage:", err);
    }
  }

  loadFromStorage();

  // Abaixo estão métodos assíncronos simulando chamadas HTTP.
  // Em uma futura API Flask, basta trocar o corpo por fetch(...)
  // mantendo as assinaturas.

  return {
    // Pacientes
    async listarPacientes() {
      return [...state.pacientes];
    },
    async criarPaciente(dados) {
      const novo = {
        id: state.nextId.paciente++,
        ...dados,
      };
      state.pacientes.push(novo);
      saveToStorage();
      return novo;
    },
    async atualizarPaciente(id, dados) {
      const idx = state.pacientes.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      state.pacientes[idx] = { ...state.pacientes[idx], ...dados };
      saveToStorage();
      return state.pacientes[idx];
    },
    async excluirPaciente(id) {
      state.pacientes = state.pacientes.filter((p) => p.id !== id);
      // Também removemos relacionamentos simples no MVP
      state.agendamentos = state.agendamentos.filter((a) => a.pacienteId !== id);
      state.atendimentos = state.atendimentos.filter((a) => a.pacienteId !== id);
      state.financeiro = state.financeiro.filter((r) => r.pacienteId !== id);
      saveToStorage();
    },

    // Agendamentos
    async listarAgendamentos() {
      return [...state.agendamentos];
    },
    async criarAgendamento(dados) {
      const novo = { id: state.nextId.agendamento++, ...dados };
      state.agendamentos.push(novo);
      saveToStorage();
      return novo;
    },
    async excluirAgendamento(id) {
      state.agendamentos = state.agendamentos.filter((a) => a.id !== id);
      saveToStorage();
    },

    // Atendimentos
    async listarAtendimentos() {
      return [...state.atendimentos];
    },
    async criarAtendimento(dados) {
      const novo = { id: state.nextId.atendimento++, ...dados };
      state.atendimentos.push(novo);
      saveToStorage();
      return novo;
    },

    // Financeiro
    async listarFinanceiro() {
      return [...state.financeiro];
    },
    async criarFinanceiro(dados) {
      const novo = { id: state.nextId.financeiro++, ...dados };
      state.financeiro.push(novo);
      saveToStorage();
      return novo;
    },

    // Resumo para o dashboard
    async obterResumo() {
      const hojeISO = new Date().toISOString().slice(0, 10);
      const agendamentosHoje = state.agendamentos.filter(
        (a) => a.data === hojeISO
      );

      return {
        totalPacientes: state.pacientes.length,
        agendamentosHoje: agendamentosHoje.length,
        totalAtendimentos: state.atendimentos.length,
      };
    },
  };
})();

// ---------------------- UTILIDADES DE UI ----------------------

function showAlert(message, type = "success") {
  const container = document.getElementById("alert-container");
  if (!container) return;

  const wrapper = document.createElement("div");
  wrapper.className = `alert alert-${type} alert-dismissible fade show`;
  wrapper.role = "alert";
  wrapper.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  container.appendChild(wrapper);

  // Some auto close (opcional)
  setTimeout(() => {
    wrapper.classList.remove("show");
    wrapper.addEventListener("transitionend", () => wrapper.remove(), {
      once: true,
    });
  }, 4000);
}

// ---------------------- LOGIN E NAVEGAÇÃO ENTRE SEÇÕES ----------------------

const AUTH_KEY = "sisclyn-logged";

function setupLogin() {
  const loginForm = document.getElementById("login-form");
  const loginWrapper = document.getElementById("login-wrapper");
  const appLayout = document.getElementById("app-layout");
  const btnLogout = document.getElementById("btn-logout");

  if (!loginForm || !loginWrapper || !appLayout) return;

  function aplicarEstadoLogado(estaLogado) {
    if (estaLogado) {
      loginWrapper.classList.add("d-none");
      appLayout.classList.remove("d-none");
    } else {
      appLayout.classList.add("d-none");
      loginWrapper.classList.remove("d-none");
    }
  }

  // Verifica se já está logado (sessão atual)
  const jaLogado = sessionStorage.getItem(AUTH_KEY) === "1";
  aplicarEstadoLogado(jaLogado);

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const user = document.getElementById("login-user").value.trim();
    const pass = document.getElementById("login-pass").value.trim();

    if (user === "admin" && pass === "1234") {
      sessionStorage.setItem(AUTH_KEY, "1");
      aplicarEstadoLogado(true);
      showAlert("Login realizado com sucesso.");
    } else {
      document.getElementById("login-alert").innerHTML =
  `<div class="alert alert-danger">Usuário ou senha inválidos.</div>`;
    }
  });

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      if (!confirm("Deseja sair do sistema?")) return;
      sessionStorage.removeItem(AUTH_KEY);
      aplicarEstadoLogado(false);
    });
  }
}

function setupNavigation() {
  const buttons = document.querySelectorAll(".sidebar-link[data-section]");
  const sections = document.querySelectorAll("[data-section-content]");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-section");

      // destaque no menu
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // mostra/esconde seções
      sections.forEach((sec) => {
        if (sec.id === `section-${target}`) {
          sec.classList.remove("d-none");
          sec.classList.add("section-visible");
        } else {
          sec.classList.add("d-none");
          sec.classList.remove("section-visible");
        }
      });
    });
  });
}

// ---------------------- PACIENTES ----------------------

let pacienteEmEdicaoId = null;

async function renderPacientes() {
  const tbody = document.getElementById("tabela-pacientes");
  if (!tbody) return;

  const pacientes = await ApiMock.listarPacientes();
  tbody.innerHTML = "";

  if (!pacientes.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="4" class="text-center text-muted py-3">Nenhum paciente cadastrado.</td>';
    tbody.appendChild(tr);
    return;
  }

  pacientes.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.nome}</td>
      <td>${p.telefone || ""}</td>
      <td>${p.diagnostico || ""}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" data-acao="editar" data-id="${p.id}">Editar</button>
        <button class="btn btn-sm btn-outline-danger" data-acao="excluir" data-id="${p.id}">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button[data-acao]").forEach((btn) => {
    const id = Number(btn.getAttribute("data-id"));
    const acao = btn.getAttribute("data-acao");
    if (acao === "editar") {
      btn.addEventListener("click", () => iniciarEdicaoPaciente(id));
    } else if (acao === "excluir") {
      btn.addEventListener("click", () => excluirPaciente(id));
    }
  });

  // Sempre atualizar selects dependentes
  await preencherSelectsPacientes();
  await atualizarDashboard();
}

async function onSubmitPacienteForm(event) {
  event.preventDefault();

  const dados = {
    nome: document.getElementById("paciente-nome").value.trim(),
    telefone: document.getElementById("paciente-telefone").value.trim(),
    dataNascimento: document
      .getElementById("paciente-data-nascimento")
      .value.trim(),
    sexo: document.getElementById("paciente-sexo").value,
    diagnostico: document.getElementById("paciente-diagnostico").value.trim(),
    queixa: document.getElementById("paciente-queixa").value.trim(),
    observacoes: document.getElementById("paciente-observacoes").value.trim(),
  };

  if (!dados.nome) {
    showAlert("Informe o nome do paciente.", "warning");
    return;
  }

  if (pacienteEmEdicaoId) {
    await ApiMock.atualizarPaciente(pacienteEmEdicaoId, dados);
    showAlert("Paciente atualizado com sucesso.");
  } else {
    await ApiMock.criarPaciente(dados);
    showAlert("Paciente cadastrado com sucesso.");
  }

  limparFormularioPaciente();
  await renderPacientes();
}

async function iniciarEdicaoPaciente(id) {
  const pacientes = await ApiMock.listarPacientes();
  const paciente = pacientes.find((p) => p.id === id);
  if (!paciente) return;

  pacienteEmEdicaoId = id;
  document.getElementById("paciente-nome").value = paciente.nome || "";
  document.getElementById("paciente-telefone").value = paciente.telefone || "";
  document.getElementById("paciente-data-nascimento").value =
    paciente.dataNascimento || "";
  document.getElementById("paciente-sexo").value = paciente.sexo || "";
  document.getElementById("paciente-diagnostico").value =
    paciente.diagnostico || "";
  document.getElementById("paciente-queixa").value = paciente.queixa || "";
  document.getElementById("paciente-observacoes").value =
    paciente.observacoes || "";

  const btnCancel = document.getElementById("paciente-cancelar-edicao");
  if (btnCancel) btnCancel.classList.remove("d-none");
}

function limparFormularioPaciente() {
  pacienteEmEdicaoId = null;
  document.getElementById("form-paciente").reset();
  const btnCancel = document.getElementById("paciente-cancelar-edicao");
  if (btnCancel) btnCancel.classList.add("d-none");
}

async function excluirPaciente(id) {
  if (!confirm("Tem certeza que deseja excluir este paciente?")) return;
  await ApiMock.excluirPaciente(id);
  showAlert("Paciente excluído com sucesso.", "success");
  await renderPacientes();
}

// Preenche todos os selects que dependem de pacientes
async function preencherSelectsPacientes() {
  const pacientes = await ApiMock.listarPacientes();

  const maps = [
    { id: "agendamento-paciente", incluirOpcaoVazia: true },
    { id: "atendimento-paciente", incluirOpcaoVazia: true },
    { id: "financeiro-paciente", incluirOpcaoVazia: true },
  ];

  maps.forEach((conf) => {
    const select = document.getElementById(conf.id);
    if (!select) return;
    select.innerHTML = "";
    if (conf.incluirOpcaoVazia) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Selecione um paciente";
      select.appendChild(opt);
    }
    pacientes.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.nome;
      select.appendChild(opt);
    });
  });
}

// ---------------------- AGENDAMENTOS ----------------------

async function renderAgendamentos() {
  const tbody = document.getElementById("tabela-agendamentos");
  if (!tbody) return;

  const [agendamentos, pacientes] = await Promise.all([
    ApiMock.listarAgendamentos(),
    ApiMock.listarPacientes(),
  ]);

  const mapaPacientes = new Map(pacientes.map((p) => [p.id, p.nome]));

  tbody.innerHTML = "";
  if (!agendamentos.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="5" class="text-center text-muted py-3">Nenhum agendamento cadastrado.</td>';
    tbody.appendChild(tr);
    return;
  }

  agendamentos.forEach((a) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${mapaPacientes.get(a.pacienteId) || ""}</td>
      <td>${a.profissional}</td>
      <td>${a.data}</td>
      <td>${a.horario}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger" data-id="${a.id}">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button[data-id]").forEach((btn) => {
    const id = Number(btn.getAttribute("data-id"));
    btn.addEventListener("click", async () => {
      if (!confirm("Deseja excluir este agendamento?")) return;
      await ApiMock.excluirAgendamento(id);
      showAlert("Agendamento excluído com sucesso.", "success");
      await renderAgendamentos();
      await atualizarDashboard();
    });
  });
}

async function onSubmitAgendamentoForm(event) {
  event.preventDefault();

  const pacienteId = Number(
    document.getElementById("agendamento-paciente").value
  );
  const profissional = document
    .getElementById("agendamento-profissional")
    .value.trim();
  const data = document.getElementById("agendamento-data").value;
  const horario = document.getElementById("agendamento-horario").value;

  if (!pacienteId || !profissional || !data || !horario) {
    showAlert("Preencha todos os campos do agendamento.", "warning");
    return;
  }

  await ApiMock.criarAgendamento({
    pacienteId,
    profissional,
    data,
    horario,
  });

  document.getElementById("form-agendamento").reset();
  showAlert("Agendamento criado com sucesso.");
  await renderAgendamentos();
  await atualizarDashboard();
}

// ---------------------- ATENDIMENTOS ----------------------

async function renderAtendimentos() {
  const tbody = document.getElementById("tabela-atendimentos");
  if (!tbody) return;

  const [atendimentos, pacientes] = await Promise.all([
    ApiMock.listarAtendimentos(),
    ApiMock.listarPacientes(),
  ]);
  const mapaPacientes = new Map(pacientes.map((p) => [p.id, p.nome]));

  tbody.innerHTML = "";
  if (!atendimentos.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="4" class="text-center text-muted py-3">Nenhum atendimento registrado.</td>';
    tbody.appendChild(tr);
    return;
  }

  atendimentos.forEach((a) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${mapaPacientes.get(a.pacienteId) || ""}</td>
      <td>${a.profissional}</td>
      <td>${a.data}</td>
      <td>${a.observacoes || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function onSubmitAtendimentoForm(event) {
  event.preventDefault();

  const pacienteId = Number(
    document.getElementById("atendimento-paciente").value
  );
  const profissional = document
    .getElementById("atendimento-profissional")
    .value.trim();
  const data = document.getElementById("atendimento-data").value;
  const observacoes = document
    .getElementById("atendimento-observacoes")
    .value.trim();
  const evolucao = document
    .getElementById("atendimento-evolucao")
    .value.trim();

  if (!pacienteId || !profissional || !data) {
    showAlert("Preencha pelo menos paciente, profissional e data.", "warning");
    return;
  }

  await ApiMock.criarAtendimento({
    pacienteId,
    profissional,
    data,
    observacoes,
    evolucao,
  });

  document.getElementById("form-atendimento").reset();
  showAlert("Atendimento registrado com sucesso.");
  await renderAtendimentos();
  await atualizarDashboard();
}

// ---------------------- FINANCEIRO ----------------------

async function renderFinanceiro() {
  const tbody = document.getElementById("tabela-financeiro");
  if (!tbody) return;

  const [registros, pacientes] = await Promise.all([
    ApiMock.listarFinanceiro(),
    ApiMock.listarPacientes(),
  ]);
  const mapaPacientes = new Map(pacientes.map((p) => [p.id, p.nome]));

  tbody.innerHTML = "";
  if (!registros.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="4" class="text-center text-muted py-3">Nenhum registro financeiro cadastrado.</td>';
    tbody.appendChild(tr);
    return;
  }

  registros.forEach((r) => {
    const tr = document.createElement("tr");
    const statusBadge =
      r.status === "Pago"
        ? '<span class="badge bg-success">Pago</span>'
        : '<span class="badge bg-warning text-dark">Pendente</span>';
    tr.innerHTML = `
      <td>${mapaPacientes.get(r.pacienteId) || ""}</td>
      <td>${r.plano}</td>
      <td>${Number(r.valor).toFixed(2)}</td>
      <td>${statusBadge}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function onSubmitFinanceiroForm(event) {
  event.preventDefault();

  const pacienteId = Number(
    document.getElementById("financeiro-paciente").value
  );
  const plano = document.getElementById("financeiro-plano").value.trim();
  const valor = document.getElementById("financeiro-valor").value;
  const status = document.getElementById("financeiro-status").value;

  if (!pacienteId || !plano || !valor || !status) {
    showAlert("Preencha todos os campos do financeiro.", "warning");
    return;
  }

  await ApiMock.criarFinanceiro({
    pacienteId,
    plano,
    valor: Number(valor),
    status,
  });

  document.getElementById("form-financeiro").reset();
  showAlert("Registro financeiro adicionado com sucesso.");
  await renderFinanceiro();
}

// ---------------------- DASHBOARD ----------------------

let chartResumo = null;

async function atualizarDashboard() {
  const resumo = await ApiMock.obterResumo();
  const elPacientes = document.getElementById("dash-total-pacientes");
  const elAgHoje = document.getElementById("dash-agendamentos-hoje");
  const elAtend = document.getElementById("dash-total-atendimentos");

  if (elPacientes) elPacientes.textContent = resumo.totalPacientes;
  if (elAgHoje) elAgHoje.textContent = resumo.agendamentosHoje;
  if (elAtend) elAtend.textContent = resumo.totalAtendimentos;

  // Se quiser no futuro, esses valores podem alimentar diretamente o gráfico.
}

function initChartResumo() {
  const ctx = document.getElementById("chart-resumo");
  if (!ctx || typeof Chart === "undefined") return;

  const labels = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];

  const data2025 = [80, 120, 150, 130, 180, 160, 190, 200, 170, 210, 190, 220];
  const data2026 = [60, 100, 140, 120, 160, 180, 200, 210, 190, 220, 210, 240];

  chartResumo = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Atendimentos de 2025",
          data: data2025,
          borderColor: "rgba(59,130,246,1)",
          backgroundColor: "rgba(59,130,246,0.12)",
          tension: 0.4,
          fill: true,
          pointRadius: 0,
        },
        {
          label: "Atendimentos de 2026",
          data: data2026,
          borderColor: "rgba(249,115,22,1)",
          backgroundColor: "rgba(249,115,22,0.10)",
          tension: 0.4,
          fill: true,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          grid: {
            color: "rgba(148,163,184,0.25)",
          },
          ticks: {
            stepSize: 50,
          },
        },
      },
    },
  });
}

// ---------------------- INICIALIZAÇÃO ----------------------

document.addEventListener("DOMContentLoaded", async () => {
  setupLogin();
  setupNavigation();

  // Formulários
  const formPaciente = document.getElementById("form-paciente");
  const btnCancelarEdicao = document.getElementById(
    "paciente-cancelar-edicao"
  );
  if (formPaciente) formPaciente.addEventListener("submit", onSubmitPacienteForm);
  if (btnCancelarEdicao)
    btnCancelarEdicao.addEventListener("click", limparFormularioPaciente);

  const formAgendamento = document.getElementById("form-agendamento");
  if (formAgendamento)
    formAgendamento.addEventListener("submit", onSubmitAgendamentoForm);

  const formAtendimento = document.getElementById("form-atendimento");
  if (formAtendimento)
    formAtendimento.addEventListener("submit", onSubmitAtendimentoForm);

  const formFinanceiro = document.getElementById("form-financeiro");
  if (formFinanceiro)
    formFinanceiro.addEventListener("submit", onSubmitFinanceiroForm);

  // Primeira renderização
  await renderPacientes();
  await renderAgendamentos();
  await renderAtendimentos();
  await renderFinanceiro();
  await atualizarDashboard();
  initChartResumo();
});


