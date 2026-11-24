# Blockchain_LD4

## Sprendžiama problema

Tradiciniame automobilio draudime klientas privalo pasitikėti draudimo bendrove, kad įvykus draudiminiam įvykiui įmonė turės
pakankamai pinigų ir išmokės žalos atlyginimą, o bendrovė rizikuoja susidurti su nepagrįstomis ar suklastotomis pretenzijomis.
Ši išmanioji sutartis išsprendžia abipusio pasitikėjimo problemą: ji laikinai užšaldo draudiko išmokos rezervą ir kliento draudimo įmoką blokų grandinėje. Sukauptos lėšos paskirstomos automatiškai pagal iš anksto sutartyje užfiksuotas taisykles tik tada, kai nepriklausomas žalų ekspertas patvirtina įvykį ir žalos dydį.

## Dalyviai

Procese dalyvauja trys šalys (demonstruojamos skirtingomis Ethereum paskyromis):

1. **Draudikas (Insurer)** – draudimo paslaugos teikėjas, formuoja polisą ir garantuoja išmokos rezervą.
2. **Klientas (Client)** – automobilio savininkas, įsigyja draudimo polisą ir gali registruoti patirtą žalą.
3. **Žalų ekspertas (Assessor)** – nepriklausomas vertintojas (pvz., autoservisas arba nepriklausomas ekspertas), vertina įvykio pagrįstumą.

## Dalyvių teisės

- **Draudikas (Insurer):**
  - Sukurti naują draudimo polisą nurodant automobilio duomenis, įmokos kainą, kliento bei eksperto adresus, ir įnešti maksimalios išmokos rezervą.
  - Atšaukti dar kliento nenupirktą polisą (`Created` būsenoje) ir susigrąžinti visą įneštą rezervą.
  - Negali vienašališkai atsiimti lėšų po to, kai klientas aktyvuoja polisą, ir negali pats vertinti pretenzijų.
- **Klientas (Client):**
  - Nupirkti jam skirtą polisą, pervesdamas tikslią draudimo įmokos sumą.
  - Nutraukti aktyvų polisą (`Active` būsenoje) iki draudiminio įvykio ir susigrąžinti 80 % įmokos.
  - Užregistruoti draudiminį įvykį (pateikti pretenziją) galiojančiam polisui.
  - Negali pats patvirtinti savo žalos ir negali reikalauti didesnės išmokos nei maksimali poliso suma.
- **Žalų ekspertas (Assessor):**
  - Patvirtinti arba atmesti kliento pateiktą pretenziją (`ClaimSubmitted` būsenoje).
  - Negali keisti poliso sumų ar atsiimti sutartyje esančių lėšų.

## Pagrindinis scenarijus

1. Draudikas sukuria draudimo polisą, nustato įmokos dydį ir įneša išmokos rezervą į sutartį.
2. Klientas nusiperka polisą ir sumoka draudimo įmoką į sutartį.
3. Įvykus avarijai, klientas užregistruoja pretenziją ir nurodo žalos sumą.
4. Žalų ekspertas įvertina įvykį ir patvirtina žalą; klientui išmokama žalos suma, o draudikui grąžinamas rezervo likutis ir įmoka.
5. Jei žalų ekspertas pretenziją atmeta, visas rezervas ir kliento įmoka grąžinami draudikui.
6. Kol polisas dar nenupirktas, draudikas gali jį atšaukti ir susigrąžinti visą rezervo sumą; o jau aktyvų polisą iki įvykio gali nutraukti klientas ir susigrąžinti 80 % įmokos.

## Proceso taisyklės

- **Role pagrįsta prieiga:** Kiekvieną būseną keičiančią funkciją gali iškviesti tik konkrečiam polisui priskirtas dalyvio adresas (`insurer`, `client` arba `assessor`).
- **Dalyvių atskyrimas:** Draudiko, kliento ir eksperto adresai privalo būti trys skirtingi, nenuliniai adresai.
- **Griežta veiksmų seka:** Veiksmai leidžiami tik atitinkamoje būsenoje (pvz., negalima pateikti pretenzijos neapmokėtam polisui arba atšaukti poliso jau pateikus pretenziją).
- **Tiksli lėšų apskaita:**
  - Kurdamas polisą draudikas privalo įnešti rezervą, didesnį už įmoką.
  - Pirkdamas polisą klientas privalo sumokėti lygiai tokią sumą, kokia nurodyta polise.
  - Prašoma žalos suma turi būti didesnė už `0` ir neviršyti maksimalios išmokos.
- **Apsauga nuo pakartotinio išmokėjimo:** Pasiekus galutinę būseną (`PaidOut`, `Rejected` arba `Cancelled`), polisas užrakinamas ir joks pakartotinis lėšų išmokėjimas ar būsenos keitimas yra neįmanomas.

## Dalyvių sąveika pateikiama sekų diagrama

///////////////////////////////////////////////////////////////////////////////////////////////////

**Trumpas diagramos veiksmų paaiškinimas:**

- **1 veiksmas (`createPolicy`):** Draudikas sukuria polisą ir į sutartį perveda maksimalios išmokos rezervą.
- **2 veiksmas (`buyPolicy`):** Klientas aktyvuoja draudimą, sumokėdamas polise nustatytą įmoką.
- **3a / 3b veiksmai (`cancelByInsurer` / `cancelByClient`):** Alternatyvios atšaukimo eigos – draudikas gali atšaukti dar nenupirktą polisą, o klientas gali nutraukti aktyvų polisą su 20 % bauda.
- **4 veiksmas (`submitClaim`):** Klientas užregistruoja draudiminį įvykį, nurodydamas remonto sumą ir aprašymą.
- **5a / 5b veiksmai (`approveClaim` / `rejectClaim`):** Ekspertas užbaigia procesą – patvirtinus žalą, sutartis padalina lėšas tarp kliento ir draudiko, o atmetus – visas lėšas grąžina draudikui.

## Ką užtikrina sutartis, kokios prielaidos/apribojimai lieka

- **Ką užtikrina sutartis:**
  - Užtikrina, kad lėšos tikrai yra rezervuotos sutartyje dar prieš klientui perkant polisą.
  - Užtikrina, kad nei draudikas, nei klientas negali vienašališkai pasisavinti svetimų lėšų.
  - Garantuojamas lėšų paskirstymas pagal eksperto sprendimą ir apsauga nuo pakartotinio išmokėjimo.
  - Visi esminiai būsenos pokyčiai užfiksuojami blokų grandinės įvykiais (_events_).
- **Prielaidos ir apribojimai:**
  - Išmanioji sutartis pati negali patikrinti, ar tikrai įvyko avarija ir kokia yra reali remonto kaina, todėl remiasi prielaida, kad žalų ekspertas yra sąžiningas.
  - Visi blokų grandinėje įrašyti duomenys (adresai, sumos, įvykio aprašymas) yra viešai matomi, todėl jautrūs asmens duomenys ar avarijos nuotraukos turėtų būti saugomi už grandinės ribų.
  - Jei klientas nenusiperka sukurto poliso, draudikas gali atgauti lėšas per `cancelByInsurer`. Tačiau jei klientas pateikė pretenziją, o ekspertas delsia priimti sprendimą, šioje versijoje lėšos lieka užšaldytos sutartyje iki sprendimo priėmimo (ateityje tai būtų galima spręsti įvedant laiko terminus per `block.timestamp`).

## Mano modelio skirtumas nuo bazinio scenarijaus:

Mano modelis nėra tęsinys/patobulinimas užduoties apraše pateikto modelio, bet noriu pagrįsti, kodėl mano modelis yra solidus, nes jis keičia lėšų saugojimo, būsenų ir sprendimų priėmimo logiką šiais sprendimais:

1. **Dvipusis lėšų užšaldymas (_Two-sided Escrow_):** Baziniame modelyje pinigus į sutartį įneša tik viena šalis (pirkėjas). Šiame modelyje sutartis vienu metu valdo ir apskaito **dviejų skirtingų šalių lėšas** – draudiko iš anksto užšaldytą didelį išmokos rezervą (`maxCoverage`) ir kliento sumokėtą draudimo įmoką (`premium`).
2. **Kintama žalos suma ir lėšų padalinimas vienoje transakcijoje:** Baziniame modelyje išmokama visa iš anksto fiksuota prekės kaina. Draudimo modelyje klientas nurodo faktinę remonto sumą (`claimAmount`), o ekspertui patvirtinus, sutartis atlieka **dvigubą išmokėjimą**: dalį rezervo perveda klientui žalai padengti, o nepanaudotą rezervo likutį kartu su įmoka apskaičiuoja ir grąžina draudikui.
3. **Dvi skirtingos atšaukimo eigos su procentine bauda:** Vietoj paprasto 100 % pinigų grąžinimo, įgyvendintos dvi nutraukimo šakos: draudikas gali atšaukti dar nenupirktą polisą susigrąžindamas 100 % rezervo, o klientas gali nutraukti jau aktyvų polisą tik su **80/20 taisykle** (atgauna 80 % įmokos, o 20 % lieka draudikui kaip administracinis mokestis).
4. **Kelių polisų registras:** Vietoj vienos prekės ir vieno užsakymo, sutartyje suprojektuotas neriboto skaičiaus draudimo polisų valdymas pagal unikalų poliso identifikatorių (`mapping(uint256 => Policy)`).

## Diegimas, pradiniai duomenys ir testavimas (v0.1)

### Projekto paruošimas ir testavimas

Norint įdiegti priklausomybes ir paleisti automatinius testus, terminale įvesti komandą:

```bash
npm install
npm test
```

### Diegimo scenarijus ir komandos

Sutarties diegimas atliekamas per scenarijų `scripts/deploy.js`. Tam reikalingi du terminalai:

- **1 terminalas** (paleidžia vietinį Hardhat Ethereum tinklą adresu `http://127.0.0.1:8545`, Chain ID `31337`):
  ```bash
  npm run node
  ```
- **2 terminalas** (įdiegia sutartį į vietinį tinklą ir sukuria pradinį polisą):
  ```bash
  npm run deploy
  ```
- **Pilnos sėkmingos eigos simuliacija vietiniame tinkle**:
  ```bash
  npm run demo
  ```

### Pradinės dalyvių paskyros (Hardhat lokalus tinklas)

Diegimo scenarijus (`scripts/deploy.js`) automatiškai priskiria pirmąsias tris vietinio Hardhat tinklo testines paskyras:

- **Draudikas (`Insurer`):** Hardhat paskyra `#0` (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`)
- **Klientas (`Client`):** Hardhat paskyra `#1` (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`)
- **Žalų ekspertas (`Assessor`):** Hardhat paskyra `#2` (`0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`)

### Pradiniai duomenys

Diegimo metu sutartyje automatiškai sukuriamas pirmasis demonstracinis polisas (`policyId = 1`) su šiais duomenimis:

- **Automobilis (`carInfo`):** `Toyota Corolla, 2020, DEMO-001`
- **Draudimo įmoka (`premium`):** `0.1 ETH` (`100000000000000000 wei`)
- **Išmokos rezervas (`maxCoverage`):** `1.0 ETH` (`1000000000000000000 wei`)
- **Pradinė būsena:** `Created`
