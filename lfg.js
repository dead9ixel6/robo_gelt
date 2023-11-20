require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');
const { calculateRSI, calculateFibonacciLevels, calculateMovingAverage } = require('./indicators');
const { generateTradingSignal, detectCrossOver, generateFibonacciSignal } = require('./magic');
const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);

const shortTermMA = 50; // For testing
const longTermMA = 200; // For testing
let currentPrice = 0; // Variable to store the current price

async function main() {
    try {
        await client.connect();
        console.log("Connected successfully to MongoDB");

        // Fetch current price initially and set it to the variable
        await updateCurrentPrice('1m'); 

        setInterval(async () => {
            await updateCurrentPrice('1m');
            await fetchBinanceData('4h', 'rsi');
            await fetchBinanceData('4h', 'fibonacci')
        }, 10000);

        setInterval(async () => {
            await fetchDataForMA('moving-averages');
            await fetchRealTimeMovingAverages()
        }, 60000); // Reduced interval for testing
    } catch (e) {
        console.error(e);
    }
}

const fetchBinanceAPI = async (interval, limit) => {
    try {
        // Determine the limit based on the interval

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

const fetchDataForMA = async (indicator) => {
    const movingAverageData = await getDataFromMongo(indicator);
    const shortTermMAValues = calculateMovingAverage(movingAverageData, shortTermMA);
    const longTermMAValues = calculateMovingAverage(movingAverageData, longTermMA);

    console.log(`Short-term MA (${shortTermMA} days): ${shortTermMAValues[0]}`);
    console.log(`Long-term MA (${longTermMA} days): ${longTermMAValues[0]}`);
    detectCrossOver(shortTermMAValues, longTermMAValues);
};

const fetchRealTimeMovingAverages = async () => {
    const shortTermMAData = await fetchBinanceData('15m', 'current-price');
    const longTermMAData = await fetchBinanceData('15m', 'current-price');
    
    if (shortTermMAData && longTermMAData) {
        const shortTermMAValues = calculateMovingAverage(shortTermMAData, shortTermMA);
        const longTermMAValues = calculateMovingAverage(longTermMAData, longTermMA);
    
        console.log(`Short-term MA (${shortTermMA} days): ${shortTermMAValues[0]}`);
        console.log(`Long-term MA (${longTermMA} days): ${longTermMAValues[0]}`);
        detectCrossOver(shortTermMAValues, longTermMAValues);
    } else {
        console.log("No real-time MA data fetched");
    }
};

const fetchBinanceData = async (interval, indicator) => {


    if (indicator === 'rsi') {
        const apiData = await fetchBinanceAPI(interval, '14');
        const rsiData = apiData; // Directly using the latest price for RSI calculation
        const rsi = calculateRSI(rsiData); // Adjust calculateRSI to work with direct price data
        console.log(`RSI (${interval}): ${rsi}`);
        console.log(generateTradingSignal(rsi));
    } else if (indicator === 'fibonacci') {
        console.log('try to get nachy')
        const apiData = await fetchBinanceAPI(interval, '14');
        const latestStoredPrice = await getLatestPriceFromMongo(indicator);

        if (!latestStoredPrice || apiData[0] !== latestStoredPrice) {
            // Insert the new price into MongoDB only if it's different
            await storePrices([apiData[0]], indicator);
        }

        const fibonacciData = await getDataFromMongo(indicator);
        if (!fibonacciData || fibonacciData.length < 2) {
            console.log("Insufficient data for Fibonacci calculation");
            return;
        }

        const high = Math.max(...fibonacciData);
        const low = Math.min(...fibonacciData);
        const fibonacciLevels = calculateFibonacciLevels(high, low);
        console.log(`Fibonacci Levels (${interval}):`, fibonacciLevels);
        generateFibonacciSignal(currentPrice, fibonacciLevels);

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

const getLatestPriceFromMongo = async (indicator) => {
    const db = client.db("robo_gelt");
    const collection = db.collection(indicator);
    const latestData = await collection.find({}).sort({ _id: -1 }).limit(1).toArray();
    return latestData.length > 0 ? latestData[0].price : null;
};

const updateCurrentPrice = async (interval) => {
    currentPrice = await fetchBinanceAPI(interval, '1');
    console.log(`Current price: $ ${ currentPrice}`)
};
main().catch(console.error);
