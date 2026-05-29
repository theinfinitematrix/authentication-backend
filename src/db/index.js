import mongoose from "mongoose";

const connectMongo = async (url) => {
  try {
    await mongoose.connect(url);
  } catch (error) {
    process.exit(1);
  }
};
export { connectMongo };
