const fs = require('fs');
const readline = require('readline');
const axios = require('axios');
const { program } = require('commander');

const filePath = 'transactions.csv';

// Returns the latest exchange rate for the given token symbol
async function getExchangeRate(tokenSymbol) {
  const url = `https://min-api.cryptocompare.com/data/price?fsym=${tokenSymbol}&tsyms=USD`;
  const response = await axios.get(url);
  return response.data.USD;
}

// Returns the portfolio value for the given token symbol and date
async function getPortfolioValue(tokenSymbol, date) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  let portfolio = {};
  for await (const line of rl) {
    const [timestamp, transactionType, symbol, amount] = line.split(',');
    const transactionDate = new Date(parseInt(timestamp) * 1000).toISOString().substring(0, 10);
    if (date && transactionDate > date) {
      break;
    }
    if (!portfolio[symbol]) {
      portfolio[symbol] = 0;
    }
    if (transactionType === 'DEPOSIT') {
      portfolio[symbol] += parseFloat(amount);
    } else if (transactionType === 'WITHDRAWAL') {
      portfolio[symbol] -= parseFloat(amount);
    }
  }
  if (tokenSymbol) {
    const exchangeRate = await getExchangeRate(tokenSymbol);
    const value = portfolio[tokenSymbol] * exchangeRate;
    console.log(`Your ${tokenSymbol} portfolio value is ${value.toFixed(2)} USD`);
  } else {
    const values = {};
    for (const [symbol, amount] of Object.entries(portfolio)) {
      const exchangeRate = await getExchangeRate(symbol);
      values[symbol] = amount * exchangeRate;
    }
    console.log(`Your portfolio value is:`);
    console.table(values);
  }
}

// Handle command-line options
program
  .option('-t, --token <token>', 'get the latest portfolio value for a token')
  .option('-d, --date <date>', 'get the portfolio value per token on a specific date')
  .parse(process.argv);

if (program.date) {
  getPortfolioValue(program.token, program.date);
} else if (program.token) {
  getPortfolioValue(program.token, null);
} else {
  getPortfolioValue(null, null);
}