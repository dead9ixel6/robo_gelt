require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');
const { calculateRSI, calculateFibonacciLevels } = require('./indicators');
const { execSync } = require('child_process');
const {generateTradingSignal} = require('./magic.js')

const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);



async function main() {
    try {


        await client.connect();
        console.log("Connected successfully to MongoDB");

        // Fetch and process data every 10 seconds
        setInterval(async () => {
            await getBinanceData();
        }, 10000);
    } catch (e) {
        console.error(e);
    }
}

const getBinanceData = async () => {
    try {
        const response = await axios.get('https://fapi.binance.com/fapi/v1/klines', {
            params: {
                symbol: 'BTCUSDT',
                interval: '1h',
                limit: 1 // Fetch only the latest kline
            }
        });

        const latestPrice = parseFloat(response.data[0][4]); // Extracting the latest closing price
        await storePrice(latestPrice); // Store the latest price in MongoDB
        const rsi = await calculateRSIWithMongo(); // Calculate RSI based on MongoDB data
        const fibonacciLevels = await calculateFibonacciWithMongo();  //Calculate Fibonacci based on MongoDB data
        console.log(`RSI: ${rsi}`);
        console.log(`Fibruh -Nacci`)
        console.log(fibonacciLevels)
        console.log(generateTradingSignal({rsi}));
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
};

const storePrice = async (price) => {
    const db = client.db("robo_gelt");
    const collection = db.collection("rsi");
    await collection.insertOne({ date: new Date(), price });
};

const calculateRSIWithMongo = async () => {
    const db = client.db("robo_gelt");
    const collection = db.collection("rsi");

    // Fetch the last 14 data points
    const data = await collection.find({}).sort({ _id: -1 }).limit(14).toArray();

    // Extract prices and timestamps
    const prices = data.map(d => d.price);
    const timestamps = data.map(d => d.date);

    // Calculate RSI
    const rsi = calculateRSI(prices);


    return rsi;
};

const calculateFibonacciWithMongo = async () => {
    const db = client.db("robo_gelt");
    const collection = db.collection("rsi");

    // Fetch a larger set of data points, adjust limit as needed
    const data = await collection.find({}).sort({ _id: -1 }).limit(100).toArray();
    const prices = data.map(d => d.price);

    // Determine high and low prices
    const high = Math.max(...prices);
    const low = Math.min(...prices);

    // Calculate Fibonacci Levels
    const fibonacciLevels = calculateFibonacciLevels(high, low);

    return fibonacciLevels;
};

main().catch(console.error);
