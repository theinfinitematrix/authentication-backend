import "dotenv/config";
import { connectMongo } from "./db/index.js";
import app from "./app.js";

const PORT = process.env.PORT || 8000;

connectMongo(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`server is up and running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(`MongoDB connection error...`);
    process.exit(1);
  });
