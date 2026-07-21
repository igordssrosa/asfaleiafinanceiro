import "dotenv/config";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";

import { connectDatabase } from "../config/database.js";
import { UserModel } from "../models/User.js";

const strongPasswordSchema = z
  .string()
  .min(12, "A senha deve possuir pelo menos 12 caracteres")
  .regex(/[a-z]/, "A senha deve possuir uma letra minúscula")
  .regex(/[A-Z]/, "A senha deve possuir uma letra maiúscula")
  .regex(/[0-9]/, "A senha deve possuir um número")
  .regex(
    /[^a-zA-Z0-9]/,
    "A senha deve possuir um caractere especial",
  );

const environmentSchema = z.object({
  OWNER_1_NAME: z.string().trim().min(2),
  OWNER_1_EMAIL: z.string().trim().email(),
  OWNER_1_PASSWORD: strongPasswordSchema,

  OWNER_2_NAME: z.string().trim().min(2),
  OWNER_2_EMAIL: z.string().trim().email(),
  OWNER_2_PASSWORD: strongPasswordSchema,
});

type OwnerInput = {
  name: string;
  email: string;
  password: string;
};

async function createOwner(owner: OwnerInput): Promise<void> {
  const normalizedEmail = owner.email.trim().toLowerCase();

  const existingUser = await UserModel.findOne({
    email: normalizedEmail,
  }).lean();

  if (existingUser) {
    console.log(
      `A conta de ${owner.name} já existe e não foi alterada.`,
    );

    return;
  }

  const passwordHash = await bcrypt.hash(owner.password, 12);

  await UserModel.create({
    name: owner.name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: "owner",
    isActive: true,
    lastLoginAt: null,
  });

  console.log(`Conta de ${owner.name} criada com sucesso.`);
}

async function createOwners(): Promise<void> {
  try {
    const environment = environmentSchema.parse(process.env);

    const owners: OwnerInput[] = [
      {
        name: environment.OWNER_1_NAME,
        email: environment.OWNER_1_EMAIL,
        password: environment.OWNER_1_PASSWORD,
      },
      {
        name: environment.OWNER_2_NAME,
        email: environment.OWNER_2_EMAIL,
        password: environment.OWNER_2_PASSWORD,
      },
    ];

    if (
      owners[0].email.toLowerCase() ===
      owners[1].email.toLowerCase()
    ) {
      throw new Error(
        "Os dois proprietários não podem utilizar o mesmo e-mail.",
      );
    }

    await connectDatabase();

    for (const owner of owners) {
      await createOwner(owner);
    }

    const ownersCount = await UserModel.countDocuments({
      role: "owner",
      isActive: true,
    });

    console.log(`Proprietários ativos encontrados: ${ownersCount}`);

    if (ownersCount !== 2) {
      throw new Error(
        `O banco deveria possuir exatamente 2 proprietários, mas possui ${ownersCount}.`,
      );
    }

    console.log("Cadastro inicial concluído.");
  } catch (error) {
    console.error("Não foi possível criar os proprietários.");

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

void createOwners();