/* =========================================================
   CryptoAcademy — Data layer
   Edit this file to change lessons, quiz, FAQ, or credentials.
   ========================================================= */

const LS = {
  lessons:   'ca_lessons_v1',
  completed: 'ca_completed_v1',
  quiz:      'ca_quizbest_v1'
};

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'crypto123';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
  {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
);

const DEFAULT_LESSONS = [
  {
    id: 'l1', icon: '💡', level: 'beginner', duration: '5 min',
    title: 'What is Cryptocurrency?',
    summary: 'The plain-English definition of digital money and why it exists.',
    content: [
      'Cryptocurrency is digital money that runs on a decentralised network of computers instead of being issued by a bank or government. Ownership and transfers are recorded on a public ledger that anyone can inspect.',
      'Bitcoin, launched in 2009 by the pseudonymous Satoshi Nakamoto, was the first working example. It proved that a network of strangers could agree on who owns what without a middleman.',
      'A normal bank balance is just an entry in the bank\'s private database — you trust the bank to be honest and solvent. With crypto, the ledger is replicated across thousands of machines, so no single party can quietly rewrite history.',
      'Price is set purely by supply and demand. There is no company behind Bitcoin to report earnings, which is why the market is far more volatile than stocks or currencies.'
    ],
    keyPoints: [
      'Crypto is digital money secured by cryptography',
      'No central authority issues or controls it',
      'Transactions live on a public, replicated ledger',
      'Value comes from supply, demand and adoption'
    ]
  },
  {
    id: 'l2', icon: '⛓️', level: 'beginner', duration: '6 min',
    title: 'How a Blockchain Actually Works',
    summary: 'Blocks, hashes, and why changing history is practically impossible.',
    content: [
      'A blockchain is a chain of "blocks", each containing a batch of transactions plus a fingerprint (hash) of the previous block. Because every block references the one before it, altering an old block breaks every block after it.',
      'Nodes — computers running the network software — independently verify each new block against the rules of the protocol. If a block is invalid, they simply ignore it.',
      'Consensus is how nodes agree on the order of events. Bitcoin uses proof-of-work (mining), where computers spend electricity to compete for the right to add a block. Most newer chains use proof-of-stake, where validators lock up coins as collateral.',
      'The practical result: the ledger is public, append-only, and extremely difficult to tamper with. That property is what makes trustless transfers possible.'
    ],
    keyPoints: [
      'Each block contains a hash of the previous block',
      'Nodes verify every transaction independently',
      'Proof-of-work and proof-of-stake are two consensus methods',
      'The ledger is append-only and hard to rewrite'
    ]
  },
  {
    id: 'l3', icon: '🔑', level: 'beginner', duration: '7 min',
    title: 'Wallets, Keys & Seed Phrases',
    summary: 'The single most important lesson: who actually controls your coins.',
    content: [
      'A crypto wallet does not store coins. Coins live on the blockchain; the wallet stores the keys that let you move them. A public key is your address — safe to share. A private key is the password that authorises spending — never share it.',
      'A seed phrase (usually 12 or 24 words) is a human-readable backup of your private keys. Anyone who has those words can restore your wallet and drain it. Write them on paper or metal, keep them offline, and never type them into a website or send them to "support".',
      'Wallets come in two flavours. Hot wallets (browser extensions, mobile apps) are connected to the internet and convenient. Cold wallets (hardware devices) keep keys offline and are safer for larger amounts.',
      'Custodial wallets — the kind you get on an exchange — hold the keys for you. That is convenient but means you are trusting a company. Hence the saying: not your keys, not your crypto.'
    ],
    keyPoints: [
      'Coins are on-chain; wallets hold the keys',
      'Never share your private key or seed phrase',
      'Hardware wallets keep keys offline',
      'Exchange balances are custodial — the exchange holds the keys'
    ]
  },
  {
    id: 'l4', icon: '🛒', level: 'beginner', duration: '6 min',
    title: 'Buying Your First Crypto',
    summary: 'A safe, boring, step-by-step first purchase.',
    content: [
      'Start with a reputable regulated exchange in your country. Verify your identity, enable two-factor authentication (an app, not SMS), and set up withdrawal whitelists if available.',
      'Buy a small amount of a major asset first — Bitcoin or Ether — so you can practise the full cycle: buying, withdrawing to your own wallet, and sending a small test transaction.',
      'Always do a tiny test transfer before sending a large amount. Copy addresses by pasting and check the first and last four characters. Crypto transactions are irreversible; there is no "undo" and no chargeback.',
      'Only invest money you could genuinely afford to lose. Position sizing is the most underrated risk control in this market.'
    ],
    keyPoints: [
      'Use a regulated exchange with 2FA enabled',
      'Practise with small amounts first',
      'Send a test transaction before large transfers',
      'Never invest money you cannot afford to lose'
    ]
  },
  {
    id: 'l5', icon: '📊', level: 'intermediate', duration: '7 min',
    title: 'Exchanges & Order Types',
    summary: 'Market orders, limit orders, spreads and liquidity explained.',
    content: [
      'A centralised exchange (CEX) matches buyers and sellers in an order book, much like a stock broker. A decentralised exchange (DEX) uses smart contracts so you trade directly from your wallet — no account, no custodian, but you pay network fees.',
      'A market order executes immediately at the best available price. A limit order only executes at your chosen price or better, but it may never fill. Stop-loss orders trigger a sale when price crosses a threshold, useful for risk management.',
      'The spread is the gap between the best bid and best ask. Thin order books mean wider spreads and worse execution — check liquidity before trading a small-cap token.',
      'Fees stack up: trading fees, network (gas) fees, and withdrawal fees. Frequent small trades can quietly erode returns.'
    ],
    keyPoints: [
      'CEX = order book with a custodian; DEX = on-chain smart contracts',
      'Market orders fill now; limit orders fill at your price',
      'Wide spreads mean poor liquidity',
      'Fees compound — trade less, trade larger'
    ]
  },
  {
    id: 'l6', icon: '🧩', level: 'intermediate', duration: '8 min',
    title: 'Smart Contracts & DeFi',
    summary: 'Programmable money, lending, and the risks that come with it.',
    content: [
      'A smart contract is code deployed to a blockchain that runs exactly as written. Because it is public and immutable, anyone can audit the logic — and anyone can interact with it without asking permission.',
      'DeFi (decentralised finance) uses smart contracts for lending, borrowing, trading and earning yield, all without a bank. You deposit collateral, borrow against it, and if the collateral value falls too far, the position is liquidated automatically.',
      'The main risks are smart contract bugs, oracle failures, and economic exploits. A protocol offering 200% APY is usually paying you to take on risk you have not fully priced in.',
      'Before using any protocol, check the audit history, total value locked, how long it has been live, and whether the code is upgradeable by a small team.'
    ],
    keyPoints: [
      'Smart contracts execute automatically and are publicly auditable',
      'DeFi replaces intermediaries with code',
      'Liquidation risk is real when borrowing against collateral',
      'Extreme yields usually signal extreme risk'
    ]
  },
  {
    id: 'l7', icon: '🛡️', level: 'beginner', duration: '6 min',
    title: 'Security, Scams & Costly Mistakes',
    summary: 'The scams that actually get people, and how to spot them.',
    content: [
      'The most common attacks are not technical — they are social. Fake "support" accounts on social media, phishing sites that clone a popular exchange, and giveaways that ask you to send crypto first. No legitimate service will ever ask for your seed phrase.',
      'Watch for approval scams: malicious dApps request unlimited token approvals so they can drain your wallet later. Review and revoke approvals periodically.',
      'Avoid clicking links in DMs, even from accounts you think you recognise. Type exchange URLs manually or use a bookmark.',
      'Operationally: use a dedicated browser profile or device for crypto, keep your seed phrase offline, and split funds between a hot wallet for daily use and a cold wallet for savings.'
    ],
    keyPoints: [
      'Nobody legitimate ever needs your seed phrase',
      'Phishing clones and fake support accounts are the top threat',
      'Revoke unused token approvals',
      'Separate hot wallet and cold storage'
    ]
  },
  {
    id: 'l8', icon: '📈', level: 'advanced', duration: '8 min',
    title: 'Reading the Market',
    summary: 'Market cap, volume, halving cycles and a sane risk framework.',
    content: [
      'Market cap (price × circulating supply) is a better size comparison than price. A $0.0001 token can have a larger market cap than a $50 token — the unit price tells you nothing on its own.',
      'Volume and open interest indicate how much real activity is behind a move. A price rise on thin volume is fragile. On-chain data — active addresses, exchange inflows, stablecoin supply — adds context that charts alone miss.',
      'Bitcoin\'s supply is capped at 21 million coins, with new issuance halving roughly every four years. Many analysts map cycles to these halvings, though past patterns are not guarantees.',
      'Build a written plan before you buy: position size, invalidation level, and exit targets. The market is designed to test your emotions — a written plan is the best defence against your own impulses.'
    ],
    keyPoints: [
      'Market cap compares size, unit price does not',
      'Volume confirms or contradicts a move',
      'Bitcoin supply is capped at 21 million',
      'Write your plan before you enter a trade'
    ]
  }
];

const QUIZ = [
  {
    q: 'What does a blockchain primarily provide?',
    options: ['A way to make free money', 'A distributed, tamper-resistant ledger', 'A private database owned by a bank', 'A faster version of PayPal'],
    answer: 1
  },
  {
    q: 'Which of these should you NEVER share with anyone?',
    options: ['Your public wallet address', 'Your seed phrase / private key', 'A transaction ID', 'Your favourite coin'],
    answer: 1
  },
  {
    q: 'What is a seed phrase?',
    options: ['A password for your email', '12–24 words that can restore your wallet', 'A type of mining reward', 'The name of a trading strategy'],
    answer: 1
  },
  {
    q: 'What is a "gas fee"?',
    options: ['A fee paid to process a transaction on a network', 'A tax charged by the government', 'The cost of a hardware wallet', 'A fee paid to your bank'],
    answer: 0
  },
  {
    q: '"Not your keys, not your crypto" means…',
    options: ['You should never own keys', 'If a third party holds your keys, you do not truly control the assets', 'Only Bitcoin has keys', 'Keys are unnecessary with exchanges'],
    answer: 1
  }
];

const FAQS = [
  { q: 'Do I need to buy crypto to use this site?', a: 'No. Every module is free and none of them require you to own anything. Think of it as a textbook, not a trading app.' },
  { q: 'Is this financial advice?', a: 'Absolutely not. This is an educational demo covering how the technology works. Do your own research before making any financial decision.' },
  { q: 'How is my progress stored?', a: 'Progress and quiz scores are saved in your browser\'s localStorage. Nothing is sent to a server — clear your browser data and it resets.' },
  { q: 'Can I add my own lessons?', a: 'Yes — sign in with the admin credentials, then use the content manager to create, edit or delete lessons. Changes persist in your browser.' },
  { q: 'Where can I learn more?', a: 'Read the original Bitcoin whitepaper, follow protocol documentation for whichever chain interests you, and treat every influencer recommendation with suspicion.' }
];