require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');

const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);

async function main() {
    try {
        await client.connect();
        console.log("Connected successfully to MongoDB");

        // Fetch and store historical data
        await fetchAndStoreHistoricalData();
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function fetchAndStoreHistoricalData() {
    let startTime = new Date('2021-01-01').getTime();
    const endTime = new Date().getTime(); // Use current date as end time
    const oneDayInMs = 24 * 60 * 60 * 1000;

    while (startTime < endTime) {
        const historicalData = await fetchBinanceAPI('1d', startTime, Math.min(startTime + oneDayInMs * 365, endTime));
        if (historicalData) {
            await storeHistoricalData(historicalData, 'moving-averages');
        }
        startTime += oneDayInMs * 365;
    }
}

async function fetchBinanceAPI(interval, startTime, endTime) {
    try {
        const response = await axios.get('https://fapi.binance.com/fapi/v1/klines', {
            params: {
                symbol: 'BTCUSDT',
                interval: interval,
                startTime: startTime,
                endTime: endTime,
                limit: 1000
            }
        });
        return response.data.map(kline => ({ date: new Date(kline[0]), price: parseFloat(kline[4]) }));
    } catch (error) {
        console.error(`Error fetching Binance data: ${error.message}`);
        return null;
    }
}

async function storeHistoricalData(data, indicator) {
    const db = client.db("robo_gelt");
    const collection = db.collection(indicator);
    for (let item of data) {
        await collection.insertOne({ date: item.date, price: item.price });
        console.log(`Stored price for ${indicator}: ${item.price} on ${item.date}`);
    }
}

main().catch(console.error);
