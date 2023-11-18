require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');
const { calculateRSI, calculateFibonacciLevels } = require('./indicators');
const { generateTradingSignal } = require('./magic')
const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);

const shortTermMA = 10; // For testing
const longTermMA = 20; // For testing

async function main() {
    try {
        await client.connect();
        console.log("Connected successfully to MongoDB");

        setInterval(async () => {
            await fetchBinanceData('1h', 'rsi');
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
        const response = await axios.get('https://fapi.binance.com/fapi/v1/klines', {
            params: {
                symbol: 'BTCUSDT',
                interval: interval,
                limit: interval === '1d' ? shortTermMA : 1
            }
        });

        if (interval === '1d') {
            const prices = response.data.map(kline => parseFloat(kline[4]));
            console.log(`Fetched daily prices for moving averages: ${prices}`);
            return prices;
        } else {
            console.log(`Fetched latest price: ${parseFloat(response.data[0][4])}`);
            return { latestPrice: parseFloat(response.data[0][4]), interval };
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
};

const fetchBinanceData = async (interval, indicator) => {
    const apiData = await fetchBinanceAPI(interval);

    if (!apiData) {
        console.log("No API data fetched");
        return;
    }

    if (indicator === 'rsi') {
        const rsiData = await getDataFromMongo(indicator);
        const rsi = calculateRSI(rsiData);
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

const storePrice = async (price, indicator) => {
    const db = client.db("robo_gelt");
    const collection = db.collection(indicator);
    await collection.insertOne({ date: new Date(), price });
    console.log(`Stored price for ${indicator}: ${price}`);
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
    const limit = indicator === 'moving-averages' ? shortTermMA : 200;
    const data = await collection.find({}).sort({ _id: -1 }).limit(limit).toArray();
    return data.map(d => d.price);
};

const calculateMovingAverage = (data, period) => {
    let maValues = [];

    for (let i = 0; i < data.length; i++) {
        if (i >= period - 1) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j];
            }
            maValues.push(sum / period);
        } else {
            maValues.push(null); // Not enough data to calculate moving average
        }
    }

    console.log(`Calculated moving averages for period ${period}:`, maValues);
    return maValues;
};


main().catch(console.error);
