const ec = new elliptic.ec('secp256k1');
let currentKeyPair = null;
let myAddress = "";
let myBalance = 0;
let wallets = JSON.parse(localStorage.getItem('ob_wallets')) || [];
let activeIndex = localStorage.getItem('ob_active_idx') || 0;

const RPC_URL = "https://rpc-one-testnet.vercel.app";
const LOCAL_MINER_URL = "http://localhost:3000";

const bip39Words = "abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual adapt add addict address adjust admit adult advance advice aerobic affair afford afraid again age agent agree ahead aim air airport aisle alarm album alcohol alert alien alike alive all alley allow almost alone alpha already also alter always amateur amazing among amount amused animal ankle announce annual another answer antenna anxiety any apart apology appear apple approve april arch arctic area arena argue arm armed armor army around arrange arrest arrive arrow art artefact artist artwork ask aspect assault asset assist assume asthma athlete atom tonight topic topple torch tornado tortoise toss total touch tough tour toward tower town toy track trade traffic tragic train transfer trap trash travel tray treat tree trend trial tribe trick trigger trim trio trip triumph trophy trouble truck true truly trumpet trust truth try tube tuition tumble tuna tunnel turkey turn turtle twelve twenty twice twin twist two type typical ugly umbrella unable unaware uncle uncover under undo unfair unfold unhappy uniform unique unit universe unknown unlock until unusual up update upon upper upset urban urge usage use used useless utter vacancy vacuum vague vain valuate value valve van vanish vapour variety various vast vault vegetable vehicle veil vein velvet vendor venture venue verb verify version very vessel veteran viable vibrant vice victim victory video view village vintage violin virtual virus visa visit visual vital vivid vocal voice void volcano volume vote voyage wage waist wait wake walk wall walnut want warfare warm warrior wash wasp waste water wave way wealth weapon wear weary weather wedding weekend weekly weigh weight welcome west wet whale what wheat wheel when where whip whisper white whole why wide widow width wife wild will win wind window wine wing wink winner winter wire wisdom wise wish witness wolf woman wonder wood wool word work world worry worse worst worth would wrap wrist write wrong yard year yellow you young youth zebra zero zone zoo";
const WORDLIST = bip39Words.split(" ");

window.onload = () => {
    if (wallets.length > 0) {
        renderWalletList();
        loadWalletFromIndex(activeIndex);
    }
};

function copyToClipboard(text, label) {
    navigator.clipboard.writeText(text);
    alert(label + " disalin!");
}

function generateMnemonic() {
    let result = [];
    const randomValues = new Uint32Array(12);
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < 12; i++) {
        result.push(WORDLIST[randomValues[i] % WORDLIST.length]);
    }
    return result.join(" ");
}

function generateAddress(pubKeyHex) {
    const hash = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(pubKeyHex)).toString();
    return "one" + hash.substring(0, 29);
}

function getKeysFromMnemonic(mnemonic) {
    const seed = CryptoJS.PBKDF2(mnemonic.trim().toLowerCase(), "mnemonic", {
        keySize: 512 / 32,
        iterations: 2048,
        hasher: CryptoJS.algo.SHA512
    }).toString(CryptoJS.enc.Hex);
    const priv = seed.substring(0, 64);
    const pair = ec.keyFromPrivate(priv, 'hex');
    return { priv, pair, addr: generateAddress(pair.getPublic('hex')) };
}

function saveWallet(mnemonic, address) {
    if (wallets.find(w => w.address === address)) return alert("Sudah ada!");
    wallets.push({ mnemonic, address });
    localStorage.setItem('ob_wallets', JSON.stringify(wallets));
    activeIndex = wallets.length - 1;
    localStorage.setItem('ob_active_idx', activeIndex);
    renderWalletList();
    loadWalletFromIndex(activeIndex);
}

function renderWalletList() {
    const sel = document.getElementById('walletSelector');
    sel.innerHTML = wallets.map((w, i) => `<option value="${i}" ${i == activeIndex ? 'selected' : ''}>Account ${i + 1} (${w.address.substring(0, 10)}...)</option>`).join('');
}

function loadWalletFromIndex(idx) {
    const data = wallets[idx];
    if (!data) return;
    const keys = getKeysFromMnemonic(data.mnemonic);
    currentKeyPair = keys.pair;
    myAddress = data.address;
    document.getElementById('setupView').classList.add('hidden');
    document.getElementById('walletView').classList.remove('hidden');
    document.getElementById('myAddr').innerText = myAddress;
    document.getElementById('displayPriv').innerText = "PRIV: " + keys.priv;
    document.getElementById('displaySeed').innerText = "SEED: " + data.mnemonic;
    updateBalance();
    fetchHistory();
}

function createWallet() {
    const mnemonic = generateMnemonic();
    const userConfirm = prompt(
        "🚨 SIMPAN SEED PHRASE INI! 🚨\n\n" +
        "Salin 12 kata di bawah ini:", 
        mnemonic
    );

    if (userConfirm !== null) {
        const keys = getKeysFromMnemonic(mnemonic);
        saveWallet(mnemonic, keys.addr);
        alert("✅ Wallet Berhasil Dibuat!\nAlamat: " + keys.addr);
    }
}

function importWallet() {
    const m = prompt("Masukkan 12 kata Mnemonic:");
    if (m && m.trim().split(/\s+/).length === 12) {
        const k = getKeysFromMnemonic(m);
        saveWallet(m, k.addr);
    }
}

function addNewWallet() {
    const mode = confirm("OK: Buat Baru | CANCEL: Import");
    mode ? createWallet() : importWallet();
}

function switchWallet(idx) {
    activeIndex = idx;
    localStorage.setItem('ob_active_idx', idx);
    loadWalletFromIndex(idx);
}

async function updateBalance() {
    if (!myAddress) return;
    try {
        const res = await fetch(`${RPC_URL}/balance/${myAddress}`);
        const data = await res.json();
        myBalance = data.balance;
        document.getElementById('myBalance').innerHTML = `${myBalance.toFixed(4)} <span class="text-sm font-normal text-slate-500">ONE</span>`;
    } catch (e) { console.log("RPC Error"); }
}

async function fetchHistory() {
    if (!myAddress) return;
    try {
        const res = await fetch(`${RPC_URL}/blocks`);
        const blocks = await res.json();
        const container = document.getElementById('txHistory');
        let html = "";
        blocks.reverse().forEach(b => {
            if (b.transactions) {
                b.transactions.forEach(tx => {
                    if (tx.fromAddress === myAddress || tx.toAddress === myAddress) {
                        const inc = tx.toAddress === myAddress;
                        html += `<div class="bg-slate-900/50 p-2 rounded-lg border-l-2 ${inc ? 'border-green-500' : 'border-red-500'} text-[10px]">
                            <div class="flex justify-between font-bold">
                                <span>${inc ? 'MASUK' : 'KELUAR'} #${b.index}</span>
                                <span class="${inc ? 'text-green-400' : 'text-red-400'}">${inc ? '+' : '-'}${tx.amount}</span>
                            </div>
                            <div class="text-slate-600 truncate">${inc ? tx.fromAddress : tx.toAddress}</div>
                        </div>`;
                    }
                });
            }
        });
        container.innerHTML = html || '<p class="text-[9px] text-slate-700 text-center italic mt-2">No activity</p>';
    } catch (e) { console.log("History error"); }
}

async function sendTransaction() {
    const to = document.getElementById('toAddr').value.trim();
    const amt = parseFloat(document.getElementById('amount').value);
    if (!to || isNaN(amt) || amt <= 0) return alert("Data salah");
    if (amt + 0.01 > myBalance) return alert("Saldo kurang");
    const pub = currentKeyPair.getPublic('hex');
    const msg = myAddress + to + amt + 0.01 + pub;
    const sig = currentKeyPair.sign(CryptoJS.SHA256(msg).toString()).toDER('hex');
    try {
        const res = await fetch(`${LOCAL_MINER_URL}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: myAddress, to, amount: amt, fee: 0.01, senderPublicKey: pub, signature: sig })
        });
        const result = await res.json();
        if (result.success) {
            alert("Terkirim ke pool!");
            updateBalance();
        } else { alert("Gagal: " + result.message); }
    } catch (e) { alert("Miner Offline!"); }
}

function addNewWallet() {
    document.getElementById('addWalletModal').classList.remove('hidden');
}

function closeAddModal() {
    document.getElementById('addWalletModal').classList.add('hidden');
}

function executeAdd(type) {
    closeAddModal();
    setTimeout(() => {
        if (type === 'create') {
            createWallet();
        } else {
            importWallet();
        }
    }, 300);
}

function toggleSecret() { document.getElementById('secretArea').classList.toggle('hidden'); }
function logout() { if (confirm("Hapus semua wallet?")) { localStorage.clear(); location.reload(); } }

setInterval(updateBalance, 5000);
setInterval(fetchHistory, 10000);