// Format for D3.js (if needed for visualization)
const formattedData = data.map((d, i) => ({
    date: d.date,
    value: i < data.length - 1 ? rsi : null // Assign RSI values to all but the latest data point
  }));
  

  export default formattedData