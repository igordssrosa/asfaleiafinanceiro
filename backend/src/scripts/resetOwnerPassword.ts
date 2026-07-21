import "dotenv/config";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";

import { connectDatabase } from "../config/database.js";
import { UserModel } from "../models/User.js";

const environmentSchema = z.object({
  RESET_OWNER_EMAIL: z
    .string()
    .trim()
    .email("E-mail inválido."),

  RESET_OWNER_PASSWORD: z
    .string()
    .min(12, "A senha deve ter pelo menos 12 caracteres.")
    .regex(/[a-z]/, "A senha precisa ter uma letra minúscula.")
    .regex(/[A-Z]/, "A senha precisa ter uma letra maiúscula.")
    .regex(/[0-9]/, "A senha precisa ter um número.")
    .regex(
      /[^a-zA-Z0-9]/,
      "A senha precisa ter um caractere especial.",
    ),
});

async function resetOwnerPassword(): Promise<void> {
  try {
    const environment = environmentSchema.parse(process.env);

    const email =
      environment.RESET_OWNER_EMAIL.trim().toLowerCase();

    await connectDatabase();

    const owner = await UserModel.findOne({
      email,
      role: "owner",
    });

    if (!owner) {
      throw new Error(
        `Nenhum proprietário foi encontrado com o e-mail ${email}.`,
      );
    }

    const passwordHash = await bcrypt.hash(
      environment.RESET_OWNER_PASSWORD,
      12,
    );

    await UserModel.updateOne(
      {
        _id: owner._id,
      },
      {
        $set: {
          passwordHash,
          isActive: true,
        },
      },
    );

    console.log(`Senha de ${owner.name} redefinida com sucesso.`);
  } catch (error) {
    console.error("Não foi possível redefinir a senha.");

    if (error instanceof z.ZodError) {
      for (const issue of error.issues) {
        console.error(
          `${issue.path.join(".")}: ${issue.message}`,
        );
      }
    } else if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Conexão encerrada.");
  }
}

void resetOwnerPassword();