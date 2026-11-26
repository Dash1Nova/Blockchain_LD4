const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const expectedChainId = "31337";

const contractABI = [
  "function policyCount() view returns (uint256)",
  "function getPolicy(uint256 policyId) view returns (tuple(address insurer,address client,address assessor,string carInfo,uint256 premium,uint256 maxCoverage,uint256 claimAmount,string reason,uint8 state))",
  "function createPolicy(address client,address assessor,string carInfo,uint256 premium) payable returns (uint256)",
  "function buyPolicy(uint256 policyId) payable",
  "function submitClaim(uint256 policyId,uint256 claimAmount,string reason)",
  "function approveClaim(uint256 policyId)",
  "function rejectClaim(uint256 policyId)",
  "function cancelByInsurer(uint256 policyId)",
  "function cancelByClient(uint256 policyId)",
  "event PolicyCreated(uint256 indexed policyId, address indexed insurer, address indexed client, address assessor, uint256 premium, uint256 maxCoverage)",
  "event PolicyBought(uint256 indexed policyId)",
  "event ClaimSubmitted(uint256 indexed policyId, uint256 claimAmount, string reason)",
  "event ClaimApproved(uint256 indexed policyId, uint256 clientPayment, uint256 insurerPayment)",
  "event ClaimRejected(uint256 indexed policyId, uint256 insurerPayment)",
  "event PolicyCancelledByInsurer(uint256 indexed policyId, uint256 insurerPayment)",
  "event PolicyCancelledByClient(uint256 indexed policyId, uint256 clientRefund, uint256 insurerPayment)",
];

let provider = null;
let signer = null;
let contract = null;

let currentAccount = null;
let currentPolicyId = null;
let currentPolicy = null;

let correctNetwork = false;
let transactionPending = false;

const policyStates = [
  "Sukurtas",
  "Aktyvus",
  "Pateiktas žalos prašymas",
  "Žala išmokėta",
  "Žala atmesta",
  "Atšauktas",
];

const policyStateClasses = [
  "created",
  "active",
  "claimsubmitted",
  "paidout",
  "rejected",
  "cancelled",
];

const elements = {
  connectBtn: document.getElementById("connectBtn"),

  networkBadge: document.getElementById("networkBadge"),
  networkValue: document.getElementById("networkValue"),
  accountValue: document.getElementById("accountValue"),
  roleValue: document.getElementById("roleValue"),
  contractValue: document.getElementById("contractValue"),
  connectionStatus: document.getElementById("connectionStatus"),
  globalMessage: document.getElementById("globalMessage"),

  policyId: document.getElementById("policyId"),
  loadPolicyBtn: document.getElementById("loadPolicyBtn"),
  latestBtn: document.getElementById("latestBtn"),
  policyCount: document.getElementById("policyCount"),

  policyTitle: document.getElementById("policyTitle"),
  policyEmpty: document.getElementById("policyEmpty"),
  policyDetails: document.getElementById("policyDetails"),
  stateBadge: document.getElementById("stateBadge"),

  carInfo: document.getElementById("carInfo"),
  premium: document.getElementById("premium"),
  coverage: document.getElementById("coverage"),
  claimAmount: document.getElementById("claimAmount"),
  claimReason: document.getElementById("claimReason"),

  insurer: document.getElementById("insurer"),
  client: document.getElementById("client"),
  assessor: document.getElementById("assessor"),

  createSection: document.getElementById("createSection"),
  createForm: document.getElementById("createForm"),
  newClient: document.getElementById("newClient"),
  newAssessor: document.getElementById("newAssessor"),
  newCar: document.getElementById("newCar"),
  newPremium: document.getElementById("newPremium"),
  newReserve: document.getElementById("newReserve"),
  createBtn: document.getElementById("createBtn"),

  noActionsMessage: document.getElementById("noActionsMessage"),

  buyAction: document.getElementById("buyAction"),
  claimAction: document.getElementById("claimAction"),
  approveAction: document.getElementById("approveAction"),
  rejectAction: document.getElementById("rejectAction"),
  cancelInsurerAction: document.getElementById("cancelInsurerAction"),
  cancelClientAction: document.getElementById("cancelClientAction"),

  buyBtn: document.getElementById("buyBtn"),
  claimForm: document.getElementById("claimForm"),
  claimValue: document.getElementById("claimValue"),
  claimReasonInput: document.getElementById("claimReasonInput"),
  claimBtn: document.getElementById("claimBtn"),

  approveBtn: document.getElementById("approveBtn"),
  rejectBtn: document.getElementById("rejectBtn"),
  cancelInsurerBtn: document.getElementById("cancelInsurerBtn"),
  cancelClientBtn: document.getElementById("cancelClientBtn"),

  txOverlay: document.getElementById("txOverlay"),
  txTitle: document.getElementById("txTitle"),
  txText: document.getElementById("txText"),
};

async function updateWalletBalance() {
  try {
    const balanceElement = document.getElementById("walletBalance");

    if (!provider || !currentAccount || !correctNetwork) {
      balanceElement.textContent = "— ETH";
      return;
    }

    const balance = await provider.getBalance(currentAccount);

    balanceElement.textContent = `${Number(ethers.formatEther(balance)).toFixed(
      4,
    )} ETH`;
  } catch (error) {
    console.error("Nepavyko gauti balanso:", error);
    document.getElementById("walletBalance").textContent = "Nepavyko įkelti";
  }
}

function showMessage(message, type = "info") {
  elements.globalMessage.textContent = message;
  elements.globalMessage.className = "message";

  if (type === "success") {
    elements.globalMessage.classList.add("success");
  } else if (type === "error") {
    elements.globalMessage.classList.add("error");
  } else if (type === "warning") {
    elements.globalMessage.classList.add("warning");
  }
}

function shortenAddress(address) {
  if (!address) return "—";

  return address.slice(0, 6) + "..." + address.slice(-4);
}

function formatETH(value) {
  return ethers.formatEther(value) + " ETH";
}

function setVisible(element, visible) {
  if (!element) return;
  element.hidden = !visible;
  element.classList.toggle("hidden", !visible);
  element.style.display = "";
}

function showTransaction(title, text) {
  elements.txTitle.textContent = title;
  elements.txText.textContent = text;

  setVisible(elements.txOverlay, true);
}

function hideTransaction() {
  setVisible(elements.txOverlay, false);
}

function isContractAddressConfigured() {
  return ethers.isAddress(contractAddress);
}

function clearPolicy() {
  currentPolicy = null;
  currentPolicyId = null;

  elements.roleValue.textContent = "Nenustatytas";
  elements.policyTitle.textContent = "Pasirinkite polisą";
  elements.stateBadge.textContent = "—";
  elements.stateBadge.className = "badge neutral";

  setVisible(elements.policyEmpty, true);
  setVisible(elements.policyDetails, false);
  setVisible(elements.createSection, false);
  updateActionVisibility();
}

async function connectWallet() {
  try {
    if (!window.ethereum) {
      showMessage("MetaMask nerasta. Įdiekite MetaMask naršyklėje.", "error");
      return;
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (!accounts || accounts.length === 0) {
      showMessage("MetaMask paskyra nepasirinkta.", "warning");
      return;
    }

    await initializeConnection(accounts[0]);

    showMessage(
      "Prisijungta prie paskyros: " + shortenAddress(accounts[0]),
      "success",
    );
  } catch (error) {
    handleError(error);
  }
}

async function initializeConnection(account) {
  const previousPolicyId = currentPolicyId;

  provider = new ethers.BrowserProvider(window.ethereum);
  currentAccount = account;
  signer = await provider.getSigner(account);

  const network = await provider.getNetwork();
  const chainId = network.chainId.toString();

  correctNetwork = chainId === expectedChainId;

  elements.accountValue.textContent = shortenAddress(account);
  elements.networkValue.textContent = getNetworkName(chainId);

  elements.contractValue.textContent = isContractAddressConfigured()
    ? shortenAddress(contractAddress)
    : "Nesukonfigūruota";

  elements.connectionStatus.textContent = "Prijungta";
  elements.connectionStatus.className = "status-pill success";
  elements.connectBtn.textContent = "Piniginė prijungta";
  updateNetworkBadge(chainId);

  if (!isContractAddressConfigured()) {
    contract = null;

    showMessage(
      "Įrašykite savo išmaniosios sutarties adresą app.js faile.",
      "warning",
    );

    clearPolicy();
    return;
  }

  contract = new ethers.Contract(contractAddress, contractABI, signer);

  if (!correctNetwork) {
    showMessage(
      "Netinkamas tinklas. Pasirinkite Hardhat Local (Chain ID 31337).",
      "error",
    );

    clearPolicy();
    await updatePolicyCount();
    return;
  }

  await updatePolicyCount();
  await updateWalletBalance();
  await updateTransactionHistory();

  if (previousPolicyId !== null) {
    await loadPolicy(previousPolicyId);
  } else {
    clearPolicy();
  }
}

function getNetworkName(chainId) {
  if (chainId === "31337") return "Hardhat Local";
  if (chainId === "11155111") return "Sepolia";

  return "Nežinomas tinklas (" + chainId + ")";
}

function updateNetworkBadge(chainId) {
  elements.networkBadge.textContent = getNetworkName(chainId);
  elements.networkBadge.className = "badge";

  if (chainId === expectedChainId) {
    elements.networkBadge.classList.add("success");
  } else {
    elements.networkBadge.classList.add("danger");
  }
}

async function updatePolicyCount() {
  if (!contract || !correctNetwork) {
    elements.policyCount.textContent = "—";
    return;
  }

  try {
    const count = await contract.policyCount();

    elements.policyCount.textContent = count.toString();
  } catch (error) {
    console.error("Nepavyko gauti polisų skaičiaus:", error);
    elements.policyCount.textContent = "Klaida";
  }
}

async function updateTransactionHistory() {
  const historyElement = document.getElementById("transactionHistory");

  if (!historyElement) return;

  if (!contract || !correctNetwork) {
    historyElement.textContent = "Prisijunkite prie tinklo.";
    return;
  }

  try {
    historyElement.textContent = "Kraunama veiksmų istorija...";

    const eventNames = [
      "PolicyCreated",
      "PolicyBought",
      "ClaimSubmitted",
      "ClaimApproved",
      "ClaimRejected",
      "PolicyCancelledByInsurer",
      "PolicyCancelledByClient",
    ];

    let allEvents = [];

    for (const eventName of eventNames) {
      const filter = contract.filters[eventName]();
      const events = await contract.queryFilter(filter, 0, "latest");

      for (const event of events) {
        allEvents.push({
          name: eventName,
          args: event.args,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        });
      }
    }

    allEvents.sort((a, b) => b.blockNumber - a.blockNumber);

    historyElement.replaceChildren();

    if (allEvents.length === 0) {
      historyElement.textContent = "Kol kas veiksmų nėra.";
      return;
    }

    function formatEth(value) {
      return `${Number(ethers.formatEther(value)).toFixed(4)} ETH`;
    }

    function getEventDescription(event) {
      const args = event.args;
      const policyId = args[0].toString();

      switch (event.name) {
        case "PolicyCreated":
          return `Sukurtas polisas #${policyId}. Įmoka: ${formatEth(
            args[4],
          )}. Draudimo rezervas: ${formatEth(args[5])}.`;

        case "PolicyBought":
          return `Nupirktas polisas #${policyId}.`;

        case "ClaimSubmitted":
          return `Pateikta žala polisui #${policyId}. Suma: ${formatEth(
            args[1],
          )}. Priežastis: ${args[2]}`;

        case "ClaimApproved":
          return `Patvirtinta žala polisui #${policyId}. Klientui: ${formatEth(
            args[1],
          )}, draudikui: ${formatEth(args[2])}.`;

        case "ClaimRejected":
          return `Atmesta žala polisui #${policyId}. Draudikui grąžinta: ${formatEth(
            args[1],
          )}.`;

        case "PolicyCancelledByInsurer":
          return `Draudikas atšaukė polisą #${policyId}. Grąžinta: ${formatEth(
            args[1],
          )}.`;

        case "PolicyCancelledByClient":
          return `Klientas atšaukė polisą #${policyId}. Klientui grąžinta: ${formatEth(
            args[1],
          )}.`;

        default:
          return `Poliso #${policyId} veiksmas: ${event.name}`;
      }
    }

    for (const event of allEvents) {
      const item = document.createElement("div");
      item.className = "history-item";

      const description = document.createElement("p");
      description.textContent = getEventDescription(event);

      const block = document.createElement("small");
      block.textContent = `Blokas: ${event.blockNumber}`;

      const hash = document.createElement("small");
      hash.textContent = `Transakcija: ${event.transactionHash.slice(
        0,
        10,
      )}...${event.transactionHash.slice(-8)}`;

      item.append(description, block, hash);
      historyElement.appendChild(item);
    }
  } catch (error) {
    console.error("Nepavyko įkelti veiksmų istorijos:", error);
    historyElement.textContent = "Nepavyko įkelti veiksmų istorijos.";
  }
}

async function loadPolicy(id) {
  try {
    if (!contract || !correctNetwork) {
      showMessage("Pirmiausia prisijunkite prie tinkamo tinklo.", "warning");
      return;
    }

    const policyId = BigInt(id);

    if (policyId < 1n) {
      showMessage("Poliso ID turi būti bent 1.", "error");
      return;
    }

    const count = await contract.policyCount();

    if (policyId > count) {
      showMessage("Polisas su tokiu ID neegzistuoja.", "error");
      return;
    }

    const policy = await contract.getPolicy(policyId);

    currentPolicyId = policyId.toString();
    currentPolicy = policy;

    displayPolicy(policy, currentPolicyId);
    updateRoleUI(policy, currentAccount);
    setVisible(elements.policyEmpty, false);
    setVisible(elements.policyDetails, true);
    showMessage("Poliso duomenys sėkmingai įkelti.", "success");
  } catch (error) {
    handleError(error);
  }
}

function displayPolicy(policy, id) {
  const state = Number(policy.state);

  elements.policyTitle.textContent = "Polisas #" + id;
  elements.stateBadge.textContent = policyStates[state] ?? "Nežinoma būsena";

  elements.carInfo.textContent = policy.carInfo;
  elements.premium.textContent = formatETH(policy.premium);
  elements.coverage.textContent = formatETH(policy.maxCoverage);
  elements.claimAmount.textContent = formatETH(policy.claimAmount);
  elements.claimReason.textContent = policy.reason || "Nenurodyta";

  elements.insurer.textContent = shortenAddress(policy.insurer);
  elements.client.textContent = shortenAddress(policy.client);
  elements.assessor.textContent = shortenAddress(policy.assessor);
  elements.stateBadge.className =
    "badge " + (policyStateClasses[state] ?? "neutral");
}

async function loadLatestPolicy() {
  try {
    if (!contract || !correctNetwork) {
      showMessage("Pirmiausia prisijunkite prie tinkamo tinklo.", "warning");
      return;
    }

    const count = await contract.policyCount();

    if (count === 0n) {
      showMessage("Dar nėra sukurtų polisų.", "warning");
      return;
    }

    await loadPolicy(count);

    elements.policyId.value = count.toString();
  } catch (error) {
    handleError(error);
  }
}

function updateRoleUI(policy, account) {
  if (!policy || !account) {
    elements.roleValue.textContent = "Nenustatytas";
    updateActionVisibility();
    return;
  }

  const address = account.toLowerCase();
  const isInsurer = address === policy.insurer.toLowerCase();
  const isClient = address === policy.client.toLowerCase();
  const isAssessor = address === policy.assessor.toLowerCase();
  let role = "Nėra šio poliso dalyvis";

  if (isInsurer) {
    role = "Draudikas";
  } else if (isClient) {
    role = "Klientas";
  } else if (isAssessor) {
    role = "Žalų vertintojas";
  }

  elements.roleValue.textContent = role;

  updateActionVisibility();
}

function updateActionVisibility() {
  const connected = Boolean(
    currentAccount && signer && contract && correctNetwork,
  );

  const policy = currentPolicy;
  const account = currentAccount;

  let isInsurer = false;
  let isClient = false;
  let isAssessor = false;
  let state = -1;

  if (connected && policy && account) {
    const address = account.toLowerCase();

    isInsurer = address === policy.insurer.toLowerCase();
    isClient = address === policy.client.toLowerCase();
    isAssessor = address === policy.assessor.toLowerCase();

    state = Number(policy.state);
  }

  const canCreatePolicy = connected;
  const canCancelAsInsurer = connected && isInsurer && state === 0;
  const canBuy = connected && isClient && state === 0;
  const canClaim = connected && isClient && state === 1;
  const canCancelAsClient = connected && isClient && state === 1;
  const canAssess = connected && isAssessor && state === 2;

  setVisible(elements.createSection, canCreatePolicy);

  setVisible(elements.buyAction, canBuy);
  setVisible(elements.claimAction, canClaim);
  setVisible(elements.cancelClientAction, canCancelAsClient);
  setVisible(elements.cancelInsurerAction, canCancelAsInsurer);
  setVisible(elements.approveAction, canAssess);
  setVisible(elements.rejectAction, canAssess);

  const hasAction =
    canCreatePolicy ||
    canBuy ||
    canClaim ||
    canAssess ||
    canCancelAsInsurer ||
    canCancelAsClient;

  setVisible(elements.noActionsMessage, connected && !hasAction);

  elements.createBtn.disabled = !canCreatePolicy || transactionPending;
  elements.buyBtn.disabled = !canBuy || transactionPending;
  elements.claimBtn.disabled = !canClaim || transactionPending;
  elements.approveBtn.disabled = !canAssess || transactionPending;
  elements.rejectBtn.disabled = !canAssess || transactionPending;
  elements.cancelInsurerBtn.disabled =
    !canCancelAsInsurer || transactionPending;
  elements.cancelClientBtn.disabled = !canCancelAsClient || transactionPending;
}

async function executeTransaction(title, action) {
  if (!contract || !correctNetwork || !signer) {
    showMessage(
      "Nėra tinkamo prisijungimo prie išmaniosios sutarties.",
      "error",
    );
    return;
  }

  if (transactionPending) return;

  transactionPending = true;
  updateActionVisibility();

  try {
    showTransaction(title, "Patvirtinkite transakciją MetaMask piniginėje.");

    const tx = await action();

    elements.txTitle.textContent = "Transakcija pateikta";
    elements.txText.textContent = "Laukiama, kol tinklas ją patvirtins.";

    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      throw new Error("Transakcija nebuvo sėkmingai patvirtinta.");
    }

    elements.txTitle.textContent = "Transakcija patvirtinta";
    elements.txText.textContent = "Atnaujinami poliso duomenys.";

    await updatePolicyCount();
    await updateWalletBalance();
    await updateTransactionHistory();

    if (currentPolicyId !== null) {
      await loadPolicy(currentPolicyId);
    }

    showMessage("Transakcija sėkmingai patvirtinta.", "success");
    return true;
  } catch (error) {
    handleError(error);
    return false;
  } finally {
    transactionPending = false;

    hideTransaction();

    updateActionVisibility();
  }
}

async function createPolicy(event) {
  event.preventDefault();

  try {
    const client = elements.newClient.value.trim();
    const assessor = elements.newAssessor.value.trim();
    const carInfo = elements.newCar.value.trim();

    const premium = elements.newPremium.value;
    const reserve = elements.newReserve.value;

    if (!ethers.isAddress(client)) {
      throw new Error("Neteisingas kliento Ethereum adresas.");
    }

    if (!ethers.isAddress(assessor)) {
      throw new Error("Neteisingas vertintojo Ethereum adresas.");
    }

    if (
      client.toLowerCase() === currentAccount.toLowerCase() ||
      assessor.toLowerCase() === currentAccount.toLowerCase() ||
      client.toLowerCase() === assessor.toLowerCase()
    ) {
      throw new Error("Draudiko, kliento ir vertintojo adresai turi skirtis.");
    }

    if (!carInfo) {
      throw new Error("Įveskite automobilio informaciją.");
    }

    if (!premium || !reserve) {
      throw new Error("Užpildykite įmokos ir rezervo laukus.");
    }

    const premiumWei = ethers.parseEther(premium);
    const reserveWei = ethers.parseEther(reserve);

    if (premiumWei <= 0n) {
      throw new Error("Draudimo įmoka turi būti didesnė už nulį.");
    }

    if (reserveWei <= premiumWei) {
      throw new Error("Rezervas turi būti didesnis už įmoką.");
    }

    const success = await executeTransaction("Kuriamas draudimo polisas", () =>
      contract.createPolicy(client, assessor, carInfo, premiumWei, {
        value: reserveWei,
      }),
    );

    if (!success) return;

    elements.createForm.reset();

    await loadLatestPolicy();
  } catch (error) {
    handleError(error);
  }
}

async function buyPolicy() {
  if (currentPolicyId === null || !currentPolicy) return;

  await executeTransaction("Įsigyjamas draudimo polisas", () =>
    contract.buyPolicy(currentPolicyId, { value: currentPolicy.premium }),
  );
}

async function submitClaim(event) {
  event.preventDefault();

  if (currentPolicyId === null) return;

  try {
    const amount = elements.claimValue.value;
    const reason = elements.claimReasonInput.value.trim();

    if (!amount || !reason) {
      throw new Error("Užpildykite visus žalos prašymo laukus.");
    }

    const amountWei = ethers.parseEther(amount);

    if (amountWei <= 0n) {
      throw new Error("Žalos suma turi būti didesnė už nulį.");
    }

    if (amountWei > currentPolicy.maxCoverage) {
      throw new Error(
        "Žalos suma negali viršyti maksimalios draudimo apsaugos.",
      );
    }

    await executeTransaction("Pateikiamas žalos prašymas", () =>
      contract.submitClaim(currentPolicyId, amountWei, reason),
    );

    elements.claimForm.reset();
  } catch (error) {
    handleError(error);
  }
}

async function approveClaim() {
  if (currentPolicyId === null) return;

  const confirmed = confirm("Ar tikrai norite patvirtinti žalos prašymą?");

  if (!confirmed) return;

  await executeTransaction("Patvirtinama žala", () =>
    contract.approveClaim(currentPolicyId),
  );
}

async function rejectClaim() {
  if (currentPolicyId === null) return;

  const confirmed = confirm("Ar tikrai norite atmesti žalos prašymą?");

  if (!confirmed) return;

  await executeTransaction("Atmetamas žalos prašymas", () =>
    contract.rejectClaim(currentPolicyId),
  );
}

async function cancelByInsurer() {
  if (currentPolicyId === null) return;

  const confirmed = confirm(
    "Ar tikrai norite atšaukti šį polisą kaip draudikas?",
  );

  if (!confirmed) return;

  await executeTransaction("Draudikas atšaukia polisą", () =>
    contract.cancelByInsurer(currentPolicyId),
  );
}

async function cancelByClient() {
  if (currentPolicyId === null) return;

  const confirmed = confirm(
    "Ar tikrai norite atšaukti aktyvų polisą? Bus grąžinta 80 % įmokos.",
  );

  if (!confirmed) return;

  await executeTransaction("Klientas atšaukia polisą", () =>
    contract.cancelByClient(currentPolicyId),
  );
}

function handleAccountsChanged(accounts) {
  if (!accounts || accounts.length === 0) {
    currentAccount = null;
    signer = null;
    contract = null;

    elements.accountValue.textContent = "Neprijungta";
    elements.connectionStatus.textContent = "Neprisijungta";
    elements.connectionStatus.className = "status-pill danger";
    elements.networkBadge.textContent = "Tinklas nepatikrintas";
    elements.networkBadge.className = "badge warning";
    elements.networkValue.textContent = "Neprijungta";
    elements.connectBtn.textContent = "Prisijungti prie MetaMask";

    document.getElementById("walletBalance").textContent = "— ETH";

    clearPolicy();

    showMessage("MetaMask paskyra atjungta. Prisijunkite iš naujo.", "warning");

    updateActionVisibility();

    return;
  }

  initializeConnection(accounts[0]).catch(handleError);
}

function handleChainChanged() {
  window.location.reload();
}

function handleError(error) {
  console.error(error);

  let message = "Įvyko netikėta klaida.";

  if (error.code === 4001) {
    message = "Transakcija atšaukta MetaMask piniginėje.";
  } else if (error.code === "ACTION_REJECTED") {
    message = "Veiksmas atmestas MetaMask piniginėje.";
  } else if (error.code === "INSUFFICIENT_FUNDS") {
    message = "Nepakanka ETH lėšų transakcijai.";
  } else if (error.reason) {
    message = error.reason;
  } else if (error.shortMessage) {
    message = error.shortMessage;
  } else if (error.message) {
    message = error.message;
  }

  showMessage(message, "error");
}

elements.connectBtn.addEventListener("click", connectWallet);

elements.loadPolicyBtn.addEventListener("click", () => {
  const id = elements.policyId.value.trim();

  if (!id || !/^[1-9]\d*$/.test(id)) {
    showMessage("Įveskite teisingą poliso ID.", "error");
    return;
  }

  loadPolicy(id);
});

elements.latestBtn.addEventListener("click", loadLatestPolicy);

elements.createForm.addEventListener("submit", createPolicy);
elements.buyBtn.addEventListener("click", buyPolicy);
elements.claimForm.addEventListener("submit", submitClaim);
elements.approveBtn.addEventListener("click", approveClaim);
elements.rejectBtn.addEventListener("click", rejectClaim);
elements.cancelInsurerBtn.addEventListener("click", cancelByInsurer);
elements.cancelClientBtn.addEventListener("click", cancelByClient);

if (window.ethereum) {
  window.ethereum.on("accountsChanged", handleAccountsChanged);
  window.ethereum.on("chainChanged", handleChainChanged);
}

clearPolicy();

elements.contractValue.textContent = isContractAddressConfigured()
  ? shortenAddress(contractAddress)
  : "Nesukonfigūruota";
