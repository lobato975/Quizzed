// CONFIGURAÇÕES GLOBAIS
const QNT_CASAS = 25;
const NOME_DO_JOGO = 'Quizzed';
const TAMANHO_DO_JOGO = 500;
const CASA_WIDTH = 80;
const CASA_HEIGHT = 80;
const CORES = ['GREEN', 'RED', 'BLUE', 'TURQUOISE', 'BLACK', 'BLUEVIOLET', 'ORANGE', 'PINK']

let PAYLOADJOGADORES = null;
let QNT_JOGADORES = null;

let listCasas = [];
let listCasasHTML = [];
let listJogadores = [];
let listJogadoresHTML = [];
let listCoresUnicas = [];

function iniciarPartida() {
    document.querySelector('.lobby').classList.add('hidden');
    gerarCasas();
    gerarJogadores();
    document.querySelector('.tabuleiro').classList.remove('hidden');

    iniciarPartida_Backend();
}

function gerarCasas() {
    // CONFIGURAÇÕES DE DEMONSTRAÇÃO
    // FAZENDO A MONTAGEM DAS CASAS
    let booleanSentidoDireita = true;
    let totalSize = 0;
    let top = 0;

    for(let x = 0; x < QNT_CASAS; x++) {
        let casaObj = {
            label: x == 0 ? 'Início' : x,
            style: `width: ${CASA_WIDTH}px; height: ${CASA_HEIGHT}px; left: ${totalSize}px; top: ${top}px;`,
            jogadores: []
        }

        if(booleanSentidoDireita) {
            totalSize += CASA_WIDTH;
        } else {
            if(totalSize != 0) {
                totalSize -= CASA_WIDTH;
            }
        }

        if(x == 4 || x == 5 || x == 16 || x == 17) {
            totalSize -= CASA_WIDTH;
            top += CASA_HEIGHT;
        }

        if(x == 6) {
            totalSize -= CASA_WIDTH * 2;
            booleanSentidoDireita ^= true;
        }

        if(x == 10 || x == 11 || x == 22 || x == 23 || x == 24) {
            top += CASA_HEIGHT;
        }

        if(x == 11 || x == 17 || x == 23) {
            booleanSentidoDireita ^= true;
        }

        let casaHTML = document.createElement("div");
        casaHTML.className = 'casa';
        casaHTML.setAttribute('style', casaObj.style);
        casaHTML.setAttribute('data-idcasa', casaObj.label);

        casaHTML.innerHTML = `
            <div class="estadiaJogador"></div>
            <div class="label">
                ${casaObj.label}
            </div>
        `;

        listCasas.push(casaObj);
        listCasasHTML.push(casaHTML);
    }

    gerarElementosHTMLcasa();

    console.log(`[GAME] CASAS GERADAS!`);
}

function gerarElementosHTMLcasa() {
    let tabuleiro = document.querySelector('.tabuleiro');

    listCasasHTML.forEach(casa => {
        tabuleiro.appendChild(casa);
    })

    console.log(`[GAME] HTML DAS CASAS IMPLEMENTADO`);
}

function gerarJogadores() {
    // FAZENDO A MONTAGEM DOS JOGADORES
    for(let x = 0; x < QNT_JOGADORES; x++) {
        let jogadorObj = {
            label: PAYLOADJOGADORES[x].playerName,
            color: PAYLOADJOGADORES[x].color,
            casaAtual: 0
        }

        jogadorObj.style = `background-color: ${jogadorObj.color};`

        // GERA O HTML DOS JOGADORES
        let jogadorHTML = document.createElement("div");
        jogadorHTML.className = 'jogador';
        jogadorHTML.setAttribute('style', jogadorObj.style);
        jogadorHTML.setAttribute('data-idjogador', jogadorObj.label);
        jogadorHTML.setAttribute('title', jogadorObj.label);

        listJogadores.push(jogadorObj);
        listJogadoresHTML.push(jogadorHTML);

    }

    console.log('[GAME] JOGADORES CRIADOS');
    gerarElementosHTMLjogadores();
}

function gerarElementosHTMLjogadores() {
    let casaInicial = document.querySelector(`.casa[data-idcasa="Início"] .estadiaJogador`);

    listJogadoresHTML.forEach(jogador => {
        casaInicial.appendChild(jogador);
    })

    console.log('[GAME] JOGADORES IMPLEMENTADOS');
}