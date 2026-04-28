import app from "./app.js";
import configService from "./lib/classes/configClass.js";

const PORT = configService.get("PORT") || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
