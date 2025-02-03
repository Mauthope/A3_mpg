import { createClient } from '@supabase/supabase-js'

// Inicialização do cliente Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

let currentUser = null

document.addEventListener("DOMContentLoaded", () => {
    checkUser()
    initializeEventListeners()
})

async function checkUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (user) {
        currentUser = user
        handleLoginSuccess()
    }
}

function $(id) {
    return document.getElementById(id)
}

function initializeEventListeners() {
    $("login-btn").addEventListener("click", handleLogin)
    $("register-btn").addEventListener("click", handleRegister)
    $("logout-btn").addEventListener("click", handleLogout)
    $("save-btn").addEventListener("click", handleSave)

    $("add-requisito").addEventListener("click", () => adicionarRequisito())
    $("add-situacao-atual").addEventListener("click", () => adicionarLinha("situacao-atual-table"))
    $("add-situacao-alvo").addEventListener("click", () => adicionarLinha("situacao-alvo-table"))
    $("add-plano-acao").addEventListener("click", () => adicionarLinha("plano-acao-table"))
    $("add-indicadores").addEventListener("click", () => adicionarLinha("indicadores-table"))
}

async function handleLogin() {
    const email = $("email").value
    const password = $("password").value
    const setor = $("setor-select").value

    if (!email || !password) {
        alert("Por favor, preencha email e senha.")
        return
    }

    if (!setor) {
        alert("Por favor, selecione um setor.")
        return
    }

    try {
        const { data: { user }, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (error) throw error

        currentUser = user
        handleLoginSuccess()
    } catch (error) {
        alert('Erro ao fazer login: ' + error.message)
    }
}

async function handleRegister() {
    const email = $("email").value
    const password = $("password").value
    const setor = $("setor-select").value

    if (!email || !password) {
        alert("Por favor, preencha email e senha.")
        return
    }

    if (!setor) {
        alert("Por favor, selecione um setor.")
        return
    }

    try {
        const { data: { user }, error } = await supabase.auth.signUp({
            email,
            password
        })

        if (error) throw error

        alert('Registro realizado com sucesso! Você já pode fazer login.')
    } catch (error) {
        alert('Erro ao registrar: ' + error.message)
    }
}

function handleLoginSuccess() {
    $("login-container").style.display = "none"
    $("a3-container").style.display = "block"
    $("setor-title").textContent = $("setor-select").value
    carregarDados()
}

async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error

        currentUser = null
        $("a3-container").style.display = "none"
        $("login-container").style.display = "block"
        $("setor-select").value = ""
        limparFormulario()
    } catch (error) {
        alert('Erro ao fazer logout: ' + error.message)
    }
}

async function handleSave() {
    if (!currentUser) {
        alert('Você precisa estar logado para salvar os dados.')
        return
    }

    try {
        // Salvar requisitos
        const requisitos = Array.from($("requisitos-list").querySelectorAll("input")).map(input => ({
            user_id: currentUser.id,
            requisito: input.value
        }))

        // Limpar requisitos existentes
        await supabase
            .from('user_requisitos')
            .delete()
            .eq('user_id', currentUser.id)

        // Inserir novos requisitos
        if (requisitos.length > 0) {
            const { error } = await supabase
                .from('user_requisitos')
                .insert(requisitos)
            if (error) throw error
        }

        // Salvar outras tabelas
        await salvarTabela('situacao-atual-table', 'user_situacao_atual')
        await salvarTabela('situacao-alvo-table', 'user_situacao_alvo')
        await salvarTabela('plano-acao-table', 'user_plano_acao')
        await salvarTabela('indicadores-table', 'user_indicadores')

        alert('Dados salvos com sucesso!')
    } catch (error) {
        alert('Erro ao salvar dados: ' + error.message)
    }
}

async function salvarTabela(tableId, tableName) {
    const tbody = $(tableId).querySelector("tbody")
    const rows = Array.from(tbody.rows).map(row => {
        const cells = Array.from(row.cells)
        const data = {
            user_id: currentUser.id
        }

        cells.forEach((cell, index) => {
            const input = cell.querySelector("input, select")
            if (input) {
                switch (tableName) {
                    case 'user_situacao_atual':
                        const colunasSituacaoAtual = ['indicador', 'meta', 'obj_futuro', 'realizado_anterior']
                        if (index < colunasSituacaoAtual.length) {
                            data[colunasSituacaoAtual[index]] = input.value
                        }
                        break
                    case 'user_situacao_alvo':
                        const colunasSituacaoAlvo = ['indicador', 'meta', 'obj_futuro', 'realizado_atual']
                        if (index < colunasSituacaoAlvo.length) {
                            data[colunasSituacaoAlvo[index]] = input.value
                        }
                        break
                    case 'user_plano_acao':
                        const colunasPlanoAcao = ['acao', 'indicador_alvo', 'data_abertura', 'responsavel', 'prazo', 'status', 'prazo2', 'evidencia']
                        if (index < colunasPlanoAcao.length) {
                            data[colunasPlanoAcao[index]] = input.value
                        }
                        break
                    case 'user_indicadores':
                        const colunasIndicadores = ['indicador', 'meta', 'obj_futuro', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
                        if (index < colunasIndicadores.length) {
                            data[colunasIndicadores[index]] = input.value
                        }
                        break
                }
            }
        })

        return data
    })

    if (rows.length > 0) {
        // Limpar dados existentes
        await supabase
            .from(tableName)
            .delete()
            .eq('user_id', currentUser.id)

        // Inserir novos dados
        const { error } = await supabase
            .from(tableName)
            .insert(rows)
        if (error) throw error
    }
}

async function carregarDados() {
    if (!currentUser) return

    try {
        // Carregar requisitos
        const { data: requisitos, error: reqError } = await supabase
            .from('user_requisitos')
            .select('*')
            .eq('user_id', currentUser.id)

        if (reqError) throw reqError

        $("requisitos-list").innerHTML = ""
        requisitos.forEach(req => {
            const li = document.createElement("li")
            li.innerHTML = `
                <input type="text" value="${req.requisito}">
                <button class="btn-remover" onclick="removerRequisito(this)">Remover</button>
            `
            $("requisitos-list").appendChild(li)
        })

        // Carregar outras tabelas
        await carregarTabela('user_situacao_atual', 'situacao-atual-table')
        await carregarTabela('user_situacao_alvo', 'situacao-alvo-table')
        await carregarTabela('user_plano_acao', 'plano-acao-table')
        await carregarTabela('user_indicadores', 'indicadores-table')
    } catch (error) {
        alert('Erro ao carregar dados: ' + error.message)
    }
}

async function carregarTabela(tableName, tableId) {
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', currentUser.id)

    if (error) throw error

    const tbody = $(tableId).querySelector("tbody")
    tbody.innerHTML = ""

    data.forEach(row => {
        adicionarLinha(tableId, row)
    })
}

function adicionarRequisito() {
    const lista = $("requisitos-list")
    const li = document.createElement("li")
    li.innerHTML = `
        <input type="text" placeholder="Digite o requisito">
        <button class="btn-remover" onclick="removerRequisito(this)">Remover</button>
    `
    lista.appendChild(li)
}

function removerRequisito(button) {
    button.closest('li').remove()
}

function adicionarLinha(tableId, dadosExistentes = null) {
    const table = $(tableId)
    const row = table.insertRow(-1)
    const numCols = table.rows[0].cells.length

    for (let i = 0; i < numCols; i++) {
        const cell = row.insertCell(i)

        if (tableId === "plano-acao-table") {
            cell.appendChild(criarCelulaPlanoAcao(i, dadosExistentes))
        } else if (tableId === "indicadores-table") {
            cell.appendChild(criarCelulaIndicadores(i, numCols, dadosExistentes))
        } else {
            cell.appendChild(criarInput(dadosExistentes ? Object.values(dadosExistentes)[i + 1] : ''))
        }
    }

    if (tableId === "indicadores-table") {
        configurarCalculoMedia(row)
        configurarColoracaoCelulas(row)
    }
}

function criarCelulaPlanoAcao(colIndex, dadosExistentes = null) {
    if (colIndex === 0) { // Primeira coluna
        const input = document.createElement("input")
        input.type = "text"
        if (dadosExistentes?.acao) input.value = dadosExistentes.acao
        
        input.addEventListener("input", () => {
            input.title = input.value
        })

        return input
    } else if (colIndex === 2 || colIndex === 4) {
        // Data de Abertura e Prazo
        const input = document.createElement("input")
        input.type = "date"
        if (dadosExistentes) {
            if (colIndex === 2 && dadosExistentes.data_abertura) input.value = dadosExistentes.data_abertura
            if (colIndex === 4 && dadosExistentes.prazo) input.value = dadosExistentes.prazo
        }
        
        input.addEventListener("mouseover", () => {
            input.title = input.value || "Selecione uma data"
        })

        input.addEventListener('change', () => {
            atualizarStatusParaAtrasado(input)
        })

        return input
    } else if (colIndex === 5) {
        // Status
        const select = document.createElement("select")
        select.innerHTML = `
            <option value="Não iniciado">Não iniciado</option>
            <option value="Em andamento">Em andamento</option>
            <option value="Concluído">Concluído</option>
            <option value="Atrasado">Atrasado</option>
        `
        if (dadosExistentes?.status) select.value = dadosExistentes.status

        select.addEventListener("mouseover", () => {
            select.title = select.value || "Selecione o status"
        })

        select.addEventListener("change", () => {
            const statusCell = select.closest('td')
            
            if (select.value === "Concluído") {
                statusCell.style.backgroundColor = "green"
                select.disabled = true
            } else if (select.value === "Em andamento") {
                statusCell.style.backgroundColor = "blue"
            }

            atualizarStatus(select)
        })
        return select
    } else if (colIndex === 6) { // Prazo 2
        const input = document.createElement("input")
        input.type = "date"
        input.disabled = true
        if (dadosExistentes?.prazo2) input.value = dadosExistentes.prazo2
        
        input.addEventListener("mouseover", () => {
            input.title = input.value || "Selecione o prazo final"
        })

        input.addEventListener('change', () => {
            if (input.value) {
                const row = input.closest("tr")
                const statusSelect = row.cells[5].querySelector("select")
                if (statusSelect) {
                    statusSelect.disabled = false
                    statusSelect.classList.remove('disabled')
                }
            }
            atualizarStatusParaAtrasado(input)
        })
        return input
    } else if (colIndex === 7) {
        // Evidência - URL transformada em hyperlink
        const input = document.createElement("input")
        input.type = "text"
        if (dadosExistentes?.evidencia) input.value = dadosExistentes.evidencia
        
        input.addEventListener("mouseover", () => {
            input.title = input.value || "Insira a URL da evidência"
        })

        input.addEventListener("input", () => {
            const url = input.value.trim()
            if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
                const link = document.createElement("a")
                link.href = url
                link.target = "_blank"
                link.textContent = "Clique aqui"
                
                const cell = input.parentElement
                cell.innerHTML = ""
                cell.appendChild(link)
            }
        })
        return input
    } else {
        return criarInput(dadosExistentes ? Object.values(dadosExistentes)[colIndex + 1] : '')
    }
}

function atualizarStatus(select) {
    const row = select.closest("tr")
    const prazoInput = row.cells[4].querySelector("input")
    const prazo2Input = row.cells[6].querySelector("input")
    const statusCell = select.parentElement

    if (!prazoInput || !prazoInput.value) return

    const prazoDate = new Date(prazoInput.value)
    const prazo2Date = prazo2Input ? new Date(prazo2Input.value) : null
    const today = new Date()

    if (select.value === "Concluído") {
        statusCell.style.backgroundColor = "green"
        select.disabled = true
        return
    }

    // Verificação para Prazo
    if (prazoDate < today && !prazo2Input.value && select.value !== "Atrasado") {
        select.value = "Atrasado"
        statusCell.style.backgroundColor = "red"
        if (prazo2Input) {
            prazo2Input.disabled = false
        }
        select.disabled = true
    }

    // Verificação para Prazo 2
    if (prazo2Date && prazo2Date < today && select.value !== "Atrasado") {
        select.value = "Atrasado"
        statusCell.style.backgroundColor = "red"
        select.disabled = true
    }

    // Caso o status não seja "Atrasado", continua a verificação normal
    else {
        switch (select.value) {
            case "Atrasado":
                statusCell.style.backgroundColor = "red"
                if (prazo2Input) {
                    prazo2Input.disabled = false
                }
                break
            case "Em andamento":
                statusCell.style.backgroundColor = "blue"
                break
            case "Concluído":
                statusCell.style.backgroundColor = "green"
                select.disabled = true
                break
            default:
                statusCell.style.backgroundColor = ""
        }
    }
}

function atualizarStatusParaAtrasado(input) {
    const row = input.closest("tr")
    const prazoInput = row.cells[4].querySelector("input")
    const prazo2Input = row.cells[6].querySelector("input")
    const statusSelect = row.cells[5].querySelector("select")

    const prazoDate = new Date(prazoInput.value)
    const prazo2Date = prazo2Input ? new Date(prazo2Input.value) : null
    const today = new Date()

    if (prazoDate < today && !prazo2Input.value && statusSelect.value !== "Atrasado") {
        statusSelect.value = "Atrasado"
        statusSelect.parentElement.style.backgroundColor = "red"
        if (prazo2Input) prazo2Input.disabled = false
    }

    if (prazo2Date && prazo2Date < today && statusSelect.value !== "Atrasado") {
        statusSelect.value = "Atrasado"
        statusSelect.parentElement.style.backgroundColor = "red"
    }
}

function criarCelulaIndicadores(colIndex, numCols, dadosExistentes = null) {
    if (colIndex === numCols - 1) {
        // Última coluna (Média)
        const span = document.createElement("span")
        span.textContent = dadosExistentes?.media || "0.00"
        return span
    } else {
        return criarInput(dadosExistentes ? Object.values(dadosExistentes)[colIndex + 1] : '')
    }
}

function criarInput(valor = '') {
    const input = document.createElement("input")
    input.type = "text"
    if (valor) input.value = valor
    return input
}

function configurarCalculoMedia(row) {
    const inputs = Array.from(row.cells)
        .slice(3, -1)
        .map((cell) => cell.querySelector("input"));
    const mediaCell = row.cells[row.cells.length - 1];

    inputs.forEach((input) => {
        input.addEventListener("input", () => {
            const valores = inputs
                .map((inp) => Number.parseFloat(inp.value.replace(",", "."))) // Garante ponto decimal
                .filter((val) => !isNaN(val));

            const media = valores.length > 0 
                ? valores.reduce((a, b) => a + b, 0) / valores.length 
                : 0;

            mediaCell.textContent = parseFloat(media.toFixed(2)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            aplicarColoracao(row);
        });
    });
}


function configurarColoracaoCelulas(row) {
    const metaInput = row.cells[1].querySelector("input")
    const objFuturoInput = row.cells[2].querySelector("input")
    ;[metaInput, objFuturoInput].forEach((input) => {
        input.addEventListener("input", () => aplicarColoracao(row))
    })
}

function aplicarColoracao(row) {
    const meta = parseFloat(row.cells[1].querySelector("input").value.replace(",", "."))
    const objFuturo = parseFloat(row.cells[2].querySelector("input").value.replace(",", "."))

    if (isNaN(meta) || isNaN(objFuturo)) return

    const cells = Array.from(row.cells).slice(3) // Jan até Média

    cells.forEach((cell) => {
        const valor = parseFloat((cell.querySelector("input")?.value || cell.textContent).replace(",", "."))
        if (isNaN(valor)) return

        let cor

        if (objFuturo > meta) {
            if (valor >= objFuturo) cor = "verde"
            else if (valor >= meta) cor = "laranja"
            else cor = "vermelho"
        } else {
            if (valor <= objFuturo) cor = "verde"
            else if (valor <= meta) cor = "laranja"
            else cor = "vermelho"
        }

        cell.className = `cor-${cor}`
    })
}


function limparFormulario() {
    $("requisitos-list").innerHTML = ""
    ;["situacao-atual-table", "situacao-alvo-table", "plano-acao-table", "indicadores-table"].forEach((tableId) => {
        $(tableId).querySelector("tbody").innerHTML = ""
    })
}

// Tornar funções globais para uso em eventos inline
window.removerRequisito = removerRequisito
