# Blockchain_LD4

## Paleidimas

Prieš pradedant reikia įsidiegti:

- **Node.js** – leidžia vykdyti JavaScript programas ir naudoti npm.
- **Visual Studio Code (VS Code)** – projekto failams atidaryti ir redaguoti.
- **MetaMask** – naršyklės piniginė, skirta prisijungti prie blokų grandinės ir patvirtinti operacijas.
- **Microsoft Edge** arba kitą palaikomą naršyklę.
  Paleidimo eiga:

1. Atsisiųsti projekto aplanką į kompiuterį.
2. Terminale įvykdyti komandą (ši komanda įdiegia visas projekte naudojamas bibliotekas ir įrankius, nurodytus `package.json` faile):

```bash
npm install
```

3. Atidaryti naują terminalo langą ir įvykdyti:

```bash
npm run node
```

Jeigu projekte nėra tokio npm scenarijaus, naudoti:

```bash
npx hardhat node
```

Šis terminalas turi likti atidarytas, kol naudojama programa. Jame paleidžiamas vietinis „Hardhat“ blokų grandinės tinklas.

Naudojami tinklo nustatymai:

- RPC adresas: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Tinklas: `Hardhat Localhost`

4. Atidaryti kitą terminalą ir įvykdyti:

```bash
npm run deploy
```

5. Įdiegti `CarInsurance` išmaniąją sutartį į vietinį blokų grandinės tinklą:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Po įdiegimo terminale pateikiamas išmaniosios sutarties adresas. Jį reikia įrašyti į frontend JavaScript failą ten, kur apibrėžiamas `contractAddress`.

**Svarbu:** jeigu vietinis „Hardhat“ tinklas paleidžiamas iš naujo, ankstesnis sutarties įdiegimas nebegalioja. Tokiu atveju sutartį reikia įdiegti iš naujo ir atnaujinti jos adresą frontend faile.

6. Naršyklėje atidaryti „MetaMask“.
7. Pridėti arba pasirinkti tinklų sąraše vietinį tinklą su šiais parametrais:

   - Network name: `Hardhat Localhost`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency symbol: `ETH`

8. Importuoti vietinio „Hardhat“ tinklo testinių paskyrų adresus, naudojant testinius privačius raktus.
9. Atidaryti projekto `index.html` failą naršyklėje.

## Automatiniai išmaniosios sutarties testai (v0.2)

Automatiniai išmaniosios sutarties testai realizuoti faile `test/CarInsurance.test.js`, naudojant „Hardhat“, „Ethers.js“ ir „Chai“ įrankius.

Testais tikrinamas pagrindinis draudimo proceso scenarijus, dalyvių teisės, netinkamų duomenų apdorojimas, veiksmų eiliškumas, pakartotinių veiksmų prevencija, poliso atšaukimas ir lėšų apskaita.

Kiekvienam testui sukuriama nauja išmaniosios sutarties kopija ir paruošiamos keturios testinės paskyros:

- **Draudikas (`Insurer`)** – sukuria draudimo polisą.
- **Klientas (`Client`)** – įsigyja polisą ir pateikia žalos prašymą.
- **Žalų vertintojas (`Assessor`)** – patvirtina arba atmeta žalos prašymą.
- **Svetimas dalyvis (`Stranger`)** – naudojamas bandant atlikti veiksmus, kuriems neturi teisių.

Testuose naudojamos pradinės reikšmės:

- Draudimo įmoka (`premium`) – 0.1 ETH.
- Maksimalios išmokos rezervas (`reserve`) – 1 ETH.
- Žalos prašymo suma (`claim`) – 0.4 ETH.
- Automobilis – „Toyota Corolla, 2020, DEMO-001“.

## Automatinių testų aprašymas

Automatinių testų failas: `test/CarInsurance.test.js`

Testų paleidimas:

```bash
npx hardhat test
```

### Pagrindinio proceso testas

**Testas:** `sėkminga eiga: sukūrimas, pirkimas, žalos pateikimas ir patvirtinimas`

Tikrina:

- Klientas gali įsigyti jam sukurtą polisą sumokėdamas 0.1 ETH įmoką.
- Įsigijus polisą jo būsena pasikeičia į `Active`.
- Klientas gali pateikti 0.4 ETH žalos prašymą.
- Pateikus prašymą poliso būsena pasikeičia į `ClaimSubmitted`.
- Vertintojas gali patvirtinti žalos prašymą.
- Patvirtinus prašymą poliso būsena pasikeičia į `PaidOut`.
- Klientas gauna 0.4 ETH išmoką.
- Draudikas gauna 0.7 ETH.
- Po išmokėjimo išmaniosios sutarties balansas yra 0 ETH.

### Dalyvių teisių testai

**Testas:** `tik klientas gali įsigyti jam skirtą polisą`.

Tikrina, ar svetimas asmuo negali įsigyti kitam klientui skirto poliso. Taip pat tikrinama, ar poliso būsena lieka `Created`.

**Testas:** `klientas negali patvirtinti žalos prašymo`.

Tikrina, ar klientas negali pats patvirtinti savo pateikto žalos prašymo. Po atmesto veiksmo būsena lieka `ClaimSubmitted`.

**Testas:** `svetimas asmuo negali patvirtinti žalos prašymo`.

Tikrina, ar su polisu nesusijęs asmuo negali patvirtinti žalos prašymo. Po atmesto veiksmo būsena lieka `ClaimSubmitted`.

**Testas:** `vertintojas negali pateikti žalos prašymo kliento vardu`.

Tikrina, ar vertintojas negali pateikti žalos prašymo vietoj kliento. Po atmesto veiksmo būsena lieka `Active`.

**Testas:** `svetimas asmuo negali atšaukti draudiko vardu`.

Tikrina, ar svetimas asmuo negali atšaukti draudikui priklausančio poliso. Po atmesto veiksmo būsena lieka `Created`.

### Netinkamų duomenų testai

**Testas:** `neleidžia sukurti poliso su nuline įmoka`.

Tikrina, ar poliso negalima sukurti nustačius 0 ETH draudimo įmoką.

**Testas:** `neleidžia sukurti poliso, kai rezervas nėra didesnis už įmoką`.

Tikrina, ar poliso negalima sukurti, kai įneštas rezervas yra lygus draudimo įmokai.

**Testas:** `neleidžia sukurti poliso su nuliniu kliento adresu`.

Tikrina, ar kuriant polisą negalima nurodyti nulinio kliento adreso (`address(0)`).

**Testas:** `neleidžia pateikti nulinės žalos sumos`.

Tikrina, ar klientas negali pateikti žalos prašymo, kurio suma yra 0 ETH. Atmetus veiksmą būsena lieka `Active`.

**Testas:** `neleidžia pateikti didesnės žalos nei maksimalus rezervas`.

Tikrina, ar klientas negali pateikti žalos prašymo, kurio suma viršija maksimalų draudimo rezervą. Atmetus veiksmą būsena lieka `Active`.

**Testas:** `neleidžia pateikti žalos be priežasties`.

Tikrina, ar žalos prašyme privaloma nurodyti priežastį.

### Veiksmų eiliškumo ir pakartotinių veiksmų testai

**Testas:** `neleidžia pateikti žalos, kol polisas neįsigytas`.

Tikrina, ar klientas negali pateikti žalos prašymo, kol polisas yra `Created` būsenoje. Po atmesto veiksmo būsena lieka `Created`.

**Testas:** `neleidžia įsigyti poliso antrą kartą`.

Tikrina, ar klientas negali antrą kartą įsigyti jau aktyvuoto poliso. Po atmesto veiksmo būsena lieka `Active`.

**Testas:** `neleidžia pateikti antro žalos prašymo`.

Tikrina, ar klientas negali pateikti antro žalos prašymo, kai pirmasis jau pateiktas. Po atmesto veiksmo būsena lieka `ClaimSubmitted`.

**Testas:** `neleidžia patvirtinti žalos du kartus`.

Tikrina, ar vertintojas negali antrą kartą patvirtinti jau patvirtinto žalos prašymo. Po atmesto veiksmo būsena lieka `PaidOut`.

### Žalos atmetimo ir poliso atšaukimo testai

**Testas:** `vertintojas gali atmesti žalos prašymą`.

Tikrina:

- Vertintojas gali atmesti pateiktą žalos prašymą.
- Poliso būsena pasikeičia į `Rejected`.
- Draudikas gauna 1.1 ETH.
- Po operacijos išmaniosios sutarties balansas yra 0 ETH.

**Testas:** `draudikas gali atšaukti dar neįsigytą polisą`.

Tikrina:

- Draudikas gali atšaukti `Created` būsenos polisą.
- Iškviečiamas poliso atšaukimo įvykis su 1 ETH grąžinama suma.
- Poliso būsena pasikeičia į `Cancelled`.
- Draudikui grąžinamas 1 ETH rezervas.
- Po operacijos išmaniosios sutarties balansas yra 0 ETH.

**Testas:** `klientas gali atšaukti aktyvų polisą ir atgauti 80 procentų įmokos`.

Tikrina:

- Klientas gali atšaukti `Active` būsenos polisą.
- Poliso būsena pasikeičia į `Cancelled`.
- Atšaukimo įvykyje nurodoma, kad klientui grąžinama 0.08 ETH.
- Draudikui tenkanti suma yra 1.02 ETH.
- Patikrinama, kad draudiko balansas padidėja 1.02 ETH.
- Po operacijos išmaniosios sutarties balansas yra 0 ETH.

**Testas:** `neleidžia klientui atšaukti dar neįsigyto poliso`.

Tikrina, ar klientas negali atšaukti dar neįsigyto, `Created` būsenoje esančio poliso. Po atmesto veiksmo būsena lieka `Created`.

Iš viso įgyvendinta **20 automatinių testų** ir visi sėkmingai praėjo.

<img width="776" height="603" alt="image" src="https://github.com/user-attachments/assets/69a1d325-8c99-4b18-befa-36c5555ed82e" />

## GUI ekranvaizdžiai

### Neprisijungta vūsena

<img width="1736" height="915" alt="image-1" src="https://github.com/user-attachments/assets/3a313c22-2061-4dee-b09e-fd654c2de6ca" />

### Prisijungta kaip draudikas

<img width="1183" height="917" alt="image-2" src="https://github.com/user-attachments/assets/36808760-b6b6-4a9c-937b-46fadaba9e06" />
<img width="1015" height="917" alt="image-3" src="https://github.com/user-attachments/assets/496adfb0-a8db-4f21-8f0a-deab0ffdae09" />

### Prisijungta kaip klientas

<img width="1007" height="920" alt="image-4" src="https://github.com/user-attachments/assets/e76a11d7-eee2-4a42-8a0f-9b9ef27d3058" />

### Prisijungta kaip žalų ekspertas

<img width="1012" height="917" alt="image-5" src="https://github.com/user-attachments/assets/9c3989ff-15a4-42ea-8fad-0290198473e3" />

## Rankinis patikrinimas

## Rankinio testavimo atvejai

| Nr. | Testavimo veiksmas                   | Kaip atlikti                                                                                    | Laukiamas rezultatas                                                                                         | Rezultatas        | Įrodymas (ekranvaizdis)   |
| --: | ------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------- | ------------------------- |
|   1 | Sukurti polisą                       | Draudiko paskyra sukuria polisą su klientu ir vertintoju                                        | Poliso būsena `Created`, rezervas užfiksuotas sutartyje                                                      | Sėkmingai atlikta | <img width="1277" height="733" alt="image-6" src="https://github.com/user-attachments/assets/ce96e827-17e6-495a-afe8-aa93960dab3b" /> |
|   2 | Neleistinas poliso sukūrimas         | Sukuriams polisas, kur įmoka didesnė už rezervą                                                 | Transakcija atmetama, polisas nesukuriamas, apskaita nepasikeičia                                            | Sėkmingai atlikta | <img width="1285" height="880" alt="image-7" src="https://github.com/user-attachments/assets/4807513c-4019-4cb7-a613-cb2120c2ead3" />
  |
|   3 | Įsigyti polisą                       | Iš kliento paskyros sumokėti tikslią įmoką                                                      | Būsena pasikeičia į `Active`                                                                                 | Sėkmingai atlikta | <img width="1780" height="905" alt="image-8" src="https://github.com/user-attachments/assets/a099360a-5fd9-4d3a-b9fa-622ecbf2c447" />
  |
|   4 | Pirkti svetimo asmens vardu          | Įsigyti polisą iš pašalinio adreso                                                              | Veiksmas atmetamas, neleidžiama prisijungti                                                                  | Sėkmingai atlikta | <img width="1783" height="923" alt="image-9" src="https://github.com/user-attachments/assets/7ca1f8db-7221-4441-950a-4adaa28fdda0" />
  |
|   5 | Pateikti žalą                        | Klientas pateikia leistiną žalos sumą ir priežastį                                              | Būsena pasikeičia į `ClaimSubmitted`                                                                         | Sėkmingai atlikta | <img width="1132" height="920" alt="image-10" src="https://github.com/user-attachments/assets/4f55419e-ec03-4016-9bfd-7137f2c48f52" />
 |
|   6 | Pateikti žalą kaip pašalinis asmuo   | Prisijugus kitu adresu bandoma pateikti žalą                                                    | Veiksmas atmetamas, nėra rodomas reikiamas funkcionalumas                                                    | Sėkmingai atlikta | <img width="1783" height="923" alt="image-9" src="https://github.com/user-attachments/assets/d17143c2-20ad-4a46-ae4c-45928a5d5522" />
  |
|   7 | Patvirtinti žalą                     | Žalų vertintojas patvirtina pateiktą žalą                                                       | Būsena tampa `PaidOut`, išmokos atliekamos pagal sutarties taisykles                                         | Sėkmingai atlikta | <img width="1122" height="912" alt="image-11" src="https://github.com/user-attachments/assets/1ad0f416-f094-4fcf-b51d-c7b66f5ddcdd" />
 |
|   8 | Atmesti žalą                         | Kitam polisui žalų vertintojas atmeta pateiktą žalą                                             | Būsena tampa `Rejected`, išmoka atliekama pagal sutarties taisykles                                          | Sėkmingai atlikta | <img width="1122" height="917" alt="image-12" src="https://github.com/user-attachments/assets/2f66a3df-e12c-4764-85ac-3769310244e2" />
 |
|   9 | Atmesti veiksmą netinkamu adresu     | Klientas arba pašalinis asmuo bando patvirtinti arba atmesti žalą                               | Nėra rodomas šiam veiksmui reikalingas funkcionalumas                                                        | Sėkmingai atlikta | <img width="1783" height="923" alt="image-9" src="https://github.com/user-attachments/assets/595f6da8-4eeb-484c-a437-73c9f35a10ca" />
  |
|  10 | Pakartoti jau įvykdytą veiksmą       | Bandoma dar kartą patvirtinti jau išmokėtą žalą                                                 | Antra išmoka neatliekama, būsena lieka `PaidOut`, nėra rodoma pakartotinam veiksmui reikalingo funkcionalumo | Sėkmingai atlikta | <img width="1122" height="912" alt="image-11" src="https://github.com/user-attachments/assets/91ab7164-49ea-41f1-8ccb-15cfbb555bdf" />
 |
|  11 | Atšaukti polisą draudiko vardu       | Draudikas bando atšaukti `Created` polisą                                                       | Būsena tampa `Cancelled`, rezervas grąžinamas draudikui                                                      | Sėkmingai atlikta | <img width="1132" height="926" alt="image-13" src="https://github.com/user-attachments/assets/dd32c4cc-80a8-4e95-a203-70e33182c34f" />
 |
|  12 | Atšaukti aktyvų polisą kliento vardu | Klientas atšaukia `Active` polisą                                                               | Būsena tampa `Cancelled`, klientui grąžinama sutartyje numatytos įmokos dalis (80%)                          | Sėkmingai atlikta | <img width="1132" height="917" alt="image-14" src="https://github.com/user-attachments/assets/50553d07-6003-4dfd-a1df-d8379553dedb" />
 |
|  13 | Atšaukti polisą su pateikta žala     | Bandoma atšaukti polisą kliento vardu po žalos prašymo pateikimo, kurio būsena `ClaimSubmitted` | Veiksmas atmetamas, nėra rodomas šiam veiksmui reikalingas funkcionalumas                                    | Sėkmingai atlikta | <img width="1127" height="928" alt="image-15" src="https://github.com/user-attachments/assets/754461c5-93a9-4be2-91fc-463f03a3eb62" />
 |

**Pastaba:** klientas gali atšaukti tik `Active` polisą, o draudikas – tik `Created` polisą.
