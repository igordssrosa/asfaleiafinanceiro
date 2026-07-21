import "dotenv/config";

import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import { connectDatabase } from "../config/database.js";

type DatabaseTestDocument = {
  testId: string;
  message: string;
  createdAt: Date;
};

async function testDatabase(): Promise<void> {
  try {
    console.log("Iniciando teste do MongoDB Atlas...");

    await connectDatabase();

    const database = mongoose.connection.db;

    if (!database) {
      throw new Error("A conexão foi aberta, mas o banco não está disponível.");
    }

    await database.admin().command({ ping: 1 });

    console.log("1. Ping realizado com sucesso.");

    const collection =
      database.collection<DatabaseTestDocument>("database_tests");

    const testId = randomUUID();

    const testDocument: DatabaseTestDocument = {
      testId,
      message: "Teste de conexão do sistema financeiro Asfaleia",
      createdAt: new Date(),
    };

    const insertionResult =
      await collection.insertOne(testDocument);

    console.log(
      `2. Documento criado: ${insertionResult.insertedId.toString()}`,
    );

    const savedDocument = await collection.findOne({
      testId,
    });

    if (!savedDocument) {
      throw new Error(
        "O documento foi criado, mas não pôde ser encontrado.",
      );
    }

    console.log("3. Documento encontrado e lido com sucesso.");

    const deletionResult = await collection.deleteOne({
      testId,
    });

    if (deletionResult.deletedCount !== 1) {
      throw new Error("Não foi possível apagar o documento de teste.");
    }

    console.log("4. Documento temporário apagado com sucesso.");
    console.log("Teste concluído: o banco está lendo e gravando normalmente.");
  } catch (error) {
    console.error("O teste do MongoDB falhou.");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Conexão de teste encerrada.");
  }
}

void testDatabase();