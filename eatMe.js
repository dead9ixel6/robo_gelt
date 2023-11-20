require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');

const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);

async function main() {
    try {
        await client.connect();
        console.log("Connected successfully to MongoDB");

        // Drop the existing "moving-averages" collection
        await dropCollection("moving-averages");

        // Number of days to subtract from the current date
        const daysToSubtract = 200;

        // Fetch and store historical data
        await fetchAndStoreHistoricalData(daysToSubtract);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function fetchAndStoreHistoricalData(daysToSubtract) {
    const endTime = new Date().getTime(); // Use current date as end time
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const startTime = endTime - (daysToSubtract * oneDayInMs);

    const historicalData = await fetchBinanceAPI('1d', startTime, endTime);
    if (historicalData) {
        const dataInserted = await storeHistoricalData(historicalData, 'moving-averages');
        return dataInserted;
    }
    return false; // No data inserted
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
    let i = 0;
    const collection = db.collection(indicator);
    for (let item of data) {
        i++
        await collection.insertOne({ date: item.date, price: item.price });
        console.log(`Stored price for ${indicator}: ${item.price} on ${item.date}`);
    }
    console.log(i)
    return true; // Data inserted successfully
}

async function dropCollection(collectionName) {
    const db = client.db("robo_gelt");
    await db.dropCollection(collectionName);
    console.log(`Dropped collection: ${collectionName}`);
}

main().catch(console.error);
