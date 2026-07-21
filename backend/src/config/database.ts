import { setServers } from "node:dns";
import mongoose from "mongoose";

setServers(["8.8.8.8", "1.1.1.1"]);

export async function connectDatabase(): Promise<void> {
  const mongodbUri = process.env.MONGODB_URI?.trim();

  if (!mongodbUri) {
    throw new Error(
      "A variável MONGODB_URI não foi definida no arquivo backend/.env",
    );
  }

  await mongoose.connect(mongodbUri, {
    serverSelectionTimeoutMS: 15_000,
  });

  console.log(
    `MongoDB Atlas conectado ao banco: ${mongoose.connection.name}`,
  );
}