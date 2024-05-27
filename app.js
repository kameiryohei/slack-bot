const express = require("express");

const app = express();

const { WebClient } = require("@slack/web-api");

require("dotenv").config();

// Slack APIクライアントを初期化
const token = process.env.SLACK_BOT_TOKEN;
const web = new WebClient(token);
const apiUrl = process.env.API_URL;
const channel = process.env.SLACK_CHANNEL;

const sendMessage = async () => {
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (Array.isArray(data)) {
      let message = data
        .map((item) => {
          if (item.co2 !== null) {
            return `${item.sensorName}のCO2濃度：${item.co2}ppm, 気温：${item.temperature}°C, 湿度：${item.relativeHumidity}%`;
          }
        })
        .filter((message) => message !== undefined)
        .join("\n");

      let alertMessage = ""; // 警告メッセージを格納

      // co2の濃度が1000ppmを超えているセンサーがあれば警告メッセージを生成
      const excessiveCO2Sensors = data.filter(
        (item) => item.co2 !== null && item.co2 > 1000
      );
      if (excessiveCO2Sensors.length > 0) {
        alertMessage = excessiveCO2Sensors
          .map(
            (item) => `場所名: ${item.sensorName}, その部屋を換気してください。`
          )
          .join("\n");
      } else {
        alertMessage = "換気は良好です";
      }

      const now = new Date();
      const timestamp = `${now.getFullYear()}/${
        now.getMonth() + 1
      }/${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

      await web.chat
        .postMessage({
          channel,
          text: `現在時刻: ${timestamp}\n++++++++++++++++++++++++++++++++++++\n${message}\n++++++++++++++++++++++++++++++++++++\n${alertMessage}`,
        })
        .catch(console.error);
    } else {
      console.error("レスポンスがサポートされていない形式です");
    }
  } catch (error) {
    console.error("外部APIの呼び出しエラー:", error);
  }
};

// 20秒ごとにsendMessage関数を呼び出す
setInterval(sendMessage, 20000);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
