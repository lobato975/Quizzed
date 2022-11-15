let clientId = null;
let gameId = null;
let playerColor = null;
let lastPayload;
let perguntaAtual;
let jogadores = [];
let vencedor = null;
let alfaAlternativas = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

const input = document.querySelector("input");

const btnCriarUmJogo = document.querySelector(".btnCriarUmJogo");
btnCriarUmJogo.addEventListener("click", e => {
    const payLoad = {
        "method": "create",
        "clientId": clientId
    }

    ws.send(JSON.stringify(payLoad));
})

const btnEntrarNaPartida = document.querySelector(".btnEntrarNaPartida");
btnEntrarNaPartida.addEventListener("click", e => {

    if (input.value == null || input.value == '' || input.value == undefined || input.value.length != 36) return;
    if (gameId === null) gameId = input.value;

    let playerName = obterNomeDoJogador();
    if (playerName == null) return;

    const payLoad = {
        "method": "join",
        "clientId": clientId,
        "gameId": gameId,
        "playerName": playerName
    }

    ws.send(JSON.stringify(payLoad));

    document.querySelector('.boxJoinPartida').classList.add('hidden');
    document.querySelector('.btnCriarUmJogo').classList.add('hidden');
    document.querySelector('.mensagemAguardando').className = 'mensagemAguardando';

})

const btnIniciarPartida = document.querySelector('.btnIniciarJogo');
btnIniciarPartida.addEventListener('click', event => {
    console.log('INICIANDO A PARTIDA!!');
    document.querySelector('.menuJogo').classList.add('hidden');

    const payLoad = {
        "method": "iniciarPartida",
        "clientId": clientId,
        "gameId": gameId,
    }

    ws.send(JSON.stringify(payLoad));
})

function obterNomeDoJogador() {
    let nome = window.prompt('Digite seu nome.');

    while (nome == undefined) {
        nome = window.prompt('Nome inválido! Digite seu nome!');
    }

    if (nome == '') nome = 'Jogador';

    return nome;
}

function entrarNaPartida(gameId) {
    let playerName = obterNomeDoJogador();
    if (playerName == null) return;

    console.log('Entrando na partida!')

    const payLoad = {
        "method": "join",
        "clientId": clientId,
        "gameId": gameId,
        "playerName": playerName
    }

    ws.send(JSON.stringify(payLoad));
}

function iniciarPartida_Backend() {
    const payLoad = {
        "method": "start",
        "gameId": gameId
    }

    ws.send(JSON.stringify(payLoad));
}

document.querySelector('.escolhaDificuldade').addEventListener('click', event => {
    if (event.target.value == null) return;

    const payLoad = {
        "jogador": clientId,
        "dificuldadeEscolhida": event.target.value,
        "method": "dificuldadeEscolhida",
        "gameId": gameId
    }

    console.log({ payLoad })

    ws.send(JSON.stringify(payLoad));

    document.querySelector('.escolhaDificuldade').classList.add('hidden');
    document.querySelector('.fundoModal').classList.add('hidden');
})

document.querySelector('.boxPergunta').addEventListener('click', event => {
    if (event.target.dataset.alternativa == null) return;

    const payLoad = {
        "gameId": gameId,
        "jogador": clientId,
        "resposta": event.target.dataset.alternativa,
        "respostaIndex": event.target.dataset.alternativaindex,
        "method": "responderPergunta"
    }

    console.log({ payLoad })

    ws.send(JSON.stringify(payLoad));

    document.querySelector('.boxPergunta').classList.add('hidden');
    document.querySelector('.fundoModal').classList.add('hidden');
})

let timeoutsList = {};

function atualizaPosicaoJogadores(response) {
    for (let x = 0; x < response.game.clients.length; x++) {
        let nomeJogador = response.game.clients[x].playerName;

        console.log({ nomeJogador: response.game.clients[x] })

        if (jogadores[x].posicao != response.game.clients[x].posicao) {

            console.log(`[GAME] Atualiza posição do ${nomeJogador}`)

            let idCasaAnterior = jogadores[x].posicao;
            let idCasaNova = response.game.clients[x].posicao;

            if (idCasaNova > 24) idCasaNova = 24;
            if (idCasaAnterior == 0) idCasaAnterior = 'Início';

            let casaAntiga = document.querySelector(`.casa[data-idcasa="${idCasaAnterior}"] .estadiaJogador`);
            let casaNova = document.querySelector(`.casa[data-idcasa="${idCasaNova}"] .estadiaJogador`);

            let tmpElement;
            let booleanAlterar = false;

            casaAntiga.childNodes.forEach(child => {
                if (child.dataset.idjogador == nomeJogador) {
                    booleanAlterar = true;
                    tmpElement = child;
                    casaAntiga.removeChild(child)
                }
            })

            if (booleanAlterar == true) casaNova.appendChild(tmpElement);
            jogadores[x].posicao = response.game.clients[x].posicao;
        }
    }
}

function limparTela() {
    let containerGeral = document.querySelector('.gameContainer');

    while (containerGeral.firstChild)
        containerGeral.removeChild(containerGeral.firstChild)

    return containerGeral;
}
