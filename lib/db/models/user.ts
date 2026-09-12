import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/db/mongodb";

export interface UserDocument {
  _id?: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
}

export async function getUsersCollection(): Promise<Collection<UserDocument>> {
  const db = await getDb();
  return db.collection<UserDocument>("users");
}

export function toUserDTO(doc: UserDocument & { _id: ObjectId }): UserDTO {
  return { id: doc._id.toString(), name: doc.name, email: doc.email };
}
