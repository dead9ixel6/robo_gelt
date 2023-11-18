require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');
const { calculateRSI, calculateFibonacciLevels, calculateMovingAverage } = require('./indicators');
const { generateTradingSignal , detectCrossOver } = require('./magic')
const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);

const shortTermMA = 50; // For testing
const longTermMA = 200; // For testing

async function main() {
    try {
        await client.connect();
        console.log("Connected successfully to MongoDB");

        setInterval(async () => {
            await fetchBinanceData('4h', 'rsi');
        }, 10000);

        setInterval(async () => {
            await fetchBinanceData('15m', 'fibonacci');
            await fetchBinanceDataForMA('1d', 'moving-averages');
        }, 60000); // Reduced interval for testing
    } catch (e) {
        console.error(e);
    }
}


const fetchBinanceAPI = async (interval) => {
    try {
        // Determine the limit based on the interval
        const limit = interval === '1d' ? shortTermMA : 14; // Fetch 14 periods for RSI calculation

        const response = await axios.get('https://fapi.binance.com/fapi/v1/klines', {
            params: {
                symbol: 'BTCUSDT',
                interval: interval,
                limit: limit
            }
        });

        // Parse the data based on the interval
        if (interval === '1d') {
            // For daily intervals (used for moving averages)
            const prices = response.data.map(kline => parseFloat(kline[4]));
            console.log(`Fetched daily prices for moving averages: ${prices}`);
            return prices;
        } else {
            // For non-daily intervals (used for RSI calculation)
            const closingPrices = response.data.map(kline => parseFloat(kline[4]));
            console.log(`Fetched closing prices for RSI calculation: ${closingPrices}`);
            return closingPrices; // Returning an array of closing prices
        }
    } catch (error) {
        console.error(`Error fetching Binance data: ${error.message}`);
        return null;
    }
};


const fetchBinanceDataForMA = async (interval, indicator) => {
    const prices = await fetchBinanceAPI(interval);
    if (!prices) {
        console.log("No prices fetched for moving averages");
        return;
    }

    await storePrices(prices, indicator);

    const movingAverageData = await getDataFromMongo(indicator);
    const shortTermMAValues = calculateMovingAverage(movingAverageData, shortTermMA);
    const longTermMAValues = calculateMovingAverage(movingAverageData, longTermMA);

    console.log(`Short-term MA (${shortTermMA} days): ${shortTermMAValues[0]}`);
    console.log(`Long-term MA (${longTermMA} days): ${longTermMAValues[0]}`);
    detectCrossOver(shortTermMAValues, longTermMAValues);
};


const fetchBinanceData = async (interval, indicator) => {
    const apiData = await fetchBinanceAPI(interval);

    if (!apiData) {
        console.log("No API data fetched");
        return;
    }

    if (indicator === 'rsi') {
        const rsiData = apiData; // Directly using the latest price for RSI calculation
        const rsi = calculateRSI(rsiData); // Adjust calculateRSI to work with direct price data
        console.log(`RSI (${interval}): ${rsi}`);
        console.log(generateTradingSignal(rsi))
    } else if (indicator === 'fibonacci') {
        const fibonacciData = await getDataFromMongo(indicator);
        if (!fibonacciData || fibonacciData.length < 2) {
            console.log("Insufficient data for Fibonacci calculation");
            return;
        }

        const high = Math.max(...fibonacciData);
        const low = Math.min(...fibonacciData);
        const fibonacciLevels = calculateFibonacciLevels(high, low);
        console.log(`Fibonacci Levels (${interval}):`, fibonacciLevels);

        if (Object.values(fibonacciLevels).some(level => isNaN(level))) {
            console.log("Fibonacci calculation error: Invalid levels detected");
        }
    }
};


const storePrices = async (prices, indicator) => {
    const db = client.db("robo_gelt");
    const collection = db.collection(indicator);
    for (let price of prices) {
        await collection.insertOne({ date: new Date(), price });
        console.log(`Stored price for ${indicator}: ${price}`);
    }
};

const getDataFromMongo = async (indicator) => {
    const db = client.db("robo_gelt");
    const collection = db.collection(indicator);
    const limit = longTermMA;
    const data = await collection.find({}).sort({ _id: -1 }).limit(limit).toArray();
    return data.map(d => d.price);
};




main().catch(console.error);
